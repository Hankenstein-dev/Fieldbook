#!/usr/bin/env python3
"""Plan public web reads from saved search responses without mixing result blocks."""
import argparse
import re
from urllib.parse import urlparse
from recover_plant_sources import ROOT,CORPUS,read,write,norm,sha,compact,now

OLD={'kew':'web-search','ranked':'rank-web-search','nonvascular':'botanical-web-search','vascular':'vascular-web-search'}
BLOCKED=('pinterest.','facebook.','reddit.','ebay.','amazon.','instagram.','tiktok.','scribd.','researchgate.net','etsy.','ebay.','aliexpress.')
MARKERS={'complex':r'complex|aggregate|species group|agg\.', 'section':r'section|sect\.',
         'subsection':r'subsection|subsect\.', 'subgenus':r'subgenus|subg\.',
         'tribe':r'tribe|tribus','subtribe':r'subtribe|subtribus','family':r'family|familia','subfamily':r'subfamily|subfamilia'}

def plan(kind,offset):
    base=CORPUS/'discovery'/kind;queue=read(base/'queue.json');rows=queue[offset:offset+4]
    query=base/f'query-{offset}.json';old=CORPUS/OLD[kind]
    if not query.exists() and (old/f'search-{offset}.txt').exists():
        write(query,{'rows':rows,'response':(old/f'search-{offset}.txt').read_text(),'retainedFrom':str((old/f'search-{offset}.txt').relative_to(ROOT)),'retainedAt':now()})
    if not query.exists():return {'needsSearch':True,'rows':rows,'queryPath':str(query),'total':len(queue)}
    raw=read(query)['response'];candidates=[]
    # Separators sometimes directly follow the last sentence, without a newline.
    for block in re.split(r'-{20,}',raw):
        block=block.strip()
        if not block:continue
        match=re.match(r'^(.*) \((https?://[^\n]+)\)$',block.split('\n')[0])
        if match:candidates.append({'title':match[1],'url':match[2],'searchText':block})
    old_entries=read(old/f'index-{offset}.json')['entries'] if (old/f'index-{offset}.json').exists() else []
    entries=[]
    for row in rows:
        tid,name,rank=row[:3];matched=[]
        for candidate in candidates:
            title,url,text=candidate['title'],candidate['url'],candidate['searchText']
            if any(d in urlparse(url).hostname for d in BLOCKED):continue
            if kind=='kew':
                if urlparse(url).hostname!='powo.science.kew.org' or '/taxon/' not in url or re.search(r'/(images|general-information)$',url):continue
                n,t=norm(name),norm(title)
                if not t.startswith(n+' '):continue
                if re.match(r'(subsp\.|var\.|subvar\.|f\.)',t[len(n):].strip()):continue
                if rank in {'genus','genushybrid'}:
                    case_title=title.replace('×','').strip();case_name=name.replace('×','').strip()
                    if re.match(r'[a-z]{3,} ',case_title[len(case_name):].strip()):continue
            else:
                if norm(name) not in norm(text):continue
                if kind=='ranked':
                    genus=row[3] if len(row)>3 else ''
                    if genus and norm(genus) not in norm(text):continue
                    if not re.search(MARKERS.get(rank,rank),text,re.I):continue
            if url not in {m['url'] for m in matched}:matched.append(candidate)
        for candidate in matched[:1 if kind=='kew' else 3]:
            filename=sha(candidate['url'])+'.txt';path=base/'pages'/filename
            reused=next((e for e in old_entries if e['url']==candidate['url'] and (old/e['pageFile']).exists()),None)
            if not path.exists() and reused:
                path.parent.mkdir(parents=True,exist_ok=True);path.write_text((old/reused['pageFile']).read_text())
                write(path.with_suffix('.json'),{'url':candidate['url'],'fetchedAt':reused['fetchedAt'],'retainedFrom':str((old/reused['pageFile']).relative_to(ROOT))})
            entries.append({'taxonId':tid,'name':name,'rank':rank,'context':row[3] if len(row)>3 else '',
                'title':candidate['title'],'url':candidate['url'],'pagePath':str(path),'pageFile':str(path.relative_to(ROOT)),
                'needsFetch':not path.exists()})
    write(base/f'index-{offset}.json',{'rows':rows,'entries':entries,'plannedAt':now(),'queryPath':str(query.relative_to(ROOT))})
    return {'needsSearch':False,'rows':rows,'entries':entries,'total':len(queue)}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('kind',choices=OLD);parser.add_argument('offset',type=int);args=parser.parse_args()
    print(compact(plan(args.kind,args.offset)))
