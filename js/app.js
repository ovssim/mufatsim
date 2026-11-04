/* Mann Co. Unboxing Simulator Beta 0.5: no build tools required. */
'use strict';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'tf2-unbox-beta-1'; // Retain saves from v0.1–0.4.
const INIT = () => ({metal:1800,metalCents:20000,defaultSellPrice:100,
  keys:{mannco:5}, crates:{'series-1':3}, items:[],opened:0,unusuals:0,
  spent:0,mode:'economy'});
let state;
try {state={...INIT(),...JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')};}
catch (_) {state=INIT();}
if (!Number.isInteger(state.metalCents)) state.metalCents=Math.max(0,Math.round((state.metal||0)*100/9));
if (!Number.isInteger(state.defaultSellPrice)) state.defaultSellPrice=100;
if (!state.keys || typeof state.keys!=='object')state.keys={mannco:0};
if (!state.crates || typeof state.crates!=='object')state.crates={};
if (!Array.isArray(state.items))state.items=[];
if (!['economy','sandbox'].includes(state.mode))state.mode='economy';
let current=ALL_CRATES[0],busy=false,toastTimeout;
const imgCache={items:{},normalized:{},crates:{},byIndex:{}};
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
function imageFor(entry,category='item'){
 if(!entry)return '';
 const id=entry.id||'';
 const name=entry.name||'';
 const canonical=name.replace(/^Strange\s+/,'');
 const n=norm(canonical);
 const manual=category==='crate'?CRATE_IMAGES[id]:ITEM_IMAGES[name]||ITEM_IMAGES[canonical];
 return safeURL(manual || (category==='crate'?imgCache.crates[id]:null)
   || (category==='key'?ITEM_IMAGES[name]:null)
   || imgCache.items[name]||imgCache.items[canonical]
   || imgCache.normalized[n]||imgCache.normalized['the'+n]
   || (Number.isInteger(entry.defindex)?imgCache.byIndex[String(entry.defindex)]:null)
   || entry.image||'');
}
function visual(entry,category='item',size='item-picture'){
 const url=imageFor(entry,category);
 const title=esc(entry.name||'TF2 item');
 const letter=category==='crate'?'SUPPLY':category==='key'?'KEY':'MANN CO.';
 const overlay=entry.quality==='Unusual'&&entry.effect?`<span class="overlay-effect ${effectClass(entry.effect)}" aria-hidden="true"><i></i><i></i><i></i></span>`:'';
 return `<span class="item-art-wrap ${category}-art"><span class="art-placeholder"><span class="placeholder-bolt"></span><span>${letter}</span></span>${url?`<img class="${size}" src="${esc(url)}" alt="${title}" loading="lazy" onerror="this.remove()">`:''}${overlay}</span>`;
}
function effectClass(name){
 const s=String(name||'').toLowerCase();
 return /orbit/.test(s)?'fx-orbit':/flame|fire|burn|blaze/.test(s)?'fx-fire':/beam|sun/.test(s)?'fx-sun':/energy|plasma|electric/.test(s)?'fx-energy':'fx-mystic';
}
function refresh(){
 $('money').textContent=ref(state.metalCents);
 $('keycount').textContent=totalKeys()+' keys';
 $('cratecount').textContent='▣ '+totalCrates()+' crates';
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
function displayPrice(c){return state.mode==='sandbox'?'FREE IN SANDBOX':fmt(c.priceUnits)+' · crate';}
function catalogTag(c){return c.graded?'VERIFIED GRADES / MODEL ODDS':c.verified?'REFERENCE DROP LIST':'DEMO DROP POOL';}
function renderCatalog(){
 const q=$('search').value.trim().toLowerCase(), filter=$('filter').value,sort=$('sort').value;
 let list=ALL_CRATES.filter(c=>(filter==='all'||filter===c.kind)&&(c.name.toLowerCase().includes(q)||String(c.series||'').includes(q)));
 if(sort==='price')list.sort((a,b)=>a.priceUnits-b.priceUnits);
 if(sort==='high')list.sort((a,b)=>b.priceUnits-a.priceUnits);
 $('catalog').innerHTML=list.map(c=>`<article class="tile" data-crate="${esc(c.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(c.name)}">
  <div class="crate-icon">${visual(c,'crate','crate-picture')}</div><div class="tag">${catalogTag(c)} · ${c.kind==='numbered'?'SERIES #'+c.series:'COSMETIC / SPECIAL'}</div>
  <h3>${esc(c.name)}</h3><p>${esc(c.keyName)}</p><div class="price">${displayPrice(c)}</div><p>Owned: ${state.crates[c.id]||0}</p></article>`).join('');
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
function modeledGradeOdds(c,item){
 const count=c.pool.filter(x=>x.grade===item.grade).length;
 return c.gradeWeights&&count?(c.gradeWeights[item.grade]/count).toFixed(2)+'% modeled':'';
}
function renderDetail(){
 const c=current;
 $('detailseries').textContent=c.kind==='numbered'?'CRATE SERIES #'+c.series:'COSMETIC / SPECIAL CASE';
 $('detailname').textContent=c.name;$('detaildesc').textContent=c.description;
 $('detailcost').innerHTML=`<h3>ACQUISITION & OPENING</h3><p>Crate: <b>${fmt(c.priceUnits)}</b> (simulator price)<br>Required: <b>${esc(c.keyName)}</b><br>Owned crates: <b>${state.crates[c.id]||0}</b> · Owned required keys: <b>${c.key?(state.keys[c.key]||0):'none required'}</b></p>`;
 $('detailodds').innerHTML=`<div class="notice"><b>${c.graded?'VERIFIED ITEM GRADES · ESTIMATED GRADE ODDS':c.verified?'REFERENCE DROP LIST':'DEMO CONTENTS — NOT HISTORICAL'}</b><br>Unusual chance: ${(c.unusualChance*100).toFixed(2)}% (beta assumption). ${c.graded?'Grade rates: Mercenary 80%, Commando 16%, Assassin 3.2%, Elite 0.8% (model, not official).':''} Strange and Unusual rates and eligible effects are modeled.</div>`;
 const groups=c.graded?['Mercenary','Commando','Assassin','Elite']:[''];
 $('detailpool').innerHTML='<h3>ITEM DROP POOL</h3>'+groups.map(grade=>{
  const list=c.graded?c.pool.filter(x=>x.grade===grade):c.pool;
  return (grade?`<h4 class="grade-heading grade-${grade.toLowerCase()}">${grade} Grade</h4>`:'')+
    `<ul class="drop-list">${list.map(item=>`<li>${esc(item.name)}${!c.graded&&item.quality?` <span class="item-quality">${esc(item.quality)}</span>`:''}${c.graded?` <span class="drop-odds">${modeledGradeOdds(c,item)}</span>`:item.weight?` <span class="drop-odds">${item.weight}% community estimate</span>`:''}</li>`).join('')}</ul>`;
 }).join('');
 $('buycrate').disabled=busy||state.mode==='sandbox';
 $('buykey').disabled=busy||state.mode==='sandbox'||!c.key;
 $('opencrate').disabled=busy;
 $('opencrate').textContent=busy?'UNLOCKING…':state.mode==='sandbox'?'UNBOX (SANDBOX)':'UNBOX';
}
$('buycrate').onclick=()=>{
 if(busy||state.mode==='sandbox')return;
 const cost=cents(current.priceUnits);if(state.metalCents<cost)return notify('Not enough refined metal.');
 state.metalCents-=cost;state.spent+=current.priceUnits;
 state.crates[current.id]=(state.crates[current.id]||0)+1;save();notify('Crate purchased!');
};
$('buykey').onclick=()=>{
 if(busy||state.mode==='sandbox'||!current.key)return;
 const k=current.key,key=KEYS[k];if(!key)return notify('This key is unavailable.');
 const cost=cents(key.priceUnits);if(state.metalCents<cost)return notify('Not enough refined metal.');
 state.metalCents-=cost;state.spent+=key.priceUnits;state.keys[k]=(state.keys[k]||0)+1;save();notify(key.name+' purchased!');
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
  const grades=['Mercenary','Commando','Assassin','Elite'].filter(g=>c.pool.some(i=>i.grade===g));
  const grade=weightedPick(grades,g=>c.gradeWeights[g]);
  const available=c.pool.filter(i=>i.grade===grade);
  base=available[Math.floor(Math.random()*available.length)];
 } else base=weightedPick(c.pool,x=>x.weight||1);
 const eligible=base.kind==='Cosmetic';
 const unusual=eligible&&Math.random()<c.unusualChance;
 const strange=!unusual&&c.graded&&Math.random()<(c.strangeChance||0);
 const quality=unusual?'Unusual':strange?'Strange':base.quality||'Unique';
 const effects=c.effectPool?.length?c.effectPool:EFFECTS; // Beta effect pool if not historically mapped.
 const effect=unusual?effects[Math.floor(Math.random()*effects.length)]:null;
 return {instanceId:globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random()),name:base.name,
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
  state.items.unshift(item);state.opened++;
  if(item.quality==='Unusual')state.unusuals++;
  $('reward').innerHTML=visual(item,'item','reward-picture')+
    `<div class="reward-name">${esc(item.quality)} ${esc(item.name)}</div>`+
    (item.grade?`<div class="reward-grade grade-${item.grade.toLowerCase()}">${esc(item.grade)} Grade</div>`:'')+
    (item.effect?`<div class="reward-effect">✦ ${esc(item.effect)}</div>`:'');
  $('effect').className='particle-effect '+(item.effect?effectClass(item.effect):'');
  stage.classList.add('revealed');
  $('status').textContent='RECEIVED: '+item.quality+' '+item.name+(item.grade?' · '+item.grade+' Grade':'')+(item.demo?' (modeled/demo probabilities)':'');
  save();
 }catch(e){console.error('Unbox error:',e);notify('Opening failed; no resources consumed.');resetStage();}
 finally {busy=false;renderDetail();}
};
function renderBackpack(){
 const containers=Object.entries(state.crates).filter(([,n])=>n>0).map(([id,n])=>({crate:ALL_CRATES.find(c=>c.id===id),id,qty:n}));
 const crateHTML=containers.map(({crate,id,qty})=>`<button type="button" class="item backpack-crate" data-owned="${esc(id)}" title="Open ${esc(crate?.name||id)}">
  <span class="art">${visual(crate||{id,name:id},'crate')}</span><strong>${esc(crate?.name||id)}</strong><small>Crate · ×${qty}</small><small>CLICK TO UNBOX</small></button>`).join('');
 const itemHTML=state.items.map(item=>`<div class="item ${item.quality==='Unusual'?'unusual':''}"><span class="art">${visual(item)}</span>
  <strong>${esc(item.name)}</strong><small class="item-quality">${esc(item.quality||'Unique')}</small>${item.grade?`<small class="grade-label grade-${item.grade.toLowerCase()}">${esc(item.grade)} Grade</small>`:''}${item.effect?`<small class="effect-name">✦ ${esc(item.effect)}</small>`:''}</div>`).join('');
 $('backpack').innerHTML=crateHTML||itemHTML?`<div class="backpack-grid">${crateHTML}${itemHTML}</div>`:'<div class="panel">Your backpack is empty.</div>';
 document.querySelectorAll('[data-owned]').forEach(btn=>btn.onclick=()=>openDetail(btn.dataset.owned));
}
function renderKeyshop(){
 $('keyshop').innerHTML=Object.entries(KEYS).map(([id,k])=>`<div class="tile key-tile"><div class="crate-icon">${visual(k,'key')}</div>
 <h3>${esc(k.name)}</h3><p>Owned: ${state.keys[id]||0}</p><div class="price">${fmt(k.priceUnits)} · simulator price</div><button data-buy-key="${esc(id)}" class="accent" ${state.mode==='sandbox'?'disabled':''}>BUY KEY</button></div>`).join('');
 document.querySelectorAll('[data-buy-key]').forEach(btn=>btn.onclick=()=>{
  if(state.mode==='sandbox')return notify('Keys are unlimited in Sandbox.');
  const id=btn.dataset.buyKey,k=KEYS[id],cost=cents(k.priceUnits);
  if(state.metalCents<cost)return notify('Not enough refined metal.');
  state.metalCents-=cost;state.spent+=k.priceUnits;state.keys[id]=(state.keys[id]||0)+1;save();notify('Purchased '+k.name);
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
 $('sellinventory').innerHTML=state.items.length?state.items.map((item,i)=>`<div class="tile sell-tile"><div class="crate-icon">${visual(item,'item','crate-picture')}</div>
  <h3>${esc(item.quality)} ${esc(item.name)}</h3><p>${esc((item.grade?item.grade+' Grade · ':'')+(item.effect||item.kind))}</p>
  <label>Buyback price (ref) <input class="sell-price" data-price="${i}" type="number" min="0" step="0.01" value="${((item.sellPrice??configuredSellPrice(item))/100).toFixed(2)}"></label>
  <button class="accent" data-sell="${i}" ${state.mode==='sandbox'?'disabled':''}>SELL ITEM</button></div>`).join(''):'<div class="panel">No unboxed drops to sell yet.</div>';
 document.querySelectorAll('[data-price]').forEach(input=>input.onchange=()=>{
  const idx=Number(input.dataset.price),amount=Math.round(Number(input.value)*100);
  if(!Number.isFinite(amount)||amount<0)return notify('Invalid price.');
  state.items[idx].sellPrice=amount;
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){notify('Save failed.');}
 });
 document.querySelectorAll('[data-sell]').forEach(btn=>btn.onclick=()=>{
  if(state.mode==='sandbox')return notify('Switch to Economy to sell.');
  const idx=Number(btn.dataset.sell),item=state.items[idx];if(!item)return;
  const amount=item.sellPrice??configuredSellPrice(item);
  if(!confirm(`Sell ${item.name} for ${ref(amount)}?`))return;
  state.items.splice(idx,1);state.metalCents+=amount;save();notify('Sold '+item.name+' for '+ref(amount));
 });
}
$('saveSellPrice').onclick=()=>{
 const amount=Math.round(Number($('defaultSellPrice').value)*100);
 if(!Number.isFinite(amount)||amount<0)return notify('Invalid price.');
 state.defaultSellPrice=amount;save();notify('Default buyback price saved.');
};
function renderStats(){
 $('statsdata').innerHTML=[['CRATES OPENED',state.opened],['UNUSUALS FOUND',state.unusuals],['REWARDS OWNED',state.items.length],['REFINED SPENT',fmt(state.spent)],['MODE',state.mode.toUpperCase()]]
 .map(([label,value])=>`<div class="stat">${label}<strong>${esc(value)}</strong></div>`).join('');
}
$('bonus').onclick=()=>{state.metalCents+=2500;save();notify('Received 25 refined beta stipend.');};
$('reset').onclick=()=>{if(confirm('Erase the local beta save?')){state=INIT();save();notify('Save reset.');}};
refresh();
// Public item image URLs are built by GitHub Actions on deployment. Browser needs no API key.
fetch('data/steam-images.json?v=0.5',{cache:'no-store'}).then(resp=>{
 if(!resp.ok)throw Error('Image manifest HTTP '+resp.status);
 return resp.json();
}).then(payload=>{
 for(const key of ['items','normalized','crates','byIndex']){
  if(payload[key]&&typeof payload[key]==='object')Object.assign(imgCache[key],payload[key]);
 }
 const count=Object.keys(imgCache.items).length;
 $('imageStatus').textContent=count?`Steam image library loaded: ${count} item icons · ${Object.keys(imgCache.crates).length} container icons.`:
  'No Steam image library generated yet. Set STEAM_API_KEY and run Build TF2 simulator and update images under Actions.';
 refresh();
}).catch(err=>{
 console.warn('Steam image manifest unavailable:',err);
 $('imageStatus').textContent='Image library unavailable. Check that data/steam-images.json exists in the deployed site.';
});
