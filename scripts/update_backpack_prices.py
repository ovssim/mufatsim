#!/usr/bin/env python3
"""Cache backpack.tf IGetPrices/v4 suggested prices. NOT average live listings.
Key is read only from GitHub Actions secret BACKPACK_TF_API_KEY.
"""
import json,os,re,sys
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request,urlopen
OUT=Path('data/backpack-prices.json')
QUAL={'1':'Genuine','3':'Vintage','5':'Unusual','6':'Unique','11':'Strange','13':'Haunted','14':"Collector's",'15':'Decorated'}
FX={'9':'Green Energy','10':'Purple Energy','13':'Burning Flames','17':'Sunbeams','33':'Orbiting Fire'}
def norm(n):
 return re.sub('[^a-z0-9]+','',re.sub(r'^(?:the|strange|unusual|vintage|genuine)\s+','',str(n).lower()).replace('’',"'"))
def quote(e,rate):
 if not isinstance(e,dict):return None
 try:
  a=float(e['value']);b=float(e.get('value_high',a));v=(a+b)/2 if b>=a else a
  if not (0<=v<1000000):return None
  unit=e.get('currency');return round(v if unit=='metal' else v*rate,2) if unit in ('metal','keys') else None
 except (KeyError,TypeError,ValueError):return None
def extract(data,rate=65.88):
 entries=data.get('response',{}).get('items',{})
 if not isinstance(entries,dict) or not entries:raise ValueError('No backpack.tf item prices')
 result={'items':{},'crates':{},'keys':{},'metadata':{'source':'backpack.tf community guide IGetPrices/v4','updatedAt':datetime.now(timezone.utc).date().isoformat(),'keyValueRef':rate}}
 for name,obj in entries.items():
  if not isinstance(obj,dict) or not isinstance(obj.get('prices'),dict):continue
  key=norm(name);record=result['items'].setdefault(key,{'name':name,'qualities':{}})
  for quality,branch in obj['prices'].items():
   if str(quality) not in QUAL or not isinstance(branch,dict):continue
   t=branch.get('Tradable',{});c=t.get('Craftable',{}) if isinstance(t,dict) else {}
   if not isinstance(c,dict):continue
   for index,entry in c.items():
    if isinstance(entry,list):
     entry=max((x for x in entry if isinstance(x,dict)),key=lambda x:x.get('last_update',0),default=None)
    value=quote(entry,rate)
    if value is None:continue
    qname=QUAL[str(quality)];q=record['qualities'].setdefault(qname,{})
    if qname=='Unusual' and str(index) in FX:q.setdefault('effects',{})[norm(FX[str(index)])]=value
    elif str(index)=='0':q['priceRef']=value
    if qname=='Unique' and index and str(index).isdigit() and int(index)>0 and re.search(r'Mann Co\. Supply (Crate|Munition)',name,re.I):
     result['crates']['series-'+str(int(index))]=value
    if qname=='Unique' and str(index)=='0' and re.search(r'Cosmetic Case|Unlocked Cosmetic Crate|Community Crate',name,re.I):
     result['crates']['name:'+key]=value
    if qname=='Unique' and str(index)=='0' and name.endswith(' Key'):
     result['keys'][key]=value
  if not record['qualities']:result['items'].pop(key,None)
 if not result['items']:raise ValueError('Empty parsed price data')
 return result
def main():
 if len(sys.argv)>2 and sys.argv[1]=='--fixture':data=json.loads(Path(sys.argv[2]).read_text())
 else:
  key=os.environ.get('BACKPACK_TF_API_KEY','').strip()
  if not key:print('No backpack.tf key: bundled simulator prices will be used.');return
  url='https://backpack.tf/api/IGetPrices/v4/?'+urlencode({'key':key,'appid':440})
  with urlopen(Request(url,headers={'User-Agent':'TF2-Unboxing-Simulator/0.7'}),timeout=45) as response:data=json.load(response)
 price=extract(data,float(os.environ.get('TF2_KEY_REF','65.88')))
 OUT.write_text(json.dumps(price,separators=(',',':'),ensure_ascii=False)+'\n',encoding='utf-8')
 print('Prices:',len(price['items']),'items,',len(price['crates']),'crates,',len(price['keys']),'keys')
if __name__=='__main__':main()
