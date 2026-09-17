#!/usr/bin/env python3
"""Durable source-ingestion → frozen generation → checked publication worker.

Broad web discovery remains external. This worker consumes its saved artifacts,
records when it is waiting for them, and never retries a failed generation.
"""
import fcntl
import subprocess
import time
from recover_plant_sources import ROOT, CORPUS, read, write, now

BASE=ROOT/'data/analysis/plant-coverage-recovery-v1'
STATE=BASE/'pipeline-state.json'
PYTHON=str(ROOT/'.venv/bin/python')


def status(stage, **values):
    state={'stage':stage,'updatedAt':now(),**values};write(STATE,state)
    print(state,flush=True)


def command(args):
    subprocess.run(args,cwd=ROOT,check=True,timeout=14400)


def discovery_state():
    complete=True;signature=[];counts={}
    for kind in ('kew','ranked','nonvascular','vascular'):
        base=CORPUS/'discovery'/kind;queue=read(base/'queue.json');done=0
        for path in base.glob('index-*.json'):
            index=read(path)
            pages=[ROOT/e['pageFile'] for e in index['entries']]
            if all(p.exists() and p.with_suffix('.json').exists() for p in pages):done+=len(index['rows'])
            for page in pages:
                if page.exists():signature.append((str(page),page.stat().st_mtime_ns))
        counts[kind]={'completed':done,'total':len(queue)};complete &= done==len(queue)
    return tuple(sorted(set(signature))),complete,counts


def main():
    with (BASE/'.pipeline.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        old=read(STATE) if STATE.exists() else {}
        if old.get('stage') in {'generating','publishing','error'}:
            raise SystemExit('Inspect the previous pipeline run before restarting; no automatic generation retry.')
        last=None;last_notice=0
        while True:
            signature,complete,counts=discovery_state()
            if signature==last:
                if complete:
                    status('needs_source_review',discovery=counts,note='Discovery finished without further usable unattempted packets. Remaining blanks require source review, not an automatic retry.')
                    return
                if time.monotonic()-last_notice>=60:
                    status('waiting_for_discovery',discovery=counts,note='No generation is running; waiting for further saved source reads.');last_notice=time.monotonic()
                time.sleep(15);continue
            last=signature
            status('preparing_sources',discovery=counts)
            for script in ['prepare_kew_recovery_sources.py','prepare_botanical_web_sources.py','collect_discovered_wiki_sources.py']:
                command([PYTHON,'scripts/'+script])
            number=1
            while (ROOT/f'data/analysis/plant-cli-recovery-auto-{number:03d}-v1/manifest.json').exists():number+=1
            run=f'data/analysis/plant-cli-recovery-auto-{number:03d}-v1'
            command([PYTHON,'scripts/prepare_fresh_plant_recovery.py','--output',run,'--minimum-count','1' if complete else '10'])
            if not (ROOT/run/'manifest.json').exists():
                if complete:
                    status('needs_source_review',discovery=counts,note='All planned discovery queues were read. No further unattempted packets meet the current source checks. Remaining blanks are not proven to lack information.')
                    return
                status('waiting_for_discovery',discovery=counts,note='No generation is running; waiting for further saved source reads.')
                continue
            count=read(ROOT/run/'manifest.json')['count']
            status('generating',run=run,count=count)
            command([PYTHON,'scripts/run_plant_content_cli.py','--output',run])
            status('publishing',run=run,count=count)
            command([PYTHON,'scripts/monitor_plant_recovery.py','--run',run])
            coverage=read(ROOT/'data/analysis/plant-card-release-v2/coverage/coverage.json')
            status('published',run=run,withSummary=coverage['withSummary'],withoutSummary=coverage['withoutSummary'])
            # Recheck once after publication, even if no further source reads arrived.
            last=None


if __name__=='__main__':
    try:main()
    except Exception as error:
        previous=read(STATE) if STATE.exists() else {}
        status('error',previousStage=previous.get('stage'),run=previous.get('run'),error=repr(error),automaticRetry=False)
        raise
