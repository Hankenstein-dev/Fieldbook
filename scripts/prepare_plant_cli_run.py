#!/usr/bin/env python3
"""Freeze a CLI sample from the full local corpus without model calls."""
import argparse
import csv
import hashlib
import random

from prepare_plant_content_run import build_packet
from audit_plant_content import SOURCE, stats
from run_plant_content_cli import ROOT, PROMPT, MODEL, ENC, now, read, write


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=800)
    parser.add_argument('--seed', type=int, default=20260916)
    parser.add_argument('--output', default='data/analysis/plant-cli-batched-v1')
    args = parser.parse_args()
    out = ROOT / args.output
    assert not out.exists(), 'Use a new output directory to preserve frozen runs'
    assert args.count > 0, 'Positive count required'
    exclusions = sorted((ROOT/'data/analysis').glob('plant-cli-*/manifest.json'))
    excluded = {tid for path in exclusions for tid in read(path)['taxonIds']}
    census = ROOT / 'data/analysis/plant-content-v1/tokens-by-taxon.csv'
    with census.open() as handle:
        eligible = sorted((r for r in csv.DictReader(handle) if r['rank'] == 'species'
                           and r['status'] == 'taxon_matched_text' and r['hasSources'] == 'True'
                           and int(r['taxonId']) not in excluded), key=lambda r: int(r['taxonId']))
    assert len({int(r['taxonId']) for r in eligible}) == len(eligible)
    selected = random.Random(args.seed).sample(eligible, args.count)
    prompt = PROMPT.read_text().rstrip('\n')
    count = lambda text: len(ENC.encode(text, disallowed_special=()))
    out.mkdir(parents=True)
    (out / 'prompt.txt').write_bytes(PROMPT.read_bytes())
    entries = []
    for row in selected:
        prepared = build_packet(row, prompt, count)
        packet = prepared['input']
        assert packet['rank'] == 'species' and packet['sourceMatchStatus'] == 'taxon_matched_text'
        assert any(s['passages'] for s in packet['sources']), 'Empty selected source packet'
        write(out / f"{packet['taxonId']}-source.json", prepared)
        entries.append(prepared['measurement'])
    write(out / 'manifest.json', {
        'preparedAt': now(), 'model': MODEL, 'reasoning': 'high', 'count': args.count,
        'seed': args.seed, 'taxonIds': [e['taxonId'] for e in entries],
        'batchSize': 10, 'timeoutSeconds': 300,
        'batches': [{'id': f'batch-{i//10+1:04d}', 'taxonIds': [e['taxonId'] for e in entries[i:i+10]]}
                    for i in range(0, len(entries), 10)],
        'eligiblePopulation': len(eligible), 'excludedTaxonIds': sorted(excluded),
        'excludedManifests': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in exclusions},
        'census': str(census.relative_to(ROOT)), 'censusSha256': hashlib.sha256(census.read_bytes()).hexdigest(),
        'sourceCorpus': str(SOURCE.relative_to(ROOT)),
        'promptSha256': hashlib.sha256(prompt.encode()).hexdigest(),
        'promptFileSha256': hashlib.sha256(PROMPT.read_bytes()).hexdigest(), 'promptTokens': count(prompt),
        'method': 'Seeded simple random sample without replacement from sorted source-matched species in the full local census; excludes every prior plant-cli run manifest, including tests. Frozen groups of ten (final group may be smaller), one fresh CLI call per group. Existing source selection and packet building; no scraping or LLM preparation.',
        'taxa': entries, 'packetStats': stats([e['packetTokens'] for e in entries])})
    print({'count': len(entries), 'eligiblePopulation': len(eligible), 'excluded': len(excluded),
           'packetStats': stats([e['packetTokens'] for e in entries])})


if __name__ == '__main__':
    main()
