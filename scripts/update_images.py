"""Build a public image manifest from Valve TF2 item schema. Requires STEAM_API_KEY."""
import json, os, urllib.request, urllib.parse
from pathlib import Path
key=os.environ['STEAM_API_KEY']
url='https://api.steampowered.com/IEconItems_440/GetSchemaItems/v1/?'+urllib.parse.urlencode({'key':key,'language':'en'})
with urllib.request.urlopen(url,timeout=60) as response:
    payload=json.load(response)
items=payload.get('result',{}).get('items',[])
images={};crates={}
for item in items:
    name=item.get('item_name')
    icon=item.get('image_url_large') or item.get('image_url')
    if not name or not icon or not icon.startswith('https://'):continue
    images.setdefault(name,icon)
    for attr in item.get('attributes',[]):
        if attr.get('name')=='set supply crate series':
            try: crates['series-'+str(int(attr['value']))]=icon
            except (ValueError,TypeError):pass
Path('data/steam-images.json').write_text(json.dumps({'items':images,'crates':crates},ensure_ascii=False,separators=(',',':'))+'\n')
print('Exported',len(images),'item icons and',len(crates),'crate icons')
