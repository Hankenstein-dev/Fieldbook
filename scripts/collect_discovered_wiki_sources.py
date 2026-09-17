#!/usr/bin/env python3
"""Resolve discovered article links using full revisions and strict subject checks."""
import re
from urllib.parse import urlparse, unquote
from collections import Counter
from recover_plant_sources import ROOT, BASE, CORPUS, read, write, wiki, source_doc, select_recovery_docs, now, compact


def main():
    rows={r['taxonId']:r for r in read(BASE/'recovery-queue.json')}
    targets={r['taxonId'] for r in read(BASE/'source-readiness.json')['pending']}
    targets.update(r['taxonId'] for r in read(ROOT/'data/analysis/plant-cli-recovery-continuation-v1/continuation-provenance.json')['deferredForBetterSources'])
    links=set()
    for tid in targets:
        path=CORPUS/'taxonomy'/f'{tid}.json'
        if path.exists():
            url=read(path)['taxon'].get('wikipedia_url')
            if url:links.add((tid,url))
    for path in (CORPUS/'discovery').glob('*/index-*.json'):
        for entry in read(path)['entries']:
            if entry['taxonId'] in targets and '.wikipedia.org/wiki/' in entry['url']:
                links.add((entry['taxonId'],entry['url']))
    counts=Counter()
    for i,(tid,url) in enumerate(sorted(links),1):
        parsed=urlparse(url);match=re.fullmatch(r'([a-z-]+)\.wikipedia\.org',parsed.hostname or '')
        if not match or not parsed.path.startswith('/wiki/'):continue
        response=wiki(match[1],unquote(parsed.path[len('/wiki/'):]))
        doc=source_doc(rows[tid],*response) if response else None
        if doc and select_recovery_docs([doc]):
            path=CORPUS/'discovered-wiki'/f'{tid}.json'
            old=read(path)['sources'] if path.exists() else []
            old=[d for d in old if d['sha256']!=doc['sha256']]+[doc]
            write(path,{'taxonId':tid,'sources':old,'preparedAt':now()});counts['verified_article']+=1
        else:counts['unmatched_or_thin']+=1
        if i%25==0 or i==len(links):print(compact({'processed':i,'total':len(links),'counts':dict(counts)}),flush=True)


if __name__=='__main__':main()
