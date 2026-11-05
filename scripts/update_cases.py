#!/usr/bin/env python3
"""Fetch public case collection metadata (names, grades, image URLs).

No private keys or item icon downloads. Sources: collection guide index and their
individual cosmetic/decorated-weapon case pages. The generated JSON is factual
metadata, not a Valve API or a probability oracle. This is a best-effort importer:
failures never replace the last known-good manifest.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from bs4 import BeautifulSoup

BASE='https://tf2tradeups.com'
INDEX=BASE+'/collections'
OUTPUT=Path('data/cases-generated.json')
GRADES=('Civilian','Freelance','Mercenary','Commando','Assassin','Elite')
IMAGE_HOSTS={'community.fastly.steamstatic.com','community.steamstatic.com',
             'steamcommunity-a.akamaihd.net','media.steampowered.com',
             'steamcdn-a.akamaihd.net','wiki.teamfortress.com'}
LEGACY_IDS={'Winter 2023 Cosmetic Case':'winter-2023',
            'Summer 2024 Cosmetic Case':'summer-2024',
            'Winter 2024 Cosmetic Case':'winter-2024'}


def safe_image(src):
    if not src: return ''
    parts=urlsplit(src)
    if parts.hostname not in IMAGE_HOSTS or parts.scheme not in ('http','https'): return ''
    return src.replace('http://','https://',1)


def tidy(text):
    return re.sub(r'\s+',' ',text or '').strip()


def get(url):
    req=Request(url,headers={'User-Agent':'TF2-Unboxing-Simulator/0.6 (public metadata import)'})
    with urlopen(req,timeout=35) as res:
        return res.read().decode('utf-8','replace')


def collection_links(markup):
    soup=BeautifulSoup(markup,'html.parser')
    found={}
    for a in soup.find_all('a',href=True):
        path=urlsplit(urljoin(BASE,a['href'])).path
        if not re.fullmatch(r'/collections/[a-z0-9-]+',path):continue
        name=tidy(a.get_text(' ',strip=True))
        if not name or not any(x in name.lower() for x in ('cosmetic','quarantined','confidential','gargoyle','creepy crawly','violet vermin','crimson cache','spooky spoils','ghoulish gains','spectral stash','haunted hoard','terrifying trove','bone-chilling','unleash the beast','mayflower','rainy day','tough break','gun mettle','pyroland','powerhouse','warbird')):
            continue
        # Ignore War Paint collections, because user asked for no War Paint cases.
        if 'war paint' in name.lower(): continue
        found[path]=name
    return found


def matching_case_title(soup):
    # Each guide explicitly labels its container and usually includes its series.
    for h in soup.find_all(['h2','h3']):
        title=tidy(h.get_text(' ',strip=True))
        if (re.search(r'(?:Cosmetic Case|Weapons? Case|Community Update Case|Collection Case|Special Case|Hoard Case|Stash Case|Trove Case|Bonanza Case|Cache Case|Gains Case|Spoils Case|Crawly Case|Vermin Case|Gargoyle Case|Crate)$',title,re.I)
            and 'War Paint' not in title and 'Collection Trade-Up' not in title):
            return h, title
    return None,''


def parse_collection(markup,source):
    soup=BeautifulSoup(markup,'html.parser')
    heading,title=matching_case_title(soup)
    if not title:return None
    # Gather the grade-level reward content only in the "Individual Item Odds" section;
    # the same rewards are duplicated lower down in trade-up/market tables.
    odds_heading=next((h for h in soup.find_all(re.compile('^h[1-6]$'))
                       if 'Individual Item Odds' in tidy(h.get_text(' ',strip=True))),None)
    if not odds_heading:return None
    pool=[]; current_grade=None
    for node in odds_heading.next_elements:
        if getattr(node,'name',None) in ('h1','h2','h3','h4','h5','h6'):
            label=tidy(node.get_text(' ',strip=True))
            if 'Available trade-up routes' in label or 'Eligible Mercenary inputs' in label:break
            new_grade=next((g for g in GRADES if re.fullmatch(re.escape(g)+r'\s+Grade',label,re.I)),None)
            if new_grade:current_grade=new_grade
            elif node.name in ('h1','h2') and 'Individual Item Odds' not in label:break
        elif getattr(node,'name',None)=='img' and current_grade:
            img=(safe_image(node.get('src')) or safe_image(node.get('data-src')))
            name=tidy(node.get('alt'))
            if not img or not name or name.lower() in ('item','image','icon','loading'):continue
            if not any(e['name']==name for e in pool):
                pool.append({'name':name,'grade':current_grade,'quality':'Unique','kind':'Cosmetic',
                             'image':img})
    if len(pool)<8:return None
    # Some source collections are weapon cases (rather than cosmetics).
    is_weapon='weapon' in title.lower()
    if is_weapon:
        for item in pool:item['kind']='Weapon';item['quality']='Decorated'
    surrounding=tidy(soup.get_text(' ',strip=True))
    series_match=re.search(r'Series\s*#\s*(\d+)',surrounding,re.I)
    series=int(series_match.group(1)) if series_match else None
    # Narrow the key lookup to text after the matched container title, if possible.
    relevant=surrounding[surrounding.find(title):surrounding.find(title)+700]
    keymatch=re.search(r'Requires\s+(?:an?\s+)?([^\.]{2,100}?\s+Key)\s+to open',relevant,re.I)
    # Never invent a key requirement. Skip ambiguous guides instead.
    if not keymatch:return None
    keyname=tidy(keymatch.group(1))
    keyname=re.sub(r'^a\s+','',keyname,flags=re.I)
    if not keyname.lower().endswith('key'):return None
    cid=LEGACY_IDS.get(title,'case-'+str(series) if series else 'case-'+re.sub('[^a-z0-9]+','-',title.lower()).strip('-'))
    # The first image with matching alt usually appears near the container heading.
    icon=''
    for img in soup.find_all('img',alt=True):
        if tidy(img.get('alt'))==title:
            icon=(safe_image(img.get('src')) or safe_image(img.get('data-src')))
            if icon:break
    return {'id':cid,'name':title,'kind':'special','series':series,'image':icon,
            'keyName':keyname,'pool':pool,'graded':True,'verified':True,
            'description':f'{len(pool)} items and their grades imported from a community collection reference. Bonus rolls and historical unusual effect eligibility are not guaranteed.',
            'oddsSource':'Simulator model: 80 / 16 / 3.2 / 0.8 grades (not official Valve rates).',
            'source':source}


def build(fetch=get):
    urls=collection_links(fetch(INDEX))
    print('Found',len(urls),'candidate cosmetic/decorated case guides')
    cases=[];errors=[]
    for path,name in urls.items():
        try:
            case=parse_collection(fetch(BASE+path),BASE+path)
            if case:cases.append(case)
        except Exception as err:
            errors.append((path,str(err)))
    unique={c['id']:c for c in cases}
    print('Imported',len(unique),'graded cases with pools, failed',len(errors))
    if len(unique)<3:
        raise RuntimeError('Too few source cases successfully parsed; keeping existing case manifest')
    return {'cases':list(unique.values()),'metadata':{'source':'https://tf2tradeups.com/collections',
          'cases':len(unique),'totalItems':sum(len(c['pool']) for c in unique.values()),
          'note':'Grade groupings are source references. Opening odds are simulator assumptions.'}}


def main():
    manifest=build()
    OUTPUT.parent.mkdir(exist_ok=True,parents=True)
    OUTPUT.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print('Saved',OUTPUT,manifest['metadata'])

if __name__=='__main__':main()
