#!/usr/bin/env python3
"""Export only usage metadata for this pilot's ten explicitly named subagents."""
import argparse
from collections import Counter
from datetime import datetime
from pathlib import Path
import json

from audit_plant_content import ROOT, read, write


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sessions-dir', type=Path, default=Path.home()/'.codex/sessions')
    parser.add_argument('--require-complete', action='store_true')
    args = parser.parse_args()
    cfg = read(ROOT/'config/plant-content-run-v2.json')
    base = ROOT/cfg['output']
    manifest = read(base/'manifest.json')
    context = read(base/'run-context.json')
    date = context['workStartedAt'][:10].replace('-', '/')
    expected = {f"/root/sol250_{b['id'].split('-')[-1]}": b['id'] for b in manifest['batches']}
    rows = []
    for path in sorted((args.sessions_dir/date).glob('*.jsonl')):
        with path.open() as file:
            first = json.loads(next(file))
            meta = first.get('payload', {})
            source = meta.get('source', {})
            spawn = source.get('subagent', {}).get('thread_spawn', {}) if isinstance(source, dict) else {}
            agent = spawn.get('agent_path')
            if agent not in expected or meta.get('cwd') != str(ROOT):
                continue
            if meta['timestamp'] < context['workStartedAt']:
                continue
            responses = {}; completed = None; last_total = None; model = effort = None
            for line in file:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue  # An active log can have an unfinished final line.
                payload = event.get('payload', {})
                if event['type'] == 'turn_context':
                    model = payload.get('model'); effort = payload.get('effort')
                elif event['type'] == 'token_usage_record':
                    responses[payload['response_id']] = payload['usage']
                elif event['type'] == 'event_msg':
                    if payload.get('type') == 'task_complete':
                        completed = event['timestamp']
                    elif payload.get('type') == 'token_count' and payload.get('info'):
                        last_total = payload['info']['total_token_usage']
            total = Counter()
            for usage in responses.values():
                total.update(usage)
            if last_total and dict(total) != last_total:
                raise SystemExit(f'Per-response/cumulative usage disagree: {agent}')
            if model != cfg['model'] or effort != cfg['reasoning']:
                raise SystemExit(f'Unexpected model or effort: {agent}')
            rows.append({'batch': expected[agent], 'agent': agent, 'model': model,
                         'reasoningEffort': effort, 'completed': completed is not None,
                         'startedAt': meta['timestamp'], 'completedAt': completed,
                         'responses': len(responses), 'usage': dict(total)})
    if len({r['batch'] for r in rows}) != len(rows):
        raise SystemExit('Duplicate batch sessions; resolve before measuring')
    totals = Counter()
    for row in rows:
        totals.update(row['usage'])
    complete = len(rows) == len(expected) and all(r['completed'] for r in rows)
    totals['uncached_input_tokens'] = totals['input_tokens'] - totals['cached_input_tokens']
    totals['nonreasoning_output_tokens'] = totals['output_tokens'] - totals['reasoning_output_tokens']
    done = [r for r in rows if r['completed']]
    parse = lambda s: datetime.fromisoformat(s.replace('Z', '+00:00'))
    wall = (max(parse(r['completedAt']) for r in done)-min(parse(r['startedAt']) for r in done)).total_seconds() if done else None
    report = {'complete': complete, 'source': 'Local Codex session token_usage_record events, deduplicated by response_id and checked against cumulative token_count.',
              'scope': 'The ten generation subagents only. Excludes parent preparation, orchestration and quality review. Includes agent system/tool context, repeated reads, code generation, validation and final messages.',
              'billingNote': 'Observed token usage, not a dollar bill or subscription quota calculation. Cached input is a subset of input; reasoning output is a subset of output. Do not add subsets again.',
              'batches': rows, 'totals': dict(totals), 'generationSessionWallSeconds': wall,
              'perPlant': {k: v/cfg['count'] for k, v in totals.items()} if complete else None}
    write(base/'agent-usage.json', report)
    print(json.dumps({k:report[k] for k in ['complete', 'totals', 'generationSessionWallSeconds', 'perPlant']}, indent=2))
    if args.require_complete and not complete:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
