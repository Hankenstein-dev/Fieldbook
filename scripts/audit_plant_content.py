#!/usr/bin/env python3
"""Offline token census and reproducible plant-content review packets. No model API."""
import csv
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import random
import re
import statistics

import mwparserfromhell as mw
import tiktoken

ROOT = Path(__file__).resolve().parents[1]
SEED = json.loads((ROOT / 'config/seed.json').read_text())
COLLECTION = json.loads((ROOT / 'config/source-collection.json').read_text())
SOURCE = ROOT / COLLECTION['output'].format(country=SEED['country'], group=SEED['group'])
OUT = ROOT / 'data/analysis/plant-content-v1'
ENCODING = 'o200k_base'

BACKMATTER = {'references','bibliography','further reading','external links','see also','notes','gallery',
              'referências','referencias','bibliografia','ligações externas','ligações externas e referências',
              'ver também','enlaces externos','véase también','literatur','einzelnachweise','weblinks','quellen','anmerkungen'}
DROP_TEMPLATES = {'taxobox','automatic taxobox','speciesbox','subspeciesbox','taxonbar','authority control',
                  'commons category','commonscat','commons','wikispecies','reflist','referências','referencias',
                  'defaultsort','short description','italic title','italictitle','taxobox/core','citation'}


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def clean_wikitext(raw):
    """Readable derivative; retain unknown templates/warnings, never alter original sources."""
    code = mw.parse(raw)
    selected = []
    excluded_level = None
    for section in code.get_sections(include_headings=True, flat=True, include_lead=True):
        headings = section.filter_headings(recursive=False)
        if headings:
            heading = str(headings[0].title).strip().casefold()
            level = headings[0].level
            if excluded_level is not None and level <= excluded_level:
                excluded_level = None
            if heading in BACKMATTER:
                excluded_level = level if excluded_level is None else min(level,excluded_level)
        if excluded_level is None:
            selected.append(str(section))
    code = mw.parse('\n'.join(selected))
    for node in list(code.filter_comments()):
        code.remove(node)
    for node in list(code.filter_tags()):
        if str(node.tag).casefold() in {'ref','references','gallery','imagemap'}:
            try: code.remove(node)
            except ValueError: pass
    for node in list(code.filter_wikilinks()):
        if str(node.title).split(':')[0].strip().casefold() in {'file','image','ficheiro','arquivo','imagem','datei','bild','category','categoria','kategorie'} and ':' in str(node.title):
            try: code.remove(node)
            except ValueError: pass
    protected = {}
    # Outermost templates retain their complete nested source when not explicitly removed.
    for node in list(code.filter_templates(recursive=False)):
        name = str(node.name).strip().replace('_',' ').casefold()
        if name in DROP_TEMPLATES or name.startswith(('cite ','citar ','navbox','infobox','taxobox','portal','sfn','harv')) or name.endswith('-stub'):
            replacement = ''
        else:
            marker = f'FIELDBOOKTEMPLATE{len(protected)}END'
            protected[marker] = str(node)
            replacement = marker
        code.replace(node,replacement)
    text = code.strip_code(normalize=True,collapse=False)
    for marker, original in protected.items():
        text = text.replace(marker,original)
    text = re.sub(r'[ \t]+',' ',text)
    text = re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+','\n\n',text).strip()
    return text


def stats(values):
    values = sorted(values)
    if not values: return {'count':0,'total':0}
    return {'count':len(values),'total':sum(values),'mean':round(statistics.mean(values),1),
            'median':statistics.median(values),'p90':values[math.ceil(.9*len(values))-1],
            'p95':values[math.ceil(.95*len(values))-1], 'max':max(values)}


def select_sources(record, documents):
    """One preferred-language exact-name source, plus botanical descriptions. Review cases separate."""
    refs = [r for r in record['sources'] if r['status']=='available']
    matched = [r for r in refs if r['scope']=='title_matches_scientific_name']
    candidates = matched or refs
    language_order = {language:i for i,language in enumerate(COLLECTION['languages']+COLLECTION['fallbackLanguages'])}
    candidates.sort(key=lambda r:(language_order.get(r['language'],9),r['path']))
    selected = [{**documents[candidates[0]['path']], 'scope':candidates[0]['scope']}] if candidates else []
    selected.extend(documents[r['path']] for r in record['botanicalSources'])
    return selected


def packet(record, selected):
    sources = []
    for i, doc in enumerate(selected,1):
        passages = [{'id':f's{i}:p{n}','text':paragraph} for n,paragraph in enumerate(re.split(r'\n\s*\n',doc['clean']),1) if paragraph.strip()]
        sources.append({'id':f's{i}','title':doc['title'],'language':doc['language'],'scope':doc.get('scope'),
                        'passages':passages})
    return {'taxonId':record['taxonId'],'scientificName':record['scientificName'],
            'commonName':record['catalogueRecord']['commonName'],'rank':record['rank'],
            'sourceMatchStatus':record['sourceMaterialStatus'],'sources':sources}


def main():
    enc = tiktoken.get_encoding(ENCODING)
    count = lambda text: len(enc.encode(text,disallowed_special=()))
    prompt = (ROOT/'config/plant-content-prompt-v1.txt').read_text()
    prompt_tokens = count(prompt)
    manifest = read(SOURCE/'manifest.json')
    records = [read(SOURCE/'taxa'/f'{tid}.json') for tid in manifest['taxonIds']]
    documents, dedup = {}, {}
    for index,record in enumerate(records,1):
        for ref in record['sources']:
            if ref['status']!='available' or ref['path'] in documents: continue
            article = read(SOURCE/ref['path'])
            key = ('wiki',article['language'],article['pageId'],article['revisionId'],article['contentSha256'])
            if key not in dedup:
                clean = clean_wikitext(article['wikitext'])
                dedup[key] = {'title':article['title'],'language':article['language'], 'raw':article['wikitext'],
                              'clean':clean,'rawTokens':count(article['wikitext']),'cleanTokens':count(clean),
                              'path':ref['path'],'sha256':article['contentSha256'],'revisionId':article['revisionId'],
                              'url':article['revisionUrl'],'scope':'Taxon identity and claims require review; article metadata is not botanical verification.'}
            documents[ref['path']] = dedup[key]
        for ref in record['botanicalSources']:
            if ref['path'] in documents: continue
            original = read(SOURCE/ref['path'])
            raw = '\n\n'.join(d['description'] for d in original.get('descriptions',[]) if d.get('description'))
            doc = {'title':ref['datasetTitle']+' — '+original['canonicalName'],'language':original.get('language') or 'unspecified','raw':raw,'clean':raw,
                   'rawTokens':count(raw),'cleanTokens':count(raw),'path':ref['path'],'sha256':ref['recordSha256'],
                   'url':ref['sourceUrl'],'scope':ref['scope']}
            documents[ref['path']] = doc
            dedup[('botanical',ref['path'])] = doc
        if index%1000==0: print(f'Prepared sources for {index}/{len(records)} taxa',flush=True)
    rows, packets, selections = [], {}, {}
    for record in records:
        selected = select_sources(record,documents)
        selections[record['taxonId']] = selected
        content = packet(record,selected)
        packets[record['taxonId']] = content
        all_refs = [r for r in record['sources'] if r['status']=='available']+record['botanicalSources']
        all_docs = {documents[r['path']]['path']:documents[r['path']] for r in all_refs}
        row = {'taxonId':record['taxonId'],'name':record['scientificName'],'rank':record['rank'],
               'status':record['sourceMaterialStatus'],'language':selected[0]['language'] if selected else '',
               'allRawSourceTokens':sum(d['rawTokens'] for d in all_docs.values()),
               'selectedRawSourceTokens':sum(d['rawTokens'] for d in selected),
               'selectedCleanSourceTokens':sum(d['cleanTokens'] for d in selected),
               'evidencePacketTokens':count(json.dumps(content,ensure_ascii=False,separators=(',',':'))),
               'hasSources':bool(selected)}
        row['draftRequestTextTokens'] = prompt_tokens + row['evidencePacketTokens']
        rows.append(row)
    OUT.mkdir(parents=True,exist_ok=True)
    with (OUT/'tokens-by-taxon.csv').open('w',newline='',encoding='utf-8') as file:
        writer=csv.DictWriter(file,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    cohorts = {}
    for label, filtered in {
        'all_catalogue_entries':rows,
        'species_with_text':[r for r in rows if r['rank']=='species' and r['hasSources']],
        'species_name_matched':[r for r in rows if r['rank']=='species' and r['status']=='taxon_matched_text'],
        'all_ranks_with_text':[r for r in rows if r['hasSources']],
    }.items():
        cohorts[label]={field:stats([r[field] for r in filtered]) for field in ['allRawSourceTokens','selectedRawSourceTokens','selectedCleanSourceTokens','evidencePacketTokens','draftRequestTextTokens']}
    summary={'encoding':ENCODING,'versions':{p:importlib.metadata.version(p) for p in ['tiktoken','mwparserfromhell']},
             'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
             'sourceManifestSha256':hashlib.sha256((SOURCE/'manifest.json').read_bytes()).hexdigest(),
             'promptTokens':prompt_tokens,'promptSha256':hashlib.sha256(prompt.encode()).hexdigest(),
             'cohorts':cohorts,'uniqueRetainedSources':{'rawTokens':sum(d['rawTokens'] for d in dedup.values()),'cleanTokens':sum(d['cleanTokens'] for d in dedup.values()),'count':len(dedup)},
             'notes':['Counts are exact for o200k_base strings, not a provider-neutral billing count.',
                      'Draft request counts include prompt and compact evidence JSON; exclude API message framing, any future formal JSON schema, retries, outputs and reasoning.',
                      'Source selection is a cost baseline: one preferred-language name-matched Wikipedia article, or a flagged review candidate, plus retained botanical descriptions. No content truncation.',
                      'Clean derivatives remove recognized backmatter sections, reference tags, file/category links and common metadata templates. Unknown templates and inline warning templates remain raw, including some multilingual infoboxes and media templates. Facts in removed infoboxes/captions are excluded from this prose baseline; originals remain available.',
                      'Source presence/name match is not claim verification. Gaps and scope-review cases must not be sent blindly to automatic publishing.']}
    write(OUT/'token-census.json',summary)
    # Content-design sample deliberately includes ordinary cases and failures; not a prevalence estimate.
    anchors=['Oxalis pes-caprae','Arbutus unedo','Quercus suber','Nerium oleander','Ophrys apifera',
             'Carpobrotus edulis','Armeria gaditana','Cistus umbellatus','Marcus-kochia littorea',
             'Solanum chenopodioides']
    sample=[r for name in anchors for r in rows if r['name']==name]
    used={r['taxonId'] for r in sample}
    pools={
        'short':[r for r in rows if r['rank']=='species' and r['hasSources'] and r['selectedCleanSourceTokens']<200],
        'medium':[r for r in rows if r['rank']=='species' and 200<=r['selectedCleanSourceTokens']<1000],
        'long':[r for r in rows if r['rank']=='species' and r['selectedCleanSourceTokens']>=1000],
        'non_english':[r for r in rows if r['rank']=='species' and r['language'] not in ('','en')],
        'other_rank':[r for r in rows if r['rank']!='species' and r['hasSources']],
    }
    rng=random.Random(20260912)
    for label,pool in pools.items():
        available=sorted([r for r in pool if r['taxonId'] not in used],key=lambda r:r['taxonId'])
        for row in rng.sample(available,min(3,len(available))):
            sample.append({**row,'sampleReason':label});used.add(row['taxonId'])
    for row in sample:
        write(OUT/'sample'/f"{row['taxonId']}.json",{'selection':row,'input':packets[row['taxonId']],
              'sourceProvenance':[{k:d[k] for k in ['path','sha256','url','title','language']} for d in selections[row['taxonId']]]})
    write(OUT/'sample-manifest.json',{'seed':20260912,'method':'10 deliberate content/scope anchors plus three seeded selections in each of five source-length/language/rank pools; overlaps excluded. A coverage-designed review sample, not population prevalence sampling.','taxa':sample})
    print(json.dumps({'promptTokens':prompt_tokens,'species_with_text':cohorts['species_with_text'],'sample':[(r['taxonId'],r['name'],r['selectedCleanSourceTokens'],r['language']) for r in sample]},indent=2),flush=True)


if __name__=='__main__': main()
