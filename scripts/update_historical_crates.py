#!/usr/bin/env python3
"""Import numbered TF2 supply crate and munition contents from public historical tables.

These tables are TheLetterZed's community likelihood *models*, not Valve's
published probabilities.  Preserve only identifiable individual drop entries.
Never turn an undefined or inaccessible series into a generic sample crate.
Bundled known-good data is retained if the public source is unavailable.
"""
from __future__ import annotations

import concurrent.futures
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

INDEX = 'https://theletterzed.ca/tf2/crates/'
BASE = 'https://theletterzed.ca'
OUT = Path('data/historical-crates.json')
SERIES = re.compile(r'(?:Series\s*#|#)\s*(\d{1,3})(?:\b|$)', re.I)
ALLOWED_TITLE = re.compile(
    r'^(?:Mann Co\. Supply Crate|Salvaged Mann Co\. Supply Crate|Mann Co\. Supply Munition)\s+(?:Series\s*)?#\s*\d+$', re.I
)
UNUSUAL = re.compile(r'^(?:Series\s+[\d\s-]+\s+Unusual|Unusual(?:\s+Hat)?|Exceedingly Rare .*)$', re.I)


def tidy(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()


def fetch(url):
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; TF2-Fan-Simulator/0.7.3; public metadata only)',
        'Accept': 'text/html,application/xhtml+xml'
    })
    with urlopen(req, timeout=24) as response:
        return response.read(2_500_000).decode('utf-8', 'replace')


def index_links(markup):
    soup = BeautifulSoup(markup, 'html.parser')
    results = {}
    for a in soup.select('a[href]'):
        path = urlsplit(urljoin(BASE, a['href'])).path
        if not re.fullmatch(r'/tf2/crate/[a-z0-9-]+/?', path):
            continue
        name = tidy(a.get_text(' ', strip=True))
        if not ALLOWED_TITLE.fullmatch(name):
            continue
        m = SERIES.search(name)
        if m and 1 <= int(m.group(1)) <= 103:
            results[urljoin(BASE, path)] = name
    return results


def item_kind(name):
    if (re.search(r'(?:Strange Part|Strange Cosmetic Part|Strangifier|Killstreak.*Kit|Tag|Paint|Dueling Mini-Game|Bacon Grease|\. .*)', name, re.I)
            or name in {'Name Tag', 'Description Tag', 'Australium Gold', 'Pink as Hell', 'A Distinctive Lack of Hue', 'An Extraordinary Abundance of Tinge'}):
        return 'Tool'
    if name.lower().startswith('strange '):
        return 'Weapon'
    return 'Item'  # Neutral until item schema identifies the item class.


def parse_detail(markup, url, expected_title=None):
    soup = BeautifulSoup(markup, 'html.parser')
    h1 = soup.find('h1')
    title = tidy(h1.get_text(' ', strip=True)) if h1 else ''
    if title.lower().startswith('expected value of '):
        title = title[len('Expected value of '):]
    if not ALLOWED_TITLE.fullmatch(title):
        return None
    if expected_title and title.casefold() != expected_title.casefold():
        return None
    series = int(SERIES.search(title).group(1))
    if not 1 <= series <= 103:
        return None
    pool = []
    special_chance = 0
    special_label = ''
    table = next((t for t in soup.find_all('table')
                  if 'Likelihood' in tidy(t.get_text(' ', strip=True))
                  and 'Item Name' in tidy(t.get_text(' ', strip=True))), None)
    if table is None:
        return None
    for tr in table.find_all('tr'):
        columns = tr.find_all('td')
        if len(columns) < 2:
            continue
        name = tidy(columns[0].get_text(' ', strip=True))
        likelihood = tidy(columns[1].get_text(' ', strip=True))
        m = re.fullmatch(r'(\d+(?:\.\d+)?)\s*%', likelihood)
        if not m or not name or name.lower() == 'item name':
            continue
        chance = float(m.group(1))
        if not 0 < chance < 100:
            continue
        if UNUSUAL.fullmatch(name):
            special_chance += chance
            special_label = name
            continue
        if name.lower().startswith(('series 1 ', 'series 2 ', 'series 3 ')) and 'unusual' in name.lower():
            special_chance += chance
            special_label = name
            continue
        if any(existing['name'] == name for existing in pool):
            continue
        quality = 'Strange' if name.startswith('Strange ') and not name.startswith(('Strange Part:', 'Strange Cosmetic Part:')) else 'Unique'
        pool.append({'name': name, 'quality': quality, 'kind': item_kind(name), 'weight': chance})
    # The expected total is around 100%, though some published estimates are rounded.
    total = sum(row['weight'] for row in pool) + special_chance
    if len(pool) < 3 or not 90 <= total <= 103 or not special_chance < 5:
        return None
    return {
        'id': f'series-{series}', 'series': series, 'name': title,
        'kind': 'numbered', 'key': 'mannco', 'keyName': 'Mann Co. Supply Crate Key',
        'pool': pool, 'weighted': True, 'verified': True, 'historical': True,
        'openable': True, 'graded': False,
        'unusualChance': round(special_chance / 100, 6),
        'rareSpecialLabel': special_label,
        'source': url,
        'oddsSource': 'TheLetterZed community likelihood estimates, not official Valve probabilities.',
        'description': (f'{len(pool)} distinct historically listed regular drops for Series #{series}. '
                        'Item chances are community estimates. Rare unusual-hat identity/effect eligibility is not fully resolved.'),
    }


def build(existing=None, fetcher=fetch):
    existing = existing if isinstance(existing, dict) else {'crates': []}
    prior = {r['id']:r for r in existing.get('crates', [])
             if isinstance(r, dict) and re.fullmatch(r'series-\d+', str(r.get('id', '')))
             and isinstance(r.get('pool'), list) and len(r['pool']) >= 3}
    try:
        links = index_links(fetcher(INDEX))
    except Exception as exc:
        print(f'WARNING: Historical index unavailable ({exc}); retaining {len(prior)} bundled entries.')
        links = {}
    print(f'Discovered {len(links)} named numbered crate references')

    def download(pair):
        url, title = pair
        try:
            return parse_detail(fetcher(url), url, title)
        except Exception as exc:
            print(f'WARNING: Failed {title}: {type(exc).__name__}: {exc}')
            return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        for result in executor.map(download, links.items()):
            if result:
                prior[result['id']] = result
    data = sorted(prior.values(), key=lambda x: int(x['series']))
    return {'crates': data, 'metadata': {
        'source': INDEX, 'count': len(data), 'checked': len(links),
        'updatedAt': datetime.now(timezone.utc).isoformat(),
        'odds': 'Community model; never official Valve probabilities',
        'scope': 'Verified, source-linked numbered supply crates and munitions. No fabricated series.'
    }}


def main():
    try:
        previous = json.loads(OUT.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        previous = {'crates': []}
    result = build(previous)
    if len(result['crates']) < 5:
        raise RuntimeError('Insufficient verified crate data; preserving bundled manifest')
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(result["crates"])} historical numbered series; indexed {result["metadata"]["checked"]}')

if __name__ == '__main__':
    main()
