/* Mann Co. Unboxing Simulator Beta 0.7: no build tools required. */
'use strict';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'tf2-unbox-beta-1'; // Retain saves from v0.1–0.4.
const INIT = () => ({metal:1800,metalCents:20000,defaultSellPrice:100,
  keys:{mannco:5}, crates:{'series-1':3}, items:[],opened:0,unusuals:0,
  spent:0,mode:'economy'});
let state;
try{state={...INIT(),...JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')};}
catch(_){state=INIT();}
// Old saves mix sandbox and paid rewards. Quarantine unknown-origin items from selling.
if(!state.originMigrationV7){
 state.items=(Array.isArray(state.items)?state.items:[]).map(i=>({...i,origin:i.origin==='economy'?'economy':'legacy'}));
 state.originMigrationV7=true;
}
if(!state.sandbox||typeof state.sandbox!=='object')state.sandbox={items:[],opened:0,unusuals:0};
state.sandbox.items=(Array.isArray(state.sandbox.items)?state.sandbox.items:[]).map(i=>({...i,origin:'sandbox'}));
state.sandbox.opened=Number(state.sandbox.opened)||0;
state.sandbox.unusuals=Number(state.sandbox.unusuals)||0;
if (!Number.isInteger(state.metalCents)) state.metalCents=Math.max(0,Math.round((state.metal||0)*100/9));
if (!Number.isInteger(state.defaultSellPrice)) state.defaultSellPrice=100;
if (!state.keys || typeof state.keys!=='object')state.keys={mannco:0};
if (!state.crates || typeof state.crates!=='object')state.crates={};
if (!Array.isArray(state.items))state.items=[];
if (!['economy','sandbox'].includes(state.mode))state.mode='economy';
let current=ALL_CRATES[0],busy=false,toastTimeout;
const imgCache={items:{},normalized:{},crates:{},byIndex:{}};
let importedCaseCount=0, importedRewardCount=0;
const STOCK_CRATE_IMAGE='https://media.steampowered.com/apps/440/icons/crate_large.4ca851c13c3907ca378765fbb91a22b6c79d3d87.png';
const STOCK_KEY_IMAGE='https://media.steampowered.com/apps/440/icons/key_large.354829243e53d73a5a75323c88fc5689ecb19359.png';
const imageFailures=new Set();
const namedItem=i=>`${i.quality&&i.quality!=='Unique'&&!String(i.name||'').toLowerCase().startsWith(i.quality.toLowerCase()+' ')?i.quality+' ':''}${i.name||'Unknown Item'}`;
const activeItems=()=>state.mode==='sandbox'?state.sandbox.items:state.items;
const IMAGE_SCHEMA_FALLBACKS=[
 'https://cdn.jsdelivr.net/gh/tsuza/tf2-item-schema@master/files/localized/item_schema_json_english.txt',
 'https://cdn.jsdelivr.net/gh/tsuza/tf2-item-schema@master/files/item_schema_json.txt'
];
const ref = cents => (cents/100).toFixed(2)+' ref';
const fmt = units => (units/9).toFixed(2)+' ref';
const cents = units => Math.round(units*100/9);
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = name => String(name||'').toLowerCase().replace(/^strange\s+/,'').replace(/^the\s+/,'').replace(/[^a-z0-9]+/g,'');
const sleep = ms => new Promise(done=>setTimeout(done,ms));
const totalKeys = () => Object.values(state.keys).reduce((sum,n)=>sum+(Number(n)||0),0);
const totalCrates = () => Object.values(state.crates).reduce((sum,n)=>sum+(Number(n)||0),0);
function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove('show'),3000);}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){notify('Could not save backpack: browser storage blocked or full.');}refresh();}
function safeURL(url){
 if(typeof url!=='string')return '';
 if(/^https:\/\//i.test(url)||/^assets\/[\w./-]+\.(png|jpg|jpeg|webp|gif)$/i.test(url))return url;
 return '';
}
function imageSources(entry,category='item'){
 if(!entry)return [];
 const id=entry.id||'',name=String(entry.name||'');
 const canonical=name.replace(/^(Strange|Unusual|Vintage|Genuine)\s+/i,'');
 const bare=canonical.replace(/^The\s+/i,'').replace(/[’]/g,"'");
 const manual=category==='crate'?CRATE_IMAGES[id]:(ITEM_IMAGES[name]||ITEM_IMAGES[canonical]);
 const wiki=name=>'https://wiki.teamfortress.com/wiki/Special:Redirect/file/Backpack_'+encodeURIComponent(name.replace(/ /g,'_'))+'.png';
 let candidates;
 if(category==='crate'&&/^series-\d+$/.test(id))candidates=[STOCK_CRATE_IMAGE,wiki('Mann Co. Supply Crate')];
 else if(category==='key'&&id==='mannco')candidates=[STOCK_KEY_IMAGE,wiki('Mann Co. Supply Crate Key')];
 else candidates=[category==='crate'?manual:null,category==='crate'?imgCache.crates[id]:null,
  imgCache.items[name],imgCache.items[canonical],imgCache.items['The '+canonical],
  imgCache.normalized[norm(name)],imgCache.normalized[norm(canonical)],imgCache.normalized['the'+norm(canonical)],
  Number.isInteger(entry.defindex)?imgCache.byIndex[String(entry.defindex)]:null,
  manual,entry.image,wiki(bare),bare!==canonical?wiki(canonical):null];
 return [...new Set(candidates.map(safeURL).filter(url=>url&&!imageFailures.has(url)))];
}
function imageFor(entry,category='item'){return imageSources(entry,category)[0]||'';}
function advanceImage(img){
 const list=JSON.parse(img.dataset.images||'[]'),bad=img.getAttribute('src')||'';
 if(bad)imageFailures.add(bad);
 let index=Number(img.dataset.index||'0')+1;
 while(index<list.length&&imageFailures.has(list[index]))index++;
 if(index<list.length){img.dataset.index=String(index);img.src=list[index];}
 else img.remove();
}
function visual(entry,category='item',size='item-picture'){
 const sources=imageSources(entry,category),url=sources[0]||'';
 const title=esc(entry.name||'TF2 item'),letter=category==='crate'?'SUPPLY':category==='key'?'KEY':'MANN CO.';
 const overlay=entry.quality==='Unusual'&&entry.effect?`<span class="overlay-effect ${effectClass(entry.effect)}" aria-hidden="true"><i></i><i></i><i></i></span>`:'';
 return `<span class="item-art-wrap ${category}-art"><span class="art-placeholder"><span class="placeholder-bolt"></span><span>${letter}</span></span>${url?`<img class="${size}" src="${esc(url)}" data-images="${esc(JSON.stringify(sources))}" data-index="0" alt="${title}" loading="lazy" onload="this.parentElement.classList.add('image-loaded')" onerror="advanceImage(this)">`:''}${overlay}</span>`;
}
function effectClass(name){
 const s=String(name||'').toLowerCase();
 return /orbit/.test(s)?'fx-orbit':/flame|fire|burn|blaze/.test(s)?'fx-fire':/beam|sun/.test(s)?'fx-sun':/energy|plasma|electric/.test(s)?'fx-energy':'fx-mystic';
}
function refresh(){
 $('money').textContent=state.mode==='sandbox'?'SANDBOX':ref(state.metalCents);
 $('keycount').textContent=state.mode==='sandbox'?'∞ keys':totalKeys()+' keys';
 $('cratecount').textContent=state.mode==='sandbox'?'FREE OPENINGS':'▣ '+totalCrates()+' crates';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===state.mode));
 renderCatalog();renderBackpack();renderKeyshop();renderCurrency();renderSell();renderStats();
 if($('detail').open)renderDetail();
}
function show(view){
 document.querySelectorAll('.view').forEach(el=>el.classList.toggle('hidden',el.id!==view));
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
 refresh();
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
 if(busy)return;
 state.mode=b.dataset.mode;save();notify('Switched to '+state.mode.toUpperCase()+' mode');
}));
const MARKET_OPTIONS={preferMarketSell:true,preferMarketCrates:true,preferMarketKeys:true,...(typeof MARKET_SETTINGS==='object'?MARKET_SETTINGS:{})};
let marketData={items:{},crates:{},keys:{},metadata:{}};
const priceKey=n=>norm(n);
function marketItemPrice(item){
 const p=marketData.items?.[priceKey(item.name)]?.qualities?.[item.quality||'Unique'];
 if(!p)return null;
 if(item.quality==='Unusual'){
  if(!item.effect)return null;
  const exact=p.effects?.[priceKey(item.effect)];
  return Number.isFinite(exact)?Math.round(exact*100):null;
 }
 return Number.isFinite(p.priceRef)?Math.round(p.priceRef*100):null;
}
function sellQuote(item){
 if(Number.isInteger(item.sellPrice))return {cents:item.sellPrice,source:'Your override'};
 const m=MARKET_OPTIONS.preferMarketSell?marketItemPrice(item):null;
 return Number.isFinite(m)?{cents:m,source:'backpack.tf guide'}:{cents:manualSellPrice(item),source:'Simulator fallback'};
}
function crateQuote(c){
 const m=marketData.crates?.[c.id]??marketData.crates?.['name:'+priceKey(c.name)];
 return MARKET_OPTIONS.preferMarketCrates&&Number.isFinite(m)&&m>=0?{cents:Math.round(m*100),source:'backpack.tf guide'}:
 {cents:cents(c.priceUnits),source:'Simulator price'};
}
function keyQuote(id){
 const k=KEYS[id],m=marketData.keys?.[priceKey(k?.name)];
 return MARKET_OPTIONS.preferMarketKeys&&Number.isFinite(m)&&m>=0?{cents:Math.round(m*100),source:'backpack.tf guide'}:
 {cents:cents(k.priceUnits),source:'Simulator price'};
}
function displayPrice(c){if(state.mode==='sandbox')return 'FREE IN SANDBOX';const p=crateQuote(c);return ref(p.cents)+' · '+p.source;}
function catalogTag(c){return c.graded?'SOURCE GRADES / MODEL ODDS':c.verified?'REFERENCE DROP LIST':'DEMO DROP POOL';}
function renderCatalog(){
 const q=$('search').value.trim().toLowerCase(), filter=$('filter').value,sort=$('sort').value;
 let list=ALL_CRATES.filter(c=>(filter==='all'||filter===c.kind)&&(c.name.toLowerCase().includes(q)||String(c.series||'').includes(q)));
 if(sort==='series')list.sort((a,b)=>(a.series||999)-(b.series||999)||a.name.localeCompare(b.name));
 if(sort==='price')list.sort((a,b)=>a.priceUnits-b.priceUnits);
 if(sort==='high')list.sort((a,b)=>b.priceUnits-a.priceUnits);
 $('catalog').innerHTML=list.map(c=>`<article class="tile" data-crate="${esc(c.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(c.name)}">
  <div class="crate-icon">${visual(c,'crate','crate-picture')}</div><div class="tag">${catalogTag(c)} · ${c.kind==='numbered'?'SERIES #'+c.series:'COSMETIC / SPECIAL'}</div>
  <h3>${esc(c.name)}</h3><p>${esc(c.keyName)}</p><div class="price">${displayPrice(c)}</div><p>${state.mode==='sandbox'?'Sandbox openings available':'Owned: '+(state.crates[c.id]||0)}</p></article>`).join('');
 document.querySelectorAll('[data-crate]').forEach(el=>{
  el.onclick=()=>openDetail(el.dataset.crate);
  el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(el.dataset.crate);}};
 });
}
$('search').oninput=renderCatalog;$('filter').onchange=renderCatalog;$('sort').onchange=renderCatalog;
function resetStage(){
 const stage=$('stage');stage.className='stage';
 $('reward').innerHTML='';$('effect').className='particle-effect';
 $('openingCrate').innerHTML=visual(current,'crate','opening-crate-image');
}
function openDetail(id){
 if(busy)return;
 const crate=ALL_CRATES.find(c=>c.id===id);
 if(!crate)return notify('Crate not found.');
 current=crate;$('detail').showModal();resetStage();$('status').textContent='';renderDetail();
}
$('close').onclick=()=>{if(!busy)$('detail').close();};
$('detail').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('detail').addEventListener('click',e=>{
 if(busy||!$('detail').open)return;
 const b=$('detail').getBoundingClientRect();
 if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('detail').close();
});
function modeledGradeOdds(c,item){
 const count=c.pool.filter(x=>x.grade===item.grade).length;
 const weight=c.gradeWeights?.[item.grade];
 return count&&Number.isFinite(weight)?(weight/count).toFixed(2)+'% modeled':'odds unverified';
}
function renderDetail(){
 const c=current;
 $('detailseries').textContent=c.kind==='numbered'?'CRATE SERIES #'+c.series:'COSMETIC / SPECIAL CASE';
 $('detailname').textContent=c.name;$('detaildesc').textContent=c.description;
 const p=crateQuote(c);
 $('detailcost').innerHTML=`<h3>ACQUISITION & OPENING</h3><p>Crate: <b>${ref(p.cents)}</b> (${esc(p.source)})<br>Required: <b>${esc(c.keyName)}</b><br>${state.mode==='sandbox'?'Sandbox: virtual crates and keys':`Owned crates: <b>${state.crates[c.id]||0}</b> · Owned keys: <b>${c.key?(state.keys[c.key]||0):'none required'}</b>`}</p>`;
 $('detailodds').innerHTML=`<div class="notice"><b>${c.graded?'VERIFIED ITEM GRADES · ESTIMATED GRADE ODDS':c.verified?'REFERENCE DROP LIST':'DEMO CONTENTS — NOT HISTORICAL'}</b><br>Unusual chance: ${(c.unusualChance*100).toFixed(2)}% (beta assumption). ${c.graded?'Grade rates: Mercenary 80%, Commando 16%, Assassin 3.2%, Elite 0.8% (model, not official).':''} Strange and Unusual rates and eligible effects are modeled.</div>`;
 const groups=c.graded?['Civilian','Freelance','Mercenary','Commando','Assassin','Elite'].filter(g=>c.pool.some(i=>i.grade===g)):[''];
 $('detailpool').innerHTML='<h3>ITEM DROP POOL</h3>'+groups.map(grade=>{
  const list=c.graded?c.pool.filter(x=>x.grade===grade):c.pool;
  return (grade?`<h4 class="grade-heading grade-${grade.toLowerCase()}">${grade} Grade</h4>`:'')+
    `<ul class="drop-list">${list.map(item=>`<li class="drop-card ${item.grade?'grade-border-'+item.grade.toLowerCase():''}">${visual(item)}<div class="drop-text"><span class="drop-name">${esc(item.name)}</span>${!c.graded&&item.quality?` <span class="item-quality">${esc(item.quality)}</span>`:''}${c.graded?` <span class="drop-odds">${modeledGradeOdds(c,item)}</span>`:item.weight?` <span class="drop-odds">${item.weight}% community estimate</span>`:''}</div></li>`).join('')}</ul>`;
 }).join('');
 $('buycrate').disabled=busy||state.mode==='sandbox';
 $('buykey').disabled=busy||state.mode==='sandbox'||!c.key;
 $('opencrate').disabled=busy;
 $('opencrate').textContent=busy?'UNLOCKING…':state.mode==='sandbox'?'UNBOX (SANDBOX)':'UNBOX';
}
$('buycrate').onclick=()=>{
 if(busy||state.mode==='sandbox')return;
 const cost=crateQuote(current).cents;if(state.metalCents<cost)return notify('Not enough refined metal.');
 state.metalCents-=cost;state.spent+=Math.round(cost*9/100);
 state.crates[current.id]=(state.crates[current.id]||0)+1;save();notify('Crate purchased!');
};
$('buykey').onclick=()=>{
 if(busy||state.mode==='sandbox'||!current.key)return;
 const k=current.key,key=KEYS[k];if(!key)return notify('This key is unavailable.');
 const cost=keyQuote(k).cents;if(state.metalCents<cost)return notify('Not enough refined metal.');
 state.metalCents-=cost;state.spent+=Math.round(cost*9/100);state.keys[k]=(state.keys[k]||0)+1;save();notify(key.name+' purchased!');
};
function weightedPick(entries,getWeight){
 const weights=entries.map(x=>Math.max(0,Number(getWeight(x))||0));
 const total=weights.reduce((a,b)=>a+b,0);
 if(total<=0)return entries[Math.floor(Math.random()*entries.length)];
 let n=Math.random()*total;
 for(let i=0;i<entries.length;i++){n-=weights[i];if(n<0)return entries[i];}
 return entries[entries.length-1];
}
function roll(c){
 let base;
 if(c.graded){
  const grades=['Civilian','Freelance','Mercenary','Commando','Assassin','Elite'].filter(g=>c.pool.some(i=>i.grade===g));
  const grade=weightedPick(grades,g=>c.gradeWeights?.[g]??1);
  const available=c.pool.filter(i=>i.grade===grade);
  base=available[Math.floor(Math.random()*available.length)];
 } else base=weightedPick(c.pool,x=>x.weight||1);
 const eligible=base.kind==='Cosmetic';
 const unusual=eligible&&Math.random()<c.unusualChance;
 const strange=!unusual&&c.graded&&Math.random()<(c.strangeChance||0);
 const quality=unusual?'Unusual':strange?'Strange':base.quality||'Unique';
 const effects=c.effectPool?.length?c.effectPool:EFFECTS; // Beta effect pool if not historically mapped.
 const effect=unusual?effects[Math.floor(Math.random()*effects.length)]:null;
 return {instanceId:globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random()),name:base.name,origin:state.mode,
  kind:base.kind,quality,grade:base.grade||null,effect,crate:c.name,crateId:c.id,
  image:base.image||'',demo:!c.verified||unusual||c.graded,sourceModel:c.graded?'Grade model':'Legacy beta'};
}
$('opencrate').onclick=async()=>{
 if(busy)return;
 const c=current;
 if(state.mode==='economy'){
  if(!(state.crates[c.id]>0))return notify('Buy this crate or switch to Sandbox.');
  if(c.key&&!(state.keys[c.key]>0))return notify('You need a '+c.keyName+'.');
 }
 busy=true;resetStage();renderDetail();
 $('detail').scrollTo({top:0,behavior:'instant'}); // Bring the reveal into view even after scrolling the drop pool.
 $('status').textContent='UNLOCKING…';
 const stage=$('stage');stage.classList.add('opening');
 try {
  await sleep(550);stage.classList.add('shaking');
  await sleep(800);stage.classList.add('burst');
  const item=roll(c);
  await sleep(680);
  if(state.mode==='economy'){
   state.crates[c.id]-=1;
   if(c.key)state.keys[c.key]-=1;
  }
  if(item.origin==='sandbox'){
   state.sandbox.items.unshift(item);state.sandbox.opened++;
   if(item.quality==='Unusual')state.sandbox.unusuals++;
  }else{
   state.items.unshift(item);state.opened++;
   if(item.quality==='Unusual')state.unusuals++;
  }
  $('reward').innerHTML=visual(item,'item','reward-picture')+
    `<div class="reward-name ${item.grade?'grade-'+item.grade.toLowerCase():''}">${esc(namedItem(item))}</div>`+
    (item.grade?`<div class="reward-grade grade-${item.grade.toLowerCase()}">${esc(item.grade)} Grade</div>`:'')+
    (item.effect?`<div class="reward-effect">✦ ${esc(item.effect)}</div>`:'');
  $('effect').className='particle-effect '+(item.effect?effectClass(item.effect):'');
  stage.classList.add('revealed');
  $('status').textContent='RECEIVED: '+namedItem(item)+(item.grade?' · '+item.grade+' Grade':'')+(item.demo?' (modeled/demo probabilities)':'');
  save();
 }catch(e){console.error('Unbox error:',e);notify('Opening failed; no resources consumed.');resetStage();}
 finally {busy=false;renderDetail();}
};
function renderBackpack(){
 const containers=(state.mode==='sandbox'?[]:Object.entries(state.crates)).filter(([,n])=>n>0).map(([id,n])=>({crate:ALL_CRATES.find(c=>c.id===id),id,qty:n}));
 const crateHTML=containers.map(({crate,id,qty})=>`<button type="button" class="item backpack-crate" data-owned="${esc(id)}" title="Open ${esc(crate?.name||id)}">
  <span class="art">${visual(crate||{id,name:id},'crate')}</span><strong>${esc(crate?.name||id)}</strong><small>Crate · ×${qty}</small><small>CLICK TO UNBOX</small></button>`).join('');
 const itemHTML=activeItems().map(item=>`<div class="item ${item.quality==='Unusual'?'unusual':''} ${item.grade?'grade-border-'+item.grade.toLowerCase():''}"><span class="art">${visual(item)}</span>
  <strong>${esc(namedItem(item))}</strong>${item.quality&&item.quality!=='Unique'?`<small class="item-quality">${esc(item.quality)}</small>`:''}${item.grade?`<small class="grade-label grade-${item.grade.toLowerCase()}">${esc(item.grade)} Grade</small>`:''}${item.effect?`<small class="effect-name">✦ ${esc(item.effect)}</small>`:''}${item.origin==='legacy'?'<small class="legacy-note">LEGACY · SELLING LOCKED</small>':''}</div>`).join('');
 $('backpack').innerHTML=`<div class="mode-banner">${state.mode==='sandbox'?'SANDBOX BACKPACK · Free unboxes are kept here and cannot be sold.':'ECONOMY BACKPACK · Paid-mode rewards only.'}</div>`+(crateHTML||itemHTML?`<div class="backpack-grid">${crateHTML}${itemHTML}</div>`:'<div class="panel">This backpack is empty.</div>');
 document.querySelectorAll('[data-owned]').forEach(btn=>btn.onclick=()=>openDetail(btn.dataset.owned));
}
function renderKeyshop(){
 $('keyshop').innerHTML=Object.entries(KEYS).map(([id,k])=>`<div class="tile key-tile"><div class="crate-icon">${visual({...k,id},'key')}</div>
 <h3>${esc(k.name)}</h3><p>Owned: ${state.keys[id]||0}</p><div class="price">${ref(keyQuote(id).cents)} · ${esc(keyQuote(id).source)}</div><button data-buy-key="${esc(id)}" class="accent" ${state.mode==='sandbox'?'disabled':''}>BUY KEY</button></div>`).join('');
 document.querySelectorAll('[data-buy-key]').forEach(btn=>btn.onclick=()=>{
  if(state.mode==='sandbox')return notify('Keys are unlimited in Sandbox.');
  const id=btn.dataset.buyKey,k=KEYS[id],cost=keyQuote(id).cents;
  if(state.metalCents<cost)return notify('Not enough refined metal.');
  state.metalCents-=cost;state.spent+=Math.round(cost*9/100);state.keys[id]=(state.keys[id]||0)+1;save();notify('Purchased '+k.name);
 });
}
function renderCurrency(){
 $('currencydata').innerHTML=`<div class="stat">REFINED METAL<strong>${ref(state.metalCents)}</strong></div><div class="stat">MANN CO. KEYS<strong>${state.keys.mannco||0}</strong></div><div class="stat">ALL KEYS<strong>${totalKeys()}</strong></div>`;
 $('craftkey').disabled=state.mode==='sandbox'||state.metalCents<6588;
 $('exchangeinfo').textContent=state.mode==='sandbox'?'Unlimited currency in Sandbox.':`Balance: ${ref(state.metalCents)}. Key exchange rate: 65.88 ref (simulated).`;
}
$('craftkey').onclick=()=>{
 if(state.mode==='sandbox')return notify('Sandbox has unlimited keys.');
 if(state.metalCents<6588)return notify('Need 65.88 refined.');
 state.metalCents-=6588;state.keys.mannco=(state.keys.mannco||0)+1;save();notify('Exchanged 65.88 refined for 1 Mann Co. key.');
};
function renderSell(){
 $('defaultSellPrice').value=(state.defaultSellPrice/100).toFixed(2);
 if(state.mode==='sandbox'){
  $('sellinventory').innerHTML='<div class="panel"><b>Sandbox inventory cannot be sold.</b> Switch to Economy to sell paid-mode drops.</div>';
  return;
 }
 $('sellinventory').innerHTML=state.items.length?state.items.map((item,i)=>{
  const price=sellQuote(item),locked=item.origin!=='economy';
  return `<div class="tile sell-tile"><div class="crate-icon">${visual(item,'item','crate-picture')}</div>
  <h3>${esc(namedItem(item))}</h3><p>${esc((item.grade?item.grade+' Grade · ':'')+(item.effect||item.kind||''))}</p><p class="price-origin">${esc(price.source)}</p>
  <label>Buyback price (ref) <input class="sell-price" data-price="${i}" type="number" min="0" step="0.01" value="${(price.cents/100).toFixed(2)}" ${locked?'disabled':''}></label>
  <button class="accent" data-sell="${i}" ${locked?'disabled':''}>${locked?'LEGACY · NOT SELLABLE':'SELL ITEM'}</button></div>`;
 }).join(''):'<div class="panel">No economy drops to sell yet.</div>';
 document.querySelectorAll('[data-price]').forEach(input=>input.onchange=()=>{
  const i=Number(input.dataset.price),v=Math.round(Number(input.value)*100);
  if(state.mode!=='economy'||state.items[i]?.origin!=='economy'||!Number.isFinite(v)||v<0)return notify('Invalid price.');
  state.items[i].sellPrice=v;save();
 });
 document.querySelectorAll('[data-sell]').forEach(btn=>btn.onclick=()=>{
  const i=Number(btn.dataset.sell),item=state.items[i];
  if(state.mode!=='economy'||!item||item.origin!=='economy')return notify('Only Economy rewards may be sold.');
  const amount=sellQuote(item).cents;
  state.items.splice(i,1);state.metalCents+=amount;save();notify('Sold '+namedItem(item)+' for '+ref(amount));
 });
}
$('saveSellPrice').onclick=()=>{
 const amount=Math.round(Number($('defaultSellPrice').value)*100);
 if(!Number.isFinite(amount)||amount<0)return notify('Invalid price.');
 state.defaultSellPrice=amount;save();notify('Default buyback price saved.');
};
function renderStats(){
 $('statsdata').innerHTML=[['CRATES OPENED',state.mode==='sandbox'?state.sandbox.opened:state.opened],['UNUSUALS FOUND',state.mode==='sandbox'?state.sandbox.unusuals:state.unusuals],['REWARDS OWNED',activeItems().length],['REFINED SPENT',state.mode==='sandbox'?'—':fmt(state.spent)],['MODE',state.mode.toUpperCase()]]
 .map(([label,value])=>`<div class="stat">${label}<strong>${esc(value)}</strong></div>`).join('');
}
$('bonus').onclick=()=>{state.metalCents+=2500;save();notify('Received 25 refined beta stipend.');};
$('reset').onclick=()=>{if(confirm('Erase the local beta save?')){state={...INIT(),originMigrationV7:true,sandbox:{items:[],opened:0,unusuals:0}};save();notify('Save reset.');}};
refresh();
// Generated manifests are served by GitHub Pages. The browser also supports
// a zero-secret public-schema fallback if an Actions image build was unavailable.
const fileBust='?v=0.6.2';
const normalizedImageName = n => String(n||'').toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9]+/g,'');
function mergeImageData(payload){
 for(const key of ['items','normalized','crates','byIndex']){
  if(payload?.[key]&&typeof payload[key]==='object')Object.assign(imgCache[key],payload[key]);
 }
}
function publicSchemaImageData(payload){
 const result=payload?.result||payload;
 const items=Array.isArray(result?.items)?result.items:Object.values(result?.items||{});
 const cache={items:{},normalized:{},crates:{},byIndex:{}};
 const trusted=/^https?:\/\/(?:media\.steampowered\.com|community\.fastly\.steamstatic\.com|community\.steamstatic\.com|steamcommunity-a\.akamaihd\.net|steamcdn-a\.akamaihd\.net)\//i;
 for(const entry of items){
  if(!entry||typeof entry!=='object')continue;
  const name=entry.item_name||entry.name||'';
  let icon=entry.image_url_large||entry.image_url||'';
  if(!trusted.test(icon))continue;
  icon=icon.replace(/^http:/i,'https:');
  cache.items[name]??=icon;
  cache.normalized[normalizedImageName(name)]??=icon;
  cache.normalized[normalizedImageName(name.replace(/^The\s+/i,''))]??=icon;
  if(entry.defindex!==undefined)cache.byIndex[String(entry.defindex)]=icon;
  const series=entry.attributes?.find?.(a=>a.name==='set supply crate series');
  if(series&&Number.isFinite(Number(series.value)))cache.crates['series-'+Number(series.value)]=icon;
 }
 return cache;
}
async function loadImages(){
 const status=$('imageStatus');
 status.textContent='Checking the Steam image library…';
 try{
  const response=await fetch('data/steam-images.json'+fileBust,{cache:'no-store'});
  if(response.ok)mergeImageData(await response.json());
 }catch(e){console.warn('Bundled image manifest unavailable:',e);}
 let count=Object.keys(imgCache.items).length;
 if(count<30){
  status.textContent='Fetching the public TF2 item schema (no key required)…';
  for(const url of IMAGE_SCHEMA_FALLBACKS){
   try{
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)continue;
    const parsed=publicSchemaImageData(await response.json());
    if(Object.keys(parsed.items).length<30)continue;
    mergeImageData(parsed);
    break;
   }catch(err){console.warn('Public schema fallback:',url,err);}
  }
 }
 count=Object.keys(imgCache.items).length;
 status.textContent=count?
  `Steam icon directory: ${count} items, ${Object.keys(imgCache.crates).length} identified series. Missing items may use a wiki image fallback.`:
  'Steam image directory is unavailable. Deploy with GitHub Actions to generate it; the site will try individual wiki images meanwhile.';
 refresh();
}
function mergeCaseManifest(payload){
 const list=Array.isArray(payload?.cases)?payload.cases:[];
 let modified=0, additions=0, rewards=0;
 for(const data of list){
  if(!data||typeof data.id!=='string'||!data.name||!/Case|Crate|Hoard|Stash|Trove/.test(data.name)||
      /War Paint/i.test(data.name)||!Array.isArray(data.pool)||data.pool.length<8)continue;
  const pool=data.pool.filter(i=>i?.name&&['Mercenary','Commando','Assassin','Elite','Civilian','Freelance'].includes(i.grade))
        .map(i=>({name:i.name,kind:i.kind||'Cosmetic',quality:i.kind==='Weapon'?'Decorated':'Unique',grade:i.grade,image:safeURL(i.image)}));
  if(pool.length<8)continue;
  const keyName=String(data.keyName||'').trim();
  if(!keyName||!keyName.endsWith('Key'))continue;
  const found=ALL_CRATES.find(c=>c.id===data.id||c.name===data.name||c.name===data.name+' (2026)');
  const keyId=found?.key||'key-'+normalizedImageName(keyName);
  if(!KEYS[keyId])KEYS[keyId]={name:keyName,priceUnits:592.92};
  else if(found?.key)KEYS[keyId].name=keyName;
  const override=CRATE_PRICES.byId[data.id]??CRATE_PRICES.bySeries[data.series];
  const item={id:data.id,name:data.name,series:data.series||undefined,kind:'special',
   priceUnits:Number.isFinite(override)?Math.round(override*9):(found?.priceUnits||1),
   key:keyId,keyName,pool,graded:true,verified:true,weighted:false,
   gradeWeights:GRADE_WEIGHTS,unusualChance:.0066,strangeChance:.10,
   openable:true,image:safeURL(data.image),source:data.source||'',
   description:data.description||'Public collection grade reference; simulated odds.',
   oddsSource:data.oddsSource||'Simulator grade model; not official odds.'};
  // Preserve existing key identifier and configured prices for preexisting cases.
  if(found){item.key=found.key||keyId;item.id=found.id;Object.assign(found,item);modified++;}
  else {ALL_CRATES.push(item);additions++;}
  rewards+=pool.length;
 }
 importedCaseCount=modified+additions;importedRewardCount=rewards;
 $('caseStatus').textContent=importedCaseCount?
  `Imported ${importedCaseCount} case collections (${importedRewardCount} graded rewards; ${additions} newly added). Sources: community collection references. Odds remain simulated.`:
  'Additional case collections not yet generated. GitHub Actions can build them from public collection data.';
 refresh();
}
async function loadCases(){
 try{
  const response=await fetch('data/cases-generated.json'+fileBust,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  mergeCaseManifest(await response.json());
 }catch(err){console.warn('Generated case catalog unavailable:',err);$('caseStatus').textContent='Case import unavailable; included verified cases and reference crates remain playable.';}
}
$('retryImages').onclick=()=>{imageFailures.clear();loadImages();};
async function loadPrices(){
 try{
  const r=await fetch('data/backpack-prices.json?v=0.7.0',{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(!data?.items||!data?.crates||!data?.keys)throw Error('Invalid format');
  marketData=data;
  const n=Object.keys(data.items).length;
  $('priceStatus').textContent=n?`backpack.tf suggested prices: ${n} items, ${Object.keys(data.crates).length} crate prices · ${data.metadata?.updatedAt||'date unknown'}. Not averaged live listings.`:'Market cache empty. Simulator prices remain in effect.';
 }catch(err){console.warn('Price cache:',err);$('priceStatus').textContent='Market cache unavailable: simulator prices active.';}
 refresh();
}
void loadImages();
void loadCases();
void loadPrices();
