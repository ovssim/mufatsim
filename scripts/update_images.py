#!/usr/bin/env python3
"""Export TF2 icon URLs using a public Valve-derived schema mirror first.

No API key is required for the default public-mirror path. Steam schema is a
secondary fallback if STEAM_API_KEY is configured; it is never published.
"""
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

CACHE = Path('data/steam-images.json')
PUBLIC_SCHEMAS = [
 'https://raw.githubusercontent.com/tsuza/tf2-item-schema/master/files/localized/item_schema_json_english.txt',
 'https://raw.githubusercontent.com/tsuza/tf2-item-schema/master/files/localized/item_schema_json_en.txt',
 'https://raw.githubusercontent.com/tsuza/tf2-item-schema/master/files/item_schema_json.txt',
 'https://cdn.jsdelivr.net/gh/tsuza/tf2-item-schema@master/files/item_schema_json.txt',
]

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
    tool_candidates = []
    target_names = {}
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
            public_name = str(item.get('item_name') or '').strip()
            internal_name = str(item.get('name') or '').strip()
            title = public_name or internal_name
            icon = secure_icon(item.get('image_url_large') or item.get('image_url'))
            if not title or not icon:
                continue
            # Tool subclasses share the generic item_name 'Strangifier' or 'Kit',
            # whereas name can identify the exact target. Save BOTH aliases.
            for alias in dict.fromkeys([public_name, internal_name]):
                if not alias: continue
                items.setdefault(alias, icon)
                normalized.setdefault(norm(alias), icon)
                normalized.setdefault(norm(alias.removeprefix('The ')), icon)
            if isinstance(item.get('defindex'), int):
                by_index[str(item['defindex'])] = icon
                if public_name and public_name.lower() not in ('strangifier', 'kit'):
                    target_names.setdefault(norm(public_name), set()).add(item['defindex'])
                if internal_name and internal_name.lower() not in ('strangifier', 'kit'):
                    target_names.setdefault(norm(internal_name), set()).add(item['defindex'])
            if ('strangifier' in (public_name+' '+internal_name).lower() or
                'killstreak' in (public_name+' '+internal_name).lower() or
                public_name.lower() == 'kit'):
                tool_candidates.append(item)
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
    # Tool target mapping tells the browser WHICH indexed kit/Strangifier
    # price to look up. Never use the price of an arbitrary generic tool.
    tool_targets = {}
    for item in tool_candidates:
        internal_name = str(item.get('name') or '').strip()
        public_name = str(item.get('item_name') or '').strip()
        search_name = internal_name if internal_name.lower() not in ('kit', 'strangifier') else public_name
        lower = (internal_name + ' ' + public_name).lower()
        family = 'strangifier' if 'strangifier' in lower else 'kit' if 'kit' in lower or 'killstreak' in lower else None
        if not family: continue
        possible_targets = set()
        tier = None
        for attr in item.get('attributes', []) or []:
            key = str(attr.get('name') or attr.get('class') or '').lower().replace('_', ' ')
            try: val = int(float(attr.get('value')))
            except (ValueError, TypeError, OverflowError): continue
            if key in ('tool target item', 'tool target item defindex'): possible_targets.add(val)
            if key == 'killstreak tier': tier = val
        if not possible_targets:
            # Some older schema snapshots omit the target attribute. Resolve
            # only when the target weapon's display name is unambiguous.
            target_label = re.sub(r'(?i)\s+(?:strangifier|(?:professional |specialized )?killstreak(?:ifier)?(?: basic| specialized| professional)?|kit)$', '', search_name).strip()
            choices = target_names.get(norm(target_label), set())
            possible_targets.update(choices)
        if not possible_targets: continue
        if family == 'kit':
            if tier is None:
                # Variant names are not always styled alike in Valve's schema.
                if 'professional' in lower: tier = 3
                elif 'specialized' in lower: tier = 2
                elif 'basic' in lower or 'killstreak kit' in lower: tier = 1
            if tier not in (1, 2, 3): continue
            family_name = {1:'Killstreak Kit', 2:'Specialized Killstreak Kit', 3:'Professional Killstreak Kit'}[tier]
            indexes = [f'{tier}-{target}' for target in sorted(possible_targets)]
        else:
            family_name = 'Strangifier'
            indexes = [str(target) for target in sorted(possible_targets)]
        aliases = [internal_name]
        if family == 'strangifier':
            aliases.extend([re.sub(r'(?i)\s+strangifier$', '', search_name).strip()+' Strangifier'])
        else:
            base = re.sub(r'(?i)\s+(?:killstreakifier|killstreak kit)(?: basic| specialized| professional)?$', '', search_name).strip()
            aliases.extend([base+' '+family_name, family_name.replace(' Kit', ' '+base+' Kit')])
        for alias in aliases:
            if alias and alias.lower() not in ('kit', 'strangifier'):
                tool_targets[norm(alias)] = {'family':family_name,'indexes':indexes}
                # Provide generic images for item labels built by the simulator.
                normalized.setdefault(norm(alias), by_index.get(str(item.get('defindex')), ''))
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
    return {'items':items,'normalized':normalized,'byIndex':by_index,'crates':crates,'toolTargets':tool_targets,
            'metadata':{'source':'Valve IEconItems_440/GetSchemaItems/v1',
                        'itemCount':len(items),'pages':pages,'indexedToolAliases':len(tool_targets)}}


def public_fetch():
    """Download a public GitHub mirror of Valve's schema (no Steam API key)."""
    last_error=None
    for uri in PUBLIC_SCHEMAS:
        try:
            req=Request(uri,headers={'User-Agent':'TF2-Unboxing-Simulator/0.6'})
            with urlopen(req,timeout=35) as response:
                raw=json.load(response)
            if isinstance(raw,list): raw={'result':{'items':raw}}
            elif isinstance(raw,dict) and 'items' in raw and 'result' not in raw:
                raw={'result':{'items':raw['items']}}
            if not isinstance(raw,dict) or not isinstance(raw.get('result'),dict):
                raise ValueError('Unexpected JSON root')
            items=raw['result'].get('items')
            if isinstance(items,dict):
                raw['result']['items']=list(items.values())
            if not isinstance(raw['result'].get('items'),list) or len(raw['result']['items'])<30:
                raise ValueError('Schema mirror did not contain at least 30 items')
            print('Image schema source:',uri)
            # Mirrors contain a full snapshot, so stop after the first page.
            raw['result'].pop('next',None)
            return lambda cursor: raw
        except Exception as e:
            last_error=e
            print('Public mirror unavailable:',uri,type(e).__name__,str(e)[:150],file=sys.stderr)
    raise RuntimeError(f'No public schema mirror could be read: {last_error}')


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
        try:
            fetch=public_fetch()
        except Exception as public_error:
            key=os.environ.get('STEAM_API_KEY','').strip()
            if not key:
                raise RuntimeError(f'Public schema failed and no optional STEAM_API_KEY was set: {public_error}')
            fetch=steam_fetch(key)
    result = export(fetch)
    CACHE.parent.mkdir(parents=True,exist_ok=True)
    CACHE.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print('Valve schema images:',result['metadata']['itemCount'],'items,',
          len(result['crates']),'containers over',result['metadata']['pages'],'pages')

if __name__ == '__main__':
    main()
