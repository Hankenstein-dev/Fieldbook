#!/usr/bin/env python3
"""Fresh subscription CLI generations in frozen groups of ten; legacy runs supported."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import html
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import time

import tiktoken

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/analysis/plant-cli-batched-v1'
PROMPT = ROOT / 'config/plant-content-prompt-v4.txt'
MODEL = 'gpt-5.6-sol'
ENC = tiktoken.get_encoding('o200k_base')


def write(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
    temporary.replace(path)


def read(path):
    return json.loads(path.read_text())


def now():
    return datetime.now(timezone.utc).isoformat()


def sentences(summary):
    # Ignore decimal points and common abbreviations/initials before counting endings.
    text = re.sub(r'\b(?:(?i:e\.g\.|i\.e\.|subsp\.|var\.|ssp\.|sp\.)|[A-Z]\.)',
                  lambda m: m[0].replace('.', ''), summary or '')
    return len([s for s in re.split(r'[.!?]+(?:[”’"\x27)]*)(?:\s+|$)', text) if s.strip()])


def validate(output, packet):
    assert isinstance(output, dict), 'Output must be an object'
    assert set(output) == {'summary', 'humanEdibility', 'edibilityNote', 'evidence'}, 'Output fields'
    summary = output['summary']
    assert summary is None or isinstance(summary, str) and summary.strip(), 'Summary type'
    assert len((summary or '').split()) <= 75, 'Word limit'
    assert not re.search(r'\n\s*\n', summary or ''), 'Multiple paragraphs'
    assert sentences(summary) <= 3, 'Sentence limit'
    assert output['humanEdibility'] in {'yes', 'no', 'unknown'}, 'Edibility status'
    note = output['edibilityNote']
    assert note is None or isinstance(note, str) and len(note.split()) <= 30, 'Edibility note'
    refs = {p['id'] for s in packet['sources'] for p in s['passages']}
    assert isinstance(output['evidence'], dict) and set(output['evidence']) == {'summary', 'humanEdibility'}, 'Evidence fields'
    for field, values in output['evidence'].items():
        assert isinstance(values, list) and all(isinstance(v, str) and v in refs for v in values), 'Evidence IDs'
        if field == 'summary' and summary or field == 'humanEdibility' and output['humanEdibility'] in {'yes', 'no'}:
            assert values, 'Missing claim evidence'
        if field == 'summary' and summary is None:
            assert not values, 'Evidence for null summary'


def report(manifest):
    results = [read(BASE/f'{tid}-result.json') for tid in manifest['taxonIds'] if (BASE/f'{tid}-result.json').exists()]
    batched = manifest.get('batchSize', 1) > 1
    calls = [read(BASE/f"{b['id']}-result.json") for b in manifest.get('batches', [])
             if (BASE/f"{b['id']}-result.json").exists()] if batched else results
    usage = Counter()
    for result in calls:
        usage.update(result['usage'] or {})
    usage['uncached_input_tokens'] = usage['input_tokens']-usage['cached_input_tokens']
    started = min((r['startedAt'] for r in results), default=None)
    completed = max((r['completedAt'] for r in results), default=None)
    data = {'complete': len(results) == manifest['count'], 'count': len(results), 'usage': dict(usage),
            'validatedCount': sum(r['validated'] for r in results),
            'failedCount': sum(not r['validated'] for r in results),
            'generationCompletedCount': sum(r['turns'] == 1 for r in results),
            'generationCallCount': len(calls),
            'completedCallCount': sum(r['turns'] == 1 for r in calls),
            'missingUsageCount': sum(r['usage'] is None for r in calls),
            'nullSummaryCount': sum(r['validated'] and r['output']['summary'] is None for r in results),
            'startedAt': started, 'completedAt': completed,
            'elapsedWallSeconds': (datetime.fromisoformat(completed)-datetime.fromisoformat(started)).total_seconds() if started else 0,
            'totalGenerationSeconds': sum(r['elapsedSeconds'] or 0 for r in calls),
            'savedOutputTokens': sum(r['savedOutputTokens'] for r in calls), 'results': results,
            'usageUnit': 'CLI call; counted once per batch' if batched else 'CLI call per plant',
            'scope': 'CLI generation processes only. Includes CLI instructions; excludes coordinating chat and Python. Cached/reasoning counts are subsets. Botanical accuracy has not been reviewed.',
            'validation': 'JSON object/schema, whitespace word counts, deterministic sentence-boundary heuristic, paragraph count, evidence-ID existence and required evidence; no LLM review.'}
    write(BASE/'report.json', data)
    cards = []
    for r in results:
        raw_path = r.get('rawOutputFile', f"{r['taxonId']}-output.txt")
        raw = (BASE/raw_path).read_text() if (BASE/raw_path).exists() else ''
        out = r['output'] if isinstance(r['output'], dict) else {}
        cards.append('<article><h2>'+html.escape(r['name'])+' · '+str(r['taxonId'])+'</h2><p>'+
                     ('PASS' if r['validated'] else 'FAIL: '+html.escape(r['validationError'] or 'Execution failure'))+
                     '</p><p>'+html.escape(str(out.get('summary') or 'No summary returned.'))+'</p><p>Human edibility: '+
                     html.escape(str(out.get('humanEdibility', 'not returned')))+' — '+html.escape(str(out.get('edibilityNote') or ''))+
                     '</p><details><summary>Original output</summary><pre>'+html.escape(raw)+'</pre></details></article>')
    (BASE/'outputs.html').write_text('<!doctype html><meta charset="utf-8"><title>Plant drafts</title>'
        '<style>body{max-width:960px;margin:40px auto;font:17px/1.6 system-ui;padding:0 20px}article{border-top:1px solid #ccc;margin:25px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>'
        f'<h1>{len(results)} plant drafts · gpt-5.6-sol high</h1><p>{data["validatedCount"]} passed format checks; {data["failedCount"]} failed. Botanical accuracy has not been reviewed.</p>'+''.join(cards))
    lines = [f'# Plant CLI batch: {len(results)}/{manifest["count"]} attempted', '',
             '[Read all outputs](outputs.html) · [Machine-readable report](report.json) · [Frozen manifest](manifest.json)', '',
             f'Model: {MODEL}; reasoning: high; existing ChatGPT subscription authentication.', '',
             f'{data["completedCallCount"]}/{data["generationCallCount"]} completed CLI calls covering '
             f'{data["generationCompletedCount"]} plants; {data["validatedCount"]} passed format checks; '
             f'{data["failedCount"]} failed (including execution failures). {data["nullSummaryCount"]} valid null summaries.', '',
             f'Elapsed wall time: {data["elapsedWallSeconds"]:.1f} seconds ({data["elapsedWallSeconds"]/60:.2f} minutes). '
             f'Sum of CLI generation durations: {data["totalGenerationSeconds"]:.1f} seconds.', '',
             '| Generation usage | Tokens |', '| --- | ---: |']
    lines.extend(f'| {key} | {value:,} |' for key, value in usage.items())
    lines += ['', f'Usage unavailable for {data["missingUsageCount"]} CLI calls. Usage is counted once per call, never multiplied by plants. Reported totals exclude unreported usage; '
              'cached input and reasoning output are subsets, not additional tokens. Coordinating-chat usage is separate and is not measured here.', '',
              f'One fresh bounded CLI process per group of up to {manifest.get("batchSize", 1)} plants; no generation retries, replacements, tools, subagents, or LLM review. '
              'Requests, raw outputs, events, stderr, attempt markers, and reported usage are retained. '
              'The approved prompt and source packets were frozen before generation.', '',
              'Validation: '+data['validation'], '',
              'Botanical accuracy has not been reviewed. These are local drafts; no app stories were changed or published.', '',
              '## Failures', '', '| Taxon ID | Species | Failure |', '| --- | --- | --- |']
    lines.extend(f'| {r["taxonId"]} | {r["name"]} | {r["validationError"]} |' for r in results if not r['validated'])
    if (BASE/'local-startup-errors/README.txt').exists():
        lines += ['', 'Local configuration errors occurred before any generation requests; their original logs are retained '
                  'in [local-startup-errors](local-startup-errors/README.txt). These are excluded from generation attempt and usage totals.']
    (BASE/'report.md').write_text('\n'.join(lines)+'\n')
    return data


def decode_batch(raw, packets):
    """Require exact taxon coverage; then validate each record against its own packet."""
    outputs = {}
    try:
        rows = json.loads(raw)
        assert isinstance(rows, list), 'Batch output must be a JSON array'
        assert all(isinstance(r, dict) and type(r.get('taxonId')) is int for r in rows), 'Each result needs an integer taxonId'
        ids = [r['taxonId'] for r in rows]
        assert len(ids) == len(set(ids)), 'Duplicate taxonId in batch response'
        assert set(ids) == {p['taxonId'] for p in packets}, 'Missing or unexpected taxonIds in batch response'
        outputs = {r['taxonId']: {k: v for k, v in r.items() if k != 'taxonId'} for r in rows}
    except (ValueError, AssertionError, TypeError) as error:
        return [(None, str(error)) for p in packets]
    checked = []
    for packet in packets:
        output = outputs[packet['taxonId']]
        error = None
        try:
            validate(output, packet)
        except (AssertionError, TypeError, KeyError) as exc:
            error = str(exc)
        checked.append((output, error))
    return checked


def save_batch_results(batch):
    # Canonical batch result is written first; resume repairs interrupted per-plant saves.
    for result in batch['results']:
        destination = BASE/f"{result['taxonId']}-result.json"
        if not destination.exists():
            write(destination, result)


def account_refusal(events):
    """Detect provider account failures, never a phrase inside generated prose."""
    messages = []
    for event in events:
        if event.get('type') == 'error':
            messages.append(event.get('message', ''))
        elif event.get('type') == 'turn.failed':
            error = event.get('error', {})
            messages.append(error.get('message', '') if isinstance(error, dict) else str(error))
        elif event.get('type') == 'item.completed' and event.get('item', {}).get('type') == 'error':
            messages.append(event['item'].get('message', ''))
    for message in messages:
        if re.search(r'usage limit|quota|rate.?limit|too many requests|insufficient.credits|unauthori[sz]ed|authentication|token.{0,20}expired|401|429', message, re.I):
            return message
    return None


def run_batches(manifest, limit, prompt, command, env):
    for group in manifest['batches']:
        ids = group['taxonIds']
        if manifest['taxonIds'].index(ids[0]) >= limit:
            break
        prefix = BASE/group['id']
        path = lambda suffix: Path(f'{prefix}-{suffix}')
        if path('result.json').exists():
            save_batch_results(read(path('result.json')))
            continue
        assert not any((BASE/f'{tid}-result.json').exists() for tid in ids), 'Mixed individual and batch results'
        packets = [read(BASE/f'{tid}-source.json')['input'] for tid in ids]
        request = prompt+'\n\nPLANT INFORMATION\n'+json.dumps(packets, ensure_ascii=False, separators=(',', ':'))
        recovered = path('attempt.json').exists()
        if not recovered:
            assert not any(path(s).exists() for s in ('request.txt', 'events.jsonl', 'output.txt')), 'Unmarked batch artifacts; inspect before executing'
            path('request.txt').write_text(request)
            write(path('attempt.json'), {'startedAt': now(), 'taxonIds': ids,
                  'requestSha256': hashlib.sha256(request.encode()).hexdigest(), 'automaticRetries': 0})
            clock = time.monotonic()
            failure = None
            with path('events.jsonl').open('w') as stdout, path('stderr.txt').open('w') as stderr:
                try:
                    proc = subprocess.run(command, input=request, stdout=stdout, stderr=stderr,
                                          text=True, env=env, timeout=manifest['timeoutSeconds'])
                    exit_code = proc.returncode
                except subprocess.TimeoutExpired:
                    exit_code = None
                    failure = f'CLI timeout after {manifest["timeoutSeconds"]} seconds; no automatic retry'
                except OSError as exc:
                    exit_code = None
                    failure = f'CLI launch failure: {exc}'
            write(path('execution.json'), {'exitCode': exit_code, 'failure': failure,
                  'completedAt': now(), 'elapsedSeconds': time.monotonic()-clock})
        attempt = read(path('attempt.json'))
        assert attempt['requestSha256'] == hashlib.sha256(request.encode()).hexdigest(), 'Attempted batch request changed'
        execution = read(path('execution.json')) if path('execution.json').exists() else {
            'exitCode': None, 'failure': 'Interrupted attempt; recovered saved events without retry',
            'completedAt': now(), 'elapsedSeconds': None}
        events = []
        failure = execution['failure']
        for line in path('events.jsonl').read_text().splitlines() if path('events.jsonl').exists() else []:
            try:
                event = json.loads(line)
                assert isinstance(event, dict)
                events.append(event)
            except (ValueError, AssertionError):
                failure = failure or 'Malformed CLI event log'
        turns = [e for e in events if e.get('type') == 'turn.completed']
        refusal = account_refusal(events)
        if refusal:
            failure = 'Provider account refusal: '+refusal
        messages = [e['item'].get('text', '') for e in events if e.get('type') == 'item.completed' and e.get('item', {}).get('type') == 'agent_message']
        tools = [e for e in events if e.get('type') in {'item.started', 'item.completed'} and e.get('item', {}).get('type') not in {'agent_message', 'reasoning', 'error'}]
        if execution['exitCode'] != 0 or len(turns) != 1 or len(messages) != 1 or tools:
            failure = failure or f'CLI execution failure: exit={execution["exitCode"]}, turns={len(turns)}, messages={len(messages)}, tool events={len(tools)}'
        raw = '\n\n'.join(messages)
        path('output.txt').write_text(raw+'\n')
        usage = Counter()
        for turn in turns:
            usage.update(turn.get('usage') or {})
        common = {'model': MODEL, 'reasoning': 'high', 'startedAt': attempt['startedAt'],
                  'completedAt': execution['completedAt'], 'elapsedSeconds': execution['elapsedSeconds'],
                  'turns': len(turns), 'toolCalls': len(tools)}
        results = []
        for packet, (output, error) in zip(packets, decode_batch(raw, packets)):
            error = failure or error
            results.append({**common, 'taxonId': packet['taxonId'], 'name': packet['scientificName'],
                'batchId': group['id'], 'usage': None, 'usageRef': path('result.json').name,
                'rawOutputFile': path('output.txt').name, 'validated': error is None,
                'validationError': error, 'output': output})
        batch = {**common, 'id': group['id'], 'taxonIds': ids, 'usage': dict(usage) if turns else None,
                 'requestTextTokens': len(ENC.encode(request)), 'savedOutputTokens': len(ENC.encode(raw)),
                 'recovered': recovered, 'failure': failure, 'results': results}
        write(path('result.json'), batch)
        save_batch_results(batch)
        data = report(manifest)
        print(f'{data["count"]}/{limit} plants; {data["generationCallCount"]} calls; '
              f'{data["validatedCount"]} passed, {data["failedCount"]} failed', flush=True)
        if refusal:
            write(BASE/'pause.json', {'at': now(), 'batchId': group['id'],
                  'reason': refusal, 'automaticResume': False})
            raise SystemExit('Stopped after provider account refusal: '+refusal)
        if tools or len(turns) > 1:
            raise SystemExit('Stopped: unexpected tools or multiple turns')
        if execution['exitCode'] != 0 and not events and not recovered:
            raise SystemExit('Stopped: CLI failed before emitting events; inspect stderr before continuing')


def main():
    global BASE
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, help='Plant limit; must end at a frozen batch boundary')
    parser.add_argument('--output', type=Path, default=BASE)
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--report-only', action='store_true')
    args = parser.parse_args()
    BASE = args.output.resolve()
    assert (BASE/'manifest.json').exists(), 'Prepare a frozen manifest first with prepare_plant_cli_run.py'
    lock = (BASE/'.runner.lock').open('a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    manifest = read(BASE/'manifest.json')
    args.limit = manifest['count'] if args.limit is None else args.limit
    assert args.limit > 0, 'Positive limit required'
    prompt = (BASE/'prompt.txt').read_text().rstrip('\n')
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
    batched = manifest.get('batchSize', 1) > 1
    if batched:
        assert manifest['batchSize'] == 10
        groups = manifest['batches']
        assert [tid for group in groups for tid in group['taxonIds']] == manifest['taxonIds']
        assert len({g['id'] for g in groups}) == len(groups)
        assert all(re.fullmatch(r'batch-\d+', g['id']) for g in groups)
        assert all(len(g['taxonIds']) == 10 for g in groups[:-1]) and 1 <= len(groups[-1]['taxonIds']) <= 10
        assert args.limit in {sum(len(g['taxonIds']) for g in groups[:i+1]) for i in range(len(groups))}, 'Limit must end at a frozen batch boundary'
        assert manifest['timeoutSeconds'] > 0
    assert manifest['promptSha256'] == prompt_hash, 'Frozen prompt changed'
    assert manifest['count'] == len(set(manifest['taxonIds'])) == len(manifest['taxonIds'])
    assert manifest['model'] == MODEL and manifest['reasoning'] == 'high'
    for entry in manifest.get('taxa', []):
        packet = read(BASE/f"{entry['taxonId']}-source.json")['input']
        assert hashlib.sha256(json.dumps(packet, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest() == entry['packetSha256'], 'Frozen packet changed'
    assert args.limit <= manifest['count'], 'Limit exceeds prepared batch'
    if args.prepare_only:
        print(json.dumps(manifest)); return
    if args.report_only:
        data = report(manifest)
        print(json.dumps({k: v for k, v in data.items() if k != 'results'})); return
    if (BASE/'continuation-location.json').exists():
        raise SystemExit('Remaining packets were transferred to '+read(BASE/'continuation-location.json')['continuationRun']+'; do not execute the original groups again.')
    executable = shutil.which('codex')
    assert executable, 'Codex CLI unavailable'
    auth = subprocess.run([executable, 'login', 'status'], capture_output=True, text=True)
    assert auth.returncode == 0 and 'ChatGPT' in auth.stdout+auth.stderr, 'ChatGPT subscription login required'
    disabled = ['apps', 'plugins', 'multi_agent', 'shell_tool', 'unified_exec', 'browser_use',
                'computer_use', 'image_generation', 'view_image', 'sleep_tool', 'goals', 'skill_search']
    env = os.environ.copy()
    for key in ['OPENAI_API_KEY', 'CODEX_API_KEY']:
        env.pop(key, None)
    with tempfile.TemporaryDirectory(prefix='fieldbook-text-') as workdir:
        command = [executable, 'exec', '--ignore-user-config', '--skip-git-repo-check',
                   '--ephemeral', '--json', '--color', 'never', '-s', 'read-only', '-C', workdir,
                   '-m', MODEL, '-c', 'model_reasoning_effort="high"', '-c', 'web_search="disabled"',
                   '-c', 'model_provider="plant_subscription"',
                   '-c', 'model_providers.plant_subscription={name="OpenAI",wire_api="responses",requires_openai_auth=true,request_max_retries=0,stream_max_retries=0,supports_websockets=false}',
                   '-c', 'project_doc_max_bytes=0', '--enable', 'skip_host_skill_discovery']
        for feature in disabled:
            command += ['--disable', feature]
        command += ['-']
        execution_path = BASE/'execution.json' if not (BASE/'execution.json').exists() else BASE/f'execution-resume-{time.time_ns()}.json'
        write(execution_path, {'cli': executable, 'command': [workdir if x == workdir else x for x in command],
              'auth': 'Existing ChatGPT login; API-key environment variables removed', 'toolPolicy': 'Unused tools disabled; unexpected tool events or multiple turns fail the run', 'startedAt': now()})
        if batched:
            run_batches(manifest, args.limit, prompt, command, env)
        for index, tid in enumerate([] if batched else manifest['taxonIds'][:args.limit], 1):
            destination = BASE/f'{tid}-result.json'
            if destination.exists():
                assert 'usage' in read(destination); continue
            if any((BASE/f'{tid}-{suffix}').exists() for suffix in ('attempt.json', 'failure.json', 'events.jsonl', 'output.txt')):
                print(f'{index}/{args.limit}: previously attempted {tid}; no new call', flush=True)
                continue
            packet = read(BASE/f'{tid}-source.json')['input']
            request = prompt+'\n\nPLANT INFORMATION\n'+json.dumps(packet, ensure_ascii=False, separators=(',', ':'))
            (BASE/f'{tid}-request.txt').write_text(request)
            started = now(); clock = time.monotonic()
            write(BASE/f'{tid}-attempt.json', {'startedAt': started, 'requestSha256': hashlib.sha256(request.encode()).hexdigest(), 'automaticRetries': 0})
            failure = None
            with (BASE/f'{tid}-events.jsonl').open('w') as events_file, (BASE/f'{tid}-stderr.txt').open('w') as stderr_file:
                try:
                    proc = subprocess.run(command, input=request, stdout=events_file, stderr=stderr_file, text=True, env=env, timeout=100)
                    exit_code = proc.returncode
                except subprocess.TimeoutExpired:
                    exit_code = None
                    failure = 'CLI timeout after 100 seconds; no automatic retry'
            elapsed = time.monotonic()-clock
            events = []
            for line in (BASE/f'{tid}-events.jsonl').read_text().splitlines():
                try:
                    events.append(json.loads(line))
                except ValueError:
                    failure = failure or 'Malformed CLI event log'
            turns = [e for e in events if e.get('type') == 'turn.completed']
            items = [e['item'] for e in events if e.get('type') == 'item.completed']
            tools = [e for e in events if e.get('type') in {'item.started', 'item.completed'} and e.get('item', {}).get('type') not in {'agent_message', 'reasoning', 'error'}]
            messages = [i.get('text', '') for i in items if i.get('type') == 'agent_message']
            if exit_code != 0 or len(turns) != 1 or len(messages) != 1 or tools:
                failure = failure or f'CLI execution failure: exit={exit_code}, turns={len(turns)}, messages={len(messages)}, tool events={len(tools)}'
                write(BASE/f'{tid}-failure.json', {'startedAt': started, 'reason': failure, 'exitCode': exit_code, 'completedTurns': len(turns), 'messageCount': len(messages), 'toolEventCount': len(tools), 'elapsedSeconds': elapsed})
            raw = '\n\n'.join(messages)
            (BASE/f'{tid}-output.txt').write_text(raw+'\n')
            output = None
            validation_error = failure
            try:
                output = json.loads(raw)
                validate(output, packet)
            except (ValueError, AssertionError, TypeError, KeyError) as error:
                validation_error = validation_error or str(error)
            usage = dict(sum((Counter(t.get('usage') or {}) for t in turns), Counter())) if turns else None
            write(destination, {'taxonId': tid, 'name': packet['scientificName'], 'model': MODEL, 'reasoning': 'high',
                  'startedAt': started, 'completedAt': now(), 'elapsedSeconds': elapsed, 'turns': len(turns), 'toolCalls': len(tools),
                  'usage': usage, 'requestTextTokens': len(ENC.encode(request)),
                  'savedOutputTokens': len(ENC.encode(raw)), 'words': len(output['summary'].split()) if isinstance(output, dict) and isinstance(output.get('summary'), str) else None,
                  'validated': validation_error is None, 'validationError': validation_error, 'output': output})
            if index == 1 or index % 5 == 0 or index == args.limit or validation_error:
                data = report(manifest)
                print(f'{index}/{args.limit}: {data["validatedCount"]} passed, {data["failedCount"]} failed; {data["elapsedWallSeconds"]/60:.1f} min elapsed', flush=True)
            if exit_code != 0 and not events:
                raise SystemExit('Stopped: CLI failed before emitting events; inspect stderr before continuing')
            if tools:
                raise SystemExit('Stopped: unexpected tool events')
    data = report(manifest)
    print(json.dumps({k: v for k, v in data.items() if k != 'results'}), flush=True)


if __name__ == '__main__':
    main()
