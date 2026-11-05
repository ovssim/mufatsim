/* Beta 0.8 — source-aware rules. Everything here is visible/editable by site owner.
 * Do not confuse historically supported effects with 3D-perfect particle rendering.
 * For graded cases, Unusual quality is restricted to listed eligible HEAD cosmetics;
 * these starter whitelists are deliberately conservative and INCOMPLETE, and should
 * be expanded as actual item eligibility is checked. Unknown items are NOT assumed.
 */
const CASE_UNUSUAL_HATS = {
  'winter-2023': ["Bonk Beanie","Boarder's Beanie","Clue Hairdo","Masked Loyalty","Nightcap","The Frigid Fashion"],
  'summer-2024': ["Crook's Cap","Daring Dell","The Tropical Brim","The Vaudeville Visor","Sneaky Blinder","Control Patrol"],
  'winter-2024': ["Buck's Brim","Battle Balaclava","Cossack Camo","Scrooge McDoc","The Crimbo Cap","The Top Brass"]
};
// These lists are editable references, not an assertion that all excluded
// cosmetics can never be Unusual. Do not fabricate an unverified combination.
const CASE_RELEASE_DATES={
  'winter-2023':'2023-12-07', 'summer-2024':'2024-07-18', 'winter-2024':'2024-12-11'
};
const CLASSIC_HAT_EFFECTS = [
 'Burning Flames','Scorching Flames','Sunbeams','Vivid Plasma','Searing Plasma',
 'Purple Energy','Green Energy','Haunted Ghosts','Purple Confetti','Green Confetti',
 'Circling Heart','Circling Peace Sign','Circling TF Logo','Massed Flies',
 'Stormy Storm','Blizzardy Storm','Nuts n’ Bolts','Orbiting Fire','Orbiting Planets',
 'Bubbling','Smoking','Steaming','Kill-a-Watt','Terror-Watt','Cloud 9',
 'Disco Beat Down','Miami Nights','Aces High','Dead Presidents'
];
const EFFECTS_BUNDLED = {
  metadata:{source:'Valve update notes / TF2Bolt public effect-by-event references',note:'Hat effects only. All-event history is a model; effect odds not official.'},
  events:[
    {id:'smissmas-2023',name:'Smissmas 2023',start:'2023-12-07',end:'2024-01-07',effects:['Fairy Lights','Goldstruck','Lunar Lights','Mint Frost','Natural Lights','Prettiest Star','Radiant Legacy','Frosty Flavours','Icestruck','North Star','Radiant Rivalry','Festive Falling Star']},
    {id:'summer-2024',name:'Summer 2024',start:'2024-07-18',end:'2024-09-15',effects:["Baron's Cherished Chaplet",'Ignited Crest',"Knight's Prideful Spirit","Loyalist's Coronet",'Lure of the Deep','Magenta Monstrum','Melting Mohawk','Overdrive','Scorched Scalp','Violent Viridian','Warp Drive','Bewitching Bugs','Butterfly Season','Cuban Smoke','Distant Drift','Psycho-Delic','Rainbow Reverie','Rare Shine']},
    {id:'scream-fortress-xvi',name:'Scream Fortress XVI',start:'2024-10-11',end:'2024-11-07',effects:['Delightful Doves','Frankencharged','Galactic Flame','Haunting Haze','Ravenous Ravens','Revived Recharge','Undead Electricity','Vicious Vampires','Phantom Plague','Spectral Fire','Searing Stove','Über Blaze']},
    {id:'smissmas-2024',name:'Smissmas 2024',start:'2024-12-11',end:'2025-01-07',effects:['Crystal Crown','Frisky Morning','Halcyon Halo','Playful Aurora','Aurora Skies','Ghosts of Smissmas Time','Shining Bokeh','Sizzling']},
    {id:'summer-2025',name:'Summer 2025',start:'2025-07-24',end:'2025-09-15',effects:['Blades of Betrayal',"Death's Daggers",'Fully Charged','Overcharged','Decimating Wind','Drunkard','Piercing Headache']},
    {id:'scream-fortress-xvii',name:'Scream Fortress XVII',start:'2025-10-09',end:'2025-11-07',effects:['Ocean Swirl','Sizzling Aroma','Toxic Aroma','Toxic Swirl','Candle Flame','Current Conductor','Sandy']},
    {id:'smissmas-2025',name:'Smissmas 2025',start:'2025-12-09',end:'2026-01-07',effects:['Analog Fortress','Chromatic Blaze','Frostfire','Midnight Frostfall','Spectrum Inferno','Twilight Snowfall','Winter Whiteout','Old Hire','Calm Snowfall','Cryogenic','Team Recognition']},
    {id:'summer-2026',name:'Summer 2026',start:'2026-07-07',end:'2026-09-15',effects:['Polar Prism','Solar Singed','Umbral Lights','Wispful Wings','Blissful Butterflies','Floral Growth','Stellar Orbit']},
    {id:'scream-fortress-xviii',name:'Scream Fortress XVIII',start:'2026-10-01',end:'2026-11-07',effects:["Boil n' Toil",'Fable Quills','Ghost Swirl','Screaming Soul','Screeching Soul','Shrieking Soul','Fable Feathers',"Grudge n' Drudge",'Spirit Swirl','Autumn Breeze','Flor de Muerto']}
  ]
};
