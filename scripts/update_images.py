#!/usr/bin/env python3
"""Export Valve TF2 schema icon URLs without saving or publishing the API key.

Pagination is mandatory: GetSchemaItems returns a "next" cursor. Historically Valve
has also returned http: image links; Steam CDN links are upgraded to https: here.
The script works with STEAM_API_KEY in GitHub Actions or with a local fixture for tests.
"""
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

CACHE = Path('data/steam-images.json')
SCHEMA = 'https://api.steampowered.com/IEconItems_440/GetSchemaItems/v1/'
TRUSTED_HOSTS = ('media.steampowered.com','community.fastly.steamstatic.com',
                 'community.steamstatic.com','steamcommunity-a.akamaihd.net',
                 'steamcdn-a.akamaihd.net')


def secure_icon(url):
    """Allow only Valve/Steam image URLs, always over HTTPS."""
    if not url:
        return ''
    parts = urlsplit(url)
    hostname = (parts.hostname or '').lower()
    if parts.scheme not in ('http', 'https') or hostname not in TRUSTED_HOSTS:
        return ''
    return urlunsplit(('https',parts.netloc,parts.path,parts.query,''))


def norm(name):
    return re.sub(r'[^a-z0-9]+','',name.lower().replace('’',"'"))


def export(fetch):
    items = {}
    normalized = {}
    crates = {}
    by_index = {}
    start, pages, seen = 0, 0, set()
    while True:
        if start in seen:
            raise RuntimeError(f'Repeated pagination cursor {start}')
        seen.add(start)
        payload = fetch(start)
        result = payload.get('result', {})
        if result.get('status') not in (None, 1):
            raise RuntimeError(f'Steam API status: {result.get("status")}')
        batch = result.get('items', [])
        if not isinstance(batch, list):
            raise RuntimeError('Unexpected schema response format')
        for item in batch:
            title = item.get('item_name') or item.get('name')
            icon = secure_icon(item.get('image_url_large') or item.get('image_url'))
            if not title or not icon:
                continue
            items.setdefault(title, icon)
            normalized.setdefault(norm(title), icon)
            normalized.setdefault(norm(title.removeprefix('The ')), icon)
            if isinstance(item.get('defindex'), int):
                by_index[str(item['defindex'])] = icon
            name_match = re.search(r'(?:supply crate|supply munition)\s*#\s*(\d+)', title, flags=re.I)
            if name_match:
                crates['series-' + str(int(name_match.group(1)))] = icon
            for attr in item.get('attributes', []):
                if attr.get('name') == 'set supply crate series':
                    try:
                        series = int(float(attr['value']))
                        if 1 <= series <= 999:
                            crates['series-' + str(series)] = icon
                    except (TypeError, ValueError):
                        pass
        pages += 1
        if pages > 100:
            raise RuntimeError('Schema pagination exceeded 100 pages')
        next_cursor = result.get('next')
        if next_cursor in (None, 0, '0', ''):
            break
        start = int(next_cursor)
    if len(items) < 30:
        raise RuntimeError(f'Only {len(items)} item icons found — refusing to replace cache')
    for cid, name in {
        'winter-2023':'Winter 2023 Cosmetic Case',
        'summer-2024':'Summer 2024 Cosmetic Case',
        'winter-2024':'Winter 2024 Cosmetic Case',
        'unlocked-cosmetic':'Unlocked Cosmetic Crate',
        'haunted-hoard-2026':'Haunted Hoard Case',
    }.items():
        url = normalized.get(norm(name))
        if url:
            crates[cid] = url
    return {'items':items,'normalized':normalized,'byIndex':by_index,'crates':crates,
            'metadata':{'source':'Valve IEconItems_440/GetSchemaItems/v1',
                        'itemCount':len(items),'pages':pages}}


def steam_fetch(key):
    def fetch(cursor):
        params = urlencode({'key':key,'language':'en','start':cursor})
        req = Request(SCHEMA+'?'+params, headers={'User-Agent':'TF2-Unboxing-Simulator/0.5'})
        with urlopen(req, timeout=45) as response:
            return json.load(response)
    return fetch


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--fixture':
        pages = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
        fetch = lambda cursor: pages[str(cursor)]
    else:
        key = os.environ.get('STEAM_API_KEY','').strip()
        if not key:
            raise RuntimeError('STEAM_API_KEY is missing (add it as a GitHub Actions secret)')
        fetch = steam_fetch(key)
    result = export(fetch)
    CACHE.parent.mkdir(parents=True,exist_ok=True)
    CACHE.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print('Valve schema images:',result['metadata']['itemCount'],'items,',
          len(result['crates']),'containers over',result['metadata']['pages'],'pages')

if __name__ == '__main__':
    main()
