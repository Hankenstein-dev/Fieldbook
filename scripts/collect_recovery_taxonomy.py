#!/usr/bin/env python3
"""Save current provider identity/ancestry to resolve ambiguous names, not as prose."""
import time
from recover_plant_sources import ROOT,BASE,CORPUS,read,write,get,compact

if __name__=='__main__':
    frozen=set(read(ROOT/'data/analysis/plant-cli-recovery-local-v1/manifest.json')['taxonIds'])
    rows=[r for r in read(BASE/'recovery-queue.json') if r['taxonId'] not in frozen]
    missing=[r for r in rows if not (CORPUS/'taxonomy'/f"{r['taxonId']}.json").exists()]
    for start in range(0,len(missing),25):
        ids=[r['taxonId'] for r in missing[start:start+25]]
        response=get('https://api.inaturalist.org/v1/taxa/'+','.join(map(str,ids)))
        saved=[]
        for taxon in (response.get('data') or {}).get('results',[]):
            write(CORPUS/'taxonomy'/f"{taxon['id']}.json",{'taxon':taxon,'url':response['url'],'fetchedAt':response['fetchedAt']});saved.append(taxon['id'])
        if len(saved)!=len(ids):write(CORPUS/'taxonomy-errors'/f'{start}.json',{'requestedIds':ids,'savedIds':saved,'status':response['status'],'url':response['url']})
        if start%100==0 or start+25>=len(missing):print(compact({'processed':min(start+25,len(missing)),'total':len(missing)}),flush=True)
        time.sleep(1)
