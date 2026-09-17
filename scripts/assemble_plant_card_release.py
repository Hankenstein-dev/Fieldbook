#!/usr/bin/env python3
"""Assemble saved CLI drafts and explicit direct corrections without changing runs."""
import csv
import hashlib
import html
import shutil
from collections import Counter
from datetime import datetime, timezone

from audit_plant_content import ROOT, read, write
from run_plant_content_cli import validate


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    analysis = ROOT / 'data/analysis'
    recovery = analysis / 'plant-content-recovery-v1'
    destination = analysis / 'plant-card-release-v1'
    assert not (destination / 'manifest.json').exists(), 'Release already assembled'
    census = analysis / 'plant-content-v1/tokens-by-taxon.csv'
    rows = list(csv.DictReader(census.open()))
    eligible = {int(r['taxonId']) for r in rows
                if r['rank'] == 'species' and r['status'] == 'taxon_matched_text'}
    gaps = [r for r in rows if r['rank'] == 'species' and int(r['taxonId']) not in eligible]
    corrections = read(recovery / 'corrections.json')
    corrected = {r['taxonId']: r for r in corrections}
    assert len(corrected) == len(corrections)
    failed = {r['taxonId'] for r in read(recovery / 'failed-records.json')}
    assert set(corrected) == failed
    records, originals, runs = {}, {}, []
    usage = Counter()
    calls = missing_usage = 0
    generation_seconds = 0
    for manifest_path in sorted(analysis.glob('plant-cli-*/manifest.json')):
        base = manifest_path.parent
        manifest = read(manifest_path)
        originals[str(manifest_path.relative_to(ROOT))] = sha(manifest_path)
        # Usage belongs to calls, never to the assembled cards or direct corrections.
        call_results = ([read(base / f"{b['id']}-result.json") for b in manifest['batches']]
                        if manifest.get('batchSize', 1) > 1 else
                        [read(base / f'{tid}-result.json') for tid in manifest['taxonIds']])
        for call in call_results:
            calls += 1
            missing_usage += call['usage'] is None
            usage.update(call['usage'] or {})
            generation_seconds += call['elapsedSeconds'] or 0
        runs.append({'path': str(base.relative_to(ROOT)), 'count': manifest['count'],
                     'report': str((base / 'report.json').relative_to(ROOT))})
        for tid in manifest['taxonIds']:
            assert tid not in records, f'Duplicate species: {tid}'
            result_path, source_path = base / f'{tid}-result.json', base / f'{tid}-source.json'
            result, frozen = read(result_path), read(source_path)
            assert result['taxonId'] == frozen['input']['taxonId'] == tid
            assert bool(result['validated']) == (tid not in corrected)
            if tid in corrected:
                assert corrected[tid]['sourceRun'] == base.name
            output = corrected[tid]['output'] if tid in corrected else result['output']
            validate(output, frozen['input'])
            for p in (result_path, source_path):
                originals[str(p.relative_to(ROOT))] = sha(p)
            records[tid] = {'taxonId': tid, 'name': result['name'], 'output': output,
                            'validated': True, 'directCompletion': tid in corrected,
                            'originalResult': str(result_path.relative_to(ROOT)),
                            'sourceFile': source_path}
    assert set(records) == eligible, 'Release must exactly cover eligible census species'
    destination.mkdir(parents=True, exist_ok=True)
    previous = ROOT / 'stories/pt/plants.cli.json'
    shutil.copyfile(previous, destination / 'previous-published-content.json')
    originals['stories/pt/plants.json'] = sha(ROOT / 'stories/pt/plants.json')
    write(destination / 'original-hashes.json', originals)
    cards = []
    for tid, record in sorted(records.items()):
        source = record.pop('sourceFile')
        shutil.copyfile(source, destination / f'{tid}-source.json')
        write(destination / f'{tid}-result.json', record)
        out = record['output']
        cards.append(f'<article id="taxon-{tid}"><h2>{html.escape(record["name"])} · {tid}</h2>'
                     f'<p>{html.escape(out["summary"] or "No supported summary; reference facts shown in app.")}</p>'
                     f'<p>Human food use: {out["humanEdibility"]}. {html.escape(out["edibilityNote"] or "")}</p>'
                     f'<p>{"Direct completion" if record["directCompletion"] else "Saved CLI output"} · '
                     f'<a href="{tid}-result.json">Output and evidence IDs</a> · '
                     f'<a href="{tid}-source.json">Frozen source packet</a></p></article>')
    write(destination / 'manifest.json', {
        'preparedAt': datetime.now(timezone.utc).isoformat(), 'count': len(records),
        'taxonIds': sorted(records), 'sourceRuns': runs, 'censusSha256': sha(census),
        'directCorrections': str((recovery / 'corrections.json').relative_to(ROOT)),
        'directCorrectionsSha256': sha(recovery / 'corrections.json'),
        'method': 'Saved successful outputs plus user-authorised direct completion of failed records; no new CLI calls.'})
    nulls = sum(r['output']['summary'] is None for r in records.values())
    usage['uncached_input_tokens'] = usage['input_tokens'] - usage['cached_input_tokens']
    report = {'count': len(records), 'validatedCount': len(records), 'unresolvedFailureCount': 0,
              'savedCliSuccessCount': len(records) - len(corrected), 'directCompletionCount': len(corrected),
              'nullSummaryCount': nulls, 'speciesWithoutMatchedSources': len(gaps),
              'sourceGapReasons': dict(Counter(r['status'] for r in gaps)),
              'generationCallCount': calls, 'generationUsage': dict(usage),
              'missingUsageCallCount': missing_usage, 'totalRecordedGenerationSeconds': generation_seconds,
              'coordinatingChatUsage': None,
              'usageScope': 'Original CLI calls only; no new generation calls for this release. Direct completion is coordinating-chat work and its usage is not measured here. Cached and reasoning tokens are subsets. Missing call usage is excluded.',
              'validation': 'All records passed JSON/schema, word and sentence limits, and evidence-ID checks against their own frozen packets.',
              'reviewScope': '113 failed records completed directly from sources. No independent botanical accuracy review of all saved CLI content.',
              'sourceRuns': runs}
    write(destination / 'report.json', report)
    write(destination / 'source-gaps.json', gaps)
    (destination / 'outputs.html').write_text(
        '<!doctype html><meta charset="utf-8"><title>Fieldbook plant cards</title>'
        '<style>body{max-width:960px;margin:40px auto;padding:0 20px;font:17px/1.6 system-ui}article{border-top:1px solid #ccc;margin:25px 0}a{overflow-wrap:anywhere}</style>'
        f'<h1>{len(records):,} plant cards</h1><p>{len(corrected)} direct completions; '
        f'{nulls} source-limited null summaries. <a href="report.json">Aggregate report</a>. '
        'Draft content; full botanical accuracy has not been independently reviewed.</p>' + ''.join(cards))
    (destination / 'report.md').write_text(
        f'# Fieldbook plant card release\n\n[All readable outputs](outputs.html) · [Detailed report](report.json)\n\n'
        f'{len(records):,} records pass code validation: {len(records)-len(corrected):,} saved CLI successes and '
        f'{len(corrected)} direct completions. No unresolved eligible records. '
        f'{nulls} valid null summaries retain factual reference cards.\n\n'
        f'{len(gaps):,} other species lack matched source text and retain reference cards.\n\n'
        'Original failed responses, requests, events and usage remain in their source runs. '
        'Direct completions use their frozen packets and made no new CLI calls. '
        'Coordinating-chat usage is separate and unavailable in this report.\n\n'
        f'Recorded generation time across all six runs: {generation_seconds:.1f} seconds; '
        f'{calls} calls, {missing_usage} with unavailable usage.\n\n'
        '| CLI generation tokens | Total |\n| --- | ---: |\n' +
        ''.join(f'| {k} | {v:,} |\n' for k, v in usage.items()) +
        '\nCached input and reasoning output are subsets, not additional totals. '
        'Full botanical accuracy has not been independently reviewed.\n')
    print({k: v for k, v in report.items() if k not in ('sourceRuns', 'generationUsage')})


if __name__ == '__main__':
    main()
