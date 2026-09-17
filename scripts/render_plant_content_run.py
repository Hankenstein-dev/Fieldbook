#!/usr/bin/env python3
"""Self-contained reading copy of the reduced-format pilot, with source evidence."""
import json

from audit_plant_content import ROOT, read


def main():
    cfg=read(ROOT/'config/plant-content-run-v2.json');base=ROOT/cfg['output'];m=read(base/'manifest.json')
    measurements=read(base/'report.json');byid={r['taxonId']:r for r in measurements['rows']}
    quality_path=base/'quality-review.json'
    reviews={r['taxonId']:r for r in read(quality_path)['records']} if quality_path.exists() else {}
    records=[]
    for batch in m['batches']:
        path=base/'results'/f"{batch['id']}.json"
        if not path.exists():continue
        for output in read(path):
            packet=read(base/'packets'/f"{output['taxonId']}.json")
            records.append({'output':output,'packet':packet,'measurement':byid[output['taxonId']],
                            'review':reviews.get(output['taxonId'])})
    records.sort(key=lambda r:r['packet']['input']['scientificName'].casefold())
    payload=json.dumps(records,ensure_ascii=False).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fieldbook — 250 Sol drafts</title>
<style>body{font:16px/1.6 system-ui,sans-serif;background:#f5f5ef;color:#203a2d;max-width:1000px;margin:auto;padding:28px}h1{font-size:28px;margin-bottom:8px}h2{font-size:21px}input,select,button{font:inherit;padding:8px;margin:6px 8px 8px 0;max-width:100%;box-sizing:border-box}#plant{width:100%}.card{background:white;border:1px solid #dae1d5;border-radius:12px;padding:24px;margin:18px 0;overflow-wrap:anywhere}.prose{font-size:20px;line-height:1.7}.meta{font-size:14px;color:#63725f}pre{font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap;background:#f0f3ec;padding:12px;overflow-wrap:anywhere}summary{cursor:pointer;font-weight:600}details{margin:14px 0}label{display:inline-block}a{color:#26613e}.warning{border-left:4px solid #aa791e;padding-left:14px}@media(max-width:600px){body{padding:14px}.card{padding:18px}.prose{font-size:18px}}</style>
<h1>250 plant drafts · Sol high</h1><p>Original model outputs for review. Paragraphs and food/toxicity claims are drafts, not approved plant guidance. Flags identify model-reported issues; no flag does not mean a draft is correct.</p>
<input id="search" type="search" aria-label="Search species" placeholder="Search species or common name"><label><input id="flagged" type="checkbox"> With model review flags</label><label><input id="food" type="checkbox"> With food evidence</label><label><input id="reviewed" type="checkbox"> Source comparison completed</label>
<select id="plant" aria-label="Select plant"></select><div><button id="previous">Previous</button><button id="next">Next</button><span id="position" class="meta"></span></div>
<article id="card" class="card"></article><details><summary>Source passages and provenance</summary><div id="sources"></div></details>
<p class="meta">No network requests. Source links open the original revision or dataset. Token counts describe saved text under o200k_base, not total subscription usage.</p>
<script id="data" type="application/json">PAYLOAD</script><script>
const records=JSON.parse(document.getElementById('data').textContent);let filtered=[];
const get=id=>document.getElementById(id);
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
function detailBlock(host,label,obj){host.append(el('h2',label+' · '+obj.status));if(!obj.details.length)host.append(el('p','No supporting details returned.','meta'));for(const detail of obj.details){const d=el('div');for(const [key,value] of Object.entries(detail)){if(value!==null)d.append(el('p',key+': '+(Array.isArray(value)?value.join(', '):value)));}host.append(d);}}
function render(){const index=get('plant').selectedIndex;const row=filtered[index];const host=get('card');const sources=get('sources');host.replaceChildren();sources.replaceChildren();get('position').textContent=filtered.length?(index+1)+' / '+filtered.length:'No matches';if(!row){host.append(el('p','No matching records.'));return;}const out=row.output;const packet=row.packet.input;const m=row.measurement;host.append(el('h2',packet.scientificName),el('p',(packet.commonName||'')+' · '+out.status+' · source language '+m.language,'meta'));host.append(el('p',out.summary??'Paragraph withheld: source or scope needs attention.','prose'));host.append(el('p',m.paragraphWords+' words · '+m.paragraphTokens+' paragraph tokens · '+m.compactOutputTokens+' complete record tokens','meta'));
if(out.reviewFlags.length){const box=el('div',undefined,'warning');box.append(el('strong','Model review flags'));const ul=el('ul');for(const flag of out.reviewFlags)ul.append(el('li',flag));box.append(ul);host.append(box);}if(row.review){const box=el('div',undefined,'warning');box.append(el('h2','Source comparison · '+row.review.assessment.replaceAll('_',' ')),el('p',row.review.notes),el('p','Selection: '+row.review.selection+' · Checked passages: '+row.review.checkedPassages.join(', '),'meta'));host.append(box);}else{host.append(el('p','This record was outside the manual source-comparison sample.','meta'));}detailBlock(host,'Human food use',out.foodUse);detailBlock(host,'Toxicity',out.toxicity);host.append(el('p','Paragraph evidence: '+out.summaryEvidence.join(', '),'meta'));const raw=el('details');raw.append(el('summary','Original JSON'),el('pre',JSON.stringify(out,null,2)));host.append(raw);
for(let i=0;i<packet.sources.length;i++){const s=packet.sources[i];sources.append(el('h2',s.id+' · '+s.title),el('p','Scope: '+s.scope,'meta'));const url=row.packet.sourceProvenance[i]?.url;if(url&&/^https?:\\/\\//.test(url)){const a=el('a','Open source');a.href=url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a);}for(const p of s.passages)sources.append(el('strong',p.id),el('pre',p.text));}}
function filter(){const term=get('search').value.toLowerCase();filtered=records.filter(r=>{const p=r.packet.input;return (p.scientificName+' '+(p.commonName||'')).toLowerCase().includes(term)&&(!get('flagged').checked||r.output.reviewFlags.length)&&(!get('food').checked||r.output.foodUse.details.length)&&(!get('reviewed').checked||r.review);});const select=get('plant');select.replaceChildren();for(const r of filtered){const option=el('option',r.packet.input.scientificName);option.value=String(r.output.taxonId);select.append(option);}render();}
function move(step){if(!filtered.length)return;const select=get('plant');select.selectedIndex=(select.selectedIndex+step+filtered.length)%filtered.length;render();}
get('plant').onchange=render;get('search').oninput=filter;get('flagged').onchange=filter;get('food').onchange=filter;get('reviewed').onchange=filter;get('previous').onclick=()=>move(-1);get('next').onclick=()=>move(1);filter();
</script></html>'''
    (base/'review.html').write_text(html.replace('PAYLOAD',payload),encoding='utf-8')
    print(f'Rendered {len(records)} draft records to {base / "review.html"}')


if __name__=='__main__':main()
