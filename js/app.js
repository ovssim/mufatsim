/* Mann Co. Unboxing Simulator — historical crate, Unusual rules, and Free Supply Drop gameplay. */
'use strict';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'tf2-unbox-beta-1'; // Retain saves from v0.1–0.4.
const INIT = () => ({metal:1800,metalCents:20000,
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
// Economy and Sandbox each have an independent five-minute free supply drop.
// Sandbox rewards never mutate the Economy wallet.
const validDrop = x => ({nextAt:Math.max(0,Number(x?.nextAt)||0),claims:Math.max(0,Number(x?.claims)||0),last:typeof x?.last==='string'?x.last:''});
state.freeDrop=validDrop(state.freeDrop);
state.sandbox.freeDrop=validDrop(state.sandbox.freeDrop);
if(!state.sandbox.bonusWallet||typeof state.sandbox.bonusWallet!=='object')state.sandbox.bonusWallet={metalCents:0,keys:{}};
if(!state.sandbox.bonusWallet.keys||typeof state.sandbox.bonusWallet.keys!=='object')state.sandbox.bonusWallet.keys={};
if(!Number.isFinite(state.sandbox.bonusWallet.metalCents))state.sandbox.bonusWallet.metalCents=0;
// Pre-0.7.2 saves may contain player-chosen sale prices.
// Ignore and discard them: all future sell quotes come from the market cache
// or the developer-maintained data/prices.js file.
delete state.defaultSellPrice;
for (const item of (Array.isArray(state.items)?state.items:[])) if (item && typeof item === 'object') delete item.sellPrice;
for (const item of state.sandbox.items || []) if (item && typeof item === 'object') delete item.sellPrice;
if (!state.keys || typeof state.keys!=='object')state.keys={mannco:0};
if (!state.crates || typeof state.crates!=='object')state.crates={};
if(!Array.isArray(state.items))state.items=[];
if(!state.redeemedCodes||typeof state.redeemedCodes!=='object'||Array.isArray(state.redeemedCodes))state.redeemedCodes={};
if (!['economy','sandbox'].includes(state.mode))state.mode='economy';
let current=ALL_CRATES[0],busy=false,toastTimeout;
const imgCache={items:{},normalized:{},crates:{},byIndex:{}};
let importedCaseCount=0, importedRewardCount=0, importedHistoricalCount=0;
const STOCK_CRATE_IMAGE='https://media.steampowered.com/apps/440/icons/crate_large.4ca851c13c3907ca378765fbb91a22b6c79d3d87.png';
const STOCK_KEY_IMAGE='https://media.steampowered.com/apps/440/icons/key_large.354829243e53d73a5a75323c88fc5689ecb19359.png';
const imageFailures=new Set();
const isUnusual=i=>i?.quality==='Unusual'||!!i?.effect;
const isStrange=i=>i?.strange===true||i?.quality==='Strange';
// Promotion gifts are permanently unsellable, regardless of cached market price.
const cannotSell=i=>!!(i?.promoReward||i?.nonSellable||i?.sellable===false||i?.unresolved||i?.origin!=='economy');
const namedItem=i=>`${isStrange(i)?'Strange ':''}${isUnusual(i)?'Unusual ':''}${i.name||'Unknown Item'}`;
const QUALITY_COLOR={Unique:'#FFD700',Strange:'#CF6A32',Unusual:'#8650AC'};
const GRADE_COLOR={Mercenary:'#4B69FF',Commando:'#8847FF',Assassin:'#D32CE6',Elite:'#EB4B4B',Civilian:'#B0C3D9',Freelance:'#5E98D9'};
function rarityStyle(item){
 const grade=GRADE_COLOR[item?.grade]||null;
 const secondary=isUnusual(item)?QUALITY_COLOR.Unusual:isStrange(item)?QUALITY_COLOR.Strange:null;
 const a=grade||secondary||QUALITY_COLOR.Unique,b=grade&&secondary?secondary:a;
 return `--rarity-a:${a};--rarity-b:${b};`;
}
const rarityFrame=item=>`rarity-frame${isUnusual(item)?' unusual':''}`;
const activeItems=()=>state.mode==='sandbox'?state.sandbox.items:state.items;
const IMAGE_SCHEMA_FALLBACKS=[
 'https://cdn.jsdelivr.net/gh/tsuza/tf2-item-schema@master/files/localized/item_schema_json_english.txt',
 'https://cdn.jsdelivr.net/gh/tsuza/tf2-item-schema@master/files/item_schema_json.txt'
];
const KEY_VALUE_CENTS=6588;
const ref = cents => (cents/100).toFixed(2)+' ref';
const UNUSUAL_EFFECT_RENDER_MAP=(typeof UNUSUAL_EFFECT_RENDERS==='object'&&UNUSUAL_EFFECT_RENDERS)?UNUSUAL_EFFECT_RENDERS:{};
const fmt = units => (units/9).toFixed(2)+' ref';
const cents = units => Math.round(units*100/9);
function splitCurrency(totalCents){
 const safe=Math.max(0,Math.round(Number(totalCents)||0));
 const keys=Math.floor(safe/KEY_VALUE_CENTS);
 const metalCents=safe-(keys*KEY_VALUE_CENTS);
 return {keys,metalCents};
}
function formatCurrency(totalCents){
 const {keys,metalCents}=splitCurrency(totalCents);
 const parts=[];
 if(keys>0)parts.push(`${keys} key${keys===1?'':'s'}`);
 if(metalCents>0||!parts.length)parts.push(`${(metalCents/100).toFixed(2)} ref`);
 return parts.join(' + ');
}
function canAffordMixed(totalCents){
 if(state.mode==='sandbox')return true;
 const {keys,metalCents}=splitCurrency(totalCents);
 return (state.keys.mannco||0)>=keys && state.metalCents>=metalCents;
}
function spendMixed(totalCents){
 const {keys,metalCents}=splitCurrency(totalCents);
 state.keys.mannco=Math.max(0,(state.keys.mannco||0)-keys);
 state.metalCents=Math.max(0,state.metalCents-metalCents);
 return {keys,metalCents};
}
function creditMixed(totalCents){
 const {keys,metalCents}=splitCurrency(totalCents);
 if(keys>0)state.keys.mannco=(state.keys.mannco||0)+keys;
 if(metalCents>0)state.metalCents+=metalCents;
 return {keys,metalCents};
}
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
 const render=category==='item'&&isUnusual(entry)&&entry.effect?effectRender(entry.effect):'';
 const overlay=isUnusual(entry)&&entry.effect?(
  render?
   `<span class="overlay-effect effect-image" aria-hidden="true"><img class="effect-render" src="${esc(render)}" alt="" loading="lazy" onerror="this.closest('.overlay-effect').classList.add('render-failed');this.remove()"><i></i><i></i><i></i></span>`:
   `<span class="overlay-effect ${effectClass(entry.effect)}" style="${effectStyle(entry.effect)}" aria-hidden="true"><i></i><i></i><i></i></span>`
 ):'';
 return `<span class="item-art-wrap ${category}-art"><span class="art-placeholder"><span class="placeholder-bolt"></span><span>${letter}</span></span>${overlay}${url?`<img class="${size}" src="${esc(url)}" data-images="${esc(JSON.stringify(sources))}" data-index="0" alt="${title}" loading="lazy" onload="this.parentElement.classList.add('image-loaded')" onerror="advanceImage(this)">`:''}</span>`;
}
// One CSS particle recipe per named effect. These are original 2D approximations,
// not Valve's proprietary 3D particle systems.
function effectClass(name){
 const s=String(name||'').toLowerCase();
 if(/sunbeams|radiant|halo|star|sunlight|north star/.test(s))return 'fx-sun';
 if(/burning flames|scorching flames|fire|flame|blaze|inferno|ignited|frostfire/.test(s))return 'fx-fire';
 if(/orbit|circling|planet|logo|heart|peace sign|aces high|dead presidents/.test(s))return 'fx-orbit';
 if(/blizzard|snow|frost|icy|ice|winter|freeze/.test(s))return 'fx-snow';
 if(/confetti|disco|festive|firework|bokeh|lights/.test(s))return 'fx-confetti';
 if(/ghost|haunt|phantasm|spirit|soul|wraith|skull|spectral/.test(s))return 'fx-ghost';
 if(/storm|thunder|electric|watt|volta|charged|surge|plasma|energy/.test(s))return 'fx-electric';
 if(/smok|steam|cloud|mist|haze|fog|vapor/.test(s))return 'fx-smoke';
 if(/flower|petal|butterfly|dove|bird|raven|fly|flies|bug|leaf|leaves/.test(s))return 'fx-nature';
 if(/moon|galactic|cosmos|stellar|space|nebula|warp/.test(s))return 'fx-cosmic';
 return 'fx-unique';
}
function effectStyle(name){
 const s=String(name||'');let hash=2166136261;
 for(const ch of s){hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;}
 const hue=hash%360,speed=(1.35+(hash%120)/100).toFixed(2);
 return `--fx-hue:${hue};--fx-speed:${speed}s`;
}
function effectRender(name){
 const raw=String(name||'').trim();
 if(!raw)return '';
 const direct=UNUSUAL_EFFECT_RENDER_MAP[raw]||UNUSUAL_EFFECT_RENDER_MAP[priceKey(raw)]||UNUSUAL_EFFECT_RENDER_MAP[norm(raw)];
 return safeURL(direct||'');
}
function refresh(){
 $('money').textContent=state.mode==='sandbox'?'SANDBOX':ref(state.metalCents);
 $('keycount').textContent=state.mode==='sandbox'?'∞ keys':totalKeys()+' keys';
 $('cratecount').textContent=state.mode==='sandbox'?'FREE OPENINGS':'▣ '+totalCrates()+' crates';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===state.mode));
 renderCatalog();renderBackpack();renderKeyshop();renderCurrency();renderSell();renderStats();renderFreeCrate();renderRedeem();
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
 // Fixed quote: never use per-item values from browser saves or form input.
 const m=MARKET_OPTIONS.preferMarketSell?marketItemPrice(item):null;
 return Number.isFinite(m)&&m>=0?{cents:m,source:'backpack.tf suggested price'}:
  {cents:manualSellPrice(item),source:'Simulator fallback (data/prices.js)'};
}
function catalogMarketRef(names,kind){
 const collection=marketData[kind]||{};
 for(const name of names){
  const normalized=priceKey(name);
  const m=collection[normalized]??collection['name:'+normalized];
  if(Number.isFinite(m)&&m>=0)return m;
  // Some newer cases and special keys appear only as unique item price entries.
  const p=marketData.items?.[normalized]?.qualities?.Unique?.priceRef;
  if(Number.isFinite(p)&&p>=0)return p;
 }
 return null;
}
function crateQuote(c){
 const names=[c.name,c.name.replace(/^The\s+/i,''),c.name.replace(/\s*#\d+$/,'')];
 const m=marketData.crates?.[c.id]??catalogMarketRef(names,'crates');
 return MARKET_OPTIONS.preferMarketCrates&&Number.isFinite(m)&&m>=0?{cents:Math.round(m*100),source:'backpack.tf suggested price'}:
 {cents:cents(c.priceUnits),source:'Simulator fallback · no matching market quote'};
}
function keyQuote(id){
 const k=KEYS[id];
 const names=[k?.name||'',(k?.name||'').replace(/\bCosmetic Case Key$/,'Cosmetic Key'),(k?.name||'').replace(/\bCosmetic Key$/,'Cosmetic Case Key')];
 const m=catalogMarketRef(names,'keys');
 return MARKET_OPTIONS.preferMarketKeys&&Number.isFinite(m)&&m>=0?{cents:Math.round(m*100),source:'backpack.tf suggested price'}:
 {cents:cents(k.priceUnits),source:'Simulator fallback · no matching market quote'};
}
function displayPrice(c){if(state.mode==='sandbox')return 'FREE IN SANDBOX';const p=crateQuote(c);return formatCurrency(p.cents)+' · '+p.source;}
function catalogTag(c){return c.historical?'HISTORICAL CONTENTS / MODELED ODDS':c.graded?'SOURCE GRADES / MODEL ODDS':c.verified?'REFERENCE DROP LIST':'UNVERIFIED';}
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
 if(!crate.openable||!Array.isArray(crate.pool)||!crate.pool.length)return notify('This crate has no verified loot data yet.');
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
 $('detailcost').innerHTML=`<h3>ACQUISITION & OPENING</h3><p>Crate: <b>${formatCurrency(p.cents)}</b> (${esc(p.source)})<br>Required: <b>${esc(c.keyName)}</b><br>${state.mode==='sandbox'?'Sandbox: virtual crates and keys':`Owned crates: <b>${state.crates[c.id]||0}</b> · Owned keys: <b>${c.key?(state.keys[c.key]||0):'none required'}</b>`}</p>`;
 $('detailodds').innerHTML=`<div class="notice"><b>${c.historical?'HISTORICAL REGULAR DROPS · COMMUNITY ESTIMATES':c.graded?'SOURCE GRADES · ESTIMATED GRADE ODDS':c.verified?'REFERENCE DROP LIST':'UNVERIFIED'}</b><br>${esc(c.oddsSource||'The displayed odds are simulator estimates, not official Valve probabilities.')} ${c.historical?`Rare unusual-hat category: ${(c.unusualChance*100).toFixed(2)}% modeled; the exact hat and effect for that rare roll are not individually verified.`:`Unusual chance: ${(c.unusualChance*100).toFixed(2)}% (simulator estimate).`} ${c.graded?`Grade rates: Mercenary 80%, Commando 16%, Assassin 3.2%, Elite 0.8% (model). ${eligibleCaseHats(c).length} whitelisted Unusual hats; ${eligibleEffects(c).length} possible classic/later-event effects (era model, not fully verified combos).`:''} ${c.source?`<a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">View source</a>`:''}</div>`;
 const groups=c.graded?['Civilian','Freelance','Mercenary','Commando','Assassin','Elite'].filter(g=>c.pool.some(i=>i.grade===g)):[''];
 $('detailpool').innerHTML='<h3>ITEM DROP POOL</h3>'+groups.map(grade=>{
  const list=c.graded?c.pool.filter(x=>x.grade===grade):c.pool;
  return (grade?`<h4 class="grade-heading grade-${grade.toLowerCase()}">${grade} Grade</h4>`:'')+
    `<ul class="drop-list">${list.map(item=>`<li class="drop-card ${item.grade?'grade-border-'+item.grade.toLowerCase():''}">${visual(item)}<div class="drop-text"><span class="drop-name">${esc(item.name)}</span>${!c.graded&&item.quality?` <span class="item-quality">${esc(item.quality)}</span>`:''}${c.graded?` <span class="drop-odds">${modeledGradeOdds(c,item)}</span>`:item.weight?` <span class="drop-odds">${item.weight}% community estimate</span>`:''}</div></li>`).join('')}</ul>`;
 }).join('');
 $('buycrate').disabled=busy||state.mode==='sandbox'||!c.openable;
 $('buykey').disabled=busy||state.mode==='sandbox'||!c.key;
 $('opencrate').disabled=busy||!c.openable||!c.pool?.length;
 $('opencrate').textContent=busy?'UNLOCKING…':state.mode==='sandbox'?'UNBOX (SANDBOX)':'UNBOX';
}
$('buycrate').onclick=()=>{
 if(busy||state.mode==='sandbox'||!current.openable||!current.pool?.length)return;
 const cost=crateQuote(current).cents;if(!canAffordMixed(cost))return notify('Not enough keys / refined metal.');
 spendMixed(cost);state.spent+=Math.round(cost*9/100);
 state.crates[current.id]=(state.crates[current.id]||0)+1;save();notify('Crate purchased for '+formatCurrency(cost)+'!');
};
$('buykey').onclick=()=>{
 if(busy||state.mode==='sandbox'||!current.key)return;
 const k=current.key,key=KEYS[k];if(!key)return notify('This key is unavailable.');
 const cost=keyQuote(k).cents;if(!canAffordMixed(cost))return notify('Not enough keys / refined metal.');
 spendMixed(cost);state.spent+=Math.round(cost*9/100);state.keys[k]=(state.keys[k]||0)+1;save();notify(key.name+' purchased for '+formatCurrency(cost)+'!');
};
function weightedPick(entries,getWeight){
 const weights=entries.map(x=>Math.max(0,Number(getWeight(x))||0));
 const total=weights.reduce((a,b)=>a+b,0);
 if(total<=0)return entries[Math.floor(Math.random()*entries.length)];
 let n=Math.random()*total;
 for(let i=0;i<entries.length;i++){n-=weights[i];if(n<0)return entries[i];}
 return entries[entries.length-1];
}
// Unusual cosmetics use an explicit hat whitelist. Unknown hats never
// automatically become Unusual. Events are only eligible if the case existed
// when they began, and only for cosmetic CASES, never numbered crates.
function eligibleCaseHats(c){
 const map=(typeof CASE_UNUSUAL_HATS!=='undefined'?CASE_UNUSUAL_HATS:{});
 const allowed=new Set((c.unusualHatNames||map[c.id]||[]).map(norm));
 return c.graded?c.pool.filter(i=>i.kind==='Cosmetic'&&allowed.has(norm(i.name))):[];
}
function eligibleEffects(c){
 const release=typeof CASE_RELEASE_DATES==='object'?CASE_RELEASE_DATES[c.id]:null;
 const classic=typeof CLASSIC_HAT_EFFECTS!=='undefined'?CLASSIC_HAT_EFFECTS:[];
 if(!release||!c.graded)return [];
 const events=typeof EFFECTS_BUNDLED==='object'?EFFECTS_BUNDLED.events:[];
 const eventEffects=events.filter(e=>e.start>=release).flatMap(e=>e.effects||[]);
 return [...new Set([...classic,...eventEffects])];
}
function randomItemId(){return globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random());}
function roll(c){
 const historicalRare=c.historical&&c.unusualChance>0&&Math.random()<c.unusualChance;
 if(historicalRare)return {
  instanceId:randomItemId(),name:'Exceedingly Rare Unusual Hat (identity unresolved)',origin:state.mode,
  kind:'Cosmetic',quality:'Unusual',strange:false,grade:null,effect:null,crate:c.name,crateId:c.id,
  demo:true,unresolved:true,sourceModel:'Historical rare category; specific hat/effect not verified'
 };
 // A modern case can only grant an Unusual from its whitelisted HEAD cosmetics,
 // not the entire cosmetic collection, and not arbitrary later hats.
 const hats=eligibleCaseHats(c),effects=eligibleEffects(c);
 const unusual=c.graded&&hats.length>0&&effects.length>0&&Math.random()<(c.unusualChance||0);
 const available=unusual?hats:c.pool;
 let base;
 if(c.graded){
  const grades=['Civilian','Freelance','Mercenary','Commando','Assassin','Elite'].filter(g=>available.some(i=>i.grade===g));
  const grade=weightedPick(grades,g=>c.gradeWeights?.[g]??1);
  const ofGrade=available.filter(i=>i.grade===grade);
  base=ofGrade[Math.floor(Math.random()*ofGrade.length)];
 }else base=weightedPick(available,x=>Number.isFinite(Number(x.weight))?Number(x.weight):1);
 // Strange is an independent display property. Exact co-occurrence odds are a
 // model, not a claim about Valve's unpublished per-case probabilities.
 const strange=!!c.graded&&Math.random()<(c.strangeChance||0);
 const quality=unusual?'Unusual':strange?'Strange':base.quality||'Unique';
 const effect=unusual?effects[Math.floor(Math.random()*effects.length)]:null;
 return {instanceId:randomItemId(),name:base.name,origin:state.mode,
  kind:base.kind,quality,strange,grade:base.grade||null,effect,crate:c.name,crateId:c.id,
  image:base.image||'',demo:!c.verified||unusual||c.graded||c.historical,
  sourceModel:c.historical?'Community model odds':c.graded?'Grade / Unusual eligibility model':'Legacy save'};
}
$('opencrate').onclick=async()=>{
 if(busy)return;
 const c=current;
 if(!c.openable||!c.pool?.length)return notify('Verified loot data is unavailable.');
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
   if(isUnusual(item))state.sandbox.unusuals++;
  }else{
   state.items.unshift(item);state.opened++;
   if(isUnusual(item))state.unusuals++;
  }
  $('reward').innerHTML=`<span class="reward-rarity-frame ${rarityFrame(item)}" style="${rarityStyle(item)}">`+visual(item,'item','reward-picture')+'</span>'+
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
 const itemHTML=activeItems().map((item,i)=>`<div class="item ${rarityFrame(item)}" style="${rarityStyle(item)}"><span class="art">${visual(item)}</span>
  <strong>${esc(namedItem(item))}</strong>${isUnusual(item)||isStrange(item)?`<small class="item-quality">${isStrange(item)&&isUnusual(item)?'Strange · ':''}${isUnusual(item)?'Unusual':item.quality==='Strange'?'Strange':''}</small>`:''}${item.grade?`<small class="grade-label grade-${item.grade.toLowerCase()}">${esc(item.grade)} Grade</small>`:''}${item.effect?`<small class="effect-name">✦ ${esc(item.effect)}</small>`:''}${item.promoReward?'<small class="promo-lock-note">PROMO REWARD · NOT SELLABLE</small>':''}${item.origin==='legacy'?'<small class="legacy-note">LEGACY · SELLING LOCKED</small>':''}<button type="button" class="delete-item" data-delete="${i}">DELETE ITEM</button></div>`).join('');
 $('backpack').innerHTML=`<div class="mode-banner">${state.mode==='sandbox'?'SANDBOX BACKPACK · Free unboxes are kept here and cannot be sold.':'ECONOMY BACKPACK · Paid-mode rewards only.'}</div>`+(crateHTML||itemHTML?`<div class="backpack-grid">${crateHTML}${itemHTML}</div>`:'<div class="panel">This backpack is empty.</div>');
 document.querySelectorAll('[data-owned]').forEach(btn=>btn.onclick=()=>openDetail(btn.dataset.owned));
 document.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>promptDelete(Number(btn.dataset.delete)));
}
function renderKeyshop(){
 $('keyshop').innerHTML=Object.entries(KEYS).map(([id,k])=>`<div class="tile key-tile"><div class="crate-icon">${visual({...k,id},'key')}</div>
 <h3>${esc(k.name)}</h3><p>Owned: ${state.keys[id]||0}</p><div class="price">${formatCurrency(keyQuote(id).cents)} · ${esc(keyQuote(id).source)}</div><button data-buy-key="${esc(id)}" class="accent" ${state.mode==='sandbox'?'disabled':''}>BUY KEY</button></div>`).join('');
 document.querySelectorAll('[data-buy-key]').forEach(btn=>btn.onclick=()=>{
  if(state.mode==='sandbox')return notify('Keys are unlimited in Sandbox.');
  const id=btn.dataset.buyKey,k=KEYS[id],cost=keyQuote(id).cents;
  if(!canAffordMixed(cost))return notify('Not enough keys / refined metal.');
  spendMixed(cost);state.spent+=Math.round(cost*9/100);state.keys[id]=(state.keys[id]||0)+1;save();notify('Purchased '+k.name+' for '+formatCurrency(cost)+'.');
 });
}
function renderCurrency(){
 $('currencydata').innerHTML=`<div class="stat">MANN CO. KEYS<strong>${state.keys.mannco||0}</strong></div><div class="stat">REFINED METAL<strong>${ref(state.metalCents)}</strong></div><div class="stat">TOTAL BUYING POWER<strong>${formatCurrency((state.keys.mannco||0)*KEY_VALUE_CENTS+state.metalCents)}</strong></div>`;
 $('craftkey').disabled=state.mode==='sandbox'||state.metalCents<6588;
 $('exchangeinfo').textContent=state.mode==='sandbox'?'Unlimited currency in Sandbox.':`Balance: ${ref(state.metalCents)}. Key exchange rate: 65.88 ref (simulated).`;
}
$('craftkey').onclick=()=>{
 if(state.mode==='sandbox')return notify('Sandbox has unlimited keys.');
 if(state.metalCents<6588)return notify('Need 65.88 refined.');
 state.metalCents-=6588;state.keys.mannco=(state.keys.mannco||0)+1;save();notify('Exchanged 65.88 refined for 1 Mann Co. key.');
};
function renderSell(){
 const pricedItems=Object.keys(marketData.items||{}).length;
 const economyItems=state.items.filter(item=>item.origin==='economy');
 const matched=MARKET_OPTIONS.preferMarketSell?economyItems.filter(item=>!item.unresolved&&Number.isFinite(marketItemPrice(item))).length:0;
 const updatedAt=marketData.metadata?.updatedAt||'';
 const mstat=$('sellPriceStatus');
 if(mstat){
  mstat.textContent=pricedItems?`backpack.tf data loaded: ${pricedItems.toLocaleString()} priced item names. ${matched} of ${economyItems.length} Economy drops matched. Updated ${updatedAt||'unknown'}. Prices are community suggestions, not live listing averages.`:
   `No backpack.tf prices loaded. Fixed quotes use data/prices.js. ${marketData.metadata?.status||'Check the GitHub Actions price-update step and BACKPACK_TF_API_KEY secret.'}`;
  mstat.dataset.state=pricedItems?'loaded':'empty';
 }
 if(state.mode==='sandbox'){
  $('sellinventory').innerHTML='<div class="panel"><b>Sandbox inventory cannot be sold.</b> Switch to Economy to sell paid-mode drops.</div>';
  return;
 }
 $('sellinventory').innerHTML=state.items.length?state.items.map((item,i)=>{
  const price=sellQuote(item),locked=cannotSell(item);
  return `<div class="tile sell-tile ${rarityFrame(item)}" style="${rarityStyle(item)}"><div class="crate-icon">${visual(item,'item','crate-picture')}</div>
  <h3>${esc(namedItem(item))}</h3><p>${esc((item.grade?item.grade+' Grade · ':'')+(item.effect||item.kind||''))}</p>
  <p class="market-quote">${formatCurrency(price.cents)}</p><p class="price-origin">${esc(price.source)}</p>
  <p class="sell-locked-note">Fixed buyback quote</p>
  <button type="button" class="accent" data-sell="${i}" ${locked?'disabled':''}>${item.promoReward||item.nonSellable||item.sellable===false?'PROMO · NOT SELLABLE':item.unresolved?'UNKNOWN HAT · UNSALEABLE':item.origin!=='economy'?'LEGACY · NOT SELLABLE':'SELL FOR '+formatCurrency(price.cents)}</button></div>`;
 }).join(''):'<div class="panel">No economy drops to sell yet. Open a crate in Economy Mode to get an item here.</div>';
 document.querySelectorAll('[data-sell]').forEach(btn=>btn.onclick=()=>{
  const i=Number(btn.dataset.sell),item=state.items[i];
  if(state.mode!=='economy'||!item||cannotSell(item))return notify('This item cannot be sold.');
  // Recompute on click so the payout always equals the current displayed price source.
  const amount=sellQuote(item).cents;
  if(!Number.isInteger(amount)||amount<0)return notify('Invalid sell quote.');
  state.items.splice(i,1);creditMixed(amount);save();notify('Sold '+namedItem(item)+' for '+formatCurrency(amount));
 });
}
$('reloadSellPrices').onclick=()=>{loadPrices();notify('Checking latest deployed price cache…');};
// Delete a SINGLE inventory item from the currently selected backpack only.
// Clicking the backdrop or pressing Escape cancels the deletion.
let pendingDeletion=null;
function promptDelete(index){
 if(busy||!Number.isInteger(index))return;
 const items=activeItems(),item=items[index];if(!item)return;
 pendingDeletion={mode:state.mode,index,item};
 $('deleteItemName').textContent=namedItem(item)+(item.effect?' · '+item.effect:'');
 $('deleteConfirm').showModal();
}
function cancelDeletion(){pendingDeletion=null;if($('deleteConfirm').open)$('deleteConfirm').close();}
$('cancelDelete').onclick=cancelDeletion;
$('deleteConfirm').addEventListener('cancel',()=>{pendingDeletion=null;});
$('deleteConfirm').addEventListener('click',e=>{
 if(e.target===$('deleteConfirm'))cancelDeletion();
});
$('confirmDelete').onclick=()=>{
 const p=pendingDeletion;if(!p)return cancelDeletion();
 const arr=p.mode==='sandbox'?state.sandbox.items:state.items;
 // Prevent deleting another item if the array changed while dialog was open.
 if(arr[p.index]!==p.item){cancelDeletion();return notify('Backpack changed; try again.');}
 arr.splice(p.index,1);cancelDeletion();save();notify('Item permanently deleted.');
};
// One-time simulator promo: 100% Unusual from an already eligible case/hat/effect.
// Code is public in client JS. Once-per-save is not tamper resistant.
function promoUnusual(){
 const valid=ALL_CRATES.map(c=>({crate:c,hats:eligibleCaseHats(c),effects:eligibleEffects(c)}))
  .filter(x=>x.hats.length>0&&x.effects.length>0);
 if(!valid.length)return null;
 const pick=a=>a[Math.floor(Math.random()*a.length)];
 const {crate,hats,effects}=pick(valid),base=pick(hats),effect=pick(effects);
 return {instanceId:randomItemId(),name:base.name,kind:base.kind||'Cosmetic',
  quality:'Unusual',strange:false,grade:base.grade||null,effect,
  image:base.image||'',crate:crate.name,crateId:crate.id,
  origin:state.mode,promoReward:true,nonSellable:true,sellable:false,
  tradable:false,marketable:false,demo:true,
  sourceModel:'Promo reward: eligible hat and modeled event effect pool'};
}
function renderRedeem(){
 const red=!!state.redeemedCodes['UNUSUAL100'];
 $('redeemButton').disabled=red;
 $('redeemStatus').textContent=red?'UNUSUAL100 has already been redeemed in this save.':'One use per browser save. Promo items cannot be sold or traded. Redeem in the backpack you want to receive it.';
}
$('redeemButton').onclick=()=>{
 const code=String($('redeemCode').value||'').trim().toUpperCase();
 if(!code)return notify('Enter a code first.');
 if(!Object.prototype.hasOwnProperty.call(PROMO_CODES,code))return notify('Unknown code.');
 if(state.redeemedCodes[code])return notify('This code has already been redeemed.');
 const spec=PROMO_CODES[code];if(spec.type!=='random-unusual')return notify('Unsupported code.');
 const item=promoUnusual();if(!item)return notify('No verified Unusual-eligible case hats are available.');
 // Lock redemption before anything is drawn, so repeated clicks cannot grant more.
 state.redeemedCodes[code]=true;
 if(state.mode==='economy'){state.items.unshift(item);state.unusuals++;}
 else{state.sandbox.items.unshift(item);state.sandbox.unusuals++;}
 save();$('redeemCode').value='';renderRedeem();
 $('promoResult').innerHTML=`<div class="promo-result-item ${rarityFrame(item)}" style="${rarityStyle(item)}">${visual(item)}<div><strong>${esc(namedItem(item))}</strong><p>✦ ${esc(item.effect)} · ${esc(item.grade||'Ungraded')}</p><small>PROMO REWARD · NOT SELLABLE · ${esc(state.mode.toUpperCase())}</small></div></div>`;
 notify('Code redeemed! Unusual added to '+state.mode+' backpack.');
};
$('redeemCode').addEventListener('keydown',e=>{if(e.key==='Enter')$('redeemButton').click();});
// Optional save transfer for people renaming their GitHub Pages repository.
// localStorage is scoped to origin (scheme, host, port); repository path changes usually preserve it.
$('exportSave').onclick=()=>{
 const blob=new Blob([JSON.stringify({format:'mannco-save-v1',save:state},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='mannco-unboxing-save.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
 notify('Save backup downloaded.');
};
$('importSave').onclick=()=>$('importSaveFile').click();
$('importSaveFile').addEventListener('change',async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
  if(f.size>2_000_000)throw new Error('Save exceeds 2 MB.');
  const d=JSON.parse(await f.text());
  if(d?.format!=='mannco-save-v1'||!d.save||!Array.isArray(d.save.items)||typeof d.save.keys!=='object'||!d.save.crates||typeof d.save.metalCents!=='number')throw new Error('Not a valid exported simulator save.');
  if(!confirm('Replace all existing local progress with this save backup?'))return;
  localStorage.setItem(SAVE_KEY,JSON.stringify(d.save));
  location.reload();
 }catch(err){notify('Import failed: '+err.message);}
 finally{e.target.value='';}
});

function renderStats(){
 $('statsdata').innerHTML=[['CRATES OPENED',state.mode==='sandbox'?state.sandbox.opened:state.opened],['UNUSUALS FOUND',state.mode==='sandbox'?state.sandbox.unusuals:state.unusuals],['REWARDS OWNED',activeItems().length],['REFINED SPENT',state.mode==='sandbox'?'—':fmt(state.spent)],['MODE',state.mode.toUpperCase()]]
 .map(([label,value])=>`<div class="stat">${label}<strong>${esc(value)}</strong></div>`).join('');
}
// Simulator-only free drop: one roll every five minutes, zero key/crate cost.
// All rewards go to their mode's wallet. User controls the clock in a static
// site; a trustworthy cross-device cooldown would require an external server.
const FREE_DROP={cooldownMs:300000,refinedAmount:45,normalKeys:3,randomCaseKeys:3,jackpotKeys:10,odds:{normalKeys:25,refined:50,randomCaseKeys:20,jackpotKeys:5},...(typeof FREE_DROP_CONFIG==='object'?FREE_DROP_CONFIG:{})};
const FREE_MILLIS=Math.max(1000,Number(FREE_DROP.cooldownMs)||300000);
function activeFreeDrop(){return state.mode==='sandbox'?state.sandbox.freeDrop:state.freeDrop;}
function remainingFreeMs(){return Math.max(0,activeFreeDrop().nextAt-Date.now());}
function formatCooldown(ms){const secs=Math.ceil(ms/1000);return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;}
function freePositiveInt(value,fallback){const n=Number(value);return Number.isSafeInteger(n)&&n>=1&&n<=1000?n:fallback;}
function drawFreeDrop(random=Math.random){
 const odds=FREE_DROP.odds||{},weights=[odds.normalKeys,odds.refined,odds.randomCaseKeys,odds.jackpotKeys].map(v=>Math.max(0,Number(v)||0));
 const total=weights.reduce((a,b)=>a+b,0);
 const chance=(total>0?Math.min(.999999999999,Math.max(0,Number(random())||0))*total:0);
 const normal=freePositiveInt(FREE_DROP.normalKeys,3),jackpot=freePositiveInt(FREE_DROP.jackpotKeys,10);
 if(chance<weights[0])return {type:'keys',keys:['mannco'],quantity:normal,label:`${normal} Mann Co. Supply Crate Keys`};
 if(chance<weights[0]+weights[1]){
  const refined=Math.max(0,Number(FREE_DROP.refinedAmount)||45);
  return {type:'refined',amount:Math.round(refined*100),label:`${refined.toFixed(2)} refined metal`};
 }
 if(chance<weights[0]+weights[1]+weights[2]){
  const available=Object.keys(KEYS).filter(id=>id!=='mannco');
  const n=freePositiveInt(FREE_DROP.randomCaseKeys,3);
  if(!available.length)return {type:'keys',keys:['mannco'],quantity:n,label:`${n} Mann Co. Supply Crate Keys`};
  const chosen=Array.from({length:n},()=>available[Math.min(available.length-1,Math.floor(Math.max(0,Math.min(.999999999999,Number(random())||0))*available.length))]);
  return {type:'keys',keys:chosen,quantity:1,label:`${n} random case keys`,detail:chosen.map(id=>KEYS[id]?.name||id).join(' · ')};
 }
 return {type:'keys',keys:['mannco'],quantity:jackpot,label:`${jackpot} Mann Co. Supply Crate Keys`};
}
function renderFreeCrate(){
 const drop=activeFreeDrop(),remaining=remainingFreeMs(),ready=remaining<=0;
 $('freeCountdown').textContent=ready?'READY TO OPEN':`NEXT FREE OPENING IN ${formatCooldown(remaining)}`;
 $('claimFree').disabled=!ready||busy;
 $('claimFree').textContent=ready?'OPEN FREE DROP':'REFRESHING…';
 $('freeMode').textContent=state.mode==='sandbox'?'SANDBOX · rewards remain in Sandbox only':'ECONOMY · rewards added to your Economy currency';
 $('freeHistory').textContent=drop.claims?`Opened ${drop.claims} times in this mode. Last reward: ${drop.last}`:'No free drops claimed in this mode yet.';
 $('freeWallet').textContent=state.mode==='sandbox'?`Sandbox rewards collected: ${ref(state.sandbox.bonusWallet.metalCents)} metal and ${Object.values(state.sandbox.bonusWallet.keys).reduce((x,n)=>x+Number(n||0),0)} keys (practice only).`:
 `Economy wallet: ${ref(state.metalCents)} and ${totalKeys()} keys.`;
 $('freePromoStatus').textContent=ready?'READY NOW':`READY IN ${formatCooldown(remaining)}`;
}
let freeBusy=false;
$('claimFree').onclick=async()=>{
 if(freeBusy||busy||remainingFreeMs()>0)return;
 // Check newer localStorage when multiple tabs are open (best effort only).
 try{const latest=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');const remote=state.mode==='sandbox'?latest.sandbox?.freeDrop:latest.freeDrop;
  if(Number(remote?.nextAt)>Date.now()){activeFreeDrop().nextAt=Number(remote.nextAt);renderFreeCrate();return notify('Free drop is still refreshing in another tab.');}
 }catch(_){}
 freeBusy=true;
 const button=$('claimFree'),stage=$('freeStage'),result=$('freeResult');
 button.disabled=true;stage.classList.remove('free-revealed');stage.classList.add('free-opening');result.innerHTML='';
 const mode=state.mode;
 const reward=drawFreeDrop();
 // Spend zero resources. Grant and save before animation to avoid duplicate claims.
 const drop=activeFreeDrop();drop.nextAt=Date.now()+FREE_MILLIS;drop.claims++;drop.last=reward.label;
 const wallet=mode==='economy'?state:state.sandbox.bonusWallet;
 if(reward.type==='refined')wallet.metalCents+=reward.amount;
 else for(const keyId of reward.keys){wallet.keys[keyId]=(wallet.keys[keyId]||0)+reward.quantity;}
 save();
 const rewardEntry=reward.type==='refined'?{name:'Refined Metal'}:{id:reward.keys[0],name:reward.label};
 try{
  await sleep(850);
  result.innerHTML=visual(rewardEntry,reward.type==='keys'?'key':'item','reward-picture')+`<strong>${esc(reward.label)}</strong>${reward.detail?`<small>${esc(reward.detail)}</small>`:''}`;
  stage.classList.remove('free-opening');stage.classList.add('free-revealed');
  notify(`FREE DROP: ${reward.label}${mode==='sandbox'?' (Sandbox only)':''}`);
 }finally{freeBusy=false;renderFreeCrate();}
};
$('openFreeFromMarket').onclick=()=>show('free');
// Update only cooldown labels every second; don't re-render the whole catalogue.
setInterval(()=>{if(!freeBusy)renderFreeCrate();},1000);
$('reset').onclick=()=>{if(confirm('Delete all local progress, Economy and Sandbox items, redeemed codes, and free drop timers? This cannot be undone.')){state={...INIT(),originMigrationV7:true,redeemedCodes:{},freeDrop:validDrop(null),sandbox:{items:[],opened:0,unusuals:0,freeDrop:validDrop(null),bonusWallet:{metalCents:0,keys:{}}}};save();notify('Local progress reset.');}};
refresh();
// Generated manifests are served by GitHub Pages. The browser also supports
// a zero-secret public-schema fallback if an Actions image build was unavailable.
const fileBust='?v=0.8.1';
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
// Historical numbered crates: source-linked drop pools, no placeholder duplicates.
function mergeHistoricalManifest(payload){
 const list=Array.isArray(payload?.crates)?payload.crates:[];
 let good=0, added=0;
 for(const data of list){
  if(!data||!/^series-\d{1,3}$/.test(data.id||'')||!Number.isInteger(data.series)||
      data.id!=='series-'+data.series||!/^(Mann Co\. Supply Crate|Salvaged Mann Co\. Supply Crate|Mann Co\. Supply Munition) Series #\d+$/.test(data.name||'')||
      !Array.isArray(data.pool)||data.pool.length<3||!/^(https:\/\/theletterzed\.ca\/tf2\/crate\/)/.test(data.source||''))continue;
  const pool=data.pool.filter(x=>x&&typeof x.name==='string'&&x.name.length>1&&
     Number.isFinite(x.weight)&&x.weight>0&&x.weight<100)
   .map(x=>({name:x.name,kind:x.kind||'Item',quality:x.quality==='Strange'?'Strange':'Unique',weight:x.weight}));
  const sum=pool.reduce((acc,x)=>acc+x.weight,0)+Number(data.unusualChance||0)*100;
  if(pool.length!==data.pool.length||sum<90||sum>103)continue;
  const override=CRATE_PRICES.byId[data.id]??CRATE_PRICES.bySeries[data.series];
  const old=ALL_CRATES.find(c=>c.id===data.id);
  const c={id:data.id,series:data.series,name:data.name,kind:'numbered',
   priceUnits:Number.isFinite(override)?Math.round(override*9):(old?.priceUnits||Math.round((.11+data.series*data.series/280)*9)),
   key:'mannco',keyName:'Mann Co. Supply Crate Key',pool,verified:true,historical:true,
   graded:false,weighted:true,unusualChance:Number(data.unusualChance||0),
   rareSpecialLabel:String(data.rareSpecialLabel||''),openable:true,
   description:String(data.description||'Distinct historical series contents; odds are community estimates.'),
   oddsSource:'Community probability estimates, NOT official Valve rates.',source:data.source};
  if(old)Object.assign(old,c);else {ALL_CRATES.push(c);added++;}
  good++;
 }
 importedHistoricalCount=good;
 $('historicalStatus').textContent=good
  ?`Historical crate library: ${good} individually documented numbered series (${added} added). Each has its own drop pool. Probabilities are community estimates, not Valve rates.`
  :'No historical numbered crates loaded. Verify data/historical-crates.json in your Pages deployment.';
 refresh();
}
async function loadHistoricalCrates(){
 try{
  const response=await fetch('data/historical-crates.json'+fileBust,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  mergeHistoricalManifest(await response.json());
 }catch(err){
  console.warn('Historical crates manifest:',err);
  $('historicalStatus').textContent='Historical crates database unavailable. Rebuild the site to generate data/historical-crates.json.';
 }
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
  const r=await fetch('data/backpack-prices.json?ts='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw Error('HTTP '+r.status);
  const data=await r.json();
  if(!data?.items||!data?.crates||!data?.keys)throw Error('Invalid format');
  marketData=data;
  const n=Object.keys(data.items).length;
  $('priceStatus').textContent=n?`backpack.tf suggested prices: ${n} items, ${Object.keys(data.crates).length} crate prices · ${data.metadata?.updatedAt||'date unknown'}. Not averaged live listings.`:`Market cache empty: ${data.metadata?.status||'Simulator prices remain in effect.'}`;
 }catch(err){console.warn('Price cache:',err);$('priceStatus').textContent=Object.keys(marketData.items||{}).length?'Price refresh unavailable; keeping previously loaded market prices.':'Market cache unavailable: simulator prices active.';}
 refresh();
}
void loadImages();
void loadCases();
void loadHistoricalCrates();
void loadPrices();
