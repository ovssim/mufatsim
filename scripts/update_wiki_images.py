#!/usr/bin/env python3
"""Best-effort Wiki MediaWiki API image URL resolver for older TF2 cosmetics/tools.
Writes URLs only, not actual image files; preserves all existing Steam schema URLs.
"""
import json,re,sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request,urlopen
MAP=Path('data/steam-images.json')
def norm(s):return re.sub('[^a-z0-9]+','',s.lower().replace('’',"'"))
def run():
 if not MAP.exists():return
 data=json.loads(MAP.read_text());data.setdefault('items',{});data.setdefault('normalized',{})
 names=json.loads(Path('data/extra-image-names.json').read_text())
 historic=Path('data/historical-crates.json')
 if historic.exists():
  for c in json.loads(historic.read_text()).get('crates',[]):
   names.append(c.get('name',''))
   names.extend(i.get('name','') for i in c.get('pool',[]))
 manifest=Path('data/cases-generated.json')
 if manifest.exists():
  for c in json.loads(manifest.read_text()).get('cases',[]):
   names.append(c.get('name',''));names.extend(i.get('name','') for i in c.get('pool',[]))
 names=list(dict.fromkeys(n.strip() for n in names if isinstance(n,str) and n.strip() and norm(n) not in data['normalized']))
 count=0
 for offset in range(0,len(names),25):
  batch=names[offset:offset+25]
  requested={norm('Backpack_'+n):n for n in batch}
  titles=['File:Backpack_'+n.replace('’',"'").replace(' ','_')+'.png' for n in batch]
  api='https://wiki.teamfortress.com/w/api.php?'+urlencode({'action':'query','format':'json','prop':'imageinfo','iiprop':'url','redirects':1,'titles':'|'.join(titles)})
  try:
   with urlopen(Request(api,headers={'User-Agent':'TF2-Unboxing-Simulator/0.7'}),timeout=20) as r:content=json.load(r)
  except Exception as e:
   print('Legacy image query failed:',str(e)[:100],file=sys.stderr);continue
  # MediaWiki may normalize or redirect the requested file title.
  for redirect in content.get('query',{}).get('redirects',[]):
   original=requested.get(norm(redirect.get('from','').removeprefix('File:').removesuffix('.png')))
   if original: requested[norm(redirect.get('to','').removeprefix('File:').removesuffix('.png'))]=original
  for normal in content.get('query',{}).get('normalized',[]):
   original=requested.get(norm(normal.get('from','').removeprefix('File:').removesuffix('.png')))
   if original: requested[norm(normal.get('to','').removeprefix('File:').removesuffix('.png'))]=original
  for item in content.get('query',{}).get('pages',{}).values():
   if 'missing' in item or not item.get('imageinfo'):continue
   title=item.get('title','').removeprefix('File:').removesuffix('.png')
   name=requested.get(norm(title));url=item['imageinfo'][0].get('url','')
   if name and url.startswith('https://') and 'wiki.teamfortress.com' in url:
    data['items'].setdefault(name,url);data['normalized'].setdefault(norm(name),url);count+=1
 if count:MAP.write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False)+'\n')
 print(f'Legacy Wiki images: {count} mapped / {len(names)} missing aliases tried.')
if __name__=='__main__':run()
