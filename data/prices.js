// EDIT THIS FILE to set the simulator buyback prices (in refined metal).
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
    'Strange Sandvich': 400.00
  },
  byQuality: {
    'Unusual': 700.00,
    'Strange': 2.00
  },
  byNameAndQuality: {
    'Strange Iron Bomber|Strange': 18.00
  },
  byNameQualityAndEffect: {
    'Team Captain|Unusual|Burning Flames': 25000.00
  }
};
function manualSellPrice(item) {
  const full = `${item.name}|${item.quality}|${item.effect||''}`;
  const q = `${item.name}|${item.quality}`;
  const p = ITEM_PRICES;
  return Math.round(100 * (p.byNameQualityAndEffect[full] ?? p.byNameAndQuality[q] ?? p.byName[item.name] ?? p.byQuality[item.quality] ?? p.defaultRef));
}

// When BACKPACK_TF_API_KEY is configured in GitHub Actions, the site can
// prefer backpack.tf community suggested prices over these manual fallbacks.
const MARKET_SETTINGS={preferMarketSell:true,preferMarketCrates:true,preferMarketKeys:true,keyValueRef:65.88};
