/* Wormyard.Store v0.9.1 — TF2 item-grade and Civilian Grade Stat Clock contracts.
 * Trade-ups consume owned browser inventory items, not Steam inventory items.
 */
(function () {
 'use strict';
 const GRADES=['Civilian','Freelance','Mercenary','Commando','Assassin','Elite'];
 const escapeText=esc;
 let recipe='grade', selected=[], lastMode=state.mode;
 const gradeNext=g=>GRADES[GRADES.indexOf(g)+1]||null;
 const owned=()=>activeItems();
 const validOrigin=i=>i?.origin===state.mode;
 const protectedItem=i=>!i||!!(i.effect||i.quality==='Unusual'||i.promoReward||i.unresolved||i.nonSellable||i.sellable===false);
 const itemStrange=i=>i?.quality==='Strange'||i?.strange===true;
 function sourceCase(i){
  const c=ALL_CRATES.find(x=>x.id===i.crateId);
  if(!c?.graded||!Array.isArray(c.pool))return null;
  // Never invent a collection for a loose weapon or an old, unknown inventory item.
  if(!c.pool.some(base=>norm(base.name)===norm(i.name)&&base.grade===i.grade))return null;
  return c;
 }
 function gradeEligible(i){
  if(protectedItem(i)||!validOrigin(i)||!gradeNext(i.grade))return false;
  const c=sourceCase(i);
  if(!c)return false;
  // Historical decorative skins need validated wear data. Do not silently
  // manufacture a Factory New result from inventory items with no wear.
  if(i.kind!=='Cosmetic')return false;
  return c.pool.some(x=>x.kind==='Cosmetic'&&x.grade===gradeNext(i.grade));
 }
 function clockEligible(i){
  if(protectedItem(i)||!validOrigin(i))return false;
  // Valve's five-item Stat Clock mail-in requires Freelance grade or higher.
  // Strange quality alone does not qualify an ungraded weapon/tool.
  return GRADES.indexOf(i.grade)>=1;
 }
 function eligible(i){return recipe==='grade'?gradeEligible(i):clockEligible(i);}
 function maxCount(){return recipe==='grade'?10:5;}
 function chosen(){return selected.filter(i=>owned().includes(i)&&eligible(i));}
 function canAdd(i){
  if(!eligible(i)||selected.includes(i)||selected.length>=maxCount())return false;
  if(recipe==='grade'&&selected.length){
   return i.grade===selected[0].grade&&itemStrange(i)===itemStrange(selected[0]);
  }
  return true;
 }
 function contractOutcomes(entries){
  if(!entries.length||recipe!=='grade')return [];
  const grade=gradeNext(entries[0].grade),counts=new Map();
  for(const item of entries){
   const c=sourceCase(item);
   if(!c)return [];
   const old=counts.get(c.id);
   if(old)old.count++;
   else counts.set(c.id,{c,count:1});
  }
  const outcomes=[];
  for(const {c,count} of counts.values()){
   const pool=c.pool.filter(x=>x.grade===grade&&x.kind==='Cosmetic');
   if(!pool.length)return [];
   for(const base of pool)outcomes.push({c,base,pct:count/entries.length*100/pool.length});
  }
  return outcomes;
 }
 function renderTradeUp(){
  const panel=$('tradeupSelected');
  if(!panel)return;
  if(lastMode!==state.mode){selected=[];lastMode=state.mode;$('tradeupResult').innerHTML='';}
  selected=chosen();
  const items=selected;
  const rules=$('tradeupRules');
  rules.textContent=recipe==='grade'
   ?'Choose 10 cosmetics of the same grade and Strange status. Mixed collections are allowed: each input contributes 10% toward its own collection. Elite and Unusual items are ineligible. Exact wear-sensitive decorated-weapon contracts are disabled.'
   :'Mail in any 5 qualifying Freelance-grade-or-better items or Strange items for exactly one Civilian Grade Stat Clock. Unusuals and promo rewards are excluded.';
  document.querySelectorAll('[data-trade-recipe]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.tradeRecipe===recipe));
  panel.innerHTML=`<h3>CONTRACT ITEMS (${items.length}/${maxCount()})</h3><div class="tradeup-picks">${
   Array.from({length:maxCount()},(_,ix)=>{
    const item=items[ix];
    return item?`<button type="button" class="tradeup-slot filled" data-trade-remove="${ix}" title="Remove ${escapeText(namedItem(item))}"><span>${escapeText(namedItem(item))}</span><small>${escapeText(item.grade||'Strange')} · REMOVE</small></button>`:
     `<div class="tradeup-slot empty"><span>＋</span><small>${ix+1}</small></div>`;
   }).join('')}</div>`;
  document.querySelectorAll('[data-trade-remove]').forEach(btn=>btn.onclick=()=>{selected.splice(Number(btn.dataset.tradeRemove),1);renderTradeUp();});
  const candidates=owned().filter(i=>eligible(i));
  $('tradeupAvailable').innerHTML=candidates.length?candidates.map(i=>{
   const ix=owned().indexOf(i),already=selected.includes(i),allowed=canAdd(i);
   return `<div class="tradeup-candidate">${visual(i)}<div><strong>${escapeText(namedItem(i))}</strong><small>${escapeText(i.grade||'No grade')} · ${escapeText(i.crate||'TF2 item')} · ${itemStrange(i)?'Strange':'Non-Strange'}</small></div><button type="button" data-trade-add="${ix}" ${already||!allowed?'disabled':''}>${already?'SELECTED':!allowed?'INCOMPATIBLE':'ADD'}</button></div>`;
  }).join(''):'<div class="panel">You do not currently own any eligible items in this mode. Unbox graded cosmetics or Strange items first.</div>';
  document.querySelectorAll('[data-trade-add]').forEach(btn=>btn.onclick=()=>{
   const item=owned()[Number(btn.dataset.tradeAdd)];
   if(canAdd(item)){selected.push(item);renderTradeUp();}
  });
  const odds=$('tradeupOdds');
  const submit=$('tradeupSubmit');
  submit.disabled=items.length!==maxCount();
  if(recipe==='clock'){
   odds.innerHTML='<strong>Fixed result:</strong> 1 Civilian Grade Stat Clock (100%). These five inputs will be consumed.';
  }else{
   const outs=contractOutcomes(items);
   if(!items.length)odds.innerHTML='Select a first cosmetic to lock its grade and Strange quality. Fill 10 slots to view your final odds.';
   else odds.innerHTML=`<strong>Target grade:</strong> ${escapeText(gradeNext(items[0].grade))} · ${itemStrange(items[0])?'Strange':'Non-Strange'}<p>Possible collection-weighted outputs${items.length===10?'':' (preview based on current selections)'}:</p>`+
    (outs.length?`<div class="tradeup-odds">${outs.map(o=>`<div><span>${escapeText(o.base.name)}</span><small>${escapeText(o.c.name)}</small><b>${o.pct.toFixed(2)}%</b></div>`).join('')}</div>`:'<p>Choose eligible items to preview outputs.</p>');
  }
 }
 window.renderTradeUp=renderTradeUp;
 document.querySelectorAll('[data-trade-recipe]').forEach(btn=>btn.onclick=()=>{recipe=btn.dataset.tradeRecipe;selected=[];$('tradeupResult').innerHTML='';renderTradeUp();});
 $('tradeupClear').onclick=()=>{selected=[];$('tradeupResult').innerHTML='';renderTradeUp();};
 $('tradeupSubmit').onclick=()=>{
  const items=chosen();
  if(items.length!==maxCount()||selected.length!==maxCount())return notify('Fill every contract slot first.');
  if(recipe==='grade'&&!items.every(i=>i.grade===items[0].grade&&itemStrange(i)===itemStrange(items[0])))return notify('Inputs must match grade and Strange status.');
  const outs=contractOutcomes(items);
  if(recipe==='grade'&&!outs.length)return notify('No verified next-grade outputs; contract cancelled.');
  if(!confirm(`Permanently trade in ${items.length} owned items for ${recipe==='grade'?'one next-grade cosmetic':'one Civilian Grade Stat Clock'}? This cannot be undone.`))return;
  // Verify references still exist BEFORE removing anything.
  if(!items.every(i=>owned().includes(i)&&eligible(i)))return notify('Inventory changed; review the contract again.');
  let output;
  if(recipe==='clock'){
   const tradable=items.every(i=>i.tradable!==false);
   output={instanceId:randomItemId(),name:'Civilian Grade Stat Clock',kind:'Tool',quality:'Unique',grade:null,
    strange:false,effect:null,origin:state.mode,tradable,sellable:tradable,nonSellable:!tradable,
    crate:'Trade-Up Contract',crateId:null,demo:false,sourceModel:'Five-item Civilian Grade Stat Clock mail-in'};
  }else{
   // Select one of ten inputs uniformly -> determines collection; within that
   // collection every eligible next-grade output is equally likely.
   const donor=items[Math.floor(Math.random()*items.length)],c=sourceCase(donor);
   const next=gradeNext(items[0].grade);
   const possibilities=c.pool.filter(i=>i.grade===next&&i.kind==='Cosmetic');
   if(!possibilities.length)return notify('Output pool unavailable; nothing consumed.');
   const base=possibilities[Math.floor(Math.random()*possibilities.length)];
   const strange=itemStrange(items[0]),tradable=items.every(i=>i.tradable!==false);
   output={instanceId:randomItemId(),name:base.name,kind:'Cosmetic',quality:strange?'Strange':'Unique',
    strange,grade:base.grade,origin:state.mode,effect:null,image:base.image||'',
    tradable,sellable:tradable,nonSellable:!tradable,
    crate:c.name,crateId:c.id,demo:false,sourceModel:'Item Grade Trade-Up: collection-weighted next-grade output'};
  }
  for(const i of items){const ix=owned().indexOf(i);if(ix<0)return notify('Item disappeared; contract cancelled.');owned().splice(ix,1);}
  owned().unshift(output);
  selected=[];
  save();
  $('tradeupResult').innerHTML=`<h3>CONTRACT COMPLETED</h3><div class="tradeup-won">${visual(output)}<div><strong>${escapeText(namedItem(output))}</strong><p>${output.grade?escapeText(output.grade)+' Grade · ':''}${escapeText(output.crate)}</p><small>${output.tradable===false?'UNTRADABLE · ':''}Added to ${state.mode.toUpperCase()} backpack</small></div></div>`;
  notify('Trade-up complete! Received '+namedItem(output));
 };
 renderTradeUp();
})();
