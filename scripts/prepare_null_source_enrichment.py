#!/usr/bin/env python3
"""Explicitly freeze a new-source enrichment run after earlier valid nulls.

This is never invoked by the automatic worker. Identical source requests and
failed last attempts are ineligible; all earlier responses remain untouched.
"""
import argparse
import fcntl
import re
from types import SimpleNamespace
from recover_plant_sources import ROOT, read, write, load_recovery_docs, prepare, now


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    history = {}
    protected = set()
    for base in (ROOT / 'data/analysis').glob('plant-cli-recovery-*-v*'):
        if not (base / 'manifest.json').exists():
            continue
        with (base / '.runner.lock').open('a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                protected.update(read(base / 'manifest.json')['taxonIds'])
        for path in base.glob('*-result.json'):
            if path.name.startswith('batch-'):
                continue
            result = read(path)
            history.setdefault(result['taxonId'], []).append((base, result))
    ready = []
    for row in read(ROOT / 'data/analysis/plant-card-release-v2/coverage/recovery-queue.json'):
        tid = row['taxonId']
        prior = history.get(tid, [])
        if row['summaryWords'] or tid in protected or not prior:
            continue
        latest = max(prior, key=lambda p: p[1].get('completedAt', ''))[1]
        if not latest.get('validated') or latest.get('output', {}).get('summary') is not None:
            continue
        hashes, words = set(), set()
        for base, _ in prior:
            frozen = read(base / f'{tid}-source.json')
            hashes.update(s['sha256'] for s in frozen['sourceProvenance'])
            words.update(re.findall(r'\w+', ' '.join(p['text'] for s in frozen['input']['sources'] for p in s['passages']).casefold()))
        new = [d for d in load_recovery_docs(row)
               if d['sha256'] not in hashes and len(d['clean'].split()) >= 40
               and len(set(re.findall(r'\w+', d['clean'].casefold())) - words) >= 25]
        if new:
            ready.append({'taxonId': tid, 'name': row['name'],
                          'previousRuns': [str(b.relative_to(ROOT)) for b, _ in prior],
                          'newSources': [{k: d[k] for k in ('title', 'path', 'sha256')} for d in new]})
    if not ready:
        print('No substantive new-source enrichment packets found.')
        return
    prepare(SimpleNamespace(output=args.output, exclude=[], only=[r['taxonId'] for r in ready],
                            local=False, include_short=False, limit=None))
    out = ROOT / args.output
    selected = set(read(out / 'manifest.json')['taxonIds'])
    for row in ready:
        if row['taxonId'] in selected:
            frozen = read(out / f"{row['taxonId']}-source.json")
            assert {s['sha256'] for s in row['newSources']} & {s['sha256'] for s in frozen['sourceProvenance']}
    write(out / 'new-source-enrichment.json', {
        'at': now(), 'selected': [r for r in ready if r['taxonId'] in selected],
        'policy': 'Explicit new-source enrichment after a valid null; latest failed attempts excluded. New source hash, at least 40 source words and 25 new word tokens versus all previous frozen requests. Original responses and usage retained; no replay of the same request.'})


if __name__ == '__main__':
    main()
