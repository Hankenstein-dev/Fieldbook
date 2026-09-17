#!/usr/bin/env python3
"""Keep descriptive-source readiness distinct from generated and published coverage."""
from collections import Counter
from recover_plant_sources import ROOT,BASE,CORPUS,read,write,load_recovery_docs,now,compact

if __name__=='__main__':
    frozen=set()
    for manifest in (ROOT/'data/analysis').glob('plant-cli-recovery-*-v*/manifest.json'):
        frozen.update(read(manifest)['taxonIds'])
    rows=read(BASE/'recovery-queue.json');pending=[];ready=[];errors=[]
    for row in rows:
        if row['summaryWords'] or row['taxonId'] in frozen:continue
        try:docs=load_recovery_docs(row)
        except Exception as exc:
            errors.append({'taxonId':row['taxonId'],'error':repr(exc)});docs=[]
        entry={k:row[k] for k in ['taxonId','name','commonName','rank']}
        if docs:ready.append({**entry,'sourceTitles':[d['title'] for d in docs]})
        else:pending.append(entry)
    report={'updatedAt':now(),'alreadyFrozenTaxa':len(frozen),'additionalBlankCardsReady':len(ready),
            'blankCardsNeedingBroaderSources':len(pending),'pendingByRank':dict(Counter(r['rank'] for r in pending)),
            'ready':ready,'pending':pending,'errors':errors}
    write(BASE/'source-readiness.json',report)
    print(compact({k:v for k,v in report.items() if k not in ['ready','pending','errors']}))
