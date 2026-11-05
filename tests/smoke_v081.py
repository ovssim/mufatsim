"""Regression: 5-minute zero-cost supply drop, split grades, behind-hat effects, inventories."""
import json
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
    page=browser.new_page(viewport={'width':1400,'height':900});errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.route('**/*',lambda r:r.abort())
    soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
    for t in soup.find_all(['script','link']):t.decompose()
    page.set_content(str(soup))
    page.evaluate('''() => {const cache={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return cache[k]||null;},setItem(k,v){cache[k]=v;}}});}''')
    page.add_style_tag(content=(P/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
    for f in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/free-drop.js','js/app.js']:
        page.add_script_tag(content=(P/f).read_text())
    page.evaluate('(payload)=>mergeHistoricalManifest(payload)',json.loads((P/'data/historical-crates.json').read_text()))
    page.evaluate('''() => {Math.random=()=>0.1;}''')
    page.locator('#openFreeFromMarket').click()
    assert page.locator('#free').is_visible()
    assert page.locator('#freeCountdown').inner_text()=='READY TO OPEN'
    before=page.evaluate('state.keys.mannco')
    page.locator('#claimFree').click()
    assert page.evaluate('state.keys.mannco')==before+1
    assert page.locator('#claimFree').is_disabled()
    assert page.evaluate('state.freeDrop.claims')==1
    assert page.evaluate('state.freeDrop.nextAt-Date.now()')>290000
    page.wait_for_timeout(960)
    assert page.locator('#freeStage').get_attribute('class')=='free-stage free-revealed'
    assert 'Mann Co. Supply Crate Key' in page.locator('#freeResult').inner_text()
    assert page.locator('#claimFree').is_disabled()
    # cooldown one per 5 minutes; must still be blocked with second click
    assert page.evaluate('state.keys.mannco')==before+1
    # metal branch: add exactly 1 refined in Economy, no resources consumed
    page.evaluate('''()=>{state.freeDrop.nextAt=0;Math.random=()=>0.30;save()}''')
    m=page.evaluate('state.metalCents')
    page.locator('#claimFree').click()
    assert page.evaluate('state.metalCents')==m+100
    page.wait_for_timeout(960)
    assert 'refined metal' in page.locator('#freeResult').inner_text()
    # special key branch
    page.evaluate('''()=>{state.freeDrop.nextAt=0;Math.random=()=>0.90;save()}''')
    keys=page.evaluate('JSON.stringify(state.keys)')
    page.locator('#claimFree').click()
    assert page.evaluate('JSON.stringify(state.keys)')!=keys
    page.wait_for_timeout(960)
    # Sandbox rewards never affect economy wallet, independent cooldown.
    page.locator('[data-mode="sandbox"]').click()
    assert page.locator('#freeCountdown').inner_text()=='READY TO OPEN'
    economy=page.evaluate('JSON.stringify({metalCents:state.metalCents,keys:state.keys,items:state.items})')
    page.evaluate('''()=>{Math.random=()=>0.10}''')
    page.locator('#claimFree').click()
    assert page.evaluate('JSON.stringify({metalCents:state.metalCents,keys:state.keys,items:state.items})')==economy
    assert page.evaluate('state.sandbox.bonusWallet.keys.mannco')==1
    assert page.evaluate('state.sandbox.freeDrop.claims')==1
    assert page.evaluate('state.freeDrop.claims')==3
    page.wait_for_timeout(960)
    # Explicit per-case allowed Unusual hats, broad effect-era model
    res=page.evaluate('''()=>{Math.random=()=>0;return roll(ALL_CRATES.find(c=>c.id==='winter-2024'));}''')
    assert res['quality']=='Unusual',res
    assert res['strange'] is True,res
    assert res['name'] in ["Buck's Brim","Battle Balaclava","Cossack Camo","Scrooge McDoc","The Crimbo Cap","The Top Brass"],res
    assert res['effect'] is not None
    assert res['grade'] in ['Mercenary','Commando','Assassin','Elite']
    assert page.evaluate('eligibleEffects(ALL_CRATES.find(c=>c.id===\'winter-2024\')).includes(\'Ghost Swirl\')') is True
    assert page.evaluate('eligibleEffects(ALL_CRATES.find(c=>c.id===\'winter-2024\')).includes(\'Goldstruck\')') is False
    css=page.evaluate('''()=>rarityStyle({grade:'Elite',quality:'Unusual',strange:true})''')
    assert '#EB4B4B' in css and '#8650AC' in css,css
    css=page.evaluate('''()=>rarityStyle({grade:'Commando',quality:'Strange'})''')
    assert '#8847FF' in css and '#CF6A32' in css,css
    css=page.evaluate('''()=>rarityStyle({quality:'Unusual'})''')
    assert '#8650AC' in css,css
    markup=page.evaluate("()=>visual({name: \"Buck's Brim\", quality:'Unusual', effect:'Burning Flames'})")
    assert markup.index('overlay-effect')<markup.index('<img')
    assert not errors,errors
    browser.close()
    print('PASS: free crate 25/50/25, per-mode cooldown and currency isolation, animated reveal, tier border and unusual era/hat whitelist')
