"""Browser regression: indexed tool quotes and image fallback names."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1300,'height':850})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda route:route.abort())
 soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
 for tag in soup.find_all(['script','link']):tag.decompose()
 page.set_content(str(soup))
 for f in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/effect-renders.js','data/free-drop.js','data/promo-codes.js','js/app.js']:
  page.add_script_tag(content=(P/f).read_text())
 got=page.evaluate('''() => {
  marketData={items:{
    strangifier:{qualities:{Unique:{indices:{'441':11,'595':22}}}},
    kit:{qualities:{Unique:{indices:{'1-205':5,'3-205':50}}}},
    strangepartheavieskilled:{qualities:{Unique:{priceRef:6.3}}}
  },crates:{},keys:{},metadata:{}};
  imgCache.toolTargets['cowmangler5000strangifier']={family:'Strangifier',indexes:['441']};
  imgCache.toolTargets['rocketlauncherkillstreakkit']={family:'Killstreak Kit',indexes:['1-205']};
  const a=marketItemPrice({name:'Cow Mangler 5000 Strangifier',quality:'Unique'});
  const b=marketItemPrice({name:'Rocket Launcher Killstreak Kit',quality:'Unique'});
  const c=marketItemPrice({name:'Strange Part: Heavies Killed',quality:'Unique'});
  const d=marketItemPrice({name:'Unknown Strangifier',quality:'Unique'});
  const icons=imageSources({name:'Private Eye Strangifier'});
  const noIncorrectStrangePart=imageSources({name:'Strange Part: Unknown Counter'});
  return {a,b,c,d,icons,noIncorrectStrangePart};
 }''')
 assert got['a']==1100,got
 assert got['b']==500,got
 assert got['c']==630,got
 assert got['d'] is None,got
 assert any('strange_generic' in url for url in got['icons']),got
 assert not any('heavies_killed_large' in url for url in got['noIncorrectStrangePart']),got
 page.locator('[data-view="sell"]').click()
 assert page.locator('#sellPriceStatus').count()==1
 assert errors==[],errors
 browser.close()
print('PASS: tool-specific indexed market prices and safe image fallback')
