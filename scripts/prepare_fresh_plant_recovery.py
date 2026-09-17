#!/usr/bin/env python3
"""Freeze newly sourced blank cards without repeating completed or interrupted calls."""
import argparse
import fcntl
from types import SimpleNamespace
from recover_plant_sources import ROOT, read, write, load_recovery_docs, prepare, now


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--limit',type=int);parser.add_argument('--minimum-count',type=int,default=10)
    args=parser.parse_args();protected=set();attempted=set();refused=set()
    reset=ROOT/'data/analysis/plant-cli-recovery-quota-reset-v1/manifest.json'
    authorized=set(read(reset)['taxonIds']) if reset.exists() else set()
    for base in (ROOT/'data/analysis').glob('plant-cli-recovery-*-v*'):
        if not (base/'manifest.json').exists():continue
        with (base/'.runner.lock').open('a') as lock:
            try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError:protected.update(read(base/'manifest.json')['taxonIds'])
        for path in base.glob('*-result.json'):
            if path.name.startswith('batch-'):continue
            result=read(path);tid=result['taxonId']
            events=base/f"{result.get('batchId','')}-events.jsonl"
            raw=base/result.get('rawOutputFile',f'{tid}-output.txt')
            if tid in authorized and result['turns']==0 and events.exists() and 'usage limit' in events.read_text().lower() and raw.exists() and not raw.read_text().strip():
                refused.add(tid)
            else:attempted.add(tid)
    ready=[];held=[]
    for row in read(ROOT/'data/analysis/plant-card-release-v2/coverage/recovery-queue.json'):
        tid=row['taxonId']
        if row['summaryWords'] or tid in protected or tid in attempted:continue
        docs=load_recovery_docs(row)
        if not docs or len(docs)==1 and len(docs[0]['clean'].split())<25:continue
        if all('hybrid formula' in d['clean'].lower() and len(d['clean'].split())<75 for d in docs):
            held.append(tid);continue
        ready.append(tid)
    if not ready:
        print('No fresh descriptive packets ready; no generation launched.');return
    if len(ready)<args.minimum_count:
        print(f'{len(ready)} fresh packets ready; waiting to fill a group of {args.minimum_count}.');return
    prepare(SimpleNamespace(output=args.output,exclude=[],only=ready,local=False,include_short=False,limit=args.limit))
    selected=read(ROOT/args.output/'manifest.json')['taxonIds']
    write(ROOT/args.output/'preparation-decisions.json',{'at':now(),'selected':selected,
        'previouslyQuotaRefusedButExplicitlyAuthorizedForResumption':sorted(set(selected)&refused),
        'formulaOnlyHeld':held,'policy':'Exclude every completed/interrupted/non-quota failed recovery call and all active-run allocations. Preserve original runs. Quota-only refusals may resume under the existing explicit reset authorization.'})


if __name__=='__main__':main()
