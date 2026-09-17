"""Build recognition references on the computer, including directly observed higher taxa.

Run with the model-build venv (numpy, onnxruntime, tokenizers). No phone-side
reference generation is required. --refresh refreshes the source snapshots.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

from seed_stories import Client, read_json, write_json, INAT
from prepare_catalogue import normalise

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/models'
OUT = ROOT / 'public/models'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    cfg = read_json(ROOT / 'config/seed.json')
    country = read_json(ROOT / 'config/countries.json')[cfg['country']]
    groups = read_json(ROOT / 'config/groups.json')
    model = read_json(ROOT / 'config/generated/identification.json')
    client = Client(RAW / 'http', refresh=args.refresh, offline=args.offline)
    rows = {}
    page = 1
    while True:
        result = client.get(INAT + '/observations/species_counts', {
            'place_id': country['iNatPlaceId'], 'per_page': 200, 'page': page, 'locale': 'en',
        })['data']
        before = len(rows)
        for row in result['results']:
            rows[row['taxon']['id']] = row
        if len(rows) >= result['total_results']:
            break
        if len(rows) == before:
            raise RuntimeError('Incomplete country species-count snapshot')
        page += 1

    # species_counts reports leaves of the queried tree. A genus can be a local
    # leaf but absent from the national leaf list. The full taxonomy endpoint
    # exposes directly observed taxa at every rank, covering that mismatch.
    taxonomy = client.get(INAT + '/observations/taxonomy', {
        'place_id': country['iNatPlaceId'], 'locale': 'en',
    })
    tree = taxonomy['data']
    if len(tree['results']) != tree['size']:
        raise RuntimeError('Incomplete country taxonomy snapshot')
    country_species = {i: normalise(row['taxon'], groups) for i, row in rows.items()}
    starter = read_json(ROOT / 'config/generated/starter.json')
    for candidate in starter['candidates']:
        country_species.setdefault(candidate['species']['id'], candidate['species'])
    references = dict(country_species)
    for taxon in tree['results']:
        if taxon.get('direct_obs_count', 0) > 0:
            references.setdefault(taxon['id'], normalise(taxon, groups))

    old = read_json(OUT / 'references.json') if (OUT / 'references.json').exists() else None
    if old and (old['model'] != model['id'] or old['country'] != cfg['country']):
        raise RuntimeError('Model/country changed: use a separate reference build directory')
    # Keep shipped vectors/chunk boundaries so APK updates only download additions.
    files = old['files'].copy() if old else []
    existing = {i for f in files for i in f['ids']}
    for file in files:
        data = (ROOT / 'public' / file['url'].lstrip('/')).read_bytes()
        if hashlib.sha256(data).hexdigest() != file['sha256']:
            raise RuntimeError('Existing reference chunk failed verification')
    additions = [s for i, s in sorted(references.items()) if i not in existing]
    print('Country leaves', len(country_species), 'new references', len(additions), flush=True)

    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 4
    opts.inter_op_num_threads = 1
    session = ort.InferenceSession(str(RAW / 'bioclip2-text-int8.onnx'),
                                   sess_options=opts, providers=['CPUExecutionProvider'])
    tokenizer = Tokenizer.from_file(str(OUT / 'tokenizer.json'))
    vector_dir = RAW / 'reference-vectors'
    vector_dir.mkdir(exist_ok=True)
    for i, species in enumerate(additions):
        path = vector_dir / f'{species["id"]}.npy'
        if not path.exists():
            ids = tokenizer.encode(f'a photo of {species["scientificName"]}').ids
            if len(ids) > 77:
                ids = ids[:76] + [49407]
            ids += [0] * (77 - len(ids))
            vector = session.run(None, {'input_ids': np.array([ids], dtype=np.int64)})[0][0]
            vector /= np.linalg.norm(vector)
            np.save(path, vector)
        if i % 1000 == 0:
            print('Precomputing additions', i, '/', len(additions), flush=True)
    for offset in range(0, len(additions), 1000):
        batch = additions[offset:offset + 1000]
        vectors = np.stack([np.load(vector_dir / f'{s["id"]}.npy') for s in batch])
        if vectors.shape != (len(batch), model['dimensions']) or not np.isfinite(vectors).all():
            raise RuntimeError('Invalid reference vectors')
        data = vectors.astype('<f4').tobytes()
        digest = hashlib.sha256(data).hexdigest()
        name = f'references-{digest[:12]}.bin'
        (OUT / name).write_bytes(data)
        files.append({'url': f'/models/{name}', 'bytes': len(data), 'sha256': digest,
                      'ids': [s['id'] for s in batch], 'kind': 'text'})
    ids = [i for file in files for i in file['ids']]
    if len(ids) != len(set(ids)) or set(references) - set(ids):
        raise RuntimeError('Reference coverage or uniqueness check failed')
    content = {
        'country': cfg['country'], 'placeId': country['iNatPlaceId'], 'model': model['id'],
        'fetchedAt': int(time.time() * 1000), 'species': list(country_species.values()),
        'files': files, 'taxonomySource': {k: taxonomy[k] for k in ('url', 'fetchedAt')},
    }
    encoded = json.dumps(content, separators=(',', ':')).encode()
    (OUT / 'references.json').write_bytes(encoded)
    write_json(RAW / 'country-species.json', list(country_species.values()))
    write_json(RAW / 'reference-species.json', list(references.values()))
    write_json(ROOT / 'config/generated/reference-pack.json', {
        'url': '/models/references.json', 'sha256': hashlib.sha256(encoded).hexdigest(),
        'bytes': sum(f['bytes'] for f in files) + len(encoded), 'species': len(ids), 'photos': 0,
    })
    print('Reference pack complete', len(ids), 'references', flush=True)


if __name__ == '__main__':
    main()
