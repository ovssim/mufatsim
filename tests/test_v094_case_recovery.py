"""Offline Chromium regression: empty / 404 / partial / complete hosted manifests."""
import json
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parents[1]
case=json.loads((BASE/'data/cases-generated.json').read_text())
historical=json.loads((BASE/'data/historical-crates.json').read_text())
scripts=['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/effect-renders.js','data/free-drop.js','data/promo-codes.js','data/case-recovery-bundle.js','js/app.js','js/tradeups.js']
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
 for mode in ('404','empty','partial','complete'):
  page=browser.new_page()
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  page.route('**/*',lambda route:route.abort())
  soup=BeautifulSoup((BASE/'index.html').read_text(),'html.parser')
  for tag in soup.find_all(['script','link']):tag.decompose()
  page.set_content(str(soup))
  page.evaluate("""() => {let data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]||null,setItem:(k,v)=>{data[k]=v;}}});}""")
  page.add_style_tag(content=(BASE/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
  responseC=case if mode=='complete' else ({'cases':case['cases'][:2]} if mode=='partial' else {'cases':[]})
  responseH=historical if mode=='complete' else ({'crates':historical['crates'][:2]} if mode=='partial' else {'crates':[]})
  page.evaluate("""({mode,casePayload,historicalPayload}) => {
   window.fetch=async (resource) => {
    const u=String(resource);
    const isC=u.includes('cases-generated.json');const isH=u.includes('historical-crates.json');
    if(!isC&&!isH)throw new Error('Offline test');
    if(mode==='404')return {ok:false,status:404};
    return {ok:true,status:200,json:async()=>isC?casePayload:historicalPayload};
   };
  }""",{'mode':mode,'casePayload':responseC,'historicalPayload':responseH})
  for f in scripts:page.add_script_tag(content=(BASE/f).read_text())
  page.wait_for_function("document.getElementById('caseStatus')?.textContent.includes('Imported 36') && document.getElementById('historicalStatus')?.textContent.includes('13 individually')",timeout=20000)
  result=page.evaluate("""() => ({
   total:ALL_CRATES.length,
   cases:ALL_CRATES.filter(c=>c.kind==='special').length,
   historical:ALL_CRATES.filter(c=>c.kind==='numbered'&&c.historical).length,
   status:document.getElementById('caseStatus').textContent,
   historicalStatus:document.getElementById('historicalStatus').textContent
  })""")
  assert result['cases']>=36 and result['historical']>=13,(mode,result)
  assert not errors,(mode,errors)
  if mode!='complete':assert 'Recovered missing entries' in result['status'],(mode,result)
  page.locator('details.system-status summary').click()
  page.locator('#retryCatalogs').click()
  page.wait_for_timeout(200)
  assert 'Imported 36' in page.locator('#caseStatus').inner_text(),mode
  print('PASS',mode,result['cases'],'special cases +',result['historical'],'historical; total',result['total'])
  page.close()
 browser.close()
