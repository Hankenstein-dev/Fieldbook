#!/usr/bin/env python3
"""Recover published Flora-On habitat accounts, preserving regional and taxon scope."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
from bs4 import BeautifulSoup
from recover_plant_sources import ROOT, BASE, CORPUS, read, write, get, norm, sha, compact, now

def fetch(row):
    destination=CORPUS/'regional'/f"{row['taxonId']}.json"
    if destination.exists(): return read(destination)
    names=[row['name']]; synonym_evidence=None; searches=[]; docs=[]
    for index in range(5):
        if index>=len(names): break
        name=names[index]
        response=get('https://flora-on.pt/',{'q':name}); searches.append({'url':response['url'],'status':response['status']})
        text=response.get('text') or ''
        try: text=text.encode('latin1').decode('utf8')
        except (UnicodeError,ValueError): pass
        soup=BeautifulSoup(text,'html.parser'); identity=soup.select_one('input[name=nomesp]')
        if identity and norm(identity.get('value',''))==norm(name):
            details=[e.get_text(' ',strip=True) for e in soup.select('.fic-detalhe')]
            details=[d for d in details if (len(d.split())>=4 or d.startswith('Tipo biológico')) and not d.startswith(('Distribuição','Floração','Altitude'))]
            if details:
                clean=f"Flora-On botanical account for {identity['value']}. Geographic scope: Portugal; habitat descriptions and native status on this site refer to Portugal, not the global native range.\n\n"+'\n\n'.join(details)
                path=CORPUS/'regional-originals'/f"{row['taxonId']}.json"
                original={'url':response['url'],'fetchedAt':response['fetchedAt'],'html':text,'sha256':sha(text),'matchedName':name,'synonymEvidence':synonym_evidence}
                write(path,original)
                docs=[{'title':f'Flora-On — {name}', 'language':'pt','scope':'requested_taxon_regional_habitat_Portugal',
                    'clean':clean,'identityDecision':'Exact scientific name in account identity field'+('; documented same-epithet genus transfer in GBIF synonym list' if name!=row['name'] else ''),
                    'path':str(path.relative_to(ROOT)),'sha256':sha(compact(original)),'url':response['url'],
                    'credit':{'title':f'Flora-On — {name}','url':response['url'],'attribution':'Flora-On, Sociedade Portuguesa de Botânica','licenseUrl':'https://flora-on.pt/sobre.html'}}]
                break
        if index==0 and row['rank']=='species':
            match=get('https://api.gbif.org/v1/species/match',{'name':row['name'],'strict':'true'}); data=match.get('data') or {}
            searches.append({'url':match['url'],'status':match['status']})
            if data.get('matchType')=='EXACT' and norm(data.get('canonicalName',''))==norm(row['name']) and data.get('rank')=='SPECIES':
                key=data.get('acceptedUsageKey') or data.get('usageKey')
                syn=get(f'https://api.gbif.org/v1/species/{key}/synonyms',{'limit':100})
                candidates=[r.get('canonicalName','') for r in (syn.get('data') or {}).get('results',[]) if r.get('rank')=='SPECIES']
                if data.get('species'): candidates.append(data['species'])
                epithet=norm(row['name']).split()[-1]
                names.extend(n for n in dict.fromkeys(candidates) if norm(n).split()[-1:]==[epithet] and norm(n)!=norm(row['name']))
                synonym_evidence={'match':match,'synonyms':syn}
    result={'taxonId':row['taxonId'],'sources':docs,'searches':searches,'state':'supported_regional_habitat' if docs else 'no_matched_account','searchExhausted':False,'completedAt':now()}
    write(destination,result);return result

if __name__=='__main__':
    frozen=set(read(ROOT/'data/analysis/plant-cli-recovery-local-v1/manifest.json')['taxonIds'])
    rows=[r for r in read(BASE/'recovery-queue.json') if r['taxonId'] not in frozen and r['rank'] in {'species','hybrid'}]
    counts=Counter()
    with ThreadPoolExecutor(max_workers=3) as pool:
        tasks={pool.submit(fetch,row):row for row in rows}
        for i,future in enumerate(as_completed(tasks),1):
            try:counts[future.result()['state']]+=1
            except Exception as exc:
                counts['error']+=1;write(CORPUS/'regional-errors'/f"{tasks[future]['taxonId']}.json",{'error':repr(exc)})
            if i%25==0 or i==len(rows):
                progress={'completed':i,'total':len(rows),'states':dict(counts),'updatedAt':now()}
                write(CORPUS/'regional-progress.json',progress);print(compact(progress),flush=True)
