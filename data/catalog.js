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
// EDIT data/crate-prices.js to override these simulator prices.

// Verified 23-item cosmetic collections (Steam Market item lists / published grade groupings).
// The 80/16/3.2/0.8 percentages are USER-EDITABLE SIMULATOR MODEL ASSUMPTIONS, not Valve-published odds.
const GRADE_WEIGHTS = { Mercenary:80, Commando:16, Assassin:3.2, Elite:0.8 };
const qualityGrade = (grade,names) => names.map(name=>({name,kind:'Cosmetic',grade,quality:'Unique'}));
function gradedCase(id,name,key,groups,description) {
  const pool=Object.entries(groups).flatMap(([grade,names])=>qualityGrade(grade,names));
  return {id,name,kind:'special',priceUnits:9,key,keyName:KEY_NAMES[key],pool,
    verified:true, graded:true, gradeWeights:GRADE_WEIGHTS, unusualChance:.0066,
    strangeChance:.10, openable:true, description,
    oddsSource:'Model only: grade rates 80% / 16% / 3.2% / 0.8%; Strange and Unusual chances are simulated estimates.'};
}
const KEY_NAMES = {
  winter2023:'Winter 2023 Cosmetic Key', summer2024:'Summer 2024 Cosmetic Key',
  winter2024:'Winter 2024 Cosmetic Key'
};
const VERIFIED_CASES = [
 gradedCase('winter-2023','Winter 2023 Cosmetic Case','winter2023',{
  Mercenary:["Balkan's Brute",'Bigger Mann on Campus','Cozy Cover-Up','Impact Impaler','Nightcap','Rugged Rags','Sleuth Suit','The Covert Covers','The Puffed Practitioner',"Wanderer's Wool"],
  Commando:['Clue Hairdo','Isotopic Insulator','Slumber Slacks','Strasbourg Scholar','The Frigid Fashion',"Torcher's Trench Coat",'Trench Warfarer'],
  Assassin:['Bonk Beanie','Lazy Lounger','Masked Loyalty','The Dapper Dickens'],
  Elite:["Boarder's Beanie","Scruffed 'n Stitched"]
 },'23 actual listed cosmetics, each with its collection grade. Extra bonus drops not yet simulated.'),
 gradedCase('summer-2024','Summer 2024 Cosmetic Case','summer2024',{
  Mercenary:["Brute's Braces",'Commonwealth Commando','Daring Dell','Desk Engineer','Invisible Flame','Pathfinder','The Aimframe','The Brand Loyalist','The Vaudeville Visor',"Watchmann's Wetsuit"],
  Commando:["Crook's Cap",'Justice Johns','Scorched Earth Stompers','Sneaky Blinder',"Tanker's Top",'The Big Star','The Tropical Brim'],
  Assassin:['Control Patrol','Fire Marshal',"Free Mann's Fashion",'Tuxedo Royale'],
  Elite:['Botler 2000','Hazardous Environment Vest']
 },'All 23 listed items and their grades. This beta uses model odds, not official crate rates.'),
 gradedCase('winter-2024','Winter 2024 Cosmetic Case','winter2024',{
  Mercenary:['Commanding Presence',"Consigliere's Coverup",'Dapper Noel','Field Fatigues','Hot Spaniel','Poleur Voyeur','Snug Sharpshooter','The Battle Music','The Crimbo Cap','The Westcoat'],
  Commando:["Buck's Brim",'Cossack Camo','Frostbite Fit','Le Frosteaux','Mine Sweepers','Polar Charger','The Checkered Past','The Triple Jumper'],
  Assassin:['Battle Balaclava',"L'aire Filteure",'Scrooge McDoc','The Top Brass'],
  Elite:['The Necroprancer']
 },'All 23 listed items and their grades. This beta uses model odds, not official crate rates.')
];

const ALL_CRATES=[...crates,...specials.filter(c=>c.id!=='winter-2024'),...VERIFIED_CASES];
ALL_CRATES.forEach(c=>{
 const override=CRATE_PRICES.byId[c.id] ?? (c.series?CRATE_PRICES.bySeries[c.series]:undefined);
 if(Number.isFinite(override)&&override>=0)c.priceUnits=Math.round(override*9);
});
ALL_CRATES.forEach(c=>{c.image=CRATE_IMAGES[c.id]||'';c.pool.forEach(item=>{item.image=ITEM_IMAGES[item.name]||''})});
const KEYS={mannco:{name:'Mann Co. Supply Crate Key',priceUnits:592.92},winter2023:{name:'Winter 2023 Cosmetic Key',priceUnits:592.92},summer2024:{name:'Summer 2024 Cosmetic Key',priceUnits:592.92},winter2024:{name:'Winter 2024 Cosmetic Key',priceUnits:592.92},haunted2026:{name:'Haunted Hoard Case Key',priceUnits:592.92}};
const EFFECTS=['Burning Flames','Sunbeams','Green Energy','Purple Energy','Orbiting Fire'];

// Images are data-driven: add a verified URL to an item or crate as `image` when available.
// The beta deliberately does not invent asset URLs or claim the demo pools are authentic.
