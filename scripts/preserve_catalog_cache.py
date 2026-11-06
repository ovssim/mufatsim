#!/usr/bin/env python3
"""Protect Wormyard.Store's public case manifests from destructive deployments.

Usage in the GitHub Pages job:
  python scripts/preserve_catalog_cache.py before
  # update_historical_crates.py; update_cases.py
  python scripts/preserve_catalog_cache.py after

On every deployment, the previous publicly deployed JSON is fetched as a safety net.
Both manifests are merged by stable id instead of replaced. The second step rejects
empty or implausibly short catalogs so an import outage cannot remove everyone's cases.
No secrets or user data are involved.
"""
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

MANIFESTS = {
    'cases': {'path': Path('data/cases-generated.json'), 'field': 'cases', 'minimum': 8},
    'historical': {'path': Path('data/historical-crates.json'), 'field': 'crates', 'minimum': 10},
}
BACKUPS = Path(tempfile.gettempdir()) / 'wormyard-catalog-before'
DEFAULT_LIVE = 'https://ovssim.github.io/mufatsim'


def valid_row(row: object, key: str) -> bool:
    if not isinstance(row, dict):
        return False
    name, ident, pool = row.get('name'), row.get('id'), row.get('pool')
    if not isinstance(name, str) or len(name.strip()) < 3:
        return False
    if not isinstance(ident, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{3,90}', ident):
        return False
    if not isinstance(pool, list):
        return False
    required = 3 if key == 'historical' else 8
    return len(pool) >= required and all(isinstance(r, dict) and r.get('name') for r in pool)


def read_data(path: Path) -> dict:
    try:
        result = json.loads(path.read_text('utf-8'))
        return result if isinstance(result, dict) else {}
    except (OSError, ValueError):
        return {}


def fetch_deployed(key: str) -> dict:
    url = os.environ.get('WORMYARD_PUBLIC_URL', DEFAULT_LIVE).rstrip('/')
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname:
        raise ValueError('WORMYARD_PUBLIC_URL must be an HTTPS site URL')
    location = f"{url}/data/{MANIFESTS[key]['path'].name}"
    req = Request(location, headers={'User-Agent': 'WormyardCatalogBackup/0.9.3', 'Accept': 'application/json'})
    with urlopen(req, timeout=18) as response:
        raw = response.read(12_000_000)
    result = json.loads(raw)
    return result if isinstance(result, dict) else {}


def good_entries(manifest: dict, key: str) -> list[dict]:
    payload = manifest.get(MANIFESTS[key]['field'], []) if isinstance(manifest, dict) else []
    if not isinstance(payload, list):
        return []
    return [row for row in payload if valid_row(row, key)]


def merge(previous: dict, incoming: dict, key: str) -> dict:
    """Union, preferring richer entries and otherwise keeping the incoming update."""
    current = {}
    # Previous first, then update with current, unless current loses entries from a pool.
    for row in good_entries(previous, key):
        current[row['id']] = row
    for row in good_entries(incoming, key):
        old = current.get(row['id'])
        if old is None or len(row['pool']) >= len(old['pool']):
            current[row['id']] = row
    meta = {}
    for data in (previous, incoming):
        if isinstance(data, dict) and isinstance(data.get('metadata'), dict):
            meta.update(data['metadata'])
    meta['catalogPreserved'] = True
    meta['preservedEntryCount'] = len(current)
    field = MANIFESTS[key]['field']
    entries = list(current.values())
    if key == 'historical':
        entries.sort(key=lambda row: (row.get('series', 999), row['id']))
    else:
        entries.sort(key=lambda row: row['name'].lower())
    return {field: entries, 'metadata': meta}


def write_data(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def before(fetcher=fetch_deployed) -> None:
    BACKUPS.mkdir(exist_ok=True, parents=True)
    for key, spec in MANIFESTS.items():
        bundled = read_data(spec['path'])
        remote = {}
        try:
            remote = fetcher(key)
        except Exception as exc:
            print(f'Previous published {key} catalog unavailable: {type(exc).__name__}: {exc}')
        merged = merge(bundled, remote, key)
        write_data(BACKUPS / f'{key}.json', merged)
        if good_entries(merged, key):
            write_data(spec['path'], merged)
        print(f"Backup {key}: {len(good_entries(bundled, key))} bundled, "
              f"{len(good_entries(remote, key))} deployed, {len(good_entries(merged, key))} preserved")


def after() -> None:
    errors = []
    for key, spec in MANIFESTS.items():
        previous = read_data(BACKUPS / f'{key}.json')
        generated = read_data(spec['path'])
        merged = merge(previous, generated, key)
        count = len(good_entries(merged, key))
        prior_count = len(good_entries(previous, key))
        if count < max(spec['minimum'], prior_count):
            errors.append(f"{key}: only {count} entries; require at least "
                          f"{max(spec['minimum'], prior_count)}. Restore a healthy manifest or fix the importer.")
        else:
            write_data(spec['path'], merged)
            print(f'{key}: preserved {prior_count} old entries; publishing {count} complete entries')
    if errors:
        raise SystemExit('REFUSING TO DEPLOY PARTIAL/EMPTY CRATE CATALOG:\n' + '\n'.join(errors))


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in ('before', 'after'):
        raise SystemExit('Usage: python scripts/preserve_catalog_cache.py before|after')
    (before if sys.argv[1] == 'before' else after)()
