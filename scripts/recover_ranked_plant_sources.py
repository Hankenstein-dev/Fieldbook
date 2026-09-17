#!/usr/bin/env python3
"""Resolve rank-qualified accounts and passages explicitly about species complexes."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from collections import Counter
import re
from recover_plant_sources import ROOT,BASE,SOURCE,CORPUS,read,write,get,wiki,source_doc,norm,clean_wikitext,now,compact

RANKS={'subgenus':'subg.','section':'sect.','subsection':'subsect.'}

def recover(row,taxonomy):
    destination=CORPUS/'ranked'/f"{row['taxonId']}.json"
    if destination.exists():return read(destination)
    taxon=taxonomy.get(row['taxonId'],{})
    genus=next((a['name'] for a in reversed(taxon.get('ancestors',[])) if a['rank']=='genus'),None)
    names=[]
    if row['rank'] in RANKS and genus:
        names=[f"{genus} {RANKS[row['rank']]} {row['name']}",f"{genus} {row['rank']} {row['name']}"]
    elif row['rank']=='complex':names=[row['name']+' species complex',row['name']+' complex']
    docs=[];searches=[]
    for name in names:
        item=wiki('en',name);searches.append({'title':name,'provider':'Wikipedia'})
        if not item:continue
        doc=source_doc({**row,'name':name},*item)
        if doc:
            doc['identityDecision']='Exact rank-qualified account; parent genus resolved from saved iNaturalist ancestry'
            docs.append(doc);break
    # Read saved sources only at the explicitly named section/complex scope.
    if not docs and row['rank']=='complex':
        candidates=[]
        for ref in row['existingSources']:
            candidates.append((SOURCE/ref['path'],read(SOURCE/ref['path'])))
        item=wiki('en',row['name'])
        if item:candidates.append(item)
        for path,article in candidates:
            if article.get('status')!='available':continue
            text=clean_wikitext(article['wikitext']);paragraphs=re.split(r'\n\s*\n',text)
            selected=[p for p in paragraphs if norm(row['name']) in norm(p) and re.search(r'\b(?:species complex|complex of species|species aggregate|species group)\b',p,re.I)]
            if not selected:continue
            doc=source_doc({**row,'rank':'species','name':article['title']},path,article)
            if not doc:continue
            doc['clean']='\n\n'.join(selected);doc['scope']='only_passages_explicitly_about_requested_species_complex'
            doc['identityDecision']='Requested scientific name and explicit complex/aggregate/group wording occur in selected passages; individual-species morphology excluded'
            docs.append(doc);break
    result={'taxonId':row['taxonId'],'genus':genus,'sources':docs,'searches':searches,'state':'ranked_account_found' if docs else 'primary_search_required','completedAt':now()}
    write(destination,result);return result

if __name__=='__main__':
    rows=[r for r in read(BASE/'recovery-queue.json') if not r['summaryWords'] and r['rank'] in {*RANKS,'complex'}]
    taxonomy={}
    for start in range(0,len(rows),25):
        ids=[r['taxonId'] for r in rows[start:start+25]]
        response=get('https://api.inaturalist.org/v1/taxa/'+','.join(map(str,ids)))
        for taxon in (response.get('data') or {}).get('results',[]):
            taxonomy[taxon['id']]=taxon
            write(CORPUS/'taxonomy'/f"{taxon['id']}.json",{'taxon':taxon,'url':response['url'],'fetchedAt':response['fetchedAt']})
    counts=Counter()
    with ThreadPoolExecutor(max_workers=3) as pool:
        tasks={pool.submit(recover,row,taxonomy):row for row in rows}
        for i,future in enumerate(as_completed(tasks),1):
            try:counts[future.result()['state']]+=1
            except Exception as exc:counts['error']+=1;write(CORPUS/'ranked-errors'/f"{tasks[future]['taxonId']}.json",{'error':repr(exc)})
            if i%10==0 or i==len(rows):print(compact({'completed':i,'total':len(rows),'states':dict(counts)}),flush=True)
