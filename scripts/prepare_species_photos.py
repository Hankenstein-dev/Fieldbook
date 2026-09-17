#!/usr/bin/env python3
"""Resolve alternatives for catalogue entries without a default photo (private build).

Fetches only taxon metadata, in paced batches; no image downloads or runtime API fan-out.
Reruns reuse cached responses. --offline regenerates from those responses only.
"""
import argparse
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def choose_photo(taxon):
    photos = [taxon.get('default_photo')] + [p.get('photo') for p in taxon.get('taxon_photos', [])]
    for photo in photos:
        if not photo:
            continue
        url = photo.get('medium_url') or photo.get('square_url') or photo.get('url')
        if url and photo.get('id'):
            return {'url': url.replace('/square.', '/medium.'),
                    'attribution': photo.get('attribution') or 'iNaturalist contributor',
                    'license': photo.get('license_code') or 'all-rights-reserved',
                    'sourceUrl': f'https://www.inaturalist.org/photos/{photo["id"]}'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    catalogue = json.loads((ROOT / 'config/generated/country-catalogue.json').read_text())
    missing = sorted(s['id'] for s in catalogue if not s.get('photo') and s['id'] > 0)
    cache = ROOT / 'data/species-photos'
    cache.mkdir(parents=True, exist_ok=True)
    # These defaults were omitted by older builds. Supply them as presentation
    # fallbacks too, so older saved sightings/queries do not hide restored images.
    photos = {str(s['id']): s['photo'] for s in catalogue if s.get('photo') and
              s['photo']['license'] not in {'cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa'}}
    restored_defaults = len(photos)
    unresolved = []
    for offset in range(0, len(missing), 30):
        ids = missing[offset:offset + 30]
        absent = [i for i in ids if not (cache / f'{i}.json').exists()]
        if absent:
            if args.offline:
                raise RuntimeError(f'Missing cached taxon metadata: {absent}')
            url = 'https://api.inaturalist.org/v1/taxa/' + ','.join(map(str, absent))
            for attempt in range(3):
                try:
                    with urllib.request.urlopen(url, timeout=40) as response:
                        result = json.load(response)
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(5)
            found = {t['id']: t for t in result['results']}
            for taxon_id in absent:
                (cache / f'{taxon_id}.json').write_text(json.dumps({
                    'source': url, 'fetchedAt': int(time.time() * 1000),
                    'taxon': found.get(taxon_id),
                }))
            time.sleep(1.1)
        for taxon_id in ids:
            taxon = json.loads((cache / f'{taxon_id}.json').read_text())['taxon']
            photo = choose_photo(taxon) if taxon else None
            if photo:
                photos[str(taxon_id)] = photo
            else:
                unresolved.append(taxon_id)
        print(f'{min(offset + 30, len(missing))}/{len(missing)} checked; {len(photos)} photos found', flush=True)
    (ROOT / 'config/generated/species-photos.json').write_text(json.dumps(photos, separators=(',', ':')))
    (cache / 'report.json').write_text(json.dumps({'checked': len(missing), 'resolved': len(photos) - restored_defaults,
                                                 'restoredDefaults': restored_defaults,
                                                 'noTaxonPhoto': unresolved}, indent=2))


if __name__ == '__main__':
    main()
