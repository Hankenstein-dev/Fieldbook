#!/usr/bin/env python3
"""Readable recovery outputs and generation-only accounting across frozen runs."""
from collections import Counter
from datetime import datetime
import html
from audit_plant_content import ROOT,read,write
from recover_plant_sources import now
from run_plant_content_cli import account_refusal

def main():
    out=ROOT/'data/analysis/plant-card-release-v2';out.mkdir(parents=True,exist_ok=True)
    runs=[];cards=[];usage=Counter();records=[];refused_calls=0
    for base in sorted((ROOT/'data/analysis').glob('plant-cli-recovery-*-v*')):
        if not (base/'report.json').exists():continue
        report=read(base/'report.json');manifest=read(base/'manifest.json')
        usage.update(report['usage'])
        runs.append({'run':str(base.relative_to(ROOT)),'expectedCount':manifest['count'],
                     **{k:v for k,v in report.items() if k not in {'results','usage'}}})
        refused=set()
        for group in manifest.get('batches',[]):
            path=base/f"{group['id']}-events.jsonl"
            if not path.exists():continue
            events=[]
            for line in path.read_text().splitlines():
                try:events.append(__import__('json').loads(line))
                except ValueError:pass
            if account_refusal(events):
                refused.update(group['taxonIds']);refused_calls+=1
        for row in report['results']:
            row={**row,'failureCategory':('provider_refusal' if row['taxonId'] in refused else 'format' if row['turns']==1 and not row['validated'] else 'execution' if not row['validated'] else None)}
            records.append(row);output=row.get('output') or {};raw=row.get('rawOutputFile',f"{row['taxonId']}-output.txt")
            href='../'+base.name+'/'+raw
            cards.append('<article><h2>'+html.escape(row['name'])+' · '+str(row['taxonId'])+'</h2><p>'+('Format checks passed' if row['validated'] else 'FAILED: '+html.escape(row.get('validationError') or 'Unknown'))+'</p><p>'+html.escape(output.get('summary') or 'No summary returned')+'</p><p>'+html.escape(output.get('edibilityNote') or '')+'</p><small>'+html.escape(base.name)+' · <a href="'+html.escape(href)+'">Original response</a></small></article>')
    elapsed=0
    if records:elapsed=(max(datetime.fromisoformat(r['completedAt']) for r in records)-min(datetime.fromisoformat(r['startedAt']) for r in records)).total_seconds()
    coverage=read(out/'coverage/coverage.json') if (out/'coverage/coverage.json').exists() else None
    report={'updatedAt':now(),'runs':runs,'attemptedTaxa':len(records),'uniqueAttemptedTaxa':len({r['taxonId'] for r in records}),
            'generationCalls':sum(r['generationCallCount'] for r in runs),'formatPassed':sum(r['validated'] for r in records),
            'failedAttempts':sum(not r['validated'] for r in records),
            'formatFailed':sum(r['failureCategory']=='format' for r in records),
            'providerRefusedCalls':refused_calls,'providerRefusedPlantAttempts':sum(r['failureCategory']=='provider_refusal' for r in records),
            'otherExecutionFailedPlantAttempts':sum(r['failureCategory']=='execution' for r in records),
            'nullSummaries':sum(r['validated'] and not r['output']['summary'] for r in records),
            'elapsedWallSeconds':elapsed,'totalGenerationSeconds':sum(r['totalGenerationSeconds'] for r in runs),'usage':dict(usage),
            'missingUsageCalls':sum(r['missingUsageCount'] for r in runs),'coverage':coverage,
            'usageScope':'New recovery CLI calls only. Coordinating chat excluded and not measured here. Cached input and reasoning output are subsets of input and output totals.',
            'accuracyScope':'Format and provenance checks are not a complete botanical accuracy review.'}
    write(out/'recovery-report.json',report)
    body=f'<h1>Recovered plant descriptions</h1><p>{report["attemptedTaxa"]} plant attempts ({report["uniqueAttemptedTaxa"]} distinct taxa); {report["formatPassed"]} passed format checks; {report["formatFailed"]} failed format checks; {report["nullSummaries"]} valid null summaries. {report["providerRefusedPlantAttempts"]} plant attempts were refused by the provider; {report["otherExecutionFailedPlantAttempts"]} had other execution failures. Refused attempts did not return botanical answers.</p>'
    if coverage:body+=f'<p>Current app content: {coverage["withSummary"]:,} of {coverage["totalVisibleEntries"]:,} visible cards have a paragraph; {coverage["withoutSummary"]:,} remain blank. Publication verification is recorded separately.</p>'
    (out/'outputs.html').write_text('<!doctype html><meta charset="utf-8"><title>Fieldbook recovery outputs</title><style>body{max-width:960px;margin:40px auto;font:17px/1.6 system-ui;padding:0 20px}article{border-top:1px solid #ddd;padding:20px 0}small{color:#555}</style>'+body+''.join(cards))
    lines=['# Fieldbook information recovery','', '[Readable outputs](outputs.html) · [Full report](recovery-report.json)','',
           f'{report["attemptedTaxa"]} attempted taxa in {report["generationCalls"]} calls; {report["formatPassed"]} format passes, {report["formatFailed"]} failures, {report["nullSummaries"]} valid null summaries.',
           f'{report["providerRefusedPlantAttempts"]} plant attempts in {report["providerRefusedCalls"]} calls were refused by the provider. {report["otherExecutionFailedPlantAttempts"]} plant attempts had other execution failures. Refusals are not botanical response failures; explicitly resumed attempts are retained separately.',
           f'Elapsed wall time: {elapsed/60:.1f} minutes; summed generation durations: {report["totalGenerationSeconds"]/60:.1f} minutes.','',
           '| Generation usage | Tokens |','| --- | ---: |']
    lines += [f'| {key} | {value:,} |' for key,value in usage.items()]
    lines += ['',report['usageScope'],report['accuracyScope'],'',f'Usage missing for {report["missingUsageCalls"]} calls; no usage estimate substituted.']
    (out/'report.md').write_text('\n'.join(lines)+'\n')
    print({k:report[k] for k in ['attemptedTaxa','generationCalls','formatPassed','formatFailed','nullSummaries','elapsedWallSeconds']})

if __name__=='__main__':main()
