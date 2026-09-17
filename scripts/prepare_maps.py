#!/usr/bin/env python3
"""Extract configured map coverage into static PMTiles files small enough for Pages."""
import argparse,hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--pmtiles',default='pmtiles');p.add_argument('--dry-run',action='store_true');a=p.parse_args()
 cfg=json.loads((ROOT/'config/map-build.json').read_text());out=ROOT/'public/maps';out.mkdir(parents=True,exist_ok=True);archives=[]
 fingerprint=hashlib.sha256(json.dumps(cfg,sort_keys=True).encode()).hexdigest()
 manifest=ROOT/'config/generated/maps.json'
 if manifest.exists() and not a.dry_run:
  previous=json.loads(manifest.read_text())
  if previous.get('buildFingerprint')==fingerprint and all((ROOT/'public'/entry['url'].lstrip('/')).exists() and (ROOT/'public'/entry['url'].lstrip('/')).stat().st_size==entry['bytes'] for entry in previous['archives']):
   print('Configured map archives already prepared.');return
 def extract(bounds,name):
  target=out/f'{name}.pmtiles'
  cmd=[a.pmtiles,'extract',cfg['source'],str(target),'--bbox='+','.join(map(str,bounds)),f"--maxzoom={cfg['maxZoom']}",'--download-threads=4']
  if a.dry_run:subprocess.run(cmd+['--dry-run'],check=True);return
  if not target.exists():subprocess.run(cmd,check=True)
  if target.stat().st_size>cfg['maxArchiveBytes']:
   w,s,e,n=bounds
   if e-w>n-s:mid=(e+w)/2;parts=[[w,s,mid,n],[mid,s,e,n]]
   else:mid=(s+n)/2;parts=[[w,s,e,mid],[w,mid,e,n]]
   for i,b in enumerate(parts):extract(b,f'{name}-{i}')
   target.unlink()
  else:archives.append({'url':f'/maps/{target.name}','bounds':bounds,'bytes':target.stat().st_size})
 for region in cfg['regions']:extract(region['bounds'],f"{region['id']}-{fingerprint[:10]}")
 if not a.dry_run:
  (ROOT/'config/generated/maps.json').write_text(json.dumps({'buildFingerprint':fingerprint,'source':cfg['source'],'maxZoom':cfg['maxZoom'],'archives':archives},indent=2)+'\n')
  print(f'Saved {len(archives)} archives; {sum(x["bytes"] for x in archives)/1e6:.1f} MB')
if __name__=='__main__':main()
