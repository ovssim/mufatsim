"""Local Chromium gameplay regression smoke test (offline)."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
 page=browser.new_page(viewport={'width':1300,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/*',lambda route:route.abort())
 soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
 for t in soup.find_all(['script','link']):t.decompose()
 page.set_content(str(soup))
 page.evaluate('''() => {const memory={}; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return memory[k]||null},setItem(k,v){memory[k]=v;}}});}''')
 css=(P/'css/style.css').read_text()
 css=css.replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",'')
 page.add_style_tag(content=css)
 for f in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','js/app.js']:
  page.add_script_tag(content=(P/f).read_text())
 assert page.locator('[data-crate]').count()>=100
 assert page.evaluate('namedItem({name:"Team Captain",quality:"Unique"})')=='Team Captain'
 assert page.evaluate('namedItem({name:"Strange Sandvich",quality:"Strange"})')=='Strange Sandvich'
 assert page.evaluate('STOCK_CRATE_IMAGE.includes("crate_large")')
 assert page.evaluate('STOCK_KEY_IMAGE.includes("key_large")')
 page.locator('[data-crate="series-1"]').click();assert page.locator('#detail').evaluate('(e)=>e.open')
 page.mouse.click(1,1);assert not page.locator('#detail').evaluate('(e)=>e.open')
 page.locator('[data-mode="sandbox"]').click();page.locator('[data-crate="winter-2024"]').click();page.locator('#opencrate').click()
 page.wait_for_timeout(2400)
 assert page.evaluate('state.sandbox.items.length')==1
 assert page.evaluate('state.items.length')==0
 assert page.locator('#stage').evaluate('(e)=>e.classList.contains("revealed")')
 page.locator('#close').click();page.locator('[data-view="sell"]').first.click()
 assert 'Sandbox inventory cannot be sold' in page.locator('#sellinventory').inner_text()
 page.locator('[data-mode="economy"]').click();page.locator('[data-view="inventory"]').first.click()
 assert page.locator('[data-owned="series-1"]').count()==1
 page.locator('[data-owned="series-1"]').click();page.locator('#opencrate').click();page.wait_for_timeout(2400)
 assert page.evaluate('state.items.length')==1
 assert page.evaluate('state.items[0].origin')=='economy'
 assert page.evaluate('state.sandbox.items.length')==1
 page.locator('#close').click();page.locator('[data-view="sell"]').first.click()
 assert page.locator('[data-sell]').count()==1
 page.locator('[data-sell]').click()
 assert page.evaluate('state.items.length')==0
 page.evaluate('''() => {marketData={items:{teamcaptain:{qualities:{Unusual:{effects:{burningflames:100}}}}},crates:{'series-1':1.11},keys:{manncosupplycratekey:65.88}};}''')
 assert page.evaluate('crateQuote(ALL_CRATES.find(c=>c.id==="series-1")).cents')==111
 assert page.evaluate('marketItemPrice({name:"Team Captain",quality:"Unusual",effect:"Burning Flames"})')==10000
 assert not errors,errors
 browser.close()
 print('Browser gameplay smoke PASS: sandbox isolation, selling, dialogs, reveal, price quotes')
