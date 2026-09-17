#!/usr/bin/env python3
"""Retrieve exact eFloras accounts through its working public HTTP search form.

No credentials, TLS verification changes, generation or model-based preparation.
"""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import re
import threading
import time
from urllib.parse import urljoin, parse_qs, urlparse
from bs4 import BeautifulSoup
from recover_plant_sources import ROOT, CORPUS, read, write, get, norm, sha, compact, now

RATE_LOCK = threading.Lock()
LAST_REQUEST = 0


def fetch(url, params=None):
    global LAST_REQUEST
    with RATE_LOCK:
        time.sleep(max(0, LAST_REQUEST + 0.35 - time.monotonic()))
        LAST_REQUEST = time.monotonic()
    return get(url, params)


def account(row, url):
    response=fetch(url)
    if response['status']!=200 or not response.get('text'):return None
    soup=BeautifulSoup(response['text'],'html.parser');body=soup.select_one('#lblTaxonDesc')
    if body is None:return None
    title=soup.title.get_text(' ',strip=True) if soup.title else ''
    if norm(title.split(' in ',1)[0])!=norm(row['name']):return None
    if row['rank'] not in {'species','genus','hybrid','genushybrid'}:return None
    # The taxon treatment is separated from navigation, member lists and related links.
    text=body.get_text(' ',strip=True)
    if len(text.split())<40:return None
    original={'provider':'eFloras','url':url,'fetchedAt':response['fetchedAt'],'scientificName':row['name'],
              'rank':row['rank'],'html':response['text'],'httpContentSha256':response['sha256'],
              'selectedText':text,'selection':'Exact scientific subject in returned flora account title; #lblTaxonDesc treatment only'}
    path=CORPUS/'efloras-originals'/f"{row['taxonId']}-{sha(compact(original))[:16]}.json"
    if not path.exists():write(path,original)
    flora=title.split(' in ',1)[-1].replace(' @ efloras.org','')
    return {'title':title,'language':'en','scope':'Requested taxon account in '+flora+'; retain regional distribution qualifications',
            'clean':text,'identityDecision':'Exact scientific subject in the flora account treatment; supplied rank retained; member accounts excluded',
            'path':str(path.relative_to(ROOT)),'sha256':sha(compact(original)),'url':url,
            'credit':{'title':title,'url':url,'attribution':flora+', eFloras'}}


def collect(row):
    path=CORPUS/'efloras'/f"{row['taxonId']}.json"
    if path.exists():return read(path)['state']
    if row['rank'] not in {'species','genus','hybrid','genushybrid'}:
        write(path,{'taxonId':row['taxonId'],'sources':[],'state':'rank_requires_other_sources','at':now()});return 'rank_requires_other_sources'
    search=fetch('http://www.efloras.org/browse.aspx',{'flora_id':1,'name_str':row['name'],'btnSearch':'Search','chkAllFloras':'on'})
    docs=[];urls=[]
    if search['status']==200 and search.get('text'):
        soup=BeautifulSoup(search['text'],'html.parser')
        for link in soup.find_all('a',href=True):
            if 'florataxon.aspx' not in link['href'] or norm(link.get_text(' ',strip=True))!=norm(row['name']):continue
            url=urljoin('http://www.efloras.org/',link['href'])
            # Chinese Plant Names is nomenclature, not a descriptive flora.
            if parse_qs(urlparse(url).query).get('flora_id')==['3'] or url in urls:continue
            urls.append(url)
        for url in urls[:5]:
            doc=account(row,url)
            if doc:docs.append(doc)
    state='descriptive_account_found' if docs else 'no_exact_descriptive_account'
    write(path,{'taxonId':row['taxonId'],'sources':docs,'state':state,'searchUrl':search['url'],'accountUrls':urls,'at':now()})
    return state


def main():
    rows=[r for r in read(ROOT/'data/analysis/plant-card-release-v2/coverage/recovery-queue.json') if not r['summaryWords']]
    active_manifest=ROOT/'data/analysis/plant-cli-recovery-specialist-v1/manifest.json'
    excluded=set(read(active_manifest)['taxonIds']) if active_manifest.exists() else set()
    rows=[r for r in rows if r['taxonId'] not in excluded]
    counts=Counter()
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(collect,row):row for row in rows}
        for i,future in enumerate(as_completed(futures),1):
            try:counts[future.result()]+=1
            except Exception as error:
                counts['retrieval_error']+=1
                write(CORPUS/'efloras-errors'/f"{futures[future]['taxonId']}.json",{'error':repr(error),'at':now()})
            if i%25==0 or i==len(rows):
                report={'completed':i,'total':len(rows),'counts':dict(counts),'updatedAt':now()}
                write(CORPUS/'efloras-progress.json',report);print(compact(report),flush=True)


if __name__=='__main__':main()
