"""v0.9.5: seller hides favorited items, indices safe, 0.99% custom rate preserved."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parents[1]
scripts=['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/effect-renders.js','data/free-drop.js','data/promo-codes.js','data/case-recovery-bundle.js','js/app.js','js/tradeups.js']
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
    page=browser.new_page()
    errs=[]
    page.on('pageerror',lambda e:errs.append(str(e)))
    page.route('**/*',lambda r:r.abort())
    soup=BeautifulSoup((BASE/'index.html').read_text(),'html.parser')
    for tag in soup.find_all(['script','link']):tag.decompose()
    page.set_content(str(soup))
    page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>d[k]||null,setItem:(k,v)=>{d[k]=v;}}});}""")
    for src in scripts:
        content=(BASE/src).read_text()
        if src=='data/unusual-rules.js':content=content.replace('const UNIVERSAL_UNUSUAL_CHANCE = 0.0066;', 'const UNIVERSAL_UNUSUAL_CHANCE = 0.0099;')
        page.add_script_tag(content=content)
    before=page.evaluate("""() => {
        state.mode='economy';
        state.items=[
          {name:'Favorite One',quality:'Unique',kind:'Cosmetic',origin:'economy',instanceId:'a',favorite:true},
          {name:'Sell Me',quality:'Unique',kind:'Cosmetic',origin:'economy',instanceId:'b'},
          {name:'Favorite Two',quality:'Unique',kind:'Cosmetic',origin:'economy',instanceId:'c',favorite:true},
          {name:'Sell That',quality:'Unique',kind:'Cosmetic',origin:'economy',instanceId:'d'}
        ];
        refresh();
        return {rate:unusualRate(ALL_CRATES.find(c=>c.id==='case-102')),names:state.items.map(i=>i.name)};
    }""")
    assert abs(before['rate']-0.0099)<1e-9,before
    page.locator('[data-view="sell"]').click()
    assert page.locator('#sellinventory .sell-tile').count()==2
    assert page.locator('#sellinventory').get_by_text('Favorite One').count()==0
    assert page.locator('#sellinventory').get_by_text('Favorite Two').count()==0
    ids=page.locator('#sellinventory [data-sell]').evaluate_all('(nodes)=>nodes.map(x=>x.dataset.sell)')
    assert ids==['1','3'],ids
    # A filtered list's second button sells the fourth element of the underlying state.items array.
    page.locator('#sellinventory [data-sell="3"]').click()
    names=page.evaluate('state.items.map(i=>i.name)')
    assert names==['Favorite One','Sell Me','Favorite Two'],names
    # Change a favorite without visiting seller, and guard stale clicks.
    page.evaluate("""() => {state.items[1].favorite=true;renderSell();}""")
    assert page.locator('#sellinventory .sell-tile').count()==0
    assert 'No unfavorited items available' in page.locator('#sellinventory').inner_text()
    page.evaluate("""() => {state.items[1].favorite=false;save();}""")
    assert page.locator('#sellinventory .sell-tile').count()==1
    assert page.locator('#sellinventory [data-sell]').get_attribute('data-sell')=='1'
    # A previously rendered button cannot sell an item subsequently protected as a favorite.
    page.evaluate("""() => {state.items[1].favorite=true;}""")
    page.locator('#sellinventory [data-sell="1"]').click()
    assert page.evaluate('state.items.length')==3
    assert not errs,errs
    print('PASS: 0.99% Unusual, favorites hidden, original sell indices intact, stale sale blocked, no JS errors')
    browser.close()
