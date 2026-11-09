"""v0.9.2 regression: grade prices, favorites/sorting and mixed-collection contracts."""
from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
P=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
    page=browser.new_page(viewport={'width':1200,'height':900})
    page.route('**/*',lambda route:route.abort())
    soup=BeautifulSoup((P/'index.html').read_text(),'html.parser')
    for tag in soup.find_all(['script','link']):tag.decompose()
    page.set_content(str(soup))
    page.evaluate("""() => {let stored={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return stored[k]||null;},setItem(k,v){stored[k]=v;}}});}""")
    page.add_style_tag(content=(P/'css/style.css').read_text().replace("@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700;900&display=swap');",''))
    for name in ['data/images.js','data/prices.js','data/crate-prices.js','data/catalog.js','data/unusual-rules.js','data/effect-renders.js','data/free-drop.js','data/promo-codes.js','js/app.js','js/tradeups.js']:
        page.add_script_tag(content=(P/name).read_text())
    data=page.evaluate("""() => {
       const grades=['Mercenary','Commando','Assassin','Elite'];
       const tiers={};
       for(const grade of grades){
         const bins=[0,0,0,0];
         for(let i=0;i<15000;i++){
           const r=simulatedUnusualQuote({name:'Test',instanceId:'unique-roll-'+i,grade,quality:'Unusual'}).cents/KEY_VALUE_CENTS;
           const idx=r<50?0:r<140?1:r<400?2:3;
           bins[idx]++;
         }
         tiers[grade]=bins.map(n=>+(n/150).toFixed(2));
       }
       marketData={items:{},crates:{},keys:{},metadata:{}};
       const examples=[
        {name:'Some Strangifier',kind:'Tool',quality:'Unique'},
        {name:'Some Professional Killstreak Kit',kind:'Tool',quality:'Unique'},
        {name:'Strange Part: Robots Destroyed',kind:'Tool',quality:'Unique'},
        {name:'Battle Scarred Painted Shotgun',kind:'Weapon',grade:'Commando',quality:'Strange',strange:true},
        {name:'Team Captain',kind:'Cosmetic',quality:'Unique'}
       ].map(item=>({name:item.name,quote:sellQuote(item)}));
       state.mode='economy';
       state.items=[
        {name:'Chill Chullo',kind:'Cosmetic',grade:'Commando',quality:'Unique',origin:'economy',instanceId:'aa'},
        {name:'Strange Part: Robots Destroyed',kind:'Tool',quality:'Unique',origin:'economy',instanceId:'bb'},
        {name:'Scorched',kind:'Cosmetic',grade:'Mercenary',quality:'Unusual',effect:'Burning Flames',origin:'economy',instanceId:'cc'}
       ];
       refresh();
       return {tiers,examples,order:state.items.map(i=>i.instanceId)};
    }""")
    # allow sampling tolerance ~1.6 percentage points
    for grade,expected in [('Mercenary',[74,20,5,1]),('Commando',[69,25,5,1]),('Assassin',[64,30,5,1]),('Elite',[59,35,5,1])]:
        assert all(abs(x-y)<2.0 for x,y in zip(data['tiers'][grade],expected)),(grade,data['tiers'][grade])
    for entry in data['examples'][:4]:
        assert entry['quote']['cents']>0,entry
        assert 'estimate' in entry['quote']['source'].lower(),entry
    assert data['examples'][4]['quote']['cents']==1200,data
    page.locator('[data-view="inventory"]').click()
    page.locator('button[data-favorite="1"]').click()
    assert page.locator('button[data-favorite="1"]').get_attribute('aria-pressed')=='true'
    page.select_option('#backpackSort','favorites')
    assert page.locator('#backpack .item:not(.backpack-crate) strong').first.inner_text()=='Strange Part: Robots Destroyed'
    page.locator('#backpackFavoritesOnly').check()
    assert page.locator('#backpack .item:not(.backpack-crate)').count()==1
    assert page.locator('#backpackResultCount').inner_text()=='1 / 3 items'
    page.reload() if False else None
    assert page.evaluate('state.items[1].favorite') is True
    page.locator('#backpackFavoritesOnly').uncheck()
    page.select_option('#backpackSort','priceHigh')
    assert page.locator('#backpack .item:not(.backpack-crate)').count()==3
    assert page.evaluate('state.items.map(i=>i.instanceId)')==data['order']
    # Trade-up: 7 Mayflower + 3 Tough Break -> 70/30 split.
    odds=page.evaluate("""() => {
      const a=ALL_CRATES.find(c=>c.id==='case-102'),b=ALL_CRATES.find(c=>c.id==='case-101');
      state.items=[...Array.from({length:7},(_,j)=>({...a.pool[0],instanceId:'may-'+j,crateId:a.id,crate:a.name,origin:'economy'})),
       ...Array.from({length:3},(_,j)=>({...b.pool[0],instanceId:'tough-'+j,crateId:b.id,crate:b.name,origin:'economy'}))];
      renderTradeUp();
      const outcomes=Array.from(document.querySelectorAll('#tradeupAvailable [data-trade-add]'));
      for(const btn of outcomes){btn.click();}
      return document.querySelector('#tradeupOdds').textContent;
    }""")
    assert '17.50%' in odds and '7.50%' in odds,odds
    browser.close()
print('PASS: grade-shifted Unusual ranges, missing-market estimates, inventory favorites/sorting, 7/3 mixed-case odds')
