"""Regression test: site owner sets fixed quotes; players cannot override them."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P = Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--no-proxy-server'])
    page = browser.new_page(viewport={'width':1320,'height':900})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/*', lambda r: r.abort())
    soup = BeautifulSoup((P/'index.html').read_text(), 'html.parser')
    for t in soup.find_all(['script','link']): t.decompose()
    page.set_content(str(soup))
    # Inject old save overrides to verify they cannot control new payouts.
    page.evaluate('''() => {
      const store = {'tf2-unbox-beta-1':JSON.stringify({
        mode:'economy', originMigrationV7:true, defaultSellPrice:888800,
        metalCents:20000, keys:{mannco:1}, crates:{},
        sandbox:{items:[{name:'Team Captain',quality:'Unique',origin:'sandbox',sellPrice:999999}],opened:0,unusuals:0},
        items:[{name:'Team Captain',quality:'Unique',origin:'economy',sellPrice:999999},
               {name:'NoMarketHat',quality:'Unique',origin:'economy',sellPrice:999999},
               {name:'Team Captain',quality:'Unique',origin:'legacy',sellPrice:999999}]
      })};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
       getItem(k){return store[k]||null}, setItem(k,v){store[k]=v}
      }});
    }''')
    page.add_style_tag(content=(P/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
    for file in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','js/app.js']:
        page.add_script_tag(content=(P/file).read_text())
    page.wait_for_timeout(100)
    page.locator('[data-view="sell"]').click()
    assert page.locator('#defaultSellPrice').count()==0
    assert page.locator('#saveSellPrice').count()==0
    assert page.locator('[data-save-custom]').count()==0
    assert page.locator('[data-custom-input]').count()==0
    assert page.locator('[data-clear-custom]').count()==0
    assert page.evaluate('state.items.every(i=>i.sellPrice===undefined)')
    assert page.evaluate('state.defaultSellPrice===undefined')
    assert page.locator('[data-sell="2"]').is_disabled()
    assert '12.00 ref' in page.locator('[data-sell="0"]').inner_text()
    assert '1.00 ref' in page.locator('[data-sell="1"]').inner_text()
    assert 'Simulator fallback' in page.locator('#sellinventory').inner_text()
    # Market quote must supersede the fixed file price.
    page.evaluate('''() => {marketData={items:{teamcaptain:{qualities:{Unique:{priceRef:12.34}}}},crates:{},keys:{},metadata:{updatedAt:'2026-11-04'}};refresh();}''')
    assert '12.34 ref' in page.locator('[data-sell="0"]').inner_text()
    assert 'backpack.tf suggested price' in page.locator('#sellinventory').inner_text()
    page.locator('[data-sell="0"]').click()
    assert page.evaluate('state.metalCents')==21234
    assert page.evaluate('state.items.length')==2
    # Sandbox isolation stays unchanged.
    page.locator('[data-mode="sandbox"]').click()
    assert 'cannot be sold' in page.locator('#sellinventory').inner_text()
    assert page.locator('[data-sell]').count()==0
    assert not errors, errors
    browser.close()
    print('PASS: fixed file/API prices, old overrides ignored, no player editing, sandbox and legacy lock')
