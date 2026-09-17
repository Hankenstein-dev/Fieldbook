import json,sys,time,urllib.request
from pathlib import Path
import numpy as np,onnxruntime as ort
from PIL import Image
root=Path(__file__).resolve().parents[1];raw=root/'data/models';out=raw/'evaluation';out.mkdir(exist_ok=True)
all_species=json.loads((raw/'country-species.json').read_text());local=json.loads((root/'config/generated/starter.json').read_text())['candidates'];species=[c['species']for c in local if (raw/'reference-vectors'/f'{c["species"]["id"]}.npy').exists()];vecs=np.stack([np.load(raw/'reference-vectors'/f'{s["id"]}.npy')for s in species]);opts=ort.SessionOptions();opts.intra_op_num_threads=4;sess=ort.InferenceSession(str(raw/'bioclip2-image-int8.onnx'),sess_options=opts)
results=[]
for tid in json.loads((root/'config/identification-evaluation.json').read_text())['taxonIds']:
 p=root/f'data/raw/pt/plants/{tid}.json'
 if not p.exists():continue
 taxon=json.loads(p.read_text())['taxon'];photos=taxon.get('taxon_photos',[]);used=next(s.get('photo',{}).get('sourceUrl','')for s in species if s['id']==tid)
 selected=[p['photo']for p in photos if p['photo'].get('license_code')in ['cc0','cc-by','cc-by-sa','cc-by-nc','cc-by-nc-sa']and str(p['photo']['id'])not in used][:3]
 for photo in selected:
  url=photo.get('medium_url')or photo.get('url','').replace('/square.','/medium.');path=out/f'{tid}-{photo["id"]}.jpg'
  try:
   if not path.exists():
    with urllib.request.urlopen(url,timeout=20)as r:path.write_bytes(r.read())
   im=Image.open(path).convert('RGB');w,h=im.size;k=min(w,h);im=im.crop(((w-k)/2,(h-k)/2,(w+k)/2,(h+k)/2)).resize((224,224),Image.Resampling.BICUBIC);x=((np.array(im,dtype=np.float32)/255-np.array([.48145466,.4578275,.40821073],dtype=np.float32))/np.array([.26862954,.26130258,.27577711],dtype=np.float32)).transpose(2,0,1)[None];t=time.time();v=sess.run(None,{'image':x})[0][0];v/=np.linalg.norm(v);scores=vecs@v;order=np.argsort(-scores);rank=next(i+1 for i,j in enumerate(order)if species[j]['id']==tid);r={'expected':tid,'photo':photo['id'],'url':url,'attribution':photo.get('attribution'),'license':photo['license_code'],'rank':rank,'seconds':time.time()-t,'top':[{'name':species[j]['scientificName'],'score':float(scores[j])}for j in order[:3]]};results.append(r);print(json.dumps(r),flush=True)
  except Exception as e:print('Error',tid,str(e),flush=True)
(out/'results.json').write_text(json.dumps(results,indent=2));print('SUMMARY',len(results),'top1',sum(r['rank']==1 for r in results),'top5',sum(r['rank']<=5 for r in results),flush=True)
