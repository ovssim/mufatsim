"""Promo Unusual once per save, locked resale, delete confirmation and mode isolation."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
    page=browser.new_page(viewport={'width':1400,'height':900},accept_downloads=True)
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.route('**/*',lambda r:r.abort())
    soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
    for t in soup.find_all(['script','link']): t.decompose()
    page.set_content(str(soup))
    page.evaluate('''() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return data[k]||null;},setItem(k,v){data[k]=v;}}});}''')
    page.add_style_tag(content=(P/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
    for file in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/free-drop.js','data/promo-codes.js','js/app.js']:
        page.add_script_tag(content=(P/file).read_text())
    # Promo in economy is guaranteed unusual, once per browser save.
    page.locator('[data-view="redeem"]').click()
    page.locator('#redeemCode').fill('unusual100')
    page.locator('#redeemButton').click()
    reward=page.evaluate('state.items[0]')
    assert reward['quality']=='Unusual' and reward['effect'] and reward['promoReward'] and reward['sellable'] is False,reward
    assert reward['origin']=='economy'
    assert page.evaluate('cannotSell(state.items[0])') is True
    assert page.evaluate('Object.keys(state.redeemedCodes).length')==1
    assert page.locator('#redeemButton').is_disabled()
    assert page.locator('#promoResult').inner_text().find('NOT SELLABLE')>=0
    # Verify even if player switches away from tab, Sell Market refuses redemption reward.
    page.locator('[data-view="sell"]').click()
    assert page.locator('[data-sell="0"]').is_disabled()
    assert 'PROMO' in page.locator('[data-sell="0"]').inner_text()
    # Gift deleted only after confirmation; Cancel does not remove.
    page.locator('[data-view="inventory"]').click()
    page.locator('[data-delete="0"]').click()
    assert page.locator('#deleteConfirm').is_visible()
    page.locator('#cancelDelete').click()
    assert page.evaluate('state.items.length')==1
    page.locator('[data-delete="0"]').click()
    page.locator('#confirmDelete').click()
    assert page.evaluate('state.items.length')==0
    assert page.evaluate('state.redeemedCodes.UNUSUAL100') is True
    page.locator('[data-view="redeem"]').click()
    assert page.locator('#redeemButton').is_disabled()
    # Backup is JSON, but its filename is not tied to repository name.
    page.locator('[data-view="stats"]').click()
    with page.expect_download() as info:
        page.locator('#exportSave').click()
    assert info.value.suggested_filename=='mannco-unboxing-save.json'
    # Simulate separate fresh save, then redeem in sandbox and check economy untouched.
    page.evaluate('''() => {state.redeemedCodes={};state.items=[];state.sandbox.items=[];save();}''')
    page.locator('[data-mode="sandbox"]').click()
    page.locator('[data-view="redeem"]').click()
    page.locator('#redeemCode').fill('UNUSUAL100')
    page.locator('#redeemButton').click()
    assert page.evaluate('state.sandbox.items.length')==1
    assert page.evaluate('state.items.length')==0
    assert page.evaluate('cannotSell(state.sandbox.items[0])') is True
    # Sandbox backpack deletion is independent.
    page.locator('[data-view="inventory"]').click()
    page.locator('[data-delete="0"]').click()
    page.locator('#confirmDelete').click()
    assert page.evaluate('state.sandbox.items.length')==0
    assert page.evaluate('state.items.length')==0
    assert errors==[],errors
    browser.close()
print('PASS: code redeem once, guaranteed unusual, permanent sale restriction, delete confirm, save export, and mode separation')
