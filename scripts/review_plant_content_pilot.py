#!/usr/bin/env python3
"""Offline structural/evidence-pointer checks and token counts; never botanical verification."""
import argparse
import hashlib
import json
from pathlib import Path

import tiktoken

from audit_plant_content import stats

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/analysis/plant-content-v1'
KINDS = {'growth_form','life_cycle','native_range','habitat','appearance','flowering',
         'ecological_relationship','human_use','regional_status'}


def compact(value):
    return json.dumps(value,ensure_ascii=False,separators=(',',':'))


def validate(output, packet):
    errors=[]
    if not isinstance(output,dict): return ['Output is not an object']
    required={'taxonId','status','facts','foodUse','toxicity','summary','summaryEvidence','reviewFlags'}
    if set(output)!=required: errors.append('Output fields differ from prompt shape')
    if output.get('taxonId')!=packet['taxonId']:errors.append('Wrong taxon ID')
    if output.get('status') not in {'draft','needs_review','insufficient_source'}:errors.append('Invalid status')
    paragraphs={p['id'] for s in packet['sources'] for p in s['passages']}
    facts=output.get('facts',[])
    if not isinstance(facts,list):return errors+['Facts is not a list']
    ids=set()
    def evidence(item):
        refs=item.get('evidence')
        if not isinstance(refs,list) or not refs or any(not isinstance(r,str) or r not in paragraphs for r in refs):
            errors.append('Missing or invalid passage pointer')
    for f in facts:
        if not isinstance(f,dict):errors.append('Invalid fact');continue
        if set(f)!={'id','kind','value','scope','qualifiers','evidence'}:errors.append('Wrong fact fields')
        fid=f.get('id')
        if not isinstance(fid,str) or fid in ids:errors.append('Missing/duplicate fact ID')
        else:ids.add(fid)
        if f.get('kind') not in KINDS:errors.append('Invalid fact kind')
        if not isinstance(f.get('value'),str) or not f['value'].strip():errors.append('Empty fact value')
        if not isinstance(f.get('qualifiers'),list):errors.append('Invalid qualifiers')
        evidence(f)
    for field,states,keys in [
        ('foodUse',{'documented_use','explicitly_inedible','not_documented','conflicting','not_assessed'}, {'part','use','conditions','scope','evidence'}),
        ('toxicity',{'reported','explicitly_absent','not_documented','conflicting','not_assessed'}, {'part','affectedOrganism','effect','conditions','scope','evidence'})]:
        obj=output.get(field,{})
        if not isinstance(obj,dict):errors.append(f'Invalid {field}');continue
        if set(obj)!={'status','details'} or obj.get('status') not in states:errors.append(f'Invalid {field} status/fields')
        details=obj.get('details',[])
        if not isinstance(details,list):errors.append(f'Invalid {field} details');continue
        if obj.get('status') in {'not_documented','not_assessed'} and details:errors.append(f'{field}: unexpected details for absent evidence')
        if obj.get('status') not in {'not_documented','not_assessed'} and not details:errors.append(f'{field}: claim without details')
        for d in details:
            if not isinstance(d,dict):errors.append(f'Invalid {field} detail');continue
            if set(d)!=keys:errors.append(f'Wrong {field} detail fields')
            evidence(d)
    summary=output.get('summary')
    if summary is not None and (not isinstance(summary,str) or not summary.strip()):errors.append('Invalid summary')
    if isinstance(summary,str) and '\n\n' in summary:errors.append('Multiple summary paragraphs')
    refs=output.get('summaryEvidence',[])
    if not isinstance(refs,list) or any(not isinstance(r,str) or r not in ids|paragraphs for r in refs):errors.append('Invalid summary evidence pointer')
    if summary and not refs:errors.append('Summary lacks evidence pointers')
    if output.get('status')=='insufficient_source' and summary is not None:errors.append('Insufficient source but non-null summary')
    if not packet['sources'] and (facts or summary is not None):errors.append('Claims with no source')
    if not isinstance(output.get('reviewFlags'),list):errors.append('Invalid review flags')
    return errors


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--benchmark',action='store_true')
    args=parser.parse_args()
    enc=tiktoken.get_encoding('o200k_base')
    count=lambda s:len(enc.encode(s,disallowed_special=()))
    if args.benchmark:
        config=json.loads((ROOT/'config/plant-content-benchmark-v1.json').read_text())
        groups=[]
        for variant in config['variants']:
            path=BASE/'benchmark/results'/f"{variant['id']}.json"
            if path.exists():groups.append((variant['id'],json.loads(path.read_text())))
        expected=set(config['taxonIds'])
    else:
        source=json.loads((ROOT/'docs/plant-content-pilot-examples.json').read_text())
        groups=[('editorial_examples',[e['output'] for e in source['examples']])]
        expected={e['output']['taxonId'] for e in source['examples']}
        for e in source['examples']:
            packet=json.loads((BASE/'sample'/f"{e['output']['taxonId']}.json").read_text())['input']
            if hashlib.sha256(compact(packet).encode()).hexdigest()!=e['inputPacketSha256']:
                raise SystemExit('An example references a changed evidence packet')
    report={}
    for label,outputs in groups:
        rows=[]
        for o in outputs:
            tid=o['taxonId']
            packet=json.loads((BASE/'sample'/f'{tid}.json').read_text())['input']
            errors=validate(o,packet)
            rows.append({'taxonId':tid,'name':packet['scientificName'],'status':o.get('status'),
                         'paragraphTokens':count(o.get('summary') or ''),
                         'paragraphWords':len((o.get('summary') or '').split()),
                         'fullRecordTokens':count(compact(o)),'factCount':len(o.get('facts',[])),
                         'structuralErrors':errors})
        actual=[o['taxonId'] for o in outputs]
        report[label]={'rows':rows,'complete':len(actual)==len(expected) and set(actual)==expected,
                       'paragraphTokensNonempty':stats([r['paragraphTokens'] for r in rows if r['paragraphTokens']]),
                       'fullRecordTokensWithSummary':stats([r['fullRecordTokens'] for r in rows if r['paragraphTokens']]),
                       'fullRecordTokensAll':stats([r['fullRecordTokens'] for r in rows]),
                       'structuralErrorCount':sum(len(r['structuralErrors']) for r in rows)}
    out=BASE/('benchmark/validation.json' if args.benchmark else 'example-token-counts.json')
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:{x:v[x] for x in ('complete','paragraphTokensNonempty','fullRecordTokensWithSummary','structuralErrorCount')} for k,v in report.items()},indent=2))
    if any(not v['complete'] or v['structuralErrorCount'] for v in report.values()):raise SystemExit(1)


if __name__=='__main__':main()
