"""Offline Chromium regression for case-local Unusuals, grades, prices, and bulk buying."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
    page=browser.new_page(viewport={'width':1400,'height':950})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/*',lambda r:r.abort())
    soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
    for t in soup.find_all(['script','link']):t.decompose()
    page.set_content(str(soup))
    page.evaluate("""() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return data[k]||null},setItem(k,v){data[k]=v}}});}""")
    page.add_style_tag(content=(P/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
    for file in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/effect-renders.js','data/free-drop.js','data/promo-codes.js','js/app.js']:
        page.add_script_tag(content=(P/file).read_text())
    # Explicit Mayflower grade and in-case origin test, forcibly winning the Unusual roll.
    result=page.evaluate("""() => {
      const c=ALL_CRATES.find(x=>x.id==='case-102');
      if(!c)throw new Error('Mayflower case is missing');
      const local=new Map(c.pool.map(i=>[i.name,i.grade]));
      let original=Math.random,results=[];
      try{for(let k=0;k<60;k++){Math.random=()=>k%2===0?0:0.00001;const reward=roll(c);
       if(reward.quality!=='Unusual'||reward.crateId!=='case-102')throw new Error('Mayflower unusual missing');
       if(!local.has(reward.name)||local.get(reward.name)!==reward.grade)throw new Error('Cross-case reward or wrong grade: '+JSON.stringify(reward));
       results.push({name:reward.name,grade:reward.grade});}}
      finally {Math.random=original;}
      return {items:results,candidateCount:unusualHatPool(c).items.length,price:crateQuote(c)};
    }""")
    assert result['candidateCount']>=4,result
    assert result['price']['source'].startswith('Custom') is False # no hardcoded manual Mayflower price yet
    assert any(x['grade']=='Mercenary' for x in result['items']),result
    # Synthetic case with only body clothes must not roll cross-case bonuses.
    synthetic=page.evaluate("""() => {
      const c={id:'no-hats-case',name:'No Hats Case',graded:true,openable:true,unusualChance:.0066,
       gradeWeights:{Mercenary:80},pool:[{name:'Some Pants',kind:'Cosmetic',grade:'Mercenary',quality:'Unique'}]};
      const previous=Math.random;Math.random=()=>0;
      try{return {rate:unusualRate(c),reward:roll(c)}}finally{Math.random=previous}
    }""")
    assert synthetic['rate']==0,synthetic
    assert synthetic['reward']['quality']!='Unusual',synthetic
    # Case-specific overrides use exact price and override market data.
    custom=page.evaluate("""() => {
      CRATE_PRICES.byName['Mayflower Cosmetic Case']=2.15;
      const c=ALL_CRATES.find(c=>c.id==='case-102');
      marketData.crates[c.id]=999;
      return crateQuote(c);
    }""")
    assert custom['cents']==215 and custom['source'].startswith('Custom'),custom
    # Bulk purchases only buy crates, not open them or consume keys.
    page.locator('[data-crate="case-102"]').click()
    assert '×5' in page.locator('#buycrate5').inner_text()
    before=page.evaluate("""() => ({n:state.crates['case-102']||0,opened:state.opened,keys:state.keys.mannco,metal:state.metalCents})""")
    page.locator('#buycrate5').click()
    after=page.evaluate("""() => ({n:state.crates['case-102']||0,opened:state.opened,keys:state.keys.mannco,metal:state.metalCents})""")
    assert after['n']==before['n']+5,(before,after)
    assert after['opened']==before['opened'] and after['keys']==before['keys'],(before,after)
    assert after['metal']==before['metal']-1075,(before,after)
    page.locator('#buycrate10').click()
    after2=page.evaluate("""() => ({n:state.crates['case-102']||0,opened:state.opened,metal:state.metalCents})""")
    assert after2['n']==15 and after2['opened']==0,after2
    # Two-dimensional loadout view shows owned unusuals and is mode-local.
    page.locator('#close').click()
    page.evaluate("""() => {state.items.unshift({instanceId:'unusual-001',name:"Herald\'s Helm",kind:'Cosmetic',grade:'Commando',quality:'Unusual',effect:'Burning Flames',origin:'economy'});save()}""")
    page.locator('[data-view="inventory"]').click()
    page.locator('[data-equip="0"]').click()
    page.locator('[data-view="loadout"]').click()
    assert 'Herald' in page.locator('#loadoutItems').inner_text()
    assert 'Burning Flames' in page.locator('#loadoutItems').inner_text()
    page.locator('[data-mode="sandbox"]').click()
    assert 'Herald' not in page.locator('#loadoutItems').inner_text()
    assert errors==[],errors
    browser.close()
print('PASS: case-local Unusual names + grades, zero-eligible safeties, exact custom price, bulk buy, 2D loadout')
