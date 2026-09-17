#!/usr/bin/env python3
"""Resumable source discovery and frozen recovery packets; never invokes an LLM."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import re
import threading
import time
from urllib.parse import quote

import mwparserfromhell as mw
import requests
import tiktoken

from audit_plant_content import ROOT, SOURCE, read, write, clean_wikitext, packet
from collect_plant_sources import article_record

BASE = ROOT/'data/analysis/plant-coverage-recovery-v1'
CORPUS = ROOT/'data/raw/pt/plants/recovery-v1'
UA = 'Fieldbook/1.0 (+https://fieldbook.demos.boombop.io; botanical source research)'
LOCK = threading.Lock()

def now(): return datetime.now(timezone.utc).isoformat()
def compact(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':'))
def sha(v): return hashlib.sha256(v.encode()).hexdigest()
def norm(s): return re.sub(r'\s+', ' ', s.replace('_',' ').replace('×','').replace("'",'')).strip().casefold()

def get(url, params=None):
    url = requests.Request('GET', url, params=params).prepare().url
    path = CORPUS/'http'/f'{sha(url)}.json'
    with LOCK:
        if path.exists(): return read(path)
    try:
        response = requests.get(url, headers={'User-Agent':UA}, timeout=45)
        try: data = response.json()
        except ValueError: data = None
        result = {'url':url, 'fetchedAt':now(), 'status':response.status_code,
                  'sha256':hashlib.sha256(response.content).hexdigest(), 'data':data,
                  'text':response.text if data is None else None}
    except requests.RequestException as exc:
        result = {'url':url, 'fetchedAt':now(), 'status':None, 'error':str(exc), 'data':None}
    with LOCK: write(path,result)
    time.sleep(.12)
    return result

def wiki(language,title):
    response=get(f'https://{language}.wikipedia.org/w/api.php', {'action':'query','format':'json','formatversion':2,
        'prop':'revisions|info|pageprops','rvprop':'ids|timestamp|content','rvslots':'main','inprop':'url',
        'redirects':1,'titles':title,'meta':'siteinfo','siprop':'rightsinfo'})
    query=(response.get('data') or {}).get('query',{})
    page=next(iter(query.get('pages',[])),None)
    if page is None: return None
    article=article_record(language,title,page,query.get('rightsinfo'),[{'url':response['url'],'fetchedAt':response['fetchedAt']}])
    path=CORPUS/'articles'/language/f'{sha(title)}.json'
    write(path,article)
    return path,article

def identity(row, article):
    """Accept own scientific identity in taxobox/lead, not incidental species lists."""
    if article.get('status')!='available': return None
    rank=row['rank']; name=norm(row['name']); title=norm(article['title'])
    raw=article.get('wikitext',''); lead=raw.split('\n==',1)[0]
    if rank in {'complex','section','subsection','subgenus'}:
        rank_words={'complex':r'complex|aggregate|agg\.', 'section':r'section|sect\.',
                    'subsection':r'subsection|subsect\.', 'subgenus':r'subgenus|subgénero|untergattung'}
        if not re.search(rank_words[rank], article['title']+' '+lead[:4000], re.I): return None
        if rank in {'section','subsection','subgenus'}:
            taxonomy=CORPUS/'taxonomy'/f"{row['taxonId']}.json"
            ancestors=read(taxonomy)['taxon'].get('ancestors',[]) if taxonomy.exists() else []
            genus=next((norm(a['name']) for a in ancestors if a['rank']=='genus'),None)
            abbreviation={'section':r'(?:section|sect\.)','subsection':r'(?:subsection|subsect\.)','subgenus':r'(?:subgenus|subg\.|subgen\.)'}[rank]
            if genus and (re.fullmatch(re.escape(genus)+r'\s+'+abbreviation+r'\s+'+re.escape(name),title) or genus==name and title==name+' ('+rank+')'):
                return 'Scientific account title identifies the requested rank and name within its verified parent genus'
    if title==name:
        return 'Scientific article title matches; supplied rank retained'
    taxon_values=[]
    for template in mw.parse(lead).filter_templates():
        values={norm(str(p.name)):mw.parse(str(p.value)).strip_code().strip() for p in template.params}
        for key in ('taxon','binomial','trinomial','wissenschaftlicher name','scientific name','taxon wissname'):
            if key in values: taxon_values.append(norm(values[key]))
        if values.get('genus') and values.get('species'):
            taxon_values.append(norm(values['genus']+' '+values['species']))
        if rank in {'genus','family','order','class','phylum','tribe','subfamily','subtribe'} and rank in values:
            # Require the requested rank to be the lowest populated standard rank.
            levels=['phylum','class','order','family','subfamily','tribe','subtribe','genus','species']
            if not any(values.get(k) for k in levels[levels.index(rank)+1:]): taxon_values.append(norm(values[rank]))
    if name in taxon_values: return 'Exact scientific identity in taxobox; common/translated article title'
    # Bold lead names identify the article subject; a mention elsewhere does not.
    bold=[norm(x) for x in re.findall(r"'''([^\n]+?)'''",lead[:6000])]
    if name in bold and rank in {'species','hybrid','genus','genushybrid'}:
        return 'Exact scientific subject in bold introductory name; supplied rank retained'
    # Only same-epithet genus transfers are accepted automatically from synonym
    # lists. Broader lumping and conflicting/misapplied names remain for review.
    if rank=='species' and len(name.split())==2 and not re.search(r'misapplied|incorrectly|auct\.|non\s+[A-Z]',raw):
        for template in mw.parse(lead).filter_templates():
            values={norm(str(p.name)):mw.parse(str(p.value)).strip_code().strip() for p in template.params}
            synonyms=norm(values.get('synonyms',''))
            if re.search(r'(?<!\w)'+re.escape(name)+r'(?!\w)',synonyms):
                if any(len(n.split())==2 and n.split()[-1]==name.split()[-1] for n in taxon_values):
                    return 'Requested name explicitly listed as synonym; same-epithet genus transfer, not broader species lumping'
                if re.search(r'\b(?:var\.|subsp\.|ssp\.)\s+'+re.escape(name.split()[-1])+r'$',title) and title in taxon_values:
                    return 'Requested species explicitly listed as synonym of the same-epithet infraspecific taxon; source is that taxon’s own account, not the broader species account'
    return None

def source_doc(row,path,article):
    decision=identity(row,article)
    if not decision: return None
    clean=mw.parse(clean_wikitext(article['wikitext'])).strip_code().strip()
    if len(clean.split())<8: return None
    return {'title':article['title'],'language':article['language'],'scope':'verified_requested_taxon', 'clean':clean,
        'identityDecision':decision, 'path':str(path.relative_to(ROOT)), 'sha256':article['contentSha256'],
        'url':article.get('revisionUrl') or article['url'],'revisionId':article.get('revisionId'),
        'credit':{'title':article['title'],'url':article['url'],'revisionUrl':article.get('revisionUrl'),
                  'attribution':article['attribution'],'license':(article.get('rights') or {}).get('text',''),
                  'licenseUrl':(article.get('rights') or {}).get('url','')}}

def checked_docs(row, docs):
    """GBIF can attach a genus Wikipedia extract to a species record. Check text too."""
    accepted=[]
    for doc in docs:
        if '/gbif/' not in doc['path']:
            accepted.append(doc); continue
        original=read(ROOT/doc['path']); record=original['record']
        dataset=get(f"https://api.gbif.org/v1/dataset/{record['datasetKey']}")
        metadata=dataset.get('data') or {}
        title=metadata.get('title','')
        if 'wikipedia' in title.casefold() and norm(row['name']) not in norm(doc['clean'][:600]):
            continue
        doc['credit']['attribution']=metadata.get('citation',{}).get('text') or title or 'GBIF source dataset'
        doc['credit']['licenseUrl']=metadata.get('license') or ''
        doc['datasetProvenance']={'url':dataset['url'],'fetchedAt':dataset['fetchedAt'],'title':title}
        accepted.append(doc)
    return accepted

def select_recovery_docs(docs):
    """Prefer complementary accounts over three translations of the same article."""
    buckets={}
    for doc in docs:
        path=doc['path']
        if '/articles/' in path or '/wikipedia/' in path:
            doc={**doc,'clean':mw.parse(doc['clean']).strip_code().strip()}
            # A translated naming stub is not descriptive source material.
            if doc.get('language')=='vi' and len(doc['clean'].split())<100 and re.search(r'Loài này được .*?(?:mô tả|miêu tả)',doc['clean']):
                continue
        if '/regional-originals/' in path:
            from bs4 import BeautifulSoup
            original=read(ROOT/path)
            soup=BeautifulSoup(original['html'],'html.parser')
            biology=[e.get_text(' ',strip=True) for e in soup.select('.fic-detalhe') if e.get_text(' ',strip=True).startswith('Tipo biológico')]
            if biology and biology[0] not in doc['clean']:doc={**doc,'clean':doc['clean']+'\n\n'+biology[0]}
        category=('curated' if '/primary/' in path else 'regional' if '/regional-originals/' in path
                  else 'kew' if '/kew-originals/' in path else 'wiki' if '/articles/' in path or 'wikipedia' in doc.get('datasetProvenance',{}).get('title','').casefold() else 'botanical')
        buckets.setdefault(category,[]).append(doc)
    selected=[]
    for category in ('curated','wiki','botanical','regional','kew'):
        choices=buckets.get(category,[])
        if not choices:continue
        choices.sort(key=lambda d:(len(d['clean'])<500,d['language']!='en',-len(d['clean'])))
        selected.append(choices[0])
    return selected[:3]

def load_recovery_docs(row):
    path=CORPUS/'taxa'/f"{row['taxonId']}.json"
    docs=checked_docs(row,read(path)['sources']) if path.exists() else []
    recovered_local,_=local(row)
    docs.extend(d for d in recovered_local if d['sha256'] not in {x['sha256'] for x in docs})
    for folder in ('regional','curated','kew','ranked','botanical-web','discovered-wiki','efloras'):
        supplemental=CORPUS/folder/f"{row['taxonId']}.json"
        if supplemental.exists(): docs.extend(read(supplemental)['sources'])
    return select_recovery_docs(docs)

def local(row):
    docs=[]; review=[]
    for ref in row['existingSources']:
        path=SOURCE/ref['path']; article=read(path)
        doc=source_doc(row,path,article)
        if doc: docs.append(doc)
        else: review.append({'path':str(path.relative_to(ROOT)), 'title':article['title'],'reason':'Identity/rank or descriptive content not established'})
    return docs,review

def discover(row):
    target=CORPUS/'taxa'/f"{row['taxonId']}.json"
    if target.exists(): return read(target)
    docs,review=local(row); searches=[]
    # Exact-name fresh lookup fixes stale misses; common names require identity verification.
    for language,title in [('en',row['name']),('en',row['commonName'])]:
        if title==row['commonName'] and (docs or title==row['name']): continue
        if docs and row['summaryWords']==0: break
        item=wiki(language,title); searches.append({'provider':'Wikipedia','language':language,'title':title})
        if item:
            doc=source_doc(row,*item)
            if doc and doc['sha256'] not in {d['sha256'] for d in docs}: docs.append(doc)
    # Scientific-name Wikidata match opens language editions missed by the pilot.
    if not docs or row['summaryWords']>0:
        result=get('https://www.wikidata.org/w/api.php',{'action':'wbsearchentities','format':'json','language':'en','search':row['name'],'limit':5})
        searches.append({'provider':'Wikidata','url':result['url'],'status':result['status']})
        ids=[r['id'] for r in (result.get('data') or {}).get('search',[])]
        if ids:
            entities=get('https://www.wikidata.org/w/api.php',{'action':'wbgetentities','format':'json','ids':'|'.join(ids),'props':'claims|sitelinks'})
            for entity in (entities.get('data') or {}).get('entities',{}).values():
                names=[c.get('mainsnak',{}).get('datavalue',{}).get('value') for c in entity.get('claims',{}).get('P225',[])]
                if row['rank']=='complex' or not any(isinstance(n,str) and norm(n)==norm(row['name']) for n in names): continue
                links=entity.get('sitelinks',{})
                languages=['en','pt','es','de','fr','it','nl','ca','pl','ru','zh','ja','sv','uk','vi','ko','id']
                candidates=[(lang,links[lang+'wiki']['title']) for lang in languages if lang+'wiki' in links]
                for language,title in candidates[:5]:
                    item=wiki(language,title)
                    if item:
                        doc=source_doc(row,*item)
                        if doc and doc['sha256'] not in {d['sha256'] for d in docs}: docs.append(doc)
                if docs: break
    # GBIF's full description-bearing index, restricted to exact canonical name and rank.
    if not docs or row['summaryWords']>0:
        response=get('https://api.gbif.org/v1/species/search',{'q':row['name'],'limit':100})
        searches.append({'provider':'GBIF descriptive datasets','url':response['url'],'status':response['status']})
        candidates=[r for r in (response.get('data') or {}).get('results',[]) if norm(r.get('canonicalName',''))==norm(row['name']) and r.get('rank','').casefold()==row['rank']]
        for candidate in candidates[:12]:
            descriptions=candidate.get('descriptions',[])
            if not descriptions: continue
            clean='\n\n'.join(d['description'] for d in descriptions if d.get('description'))
            if len(clean.split())<25: continue
            key=candidate['key']; source_url=f'https://api.gbif.org/v1/species/{key}'
            original={'provider':'GBIF','record':candidate,'descriptions':descriptions,'url':source_url,'fetchedAt':response['fetchedAt']}
            path=CORPUS/'gbif'/f'{key}.json'; write(path,original)
            docs.append({'title':candidate['scientificName'],'language':candidate.get('language','unspecified'),
                'scope':'exact_canonical_name_and_rank','clean':clean,'identityDecision':'Exact GBIF canonical name and rank; no accepted-name substitution',
                'path':str(path.relative_to(ROOT)),'sha256':sha(compact(original)),'url':source_url,
                'credit':{'title':candidate['scientificName'],'url':f'https://www.gbif.org/species/{key}',
                          'attribution':candidate.get('datasetTitle','GBIF source dataset'),'licenseUrl':candidate.get('license','')}})
    result={'taxonId':row['taxonId'],'name':row['name'],'rank':row['rank'],'completedAt':now(),
            'state':'supported_source_ready' if docs else 'broader_search_required','searchExhausted':False,
            'sources':docs,'identityReview':review,'searches':searches}
    write(target,result)
    return result

def prepare(args):
    out=ROOT/args.output
    if (out/'manifest.json').exists(): raise SystemExit('Frozen manifest already exists; resume the runner.')
    prompt=(ROOT/'config/plant-content-prompt-v5.txt').read_text().rstrip('\n')
    enc=tiktoken.get_encoding('o200k_base'); count=lambda s:len(enc.encode(s,disallowed_special=()))
    excluded=set()
    for directory in args.exclude:
        excluded.update(read(ROOT/directory/'manifest.json')['taxonIds'])
    prepared=[]; review=[]
    for row in read(BASE/'recovery-queue.json'):
        if args.only and row['taxonId'] not in args.only: continue
        if row['taxonId'] in excluded or (row['summaryWords'] and not args.include_short): continue
        if args.local:
            docs,pending=local(row)
        else:
            docs=load_recovery_docs(row);pending=[]
        if not docs: continue
        docs=select_recovery_docs(docs)
        if len(docs)==1 and len(docs[0]['clean'].split())<25: continue
        if row['summaryWords']:
            old,_=local(row); oldhash={d['sha256'] for d in old}
            oldwords=set(re.findall(r'\w+', ' '.join(d['clean'] for d in old).casefold()))
            # A differently packaged copy of the old text is not new evidence.
            fresh=[d for d in docs if d['sha256'] not in oldhash and len(set(re.findall(r'\w+',d['clean'].casefold()))-oldwords)>=12]
            if not fresh: continue
        record=read(SOURCE/'taxa'/f"{row['taxonId']}.json")
        content=packet(record,docs)
        content['sourceMatchStatus']='recovery_identity_checked'
        encoded=compact(content)
        entry={'taxonId':row['taxonId'],'name':row['name'],'language':','.join(d['language'] for d in docs),
               'sourceTextTokens':sum(count(d['clean']) for d in docs),'packetTokens':count(encoded),
               'standaloneInputTextTokens':count(encoded)+count(prompt),'packetSha256':sha(encoded)}
        frozen={'input':content,'sourceProvenance':[{k:v for k,v in d.items() if k not in {'clean','scope','language','title'}} for d in docs], 'measurement':entry}
        prepared.append((entry,frozen))
    # Stable ID ordering makes membership and resume boundaries reproducible.
    prepared.sort(key=lambda item:item[0]['taxonId'])
    if args.limit: prepared=prepared[:args.limit]
    out.mkdir(parents=True,exist_ok=True); (out/'prompt.txt').write_text(prompt+'\n')
    for entry,frozen in prepared: write(out/f"{entry['taxonId']}-source.json",frozen)
    ids=[entry['taxonId'] for entry,_ in prepared]
    assert ids,'No eligible recovered packets'
    manifest={'model':'gpt-5.6-sol','reasoning':'high','count':len(ids),'taxonIds':ids,'batchSize':10,'timeoutSeconds':300,
        'promptSha256':sha(prompt),'preparedAt':now(),'purpose':'Recover actual blank cards and explicitly selected source-enriched short cards; all supplied ranks',
        'taxa':[e for e,_ in prepared],'batches':[{'id':f'batch-{i//10+1:04d}','taxonIds':ids[i:i+10]} for i in range(0,len(ids),10)]}
    write(out/'manifest.json',manifest)
    print(compact({'prepared':len(ids),'output':str(out),'packetTokens':sum(e['packetTokens'] for e,_ in prepared)}),flush=True)

def main():
    parser=argparse.ArgumentParser(); sub=parser.add_subparsers(dest='command',required=True)
    collect=sub.add_parser('collect'); collect.add_argument('--workers',type=int,default=3); collect.add_argument('--limit',type=int)
    p=sub.add_parser('prepare'); p.add_argument('--output',required=True);p.add_argument('--local',action='store_true');p.add_argument('--include-short',action='store_true');p.add_argument('--exclude',action='append',default=[]);p.add_argument('--limit',type=int);p.add_argument('--only',type=int,nargs='+')
    args=parser.parse_args()
    if args.command=='prepare': return prepare(args)
    rows=read(BASE/'recovery-queue.json'); rows.sort(key=lambda r:(r['summaryWords']>0,r['taxonId']))
    if args.limit: rows=rows[:args.limit]
    counts=Counter()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(discover,row):row for row in rows}
        for i,future in enumerate(as_completed(futures),1):
            try: counts[future.result()['state']]+=1
            except Exception as exc:
                counts['retrieval_error']+=1
                write(CORPUS/'errors'/f"{futures[future]['taxonId']}.json",{'error':repr(exc),'at':now()})
            if i%25==0 or i==len(rows):
                progress={'completed':i,'total':len(rows),'states':dict(counts),'updatedAt':now()}
                write(CORPUS/'progress.json',progress);print(compact(progress),flush=True)

if __name__=='__main__': main()
