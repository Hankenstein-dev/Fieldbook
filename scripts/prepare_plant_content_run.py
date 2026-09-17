#!/usr/bin/env python3
"""Prepare a reproducible fresh source sample for the reduced-format subscription run."""
import csv
from datetime import datetime, timezone
import hashlib
import json
import random

import tiktoken

from audit_plant_content import ROOT, SOURCE, read, write, clean_wikitext, select_sources, packet, stats


def compact(value):
    return json.dumps(value,ensure_ascii=False,separators=(',',':'))


def build_packet(row, prompt, count):
    tid=int(row['taxonId']);record=read(SOURCE/'taxa'/f'{tid}.json')
    refs=[r for r in record['sources'] if r['status']=='available']+record['botanicalSources']
    bypath={r['path']:r for r in refs}
    stubs=select_sources(record,{r['path']:{'path':r['path']} for r in refs})
    docs=[];provenance=[]
    for stub in stubs:
        ref=bypath[stub['path']];original=read(SOURCE/ref['path'])
        if 'wikitext' in original:
            text=clean_wikitext(original['wikitext'])
            doc={'title':original['title'],'language':original['language'],'scope':ref['scope'],'clean':text}
            meta={'path':ref['path'],'sha256':original['contentSha256'],'url':original['revisionUrl'],'revisionId':original['revisionId']}
        else:
            text='\n\n'.join(d['description'] for d in original.get('descriptions',[]) if d.get('description'))
            doc={'title':ref['datasetTitle']+' — '+original['canonicalName'],'language':original.get('language') or 'unspecified','scope':ref['scope'],'clean':text}
            meta={'path':ref['path'],'sha256':ref['recordSha256'],'url':ref['sourceUrl']}
        docs.append(doc);provenance.append(meta)
    content=packet(record,docs)
    encoded=compact(content)
    entry={'taxonId':tid,'name':record['scientificName'],'language':row['language'],
           'sourceTextTokens':sum(count(d['clean']) for d in docs),'packetTokens':count(encoded),
           'standaloneInputTextTokens':count(encoded)+count(prompt),'packetSha256':hashlib.sha256(encoded.encode()).hexdigest()}
    return {'input':content,'sourceProvenance':provenance,'measurement':entry}


def main():
    cfg=read(ROOT/'config/plant-content-run-v2.json')
    out=ROOT/cfg['output']
    if (out/'manifest.json').exists():
        raise SystemExit('Prepared run already exists; use a new version/output to preserve frozen evidence.')
    started=datetime.now(timezone.utc).isoformat()
    enc=tiktoken.get_encoding(cfg['encoding'])
    count=lambda text:len(enc.encode(text,disallowed_special=()))
    prompt=(ROOT/cfg['prompt']).read_text()
    excluded={r['taxonId'] for r in read(ROOT/cfg['excludeSample'])['taxa']}
    rows=list(csv.DictReader((ROOT/cfg['census']).open()))
    eligible=sorted([r for r in rows if r['rank']==cfg['eligibleRank'] and r['status']==cfg['eligibleStatus'] and int(r['taxonId']) not in excluded],key=lambda r:int(r['taxonId']))
    selected=random.Random(cfg['seed']).sample(eligible,cfg['count'])
    entries=[]
    for row in selected:
        prepared=build_packet(row,prompt,count)
        entry=prepared['measurement']
        write(out/'packets'/f"{entry['taxonId']}.json",prepared)
        entries.append(entry)
    # Balance source sizes across equal-sized batches; sample membership stays uniformly random.
    batches=[{'id':f'batch-{i+1:02d}','taxa':[],'packetTokens':0} for i in range((len(entries)+cfg['batchSize']-1)//cfg['batchSize'])]
    for entry in sorted(entries,key=lambda r:(-r['packetTokens'],r['taxonId'])):
        batch=min([b for b in batches if len(b['taxa'])<cfg['batchSize']],key=lambda b:(b['packetTokens'],b['id']))
        batch['taxa'].append(entry['taxonId']);batch['packetTokens']+=entry['packetTokens']
    for batch in batches:
        inputs=[read(out/'packets'/f'{tid}.json')['input'] for tid in batch['taxa']]
        write(out/'batches'/f"{batch['id']}.json",inputs)
        # Actual file text count for the visible agent tool read, distinct from API request count.
        batch['prettyFileTokens']=count((out/'batches'/f"{batch['id']}.json").read_text())
    write(out/'manifest.json',{'config':cfg,'preparedStartedAt':started,'preparedCompletedAt':datetime.now(timezone.utc).isoformat(),
        'eligiblePopulation':len(eligible),'excludedPriorSampleIds':sorted(excluded),'promptSha256':hashlib.sha256(prompt.encode()).hexdigest(),
        'promptTokens':count(prompt),'selection':'Simple random sample without replacement from name-matched species, excluding the prior 25-entry sample; balanced batch assignment by packet length.',
        'taxa':entries,'batches':batches,'inputStats':{key:stats([e[key] for e in entries]) for key in ['sourceTextTokens','packetTokens','standaloneInputTextTokens']}})
    (out/'results').mkdir(exist_ok=True)
    print(json.dumps({'eligiblePopulation':len(eligible),'count':len(entries),'promptTokens':count(prompt),'inputStats':read(out/'manifest.json')['inputStats'],'batches':[{k:b[k] for k in ['id','packetTokens','prettyFileTokens']} for b in batches]},indent=2))


if __name__=='__main__':main()
