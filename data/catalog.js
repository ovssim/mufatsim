// HISTORICAL DATA — no fabricated series or shared demonstration loot.
// Numbered crates arrive from data/historical-crates.json.  The bundled JSON
// contains manually checked source-linked series.  GitHub Actions imports
// more from public historical references at each deployment.
// Older crates never receive modern grade labels.
const GRADE_WEIGHTS = { Mercenary:80, Commando:16, Assassin:3.2, Elite:0.8 };
// Verified 23-item cosmetic collections (Steam Market item lists / published grade groupings).
// Grade weights are simulator assumptions, not published Valve odds.
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
  winter2024:'Winter 2024 Cosmetic Key', mayflower:'Mayflower Cosmetic Key',
  toughbreak:'Tough Break Cosmetic Key'
};
const VERIFIED_CASES = [
 gradedCase('case-101','Tough Break Cosmetic Case','toughbreak',{
  Mercenary:['A Hat to Kill For','Berlin Brain Bowl',"Bunnyhopper's Ballistics Vest",
   'Chicago Overcoat','Hot Heels','Medical Monarch','Shin Shredders',
   'Siberian Sweater','The Diplomat','The Patriot Peak'],
  Commando:["Bonk Batter's Backup",'The Chill Chullo','The Gift Bringer','Winter Backup'],
  Assassin:['A Well Wrapped Hat']
 },'Tough Break Cosmetics Collection: the original 15 cosmetics with their 10/4/1 grades. Bonus Unusuals and grade odds are simulator estimates.'),
 gradedCase('case-102','Mayflower Cosmetic Case','mayflower',{
  Mercenary:['Courtly Cuirass',"Squire's Sabatons",'The Airdog',"The Demo's Dustcatcher",'Scoped Spartan','The Surgical Survivalist'],
  Commando:["Herald's Helm",'The Gauzed Gaze','The Lurking Legionnaire',"Patriot's Pouches"],
  Assassin:['The Dayjogger','Dad Duds'],
  Elite:['Bedouin Bandana','The Dead Head']
 },'Mayflower Cosmetics Collection: 14 items with published collection grades. Unusuals are chosen only from eligible Mayflower hats.'),
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

const ALL_CRATES=[...VERIFIED_CASES];
const KEYS={
 mannco:{name:'Mann Co. Supply Crate Key',priceUnits:592.92},
 winter2023:{name:'Winter 2023 Cosmetic Key',priceUnits:592.92},
 summer2024:{name:'Summer 2024 Cosmetic Key',priceUnits:592.92},
 winter2024:{name:'Winter 2024 Cosmetic Key',priceUnits:592.92},
 mayflower:{name:'Mayflower Cosmetic Key',priceUnits:592.92},
 toughbreak:{name:'Tough Break Cosmetic Key',priceUnits:592.92}
};
const EFFECTS=['Burning Flames','Sunbeams','Green Energy','Purple Energy','Orbiting Fire'];
// Every numbered series will be added only if its real contents were verified.
// No fake 1..103 generator and no generic sample pool.
