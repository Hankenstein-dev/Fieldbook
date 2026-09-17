#!/usr/bin/env python3
"""Verify saved batched generations and report format quality without model calls."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import statistics

from run_plant_content_cli import ROOT, read, write, validate, sentences


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    base = args.output.resolve()
    manifest = read(base/'manifest.json')
    report = read(base/'report.json')
    prompt = (base/'prompt.txt').read_text().rstrip('\n')
    assert hashlib.sha256(prompt.encode()).hexdigest() == manifest['promptSha256']
    ids = manifest['taxonIds']
    assert len(ids) == len(set(ids)) == manifest['count']
    assert not set(ids).intersection(manifest['excludedTaxonIds'])
    for relative, digest in manifest['excludedManifests'].items():
        assert hashlib.sha256((ROOT/relative).read_bytes()).hexdigest() == digest
    measurements = {r['taxonId']: r for r in manifest['taxa']}
    usage = Counter()
    failures = Counter()
    word_counts = []
    sentence_counts = []
    summaries = Counter()
    plant_count = completed_calls = missing_usage = 0
    for group in manifest['batches']:
        prefix = group['id']
        path = base/f'{prefix}-result.json'
        assert path.exists(), f'Incomplete batch: {prefix}'
        batch = read(path)
        assert batch['taxonIds'] == group['taxonIds']
        packets = []
        for tid in group['taxonIds']:
            packet = read(base/f'{tid}-source.json')['input']
            assert packet['taxonId'] == tid
            assert packet['rank'] == 'species' and packet['sourceMatchStatus'] == 'taxon_matched_text'
            encoded = json.dumps(packet, ensure_ascii=False, separators=(',', ':'))
            assert hashlib.sha256(encoded.encode()).hexdigest() == measurements[tid]['packetSha256']
            packets.append(packet)
        request = (base/f'{prefix}-request.txt').read_text()
        assert request == prompt+'\n\nPLANT INFORMATION\n'+json.dumps(packets, ensure_ascii=False, separators=(',', ':'))
        attempt = read(base/f'{prefix}-attempt.json')
        assert attempt['requestSha256'] == hashlib.sha256(request.encode()).hexdigest()
        assert attempt['taxonIds'] == group['taxonIds'] and attempt['automaticRetries'] == 0
        events = [json.loads(line) for line in (base/f'{prefix}-events.jsonl').read_text().splitlines()]
        turns = [e for e in events if e.get('type') == 'turn.completed']
        assert len(turns) <= 1
        assert sum(e.get('type') == 'turn.started' for e in events) <= 1
        assert batch['toolCalls'] == 0
        messages = [e['item']['text'] for e in events if e.get('type') == 'item.completed' and e.get('item', {}).get('type') == 'agent_message']
        assert (base/f'{prefix}-output.txt').read_text() == '\n\n'.join(messages)+'\n'
        if turns:
            assert Counter(turns[0]['usage']) == Counter(batch['usage'])
            usage.update(batch['usage'])
            completed_calls += 1
        else:
            missing_usage += 1
        assert len(batch['results']) == len(group['taxonIds'])
        for packet, result in zip(packets, batch['results']):
            assert result == read(base/f"{packet['taxonId']}-result.json")
            assert result['taxonId'] == packet['taxonId']
            plant_count += 1
            if result['validated']:
                validate(result['output'], packet)
                summary = result['output']['summary']
                if summary:
                    word_counts.append(len(summary.split()))
                    sentence_counts.append(sentences(summary))
                    summaries[summary] += 1
            else:
                failures[result['validationError']] += 1
    usage['uncached_input_tokens'] = usage['input_tokens']-usage['cached_input_tokens']
    assert dict(usage) == report['usage']
    assert plant_count == report['count'] == manifest['count']
    assert report['generationCallCount'] == len(manifest['batches'])
    assert report['completedCallCount'] == completed_calls
    assert report['failedCount'] == sum(failures.values())
    assert report['missingUsageCount'] == missing_usage
    assert (base/'outputs.html').read_text().count('<article>') == plant_count
    audit = {'artifactChecksPassed': True, 'plantCount': plant_count,
             'callCount': len(manifest['batches']), 'completedCalls': completed_calls,
             'validatedCount': report['validatedCount'], 'failureTypes': dict(failures),
             'nullSummaryCount': report['nullSummaryCount'],
             'summaryWords': {'median': statistics.median(word_counts) if word_counts else None,
                              'maximum': max(word_counts, default=0)},
             'maximumSentences': max(sentence_counts, default=0),
             'duplicateNonNullSummaries': sum(n-1 for n in summaries.values() if n > 1),
             'usage': dict(usage), 'missingUsageCalls': missing_usage,
             'scope': 'Code checks only: frozen inputs, exact request composition, result mapping, artifacts, events, schema, limits, evidence-ID existence and usage accounting. Botanical accuracy and entailment are not established. No review model calls.'}
    write(base/'integrity-check.json', audit)
    print(json.dumps(audit))


if __name__ == '__main__':
    main()
