#!/usr/bin/env python3
"""Publish validated recovery checkpoints; never launch or retry generation.

Durable disk state allows this monitor to survive a coordinating-chat interruption.
"""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import time
from recover_plant_sources import ROOT, read, write, now


def running(base):
    with (base/'.runner.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', required=True)
    args = parser.parse_args()
    base = ROOT/args.run
    statepath = base/'publication-monitor.json'
    state = read(statepath) if statepath.exists() else {'lastPublishedCount':0}
    release = ROOT/'data/analysis/plant-card-release-v2'
    with (release/'.publication-monitor.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        while True:
            active = running(base)
            report = read(base/'report.json') if (base/'report.json').exists() else {'count':0, 'validatedCount':0, 'failedCount':0}
            state.update(updatedAt=now(), runnerActive=active, attemptedCount=report['count'], validatedCount=report['validatedCount'], failedCount=report['failedCount'])
            write(statepath, state)
            if report['count'] >= state['lastPublishedCount']+200 or (not active and report['count'] > state['lastPublishedCount']):
                runs = sorted(p.parent for p in (ROOT/'data/analysis').glob('plant-cli-recovery-*-v*/report.json'))
                command = [str(ROOT/'.venv/bin/python'), 'scripts/merge_plant_recovery_content.py']
                for run in runs: command.extend(['--run', str(run.relative_to(ROOT))])
                commands = [command,
                    ['node', 'scripts/audit_plant_card_coverage.mjs', str(release/'coverage')],
                    [str(ROOT/'.venv/bin/python'), 'scripts/report_plant_recovery.py'],
                    ['npm', 'run', 'build:web'], ['npm', 'run', 'deploy:web'],
                    ['node', 'scripts/check-strawberry-cards.mjs', 'https://fieldbook.demos.boombop.io']]
                env = os.environ.copy()
                libs = '/tmp/fieldbook-browser-libs/usr/lib/x86_64-linux-gnu'
                env['LD_LIBRARY_PATH'] = libs+(':'+env['LD_LIBRARY_PATH'] if env.get('LD_LIBRARY_PATH') else '')
                for command in commands:
                    print(now(), 'Running', ' '.join(command), flush=True)
                    subprocess.run(command, cwd=ROOT, env=env, check=True, timeout=600)
                state.update(lastPublishedCount=report['count'], publishedAt=now(), deployment=read(ROOT/'artifacts/web-deployment.json'))
                write(statepath, state)
                write(release/'publications'/f"{state['publishedAt'].replace(':','-')}.json", {'monitor':state, 'coverage':read(release/'coverage/coverage.json'), 'import':read(release/'card-import.json')})
                print(now(), 'Published', report['count'], 'attempted plants checkpoint', flush=True)
            if not active:
                state.update(stoppedAt=now(), generationComplete=report.get('complete', False), pause=read(base/'pause.json') if (base/'pause.json').exists() else None)
                write(statepath, state)
                print(now(), 'Generator stopped; monitor exiting without retries', flush=True)
                return
            time.sleep(30)


if __name__ == '__main__': main()
