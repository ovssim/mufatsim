"""v0.9.1 browser-level checks: price draw, Tough Break, trade-ups, Strange label."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
    page=browser.new_page(viewport={'width':1250,'height':900})
    page.route('**/*',lambda route:route.abort())
    soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
    for tag in soup.find_all(['script','link']):tag.decompose()
    page.set_content(str(soup))
    page.evaluate("""() => {const data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return data[k]||null},setItem(k,v){data[k]=v}}});}""")
    page.add_style_tag(content=(P/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
    for name in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/effect-renders.js','data/free-drop.js','data/promo-codes.js','js/app.js','js/tradeups.js']:
        page.add_script_tag(content=(P/name).read_text())
    assert page.locator('[data-view="tradeups"]').count()==1
    res=page.evaluate("""() => {
      const bands=[0,0,0,0], sample=5000;
      for(let j=0;j<sample;j++){
       const value=simulatedUnusualQuote({instanceId:'roll-'+j,name:'Sample',quality:'Unusual',effect:'Sunbeams'}).cents/KEY_VALUE_CENTS;
       const which=value<50?0:value<140?1:value<400?2:3;
       bands[which]++;
      }
      const unusual={instanceId:'fixed-seed',name:'Team Captain',quality:'Unusual',effect:'Burning Flames',origin:'economy'};
      const first=sellQuote(unusual),second=sellQuote(unusual);
      const weird={instanceId:'fixed-seed',name:'Strange Sandvich',quality:'Strange',strange:true};
      const tb=ALL_CRATES.find(c=>c.id==='case-101');
      const prev=Math.random;Math.random=()=>0;
      let chosen;try{chosen=roll(tb)}finally{Math.random=prev;}
      return {bands,first,second,strange:namedItem(weird),toughBreak:{size:tb.pool.length,grades:tb.pool.reduce((o,x)=>(o[x.grade]=(o[x.grade]||0)+1,o),{}),roll:chosen,valid:tb.pool.some(i=>i.name===chosen.name&&i.grade===chosen.grade)},classifications:['Dead Presidents','Bubbling','Ravenous Ravens','Floral Growth','Analog Fortress'].map(effectClass),clock:simulatedUnusualQuote({instanceId:'clock-test',quality:'Unusual'}).source};
    }""")
    assert res['first']==res['second'],res
    assert 'Simulated Unusual' in res['first']['source'],res
    assert res['strange']=='Strange Sandvich',res
    for actual,wanted in zip(res['bands'],[3700,1000,250,50]):
        assert abs(actual-wanted)<200,(res['bands'],actual,wanted)
    assert res['toughBreak']['size']==15,res
    assert res['toughBreak']['grades']=={'Mercenary':10,'Commando':4,'Assassin':1},res
    assert res['toughBreak']['valid'],res
    assert res['toughBreak']['roll']['quality']=='Unusual',res
    assert len(set(res['classifications']))>=4,res
    # Set up normal Mercenary x10, choose inputs through rendered UI then trade up.
    page.evaluate("""() => {
      const tb=ALL_CRATES.find(c=>c.id==='case-101');
      state.mode='economy';
      state.items=Array.from({length:10},(_,j)=>({...tb.pool[0],instanceId:'tb-'+j,crateId:tb.id,crate:tb.name,origin:'economy'}));
      renderTradeUp();
    }""")
    page.locator('[data-view="tradeups"]').click()
    for i in range(10):page.locator('button[data-trade-add]:not([disabled])').first.click()
    assert '10/10' in page.locator('#tradeupSelected').inner_text()
    assert '25.00%' in page.locator('#tradeupOdds').inner_text()
    page.on('dialog',lambda dlg:dlg.accept())
    page.locator('#tradeupSubmit').click()
    outcome=page.evaluate("""() => ({size:state.items.length,name:state.items[0].name,grade:state.items[0].grade,crateId:state.items[0].crateId})""")
    assert outcome['size']==1 and outcome['grade']=='Commando' and outcome['crateId']=='case-101',outcome
    # Strange but ungraded items are not eligible for Civilian Grade Stat Clock.
    page.evaluate("""() => {state.items.push({instanceId:'x',name:'Strange Sandvich',quality:'Strange',strange:true,grade:null,origin:'economy'});renderTradeUp();}""")
    page.locator('[data-trade-recipe="clock"]').click()
    assert 'Strange Sandvich' not in page.locator('#tradeupAvailable').inner_text()
    browser.close()
print('PASS: unique stable Unusual appraisals, 74/20/5/1 distribution, grades, effects, Strange text, contract outcome and Stat Clock validation')
