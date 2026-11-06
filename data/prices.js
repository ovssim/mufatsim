// SITE OWNER: EDIT THIS FILE to set fixed simulator buyback prices (in refined metal).
// Players cannot change sell prices from the browser's Sell Items tab.
// A valid backpack.tf suggested price takes priority when MARKET_SETTINGS.preferMarketSell is true.
// Exact matches can include quality and effect; more specific rules take priority.
// This is NOT live backpack.tf pricing.
const ITEM_PRICES = {
  defaultRef: 1.00,
  byName: {
    'Vita-Saw': 0.11,
    'Gunslinger': 0.11,
    'Equalizer': 0.11,
    'Scottish Resistance': 0.11,
    'Name Tag': 18.00,
    'Team Captain': 12.00,
    'Strange Sandvich': 536.00
  },
  byQuality: {
    'Unusual': 700.00,
    'Strange': 12.00
  },
  byNameAndQuality: {
    'Strange Iron Bomber|Strange': 18.00
  },
  byNameQualityAndEffect: {
    'Team Captain|Unusual|Burning Flames': 25000.00
  }
};
function manualSellPrice(item, defaultRef=ITEM_PRICES.defaultRef) {
  const full = `${item.name}|${item.quality}|${item.effect||''}`;
  const q = `${item.name}|${item.quality}`;
  const p = ITEM_PRICES;
  return Math.round(100 * (p.byNameQualityAndEffect[full] ?? p.byNameAndQuality[q] ?? p.byName[item.name] ?? p.byQuality[item.quality] ?? defaultRef));
}

// When BACKPACK_TF_API_KEY is configured in GitHub Actions, the site can
// prefer backpack.tf community suggested prices over these manual fallbacks.
const MARKET_SETTINGS={preferMarketSell:true,preferMarketCrates:true,preferMarketKeys:true,keyValueRef:65.88};


// v0.9.1 — odds for a random-but-permanent simulated Unusual appraisal.
// Each newly unboxed Unusual gets a stable value in one of these ranges.
// Distribution is 74% / 20% / 5% / 1% per Unusual, not per refresh.
// These are fictional simulator buyback quotes, NOT backpack.tf prices.
const SIMULATED_UNUSUAL_PRICE_BANDS = [
  {minKeys:15, maxKeys:50, weight:735},
  {minKeys:50, maxKeys:180, weight:240},
  {minKeys:200, maxKeys:450, weight:20},
  {minKeys:500, maxKeys:5000, weight:5}
];


// v0.9.2: Every grade above Mercenary shifts 5 percentage points from
// the 15–50 key band to the 50–140 key band. The high-end 5% and 1%
// bands are unchanged. Mercenary 74/20/5/1, Commando 69/25/5/1,
// Assassin 64/30/5/1, Elite 59/35/5/1.
const UNUSUAL_GRADE_BONUS_PERCENT_POINTS=5;

// Estimated prices are SIMULATOR VALUES, not confirmed market listings.
// Used only after exact backpack.tf and the explicitly configured ITEM_PRICES
// have failed to match. Customize these amounts in refined metal.
const SIMULATED_ITEM_ESTIMATES={
  strangifierRef:12.00,
  strangePartRef:3.00,
  killstreakKitRef:6.00,
  specializedKillstreakKitRef:25.00,
  professionalKillstreakKitRef:80.00,
  fabricatorRef:4.00,
  weaponByGradeRef:{Civilian:0.45,Freelance:0.85,Mercenary:1.40,Commando:3.20,Assassin:9.50,Elite:30.00},
  weaponUnspecifiedRef:1.00,
  strangeWeaponMultiplier:1.45,
  wearMultipliers:{'Factory New':1,'Minimal Wear':0.77,'Field-Tested':0.55,'Well-Worn':0.39,'Battle Scarred':0.30},
  // Enable category means when at least 3 comparable quotes are available.
  marketFamilyAverage:true
};
