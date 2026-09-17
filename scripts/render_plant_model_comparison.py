#!/usr/bin/env python3
"""Render the original model outputs and evidence into a local, self-contained review page."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'data/analysis/plant-content-v1/benchmark'


def main():
    config=json.loads((ROOT/'config/plant-content-benchmark-v1.json').read_text())
    payload={'variants':config['variants'],'taxa':[],'results':{}}
    for tid in config['taxonIds']:
        payload['taxa'].append(json.loads((BASE/f'{tid}.json').read_text()))
    for v in config['variants']:
        path=BASE/'results'/f"{v['id']}.json"
        if not path.exists():raise SystemExit(f'Missing result: {v["id"]}')
        payload['results'][v['id']]=json.loads(path.read_text())
    # Escape script terminators in any untrusted source/model strings.
    data=json.dumps(payload,ensure_ascii=False).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    template='''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fieldbook: model output review</title>
<style>
body{font:16px/1.55 system-ui,sans-serif;color:#193229;background:#f6f6f1;margin:0;padding:28px;max-width:1450px;margin:auto}h1{font-size:28px;margin:0}h2{font-size:20px}p{max-width:85ch}label{display:block;font-weight:600}select{font:inherit;padding:8px;max-width:100%;margin:8px 0 18px}#columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{background:white;border:1px solid #d8e1d9;border-radius:10px;padding:22px;overflow-wrap:anywhere}summary{cursor:pointer;font-weight:600}pre{white-space:pre-wrap;font:13px/1.45 ui-monospace,monospace;background:#f1f4ee;padding:12px}.fact{border-top:1px solid #eee;padding:12px 0}.meta{color:#53685b;font-size:14px}.prose{font-size:18px}button{font:inherit;cursor:pointer;padding:7px 14px;margin:0 10px 18px 0}details{margin:14px 0}@media(max-width:800px){#columns{grid-template-columns:1fr}body{padding:16px}}
</style>
<h1>Plant model comparison</h1>
<p>Ten identical source packets, six model/reasoning settings. These are unedited subscription-subagent outputs, not approved plant information. Compare the prose and the extracted facts. A valid evidence ID does not prove that a passage supports a claim.</p>
<label for="plant">Plant</label><select id="plant"></select><br><button id="previous">Previous</button><button id="next">Next</button>
<div id="columns"><section><label for="left">Left model</label><select id="left"></select><article id="leftCard" class="card"></article></section><section><label for="right">Right model</label><select id="right"></select><article id="rightCard" class="card"></article></section></div>
<details><summary>Source passages for this plant</summary><div id="evidence"></div></details>
<p class="meta">Visible output counts and editorial findings are in docs/plant-content-model-comparison.md. This local file makes no network requests. No API input or hidden-reasoning usage was available.</p>
<script id="data" type="application/json">PAYLOAD</script>
<script>
const data=JSON.parse(document.getElementById('data').textContent);
const byId=id=>document.getElementById(id);
function element(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function options(select,items){for(const [value,label] of items){const o=element('option',label);o.value=value;select.append(o);}}
options(byId('plant'),data.taxa.map(t=>[String(t.taxonId),t.scientificName]));
for(const id of ['left','right'])options(byId(id),data.variants.map(v=>[v.id,v.model+' · '+v.reasoning]));
byId('right').value='astra-max';
function card(side,tid){const host=byId(side+'Card');host.replaceChildren();const output=data.results[byId(side).value].find(o=>o.taxonId===tid);host.append(element('p','Status: '+output.status,'meta'));host.append(element('p',output.summary??'Summary withheld.','prose'));
 const facts=element('details');facts.open=true;facts.append(element('summary','Extracted facts ('+output.facts.length+')'));for(const f of output.facts){const item=element('div',undefined,'fact');item.append(element('strong',f.kind+' · '+f.id),element('p',f.value));if(f.scope)item.append(element('p','Scope: '+f.scope,'meta'));if(f.qualifiers.length)item.append(element('p','Qualifications: '+f.qualifiers.join(' '),'meta'));item.append(element('p','Evidence: '+f.evidence.join(', '),'meta'));facts.append(item);}host.append(facts);
 for(const [key,label] of [['foodUse','Human food use'],['toxicity','Toxicity']]){host.append(element('h2',label+' · '+output[key].status));for(const detail of output[key].details)host.append(element('pre',JSON.stringify(detail,null,2)));}
 host.append(element('h2','Review flags'));const ul=element('ul');for(const flag of output.reviewFlags)ul.append(element('li',flag));if(!output.reviewFlags.length)host.append(element('p','No flags returned.'));else host.append(ul);
 host.append(element('p','Summary evidence: '+output.summaryEvidence.join(', '),'meta'));const raw=element('details');raw.append(element('summary','Original JSON'),element('pre',JSON.stringify(output,null,2)));host.append(raw);
}
function render(){const tid=Number(byId('plant').value);card('left',tid);card('right',tid);const evidence=byId('evidence');evidence.replaceChildren();for(const s of data.taxa.find(t=>t.taxonId===tid).sources){evidence.append(element('h2',s.title+' · '+s.language),element('p','Scope: '+s.scope,'meta'));for(const p of s.passages){evidence.append(element('strong',p.id),element('pre',p.text));}}}
for(const id of ['plant','left','right'])byId(id).addEventListener('change',render);
function step(n){const select=byId('plant');select.selectedIndex=(select.selectedIndex+n+select.options.length)%select.options.length;render();}
byId('previous').onclick=()=>step(-1);byId('next').onclick=()=>step(1);render();
</script></html>'''
    (BASE/'review.html').write_text(template.replace('PAYLOAD',data),encoding='utf-8')
    print(BASE/'review.html')


if __name__=='__main__':main()
