#!/usr/bin/env python3
"""Cache backpack.tf IGetPrices/v4 community suggested prices (not classifieds averages).

The private BACKPACK_TF_API_KEY is only read in GitHub Actions. JSON delivered to
GitHub Pages contains neither the key nor personally identifiable information.
"""
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

OUT = Path('data/backpack-prices.json')
QUAL = {
    '1': 'Genuine', '3': 'Vintage', '5': 'Unusual', '6': 'Unique',
    '11': 'Strange', '13': 'Haunted', '14': "Collector's", '15': 'Decorated'
}
# Exact particle IDs that the beta's reward generator currently supports.
FX = {
    '9': 'Green Energy', '10': 'Purple Energy', '13': 'Burning Flames',
    '17': 'Sunbeams', '33': 'Orbiting Fire'
}


def norm(name):
    s = str(name).lower().replace('’', "'")
    s = re.sub(r'^(?:(?:the|strange|unusual|vintage|genuine)\s+)+', '', s)
    return re.sub('[^a-z0-9]+', '', s)


def pairs(value):
    """PHP JSON serialization sometimes turns zero-indexed maps into arrays."""
    if isinstance(value, dict):
        return value.items()
    if isinstance(value, list):
        return enumerate(value)
    return ()


def quote(price, key_rate):
    if not isinstance(price, dict):
        return None
    try:
        a = float(price['value'])
        b = float(price.get('value_high', a))
        v = (a+b)/2 if b >= a else a
        if not math.isfinite(v) or v < 0 or v > 1000000:
            return None
        unit = price.get('currency')
        if unit == 'metal':
            return round(v, 2)
        if unit == 'keys':
            return round(v * key_rate, 2)
    except (ValueError, TypeError, KeyError, OverflowError):
        pass
    return None


def extract(data, rate=65.88):
    entries = data.get('response', {}).get('items', {})
    if not isinstance(entries, dict) or not entries:
        raise ValueError('No backpack.tf item prices in API response')
    result = {
        'items': {}, 'crates': {}, 'keys': {},
        'metadata': {
            'source': 'backpack.tf IGetPrices/v4 community suggestions',
            'updatedAt': datetime.now(timezone.utc).date().isoformat(),
            'keyValueRef': rate
        }
    }
    for name, obj in entries.items():
        if not isinstance(obj, dict):
            continue
        record = result['items'].setdefault(norm(name), {'name': name, 'qualities': {}})
        for quality, branch in pairs(obj.get('prices', {})):
            qname = QUAL.get(str(quality))
            if not qname or not isinstance(branch, dict):
                continue
            trade = branch.get('Tradable')
            if not isinstance(trade, dict):
                continue
            craft = trade.get('Craftable')
            for index, entry in pairs(craft):
                if isinstance(entry, list):
                    entry = max((p for p in entry if isinstance(p, dict)),
                                key=lambda p: p.get('last_update', 0) or 0,
                                default=None)
                value = quote(entry, rate)
                if value is None:
                    continue
                idx = str(index)
                grade_entry = record['qualities'].setdefault(qname, {})
                if qname == 'Unusual':
                    # Preserve all priced particle IDs for future supported effects.
                    grade_entry.setdefault('effectsById', {})[idx] = value
                    if idx in FX:
                        grade_entry.setdefault('effects', {})[norm(FX[idx])] = value
                elif idx == '0':
                    grade_entry['priceRef'] = value
                if qname != 'Unique':
                    continue
                if idx.isdigit() and int(idx) > 0 and re.search(r'Mann Co\. Supply (Crate|Munition)', name, re.I):
                    result['crates']['series-' + str(int(idx))] = value
                if idx == '0':
                    # Avoid calling a crate key a crate.
                    if not name.lower().endswith(' key') and re.search(r'\b(case|crate)\b', name, re.I):
                        result['crates']['name:' + norm(name)] = value
                    if name.endswith(' Key'):
                        result['keys'][norm(name)] = value
        if not record['qualities']:
            result['items'].pop(norm(name), None)
    if not result['items']:
        raise ValueError('Parsed zero item prices: check API response layout')
    result['metadata'].update({'items': len(result['items']), 'crates': len(result['crates']), 'keys': len(result['keys'])})
    return result


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--fixture':
        data = json.loads(Path(sys.argv[2]).read_text())
    else:
        key = os.environ.get('BACKPACK_TF_API_KEY', '').strip()
        if not key:
            print('No BACKPACK_TF_API_KEY set: simulator fallback prices in use.')
            return
        url = 'https://backpack.tf/api/IGetPrices/v4/?' + urlencode({'key': key, 'appid': 440})
        # Do not write API key or URL to logs.
        request = Request(url, headers={'User-Agent': 'TF2-Unboxing-Simulator/0.7.1', 'Accept': 'application/json'})
        with urlopen(request, timeout=50) as response:
            data = json.load(response)
    result = extract(data, float(os.environ.get('TF2_KEY_REF', '65.88')))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')
    print('Price data loaded:', result['metadata']['items'], 'items,', result['metadata']['crates'],
          'crates,', result['metadata']['keys'], 'keys')


if __name__ == '__main__':
    main()
