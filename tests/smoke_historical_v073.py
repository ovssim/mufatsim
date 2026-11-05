"""Offline Chromium test for generated verified crate manifest, modes, and odds labels."""
import json
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
manifest=json.loads((P/'data/historical-crates.json').read_text())
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
 page=browser.new_page(viewport={'width':1366,'height':900});errors=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.route('**/*',lambda route:route.abort())
 soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
 for node in soup.find_all(['script','link']):node.decompose()
 page.set_content(str(soup))
 page.evaluate('''() => {const state={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return state[k]||null},setItem(k,v){state[k]=v;}}});}''')
 page.add_style_tag(content=(P/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
 for file in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','js/app.js']:
  page.add_script_tag(content=(P/file).read_text())
 page.evaluate('(payload) => mergeHistoricalManifest(payload)',manifest)
 assert page.locator('[data-crate="series-1"]').count()==1
 assert page.locator('[data-crate="series-2"]').count()==1
 assert page.locator('[data-crate="series-30"]').count()==1
 assert page.locator('[data-crate="series-50"]').count()==1
 assert page.locator('[data-crate="series-82"]').count()==1
 assert page.locator('[data-crate="series-103"]').count()==1
 assert page.locator('[data-crate="series-3"]').count()==0 # no fake/unverified contents
 assert page.evaluate('ALL_CRATES.find(c=>c.id==="series-30").pool.length')==5
 assert page.evaluate('ALL_CRATES.find(c=>c.id==="series-30").pool[0].name')=='Strange Ullapool Caber'
 assert page.evaluate('ALL_CRATES.find(c=>c.id==="series-103").name')=='Mann Co. Supply Munition Series #103'
 page.locator('[data-crate="series-30"]').click()
 assert 'community' in page.locator('#detailodds').inner_text().lower()
 assert 'Salvaged Mann Co.' in page.locator('#detailname').inner_text()
 assert 'Strange Ullapool Caber' in page.locator('#detailpool').inner_text()
 assert 'Team Captain' not in page.locator('#detailpool').inner_text()
 page.locator('#close').click()
 page.locator('[data-mode="sandbox"]').click()
 page.locator('[data-crate="series-2"]').click()
 page.locator('#opencrate').click()
 page.wait_for_timeout(2400)
 assert page.evaluate('state.sandbox.items.length')==1
 assert page.evaluate('state.items.length')==0
 assert not page.evaluate('state.sandbox.items[0].grade')
 assert page.evaluate('state.sandbox.items[0].crateId')=='series-2'
 page.locator('#close').click()
 page.locator('[data-mode="economy"]').click()
 page.locator('[data-view="inventory"]').click()
 page.locator('[data-owned="series-1"]').click()
 page.locator('#opencrate').click()
 page.wait_for_timeout(2400)
 assert page.evaluate('state.items.length')==1
 assert page.evaluate('state.items[0].origin')=='economy'
 assert page.evaluate('state.items[0].crateId')=='series-1'
 assert not errors,errors
 browser.close()
 print('PASS: sourced historical crate pools, no fictitious series, Sandbox/Economy isolation and unboxing')
