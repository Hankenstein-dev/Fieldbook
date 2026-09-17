"""Build pinned BioCLIP 2 browser assets; run in the documented model-build venv."""
import hashlib,json,urllib.request
from pathlib import Path
import torch,open_clip,onnx
from safetensors.torch import load_file
from onnxruntime.quantization import quantize_dynamic,QuantType
ROOT=Path(__file__).resolve().parents[1];RAW=ROOT/'data/models';OUT=ROOT/'public/models';RAW.mkdir(exist_ok=True);OUT.mkdir(exist_ok=True)
REV='2957b322090f9cb17ae72c71981c7218a28d81e0';BASE=f'https://huggingface.co/imageomics/bioclip-2/resolve/{REV}/'
def download(url,path):
 if not path.exists():
  print('Download',url,flush=True);urllib.request.urlretrieve(url,str(path)+'.tmp');Path(str(path)+'.tmp').rename(path)
 return path
weights=download(BASE+'open_clip_model.safetensors',RAW/'bioclip2.safetensors')
text=RAW/'bioclip2-text-int8.onnx'
if not text.exists():
 print('Export text encoder',flush=True)
 model=open_clip.create_model('ViT-L-14',pretrained=None);state=load_file(weights)
 # The second visual projector is irrelevant to the matching biological text tower.
 model.load_state_dict(state,strict=True);model.eval();torch.set_num_threads(4)
 class TextEncoder(torch.nn.Module):
  def __init__(self,m):super().__init__();self.token_embedding=m.token_embedding;self.positional_embedding=m.positional_embedding;self.transformer=m.transformer;self.ln_final=m.ln_final;self.text_projection=m.text_projection;self.register_buffer('attn_mask',m.attn_mask)
  def forward(self,tokens):
   x=self.token_embedding(tokens)+self.positional_embedding
   x=self.transformer(x,attn_mask=self.attn_mask);x=self.ln_final(x)
   return x[torch.arange(x.shape[0]),tokens.argmax(dim=-1)]@self.text_projection
 encoder=TextEncoder(model).eval();del model
 tokens=open_clip.get_tokenizer('ViT-L-14')(['a photo of a plant'])
 torch.onnx.export(encoder,tokens,RAW/'text-fp32.onnx',input_names=['input_ids'],output_names=['text_features'],opset_version=17,dynamo=False)
 quantize_dynamic(str(RAW/'text-fp32.onnx'),str(text),weight_type=QuantType.QInt8,op_types_to_quantize=['MatMul','Gemm','Gather'])
 print('Text bytes',text.stat().st_size,flush=True)
vision=download('https://huggingface.co/mahan-ym/bioclip-2-quantized/resolve/28df31a338efac8366d66660aed4753a528eae8b/onnx/bioclip2_model_int8.onnx',RAW/'bioclip2-image-int8.onnx')
manifest={'id':'bioclip2-int8-v1','label':'BioCLIP 2','dimensions':768,'imageSize':224,'mean':[.48145466,.4578275,.40821073],'std':[.26862954,.26130258,.27577711],'license':'MIT','source':'https://huggingface.co/imageomics/bioclip-2','revision':REV,'files':{}}
for name,path in [('image',vision),('text',text)]:
 parts=[]
 with path.open('rb') as f:
  i=0
  while chunk:=f.read(23_000_000):
   digest=hashlib.sha256(chunk).hexdigest();filename=f'{name}-{digest[:12]}-{i}.bin';(OUT/filename).write_bytes(chunk);parts.append({'url':f'/models/{filename}','bytes':len(chunk),'sha256':digest});i+=1
 m=onnx.load(path)
 manifest['files'][name]={'parts':parts,'bytes':path.stat().st_size,'input':m.graph.input[0].name,'output':m.graph.output[0].name}
for name in ['tokenizer.json','tokenizer_config.json','special_tokens_map.json']:
 download(BASE+name,OUT/name)
manifest['tokenizerBytes']=sum((OUT/n).stat().st_size for n in ['tokenizer.json','tokenizer_config.json'])
manifest['bytes']=sum(f['bytes']for f in manifest['files'].values())
(ROOT/'config/generated/identification.json').write_text(json.dumps(manifest,indent=2)+'\n');print('Prepared',manifest['bytes'],'model bytes',flush=True)
