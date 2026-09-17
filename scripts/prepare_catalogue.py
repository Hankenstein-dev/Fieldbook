#!/usr/bin/env python3
"""Build a compact reference catalogue and a real, dated starter-cell query."""
import argparse,math
from pathlib import Path
from seed_stories import Client,read_json,write_json,INAT
ROOT=Path(__file__).resolve().parents[1]
def cell_for(lat,lng):
 ranges=[[-180,180],[-90,90]];coords=[lng,lat];axis=0;value=bits=0;result=''
 while len(result)<5:
  r=ranges[axis];mid=sum(r)/2;value*=2
  if coords[axis]>=mid:value+=1;r[0]=mid
  else:r[1]=mid
  axis=1-axis;bits+=1
  if bits==5:result+='0123456789bcdefghjkmnpqrstuvwxyz'[value];value=bits=0
 centre={'lat':sum(ranges[1])/2,'lng':sum(ranges[0])/2}
 def distance(lat,lng):
  r=math.pi/180;h=math.sin((lat-centre['lat'])*r/2)**2+math.cos(centre['lat']*r)*math.cos(lat*r)*math.sin((lng-centre['lng'])*r/2)**2
  return 6371.0088*2*math.atan2(math.sqrt(h),math.sqrt(1-h))
 radius=max(8,math.ceil((5+max(distance(lat,lng) for lat in ranges[1] for lng in ranges[0]))*10)/10)
 return result,centre,radius
def normalise(t,groups):
 group=next((key for key,g in groups.items() if t.get('iconic_taxon_name') in g['iconicTaxa']),'other')
 d={'id':t['id'],'scientificName':t['name'],'commonName':t.get('preferred_common_name') or t['name'],
  'alternativeNames':list(dict.fromkeys(n['name'] for n in t.get('names',[]) if n.get('is_valid',True))),
  'group':group,'rank':t.get('rank','species')}
 family=next((a['name'] for a in t.get('ancestors',[]) if a['rank']=='family'),None)
 if family:d['family']=family
 p=t.get('default_photo')
 if p:
  url=p.get('medium_url') or p.get('square_url') or p.get('url')
  if url:d['photo']={'url':url.replace('/square.','/medium.'),'attribution':p.get('attribution','iNaturalist contributor'),'license':p.get('license_code') or 'all-rights-reserved','sourceUrl':f'https://www.inaturalist.org/photos/{p["id"]}'}
 return d
def main():
 p=argparse.ArgumentParser();p.add_argument('--offline',action='store_true');args=p.parse_args()
 seed=read_json(ROOT/'config/seed.json');countries=read_json(ROOT/'config/countries.json');groups=read_json(ROOT/'config/groups.json');country=countries[seed['country']]
 raw=ROOT/'data/raw'/seed['country']/seed['group'];m=read_json(raw/'manifest.json');catalogue=[normalise(read_json(raw/f'{i}.json')['taxon'],groups) for i in m['taxonIds']]
 write_json(ROOT/'config/generated/catalogue.json',catalogue)
 cell,centre,minimum_radius=cell_for(country['start']['lat'],country['start']['lng']);client=Client(raw/'_http',offline=args.offline);rows={};sources=[]
 for radius in [minimum_radius,25]:
  page=1;rows={}
  while True:
   envelope=client.get(INAT+'/observations/species_counts',{'lat':centre['lat'],'lng':centre['lng'],'radius':radius,'iconic_taxa':','.join(groups[seed['group']]['iconicTaxa']),'locale':'en','per_page':200,'page':page})
   sources.append({k:envelope[k] for k in ['url','fetchedAt']});data=envelope['data'];before=len(rows)
   for row in data['results']:rows[row['taxon']['id']]=row
   print('Starter query:',len(rows),'/',data['total_results'],flush=True)
   if len(rows)>=data['total_results']:break
   if len(rows)==before:raise RuntimeError('Incomplete starter query')
   page+=1
  if len(rows)>=40:break
 index={s['id']:s for s in catalogue}
 candidates=[{'species':index.get(i,normalise(row['taxon'],groups)),'count':row['count']} for i,row in rows.items()]
 fetched=min(s['fetchedAt'] for s in sources)
 from datetime import datetime
 output={'key':f"{seed['country']}:{seed['group']}:{cell}:unknown",'cell':cell,'habitat':'unknown','centre':centre,'radius':radius,'total':len(rows),
  'candidates':candidates,'fetchedAt':int(datetime.fromisoformat(fetched).timestamp()*1000),'complete':True}
 write_json(ROOT/'config/generated/starter.json',output)
 write_json(raw/'starter-query.json',{'cell':cell,'centre':centre,'radius':radius,'sources':sources,'taxa':list(rows.values())})
 print('Starter saved:',len(rows),'taxa; network requests:',client.network_requests)
if __name__=='__main__':main()
