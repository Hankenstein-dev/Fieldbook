# Replay the retained 21-photo control set against current packed country references.
# Run with .venv/bin/python scripts/replay-bioclip-controls.py. Requires prepared local assets.
# Results are a convenience sample, not a population accuracy estimate; CPU timings are not phone timings.
import json,pathlib,time,hashlib
import numpy as np,onnxruntime as ort
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1];out=root/'data/diagnostics/investigations/online-comparison';source=root/'data/models/evaluation'
samples=json.load(open(source/'results.json'))
metadata={s['id']:s for s in json.load(open(root/'data/models/reference-species.json'))}
ids={s['id'] for s in json.load(open(root/'data/models/country-species.json'))}|{c['species']['id'] for c in json.load(open(root/'config/generated/starter.json'))['candidates']}
packed=[];taxa=[]
for block in json.load(open(root/'public/models/references.json'))['files']:
 if block['kind']!='text':continue
 raw=(root/'public'/block['url'].lstrip('/')).read_bytes();assert hashlib.sha256(raw).hexdigest()==block['sha256']
 vectors=np.frombuffer(raw,dtype='<f4').reshape(-1,768)
 for i,v in zip(block['ids'],vectors):
  if i in ids:taxa.append(i);packed.append(v)
mat=np.stack(packed)
opts=ort.SessionOptions();opts.intra_op_num_threads=4
sess=ort.InferenceSession(str(root/'data/models/bioclip2-image-int8.onnx'),sess_options=opts)
results=[]
for sample in samples:
 tid=sample['expected'];file=source/f'{tid}-{sample["photo"]}.jpg'
 im=Image.open(file).convert('RGB');w,h=im.size;k=min(w,h);im=im.crop(((w-k)/2,(h-k)/2,(w+k)/2,(h+k)/2)).resize((224,224),Image.Resampling.BICUBIC)
 x=((np.array(im,dtype=np.float32)/255-np.array([.48145466,.4578275,.40821073],dtype=np.float32))/np.array([.26862954,.26130258,.27577711],dtype=np.float32)).transpose(2,0,1)[None]
 t=time.perf_counter();v=sess.run(None,{'image':x})[0][0];v/=np.linalg.norm(v);scores=mat@v;order=np.argsort(-scores);rank=next(j+1 for j,i in enumerate(order) if taxa[i]==tid)
 r={'provider':'bioclip-country','expected':tid,'expectedName':metadata[tid]['scientificName'],'photo':sample['photo'],'imageSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'candidates':len(taxa),'rank':rank,'seconds':time.perf_counter()-t,'top':[{'name':metadata[taxa[i]]['scientificName'],'score':float(scores[i])} for i in order[:5]]};results.append(r);print(r['expectedName'],sample['photo'],'rank',rank,flush=True)
(out/'controls-bioclip-country.json').write_text(json.dumps(results,indent=2));print('TOTAL',len(results),'TOP1',sum(r['rank']==1 for r in results),'TOP5',sum(r['rank']<=5 for r in results),flush=True)
