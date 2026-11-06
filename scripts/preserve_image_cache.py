#!/usr/bin/env python3
"""Best-effort protection against deploying an empty/partial Steam icon manifest.
Usage: python scripts/preserve_image_cache.py before|after
This uses publicly deployed image data; no secrets are required.
"""
import json
import sys
from pathlib import Path
from urllib.request import Request, urlopen

PATH = Path('data/steam-images.json')
BACKUP = Path('/tmp/wormyard-image-cache-before.json')
LIVE = 'https://ovssim.github.io/mufatsim/data/steam-images.json'
SECTIONS = ('items', 'normalized', 'byIndex', 'crates', 'toolTargets')


def valid(data):
    return isinstance(data, dict) and len(data.get('items', {})) >= 30


def read(path):
    try:
        return json.loads(path.read_text('utf-8'))
    except (OSError, ValueError):
        return {}


def before():
    candidates = [read(PATH)]
    try:
        with urlopen(Request(LIVE, headers={'User-Agent':'Wormyard-Image-Preservation/0.8.8'}), timeout=15) as r:
            candidates.append(json.load(r))
    except Exception as exc:
        print('Previous published image cache unavailable:', type(exc).__name__)
    best = max((c for c in candidates if valid(c)), key=lambda c: len(c['items']), default={})
    if best:
        BACKUP.write_text(json.dumps(best), encoding='utf-8')
        print('Preserved', len(best['items']), 'existing image mappings')
    else:
        print('No populated prior manifest was available')


def after():
    current, previous = read(PATH), read(BACKUP)
    if valid(previous):
        for section in SECTIONS:
            old = previous.get(section) or {}
            new = current.get(section) or {}
            current[section] = {**old, **new}
        current.setdefault('metadata', {})['previousMappingsPreserved'] = len(previous.get('items', {}))
        PATH.write_text(json.dumps(current, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
        print('Merged image manifest:', len(current['items']), 'item names')
    elif valid(current):
        print('Generated image manifest valid:', len(current['items']), 'item names')
    else:
        # Fail rather than silently publishing the 0-item starter JSON again.
        raise SystemExit('ERROR: No populated item-image manifest was generated or recovered. Refusing to deploy an empty image map.')


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in ('before', 'after'):
        raise SystemExit('Usage: python scripts/preserve_image_cache.py before|after')
    (before if sys.argv[1] == 'before' else after)()
