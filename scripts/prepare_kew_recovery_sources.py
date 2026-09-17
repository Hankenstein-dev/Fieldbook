#!/usr/bin/env python3
"""Extract taxon-scoped introductory facts from saved primary-source web reads."""
import re
from collections import Counter
from recover_plant_sources import ROOT,CORPUS,read,write,norm,sha,compact,now

def clean(text):
    text=re.sub(r'L\d+(?:@P\d+)?:\s?', '',text)
    text=re.sub(r'cite[^†]+†([^†]+)(?:†[^]+)?',r'\1',text)
    return text.strip()

def main():
    base=CORPUS/'web-search';counts=Counter()
    indexes=[*sorted(base.glob('index-*.json')),*sorted((CORPUS/'discovery').glob('*/index-*.json'))]
    for index in indexes:
        for entry in read(index)['entries']:
            if not entry['url'].startswith('https://powo.science.kew.org/taxon/'):continue
            page=ROOT/entry['pageFile'] if 'pagePath' in entry else base/entry['pageFile']
            if not page.exists():continue
            raw=page.read_text()
            fetched=read(page.with_suffix('.json'))['fetchedAt'] if 'pagePath' in entry and page.with_suffix('.json').exists() else entry.get('fetchedAt')
            heading=re.search(r'L\d+: # ([^\n]+)',raw)
            if not heading or not norm(heading[1]).startswith(norm(entry['name'])):
                counts['read_error_or_identity_review']+=1;continue
            main=raw[heading.start():]
            # Stop before taxonomy/navigation lists. Native range and life form are a
            # single explicitly scoped POWO paragraph, not inferred from member taxa.
            match=re.search(r'L\d+: (The native range of this [^\n]+)',main)
            formula=re.search(r'L\d+: (The hybrid formula of this [^\n]+)',main)
            if not match and not formula:
                counts['no_descriptive_intro']+=1;continue
            content=clean(match[1] if match else formula[1])
            clean_text=f"Plants of the World Online account: {heading[1]}.\n\n{content}"
            original={'provider':'Plants of the World Online','url':entry['url'],'fetchedAt':fetched,
                      'webReadPath':str(page.relative_to(ROOT)),'webReadSha256':sha(raw),
                      'scientificName':entry['name'],'rank':entry['rank'],'selectedText':clean_text}
            path=CORPUS/'kew-originals'/f"{entry['taxonId']}-{sha(compact(original))[:16]}.json"
            if not path.exists():write(path,original)
            license_match=re.search(r'https?://creativecommons.org/licenses/by/[\d.]+/?',raw)
            doc={'title':f"{heading[1]} — Plants of the World Online",'language':'en','scope':'requested_taxon_Kew_account',
                 'clean':clean_text,'identityDecision':'Exact scientific name in primary account heading; no use of synonym target or member-species account',
                 'path':str(path.relative_to(ROOT)),'sha256':sha(compact(original)),'url':entry['url'],
                 'credit':{'title':f"{heading[1]} — Plants of the World Online",'url':entry['url'],
                           'attribution':'Plants of the World Online, Royal Botanic Gardens, Kew',**({'licenseUrl':license_match[0]} if license_match else {})}}
            write(CORPUS/'kew'/f"{entry['taxonId']}.json",{'taxonId':entry['taxonId'],'sources':[doc],'preparedAt':now()})
            counts['supported_intro']+=1
    print(compact(dict(counts)))

if __name__=='__main__':main()
