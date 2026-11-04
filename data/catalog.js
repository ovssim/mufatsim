// BETA CATALOGUE: all numbered series 1–103 are browseable. Only Series #1 has a verified example pool.
// Other pools and prices are explicitly demo placeholders, NOT historical crate data or market quotations.
const DEMO_POOL=[{name:'The Team Captain',symbol:'🎩',kind:'Cosmetic'},{name:'The Merc’s Mohawk',symbol:'🎓',kind:'Cosmetic'},{name:'Rocket Launcher',symbol:'🚀',kind:'Weapon'},{name:'Scattergun',symbol:'🔫',kind:'Weapon'},{name:'Name Tag',symbol:'🏷️',kind:'Tool'}];
const SERIES_ONE=[{name:'Vita-Saw',symbol:'🪚',kind:'Weapon'},{name:'Gunslinger',symbol:'🦾',kind:'Weapon'},{name:'Equalizer',symbol:'⛏️',kind:'Weapon'},{name:'Scottish Resistance',symbol:'💣',kind:'Weapon'},{name:'Old Guadalajara',symbol:'🎩',kind:'Cosmetic'},{name:"Napper’s Respite",symbol:'🧢',kind:'Cosmetic'},{name:'Name Tag',symbol:'🏷️',kind:'Tool'},{name:'An Extraordinary Abundance of Tinge',symbol:'🎨',kind:'Tool'},{name:'A Distinctive Lack of Hue',symbol:'🎨',kind:'Tool'}];
const crates=Array.from({length:103},(_,i)=>{const n=i+1;return {id:`series-${n}`,name:`Mann Co. Supply Crate #${n}`,series:n,kind:'numbered',priceUnits:Math.round((0.11+n*n/280)*9),key:'mannco',keyName:'Mann Co. Supply Crate Key',pool:n===1?SERIES_ONE:DEMO_POOL,verified:n===1,unusualChance:.0066,openable:true,description:n===1?'Series #1 regular drop names based on the original crate listing. Unusual eligibility/effects remain demo-only.':'Series-specific historical drops not yet imported. BETA uses an illustrative pool for opening tests.'}});
const specials=[
{id:'unlocked-cosmetic',name:'Unlocked Cosmetic Crate',kind:'special',priceUnits:36,key:null,keyName:'No key needed',pool:DEMO_POOL,verified:false,unusualChance:.0066,openable:true,description:'Keyless container demonstration; historical variants need verification.'},
{id:'winter-2024',name:'Winter 2024 Cosmetic Case',kind:'special',priceUnits:9,key:'winter2024',keyName:'Winter 2024 Cosmetic Key',pool:DEMO_POOL,verified:false,unusualChance:.0066,openable:true,description:'Specialized key demonstration. Contents and price are placeholders.'},
{id:'haunted-hoard-2026',name:'Haunted Hoard Case (2026)',kind:'special',priceUnits:45,key:'haunted2026',keyName:'Haunted Hoard Case Key',pool:DEMO_POOL,verified:false,unusualChance:.0066,openable:true,description:'Seasonal case example. Contents, key requirement and pricing need verification.'}
];
// Curated reference pools. Drop weights below are community-model estimates for #103,
// NOT Valve-published odds. Other historical series remain marked demo until verified.
const SERIES_26 = ['Syringe Gun','Crusader\'s Crossbow','Bonesaw','Medi Gun','Gentleman\'s Gatsby','Otolaryngologist\'s Mirror'].map((name,i)=>({name,kind:i<4?'Weapon':'Cosmetic',symbol:i<4?'⚔️':'🎩',quality:i<4?'Strange':'Unique'}));
const SERIES_103 = [
 ['Strange Part: Heavies Killed',6.50],['Strange Part: Pyros Killed',6.50],['Strange Part: Critical Kills',6.50],['Strange Part: Allied Healing Done',6.50],['Strange Part: Damage Dealt',6.50],
 ['Strange Sandvich',1.00],['Strange Natascha',7.25],['Strange Powerjack',7.25],['Strange Degreaser',7.25],['Strange Reserve Shooter',7.25],['Strange Ambassador',7.25],['Strange Quickiebomb Launcher',7.25],['Strange Back Scatter',7.25],['Strange Panic Attack',7.25],['Strange Iron Bomber',7.25]
].map(([name,weight])=>({name,weight,kind:name.startsWith('Strange Part')?'Tool':'Weapon',quality:name.startsWith('Strange Part')?'Unique':'Strange',symbol:'⚔️'}));
const c26=crates.find(c=>c.series===26);c26.pool=SERIES_26;c26.verified=true;c26.description='Reference drop names and weapon quality verified; individual probabilities are not established.';
const c103=crates.find(c=>c.series===103);c103.name='Mann Co. Supply Munition #103';c103.pool=SERIES_103;c103.verified=true;c103.weighted=true;c103.description='Reference drop list with community-estimated weights (not official Valve probabilities).';
const ALL_CRATES=[...crates,...specials];
ALL_CRATES.forEach(c=>{c.image=CRATE_IMAGES[c.id]||'';c.pool.forEach(item=>{item.image=ITEM_IMAGES[item.name]||''})});
const KEYS={mannco:{name:'Mann Co. Supply Crate Key',priceUnits:592.92},winter2024:{name:'Winter 2024 Cosmetic Key',priceUnits:450},haunted2026:{name:'Haunted Hoard Case Key',priceUnits:450}};
const EFFECTS=['Burning Flames','Sunbeams','Green Energy','Purple Energy','Orbiting Fire'];

// Images are data-driven: add a verified URL to an item or crate as `image` when available.
// The beta deliberately does not invent asset URLs or claim the demo pools are authentic.
