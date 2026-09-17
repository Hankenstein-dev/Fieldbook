#!/usr/bin/env python3
"""Build country metadata and fixed-zone checklists without downloading model weights."""
import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path
from prepare_catalogue import normalise

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def write(path, value):
    (ROOT / path).write_text(json.dumps(value, separators=(',', ':')))


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--offline', action='store_true')
    mode.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    groups, seed, build = read('config/groups.json'), read('config/seed.json'), read('config/zone-build.json')
    places = read(build['sourcePlaces'])
    country = read('config/countries.json')[seed['country']]
    species = {s['id']: s for s in read('public/models/references.json')['species'] if s['group'] in groups}
    zones, checklists = [], {}
    for place in sorted(places, key=lambda x: x['id']):
        if country['iNatPlaceId'] not in place['ancestor_place_ids']:
            raise RuntimeError('Zone is outside the configured country')
        lat, lng = map(float, place['location'].split(','))
        bbox = place['bounding_box_geojson']['coordinates'][0]
        zone = {
            'id': str(place['id']), 'name': build.get('labels', {}).get(str(place['id']), place['name']),
            'placeId': place['id'], 'centre': {'lat': lat, 'lng': lng},
            'bounds': [min(p[0] for p in bbox), min(p[1] for p in bbox), max(p[0] for p in bbox), max(p[1] for p in bbox)],
            'geometry': place['geometry_geojson'], 'source': f'https://www.inaturalist.org/places/{place["id"]}',
        }
        zones.append(zone)
        counts, fetched = {}, []
        for group in groups.values():
            page, group_ids = 1, set()
            while True:
                params = {'place_id': place['id'], 'iconic_taxa': ','.join(group['iconicTaxa']), 'per_page': 500, 'page': page, 'locale': 'en'}
                path = ROOT / f'data/zones/checklists/{place["id"]}-{params["iconic_taxa"]}-{page}.json'
                if args.refresh or not path.exists():
                    if args.offline:
                        raise RuntimeError(f'Missing cached response: {path}')
                    url = 'https://api.inaturalist.org/v1/observations/species_counts?' + urllib.parse.urlencode(params)
                    for attempt in range(3):
                        try:
                            response = json.load(urllib.request.urlopen(url, timeout=35))
                            break
                        except Exception:
                            if attempt == 2:
                                raise
                            time.sleep(3)
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_text(json.dumps({'url': url, 'fetchedAt': int(time.time()*1000), 'data': response}))
                    time.sleep(1.1)
                envelope = json.loads(path.read_text())
                result = envelope['data']
                fetched.append(envelope['fetchedAt'])
                previous = len(group_ids)
                for row in result['results']:
                    taxon = normalise(row['taxon'], groups)
                    species.setdefault(taxon['id'], taxon)
                    if taxon.get('photo') and not species[taxon['id']].get('photo'):
                        species[taxon['id']]['photo'] = taxon['photo']
                    counts[taxon['id']] = row['count']
                    group_ids.add(taxon['id'])
                if len(group_ids) >= result['total_results']:
                    break
                if len(group_ids) == previous:
                    raise RuntimeError(f'Incomplete species list for {place["name"]}')
                page += 1
        checklists[zone['id']] = {
            'counts': counts, 'fetchedAt': min(fetched), 'complete': True,
            'source': f'https://www.inaturalist.org/observations?place_id={place["id"]}&view=species',
        }
        print(zone['name'], len(counts), 'taxa', flush=True)
    # Publish only after every zone has a complete snapshot.
    write('config/generated/zones.json', {'country': seed['country'], 'source': 'iNaturalist standard administrative places', 'zones': zones})
    write('config/generated/zone-checklists.json', checklists)
    write('config/generated/country-catalogue.json', list(species.values()))
    print('Fieldbook:', len(zones), 'zones;', len(species), 'taxa;', country['name'])


if __name__ == '__main__':
    main()
