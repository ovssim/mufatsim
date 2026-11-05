"""Local Chromium smoke test. Run: python tests/smoke_browser.py"""
import os
import re
from bs4 import BeautifulSoup
import threading
import http.server
import socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright
os.chdir(Path(__file__).resolve().parents[1])
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
class Server(socketserver.ThreadingTCPServer):allow_reuse_address=True
server=Server(('127.0.0.1',0),QuietHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://localhost:{server.server_address[1]}/'
errs=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
    page=browser.new_page(viewport={'width':1350,'height':930})
    page.set_default_timeout(7000)
    page.on('pageerror',lambda x:errs.append(str(x)))
    page.route('**/*',lambda route: route.abort())
    html=Path('index.html').read_text()
    soup=BeautifulSoup(html,'html.parser')
    for tag in soup.find_all(['script','link']):tag.decompose()
    page.set_content(str(soup),wait_until='domcontentloaded')
    print('html loaded',flush=True)
    page.add_style_tag(content=re.sub(r'^@import.*?\);', '', Path('css/style.css').read_text(),count=1))
    print('style loaded',flush=True)
    for script in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','js/app.js']:
        page.add_script_tag(content=Path(script).read_text())
        print('loaded',script,flush=True)
    assert 'BETA 0.6' in page.locator('.logo').inner_text()
    assert page.locator('[data-crate]').count() >= 105
    assert 'image' in page.locator('#imageStatus').inner_text().lower()
    assert page.locator('#retryImages').count()==1
    page.evaluate('''() => { mergeImageData({items:{'Team Captain':'https://media.steampowered.com/apps/440/icons/test.png'},normalized:{'teamcaptain':'https://media.steampowered.com/apps/440/icons/test.png'}}); }''')
    assert page.evaluate('''() => imageFor({name:'Team Captain'})''').startswith('https://media.steampowered.com/')
    page.evaluate('''() => {mergeCaseManifest({cases:[{id:'case-999',name:'Example 999 Cosmetic Case',keyName:'Example 999 Cosmetic Key',pool:[...Array(11)].map((_,i)=>({name:'Example Prize '+i,kind:'Cosmetic',grade:i<8?'Mercenary':i<10?'Commando':'Elite',image:'https://media.steampowered.com/apps/440/icons/test.png'}))}]});}''')
    assert page.locator('[data-crate="case-999"]').count()==1
    assert page.locator('#caseStatus').inner_text().startswith('Imported')
    assert page.evaluate('''() => getComputedStyle(document.documentElement).getPropertyValue('--mercenary').trim()''')=='#4B69FF'
    page.locator('[data-view="inventory"]').last.click()
    page.locator('[data-owned="series-1"]').click()
    assert page.locator('#detail').evaluate('(e)=>e.open')
    page.locator('#close').click()
    page.locator('[data-view="shop"]').click()
    page.locator('#search').fill('winter 2024')
    page.locator('[data-crate="winter-2024"]').click()
    assert page.locator('.grade-heading').count()==4
    assert page.locator('#detailpool').inner_text().count('Necroprancer')==1
    assert 'model' in page.locator('#detailodds').inner_text().lower()
    page.locator('#close').click()
    page.locator('[data-mode="sandbox"]').click()
    page.locator('[data-crate="winter-2024"]').click()
    page.locator('#opencrate').click()
    page.wait_for_timeout(2550)
    assert 'RECEIVED:' in page.locator('#status').inner_text()
    assert page.locator('#stage').evaluate('(e)=>e.classList.contains("revealed")')
    assert page.locator('#stage .opening-crate').evaluate('(e)=>getComputedStyle(e).visibility')=='hidden'
    assert page.locator('#reward .reward-grade').count()==1
    page.screenshot(path='/mnt/data/tf2-v06/tests/reveal.png',full_page=False)
    page.locator('#close').click()
    page.locator('[data-view="inventory"]').first.click()
    assert page.locator('.backpack-grid .item').count()>=2
    page.locator('[data-view="inventory"]').first.click()
    assert page.locator('.backpack-grid .item').count()>=2
    assert not errs,errs
    browser.close()
server.shutdown()
print('Browser smoke test PASS; no JS page errors')
