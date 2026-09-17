#!/usr/bin/env python3
"""Validate and measure the reduced-format run without changing model outputs."""
import argparse
from collections import Counter
import csv
from datetime import datetime
import hashlib
import json

import tiktoken

from audit_plant_content import ROOT, read, write, stats
from review_plant_content_pilot import validate, compact


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--require-complete',action='store_true');args=parser.parse_args()
    cfg=read(ROOT/'config/plant-content-run-v2.json');base=ROOT/cfg['output'];manifest=read(base/'manifest.json')
    enc=tiktoken.get_encoding(cfg['encoding']);count=lambda s:len(enc.encode(s,disallowed_special=()))
    if hashlib.sha256((ROOT/cfg['prompt']).read_bytes()).hexdigest()!=manifest['promptSha256']:
        raise SystemExit('Frozen prompt has changed')
    rows=[];batch_report=[];issues=[];source_entries={e['taxonId']:e for e in manifest['taxa']}
    expected_keys={'taxonId','status','summary','summaryEvidence','foodUse','toxicity','reviewFlags'}
    for batch in manifest['batches']:
        bid=batch['id'];path=base/'results'/f'{bid}.json'
        if not path.exists():continue
        original=path.read_text()
        try:outputs=json.loads(original)
        except json.JSONDecodeError:issues.append(f'{bid}: invalid JSON');continue
        if not isinstance(outputs,list):issues.append(f'{bid}: not an array');continue
        actual=[o.get('taxonId') for o in outputs if isinstance(o,dict)]
        if len(actual)!=len(batch['taxa']) or set(actual)!=set(batch['taxa']):issues.append(f'{bid}: missing/duplicate/unexpected IDs')
        for output in outputs:
            if not isinstance(output,dict) or output.get('taxonId') not in source_entries:
                issues.append(f'{bid}: invalid record');continue
            tid=output['taxonId'];packet=read(base/'packets'/f'{tid}.json')['input']
            if hashlib.sha256(compact(packet).encode()).hexdigest()!=source_entries[tid]['packetSha256']:
                raise SystemExit(f'Frozen packet changed: {tid}')
            errors=[]
            if set(output)!=expected_keys:errors.append('Wrong reduced-format output fields')
            try:errors+=validate({**output,'facts':[]},packet)
            except (TypeError,KeyError,AttributeError):errors.append('Invalid nested output types')
            if output.get('status')=='draft' and not isinstance(output.get('summary'),str):errors.append('Draft lacks paragraph')
            if output.get('status') in {'needs_review','insufficient_source'} and (output.get('summary') is not None or output.get('summaryEvidence')):errors.append('Withheld draft contains summary/evidence')
            flags=output.get('reviewFlags')
            if isinstance(flags,list) and any(not isinstance(f,str) or not f.strip() for f in flags):errors.append('Invalid review flag text')
            for field in ['foodUse','toxicity']:
                obj=output.get(field)
                if isinstance(obj,dict) and isinstance(obj.get('details'),list):
                    for detail in obj['details']:
                        if isinstance(detail,dict):
                            for key,value in detail.items():
                                if key!='evidence' and value is not None and not isinstance(value,str):errors.append(f'Invalid {field}.{key} text')
            summary=output.get('summary');summary=summary if isinstance(summary,str) else ''
            food=output.get('foodUse',{});tox=output.get('toxicity',{})
            output_tokens=count(compact(output))
            no_food_toxicity={k:v for k,v in output.items() if k not in {'foodUse','toxicity'}}
            no_flags={k:v for k,v in output.items() if k!='reviewFlags'}
            rows.append({'batch':bid,'taxonId':tid,'name':source_entries[tid]['name'],'language':source_entries[tid]['language'],
                'status':output.get('status'),'paragraphWords':len(summary.split()),'paragraphTokens':count(summary),
                'compactOutputTokens':output_tokens,
                'foodAndToxicityTokenContribution':output_tokens-count(compact(no_food_toxicity)),
                'reviewFlagsTokenContribution':output_tokens-count(compact(no_flags)),
                'foodStatus':food.get('status') if isinstance(food,dict) else None,
                'toxicityStatus':tox.get('status') if isinstance(tox,dict) else None,'reviewFlagCount':len(flags) if isinstance(flags,list) else 0,
                'errors':errors})
        timing_path=base/'timing'/f'{bid}.json';timing=read(timing_path) if timing_path.exists() else {}
        batch_report.append({'batch':bid,'count':len(outputs),'fileSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                             'savedFileTokens':count(original),'timing':timing})
    timings=[b['timing'] for b in batch_report if b['timing'].get('completedAt')]
    starts=[datetime.fromisoformat(t['startedAt'].replace('Z','+00:00')) for t in timings]
    ends=[datetime.fromisoformat(t['completedAt'].replace('Z','+00:00')) for t in timings]
    durations=[(end-start).total_seconds() for start,end in zip(starts,ends)]
    complete=len(rows)==cfg['count'] and len({r['taxonId'] for r in rows})==cfg['count'] and not issues
    report={'complete':complete,'expectedCount':cfg['count'],'completedCount':len(rows),'batchIssues':issues,
        'structuralErrorCount':sum(len(r['errors']) for r in rows),'rows':rows,'batches':batch_report,
        'counts':{field:dict(Counter(str(r[field]) for r in rows)) for field in ['status','language','foodStatus','toxicityStatus']},
        'recordsWithFlags':sum(r['reviewFlagCount']>0 for r in rows),
        'tokens':{'encoding':cfg['encoding'],'input':manifest['inputStats'],
            'promptOncePerBatchTokens':manifest['promptTokens']*len(manifest['batches']),
            'allPrettyBatchFilesTokens':sum(b['prettyFileTokens'] for b in manifest['batches']),
            'compactOutputAll':stats([r['compactOutputTokens'] for r in rows]),
            'compactOutputWithParagraph':stats([r['compactOutputTokens'] for r in rows if r['paragraphTokens']]),
            'paragraphsNonempty':stats([r['paragraphTokens'] for r in rows if r['paragraphTokens']]),
            'paragraphWordsNonempty':stats([r['paragraphWords'] for r in rows if r['paragraphTokens']]),
            'foodAndToxicityTokenContribution':stats([r['foodAndToxicityTokenContribution'] for r in rows]),
            'reviewFlagsTokenContribution':stats([r['reviewFlagsTokenContribution'] for r in rows]),
            'savedOutputFilesTotal':sum(b['savedFileTokens'] for b in batch_report),
            'subscriptionBilledInput':None,'subscriptionBilledOutput':None,'hiddenReasoningTokens':None,
            'agentTelemetryArtifact':'agent-usage.json',
            'notes':'Reference tokenizer counts of saved texts/artifacts, not actual model billing. Standalone inputs repeat the prompt per plant. Batch file counts and once-per-batch prompts omit system/tool context, repeated reads and reasoning. Observed generation-agent usage is separately recorded in agent-usage.json; it is not subscription billing. Field contributions are the change in compact tokens on removing that field group, not extra LLM inference measurements.'},
        'timing':{'completedTimedBatches':len(timings),'observedGenerationWallSeconds':(max(ends)-min(starts)).total_seconds() if starts else None,
                  'summedBatchSeconds':sum(durations),'batchSeconds':stats(durations),
                  'notes':'Agent-recorded first-tool to output-completion times; up to three concurrent batches. Includes reading, writing and validation, not pure inference latency. Wall interval includes dispatch gaps.'}}
    write(base/'report.json',report)
    if rows:
        with (base/'measurements.csv').open('w',newline='',encoding='utf-8') as file:
            writer=csv.DictWriter(file,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    print(json.dumps({k:report[k] for k in ['complete','completedCount','structuralErrorCount','batchIssues','counts','recordsWithFlags','timing']},indent=2))
    print(json.dumps({k:v for k,v in report['tokens'].items() if k in ['compactOutputAll','paragraphsNonempty','paragraphWordsNonempty']},indent=2))
    if issues or report['structuralErrorCount'] or (args.require_complete and (not complete or len(timings)!=len(manifest['batches']))):raise SystemExit(1)


if __name__=='__main__':main()
