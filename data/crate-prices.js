// Wormyard.Store — individual case and crate purchase prices in REFINED metal.
// These are fixed prices you set; they take priority over the backpack.tf
// suggested market price. Leave out an item to keep its automatic market price.
// Use case IDs (case-102 = Mayflower) OR case names; numbered crates use series-N.
const CRATE_PRICES = {
  byId: {
    'winter-2024': 0.11,
    // 'case-102': 4.50,        // Mayflower Cosmetic Case example
    // 'series-1': 3.00,        // Mann Co. Supply Crate Series #1
  },
  byName: {
    // 'Mayflower Cosmetic Case': 4.50,
    // 'Summer 2024 Cosmetic Case': 0.33,
  },
  bySeries: {
    1: 3.00,
    26: 0.55,
    103: 0.22,
  }
};
