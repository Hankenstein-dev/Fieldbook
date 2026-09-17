#!/usr/bin/env python3
"""Merge validated recovery additions, preserving the previous complete card overlay."""
import argparse
import hashlib
from audit_plant_content import ROOT, read, write
from recover_plant_sources import compact, sha, now
from run_plant_content_cli import validate

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--run',action='append',required=True)
    args=parser.parse_args()
    release=ROOT/'data/analysis/plant-card-release-v2'
    correction_file=release/'validated-corrections.json'
    corrections={(c['run'],c['taxonId']):c for c in read(correction_file)} if correction_file.exists() else {}
    destination=ROOT/'stories/pt/plants.cli.json'
    baseline=release/'baseline.json'
    if not baseline.exists(): write(baseline,read(destination))
    old=read(destination); stories={s['taxonId']:s for s in old['stories']}
    changes=[];held=[];inputs=[]
    for run in args.run:
        base=ROOT/run;manifest=read(base/'manifest.json')
        inputs.append({'run':run,'manifestSha256':hashlib.sha256((base/'manifest.json').read_bytes()).hexdigest()})
        for tid in manifest['taxonIds']:
            path=base/f'{tid}-result.json'
            if not path.exists(): continue
            result=read(path); frozen=read(base/f'{tid}-source.json');packet=frozen['input']
            assert result['taxonId']==packet['taxonId']==tid,'Taxon identity mismatch'
            correction=corrections.get((run,tid))
            if correction:
                assert hashlib.sha256(path.read_bytes()).hexdigest()==correction['originalResultSha256'],'Corrected result changed'
                validate(correction['output'],packet)
                result={**result,'output':correction['output'],'validated':True,'validationError':None}
            if not result['validated']:
                held.append({'taxonId':tid,'run':run,'reason':result['validationError']});continue
            validate(result['output'],packet)
            assert sha(compact(packet))==frozen['measurement']['packetSha256'],'Frozen packet changed'
            if not result['output']['summary']:
                held.append({'taxonId':tid,'run':run,'reason':'Valid null summary retained in run, not used to overwrite app content'});continue
            sources=[]
            assert len(packet['sources'])==len(frozen['sourceProvenance']),'Source provenance coverage mismatch'
            for source,provenance in zip(packet['sources'],frozen['sourceProvenance']):
                original=read(ROOT/provenance['path'])
                assert (sha(original['wikitext']) if 'wikitext' in original else sha(compact(original)))==provenance['sha256'],f'Source changed: {provenance["path"]}'
                sources.append({'id':source['id'],**provenance['credit']})
            output=result['output']; existing=stories.get(tid)
            if existing and existing.get('summary') and len(output['summary'].split())<len(existing['summary'].split()):
                held.append({'taxonId':tid,'run':run,'reason':'Candidate is shorter than the existing non-null account; existing published description retained pending comparison'});continue
            story={'taxonId':tid,'tags':existing.get('tags',[]) if existing else [],'summary':output['summary'],
                   'humanEdibility':output['humanEdibility'],'edibilityNote':output['edibilityNote'],'reviewStatus':'draft','sources':sources}
            if existing!=story:
                changes.append({'taxonId':tid,'run':run,'previousSummary':(existing or {}).get('summary'),
                                'resultSha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                                **({'correction':correction['reason'],'correctionSha256':sha(compact(correction))} if correction else {}),
                                'identityDecisions':[p.get('identityDecision') for p in frozen['sourceProvenance']]})
            stories[tid]=story
    ordered=list(stories.values())
    manifest={'count':len(ordered),'taxonIds':[s['taxonId'] for s in ordered],'updatedAt':now(),
              'purpose':'Release inventory, not a generation manifest. Frozen generation manifests remain in their original runs.',
              'baselineSourceRun':read(baseline)['sourceRun'],'latestMergedRuns':inputs}
    write(release/'manifest.json',manifest)
    write(destination,{'schemaVersion':1,'sourceRun':str(release.relative_to(ROOT)),
        'manifestSha256':hashlib.sha256((release/'manifest.json').read_bytes()).hexdigest(),
        'selection':'Preserved prior overlay plus validated, non-null recovery additions; no failed or null replacement of existing content.',
        'count':len(ordered),'stories':ordered})
    chunks=destination.with_suffix('');imports=[];names=[]
    for i,start in enumerate(range(0,len(ordered),1000)):
        name=f'part-{i:03d}.json';write(chunks/name,ordered[start:start+1000]);imports.append(f"import part{i} from './{name}';");names.append(f'...part{i}')
    (chunks/'index.ts').write_text('// Generated by merge_plant_recovery_content.py.\n'+'\n'.join(imports)+'\nexport default { stories: ['+', '.join(names)+'] };\n')
    report={'count':len(ordered),'taxonIds':manifest['taxonIds'],'destination':str(destination.relative_to(ROOT)),
            'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'nullSummaryCount':sum(not s.get('summary') for s in ordered),
            'changedCount':len(changes),'changes':changes,'held':held,'mergedRuns':inputs,'updatedAt':now(),
            'botanicalAccuracyReviewed':False,'validation':'Schema, limits, evidence-ID existence, frozen source and packet hashes; code-based identity matching during preparation.'}
    write(release/'card-import.json',report)
    write(release/'imports'/f"{report['updatedAt'].replace(':','-')}.json",report)
    print(compact({k:report[k] for k in ['count','changedCount','nullSummaryCount']}))

if __name__=='__main__':main()
