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
    'Mayflower Cosmetic Case': 11.55,
    'Gun Mettle Cosmetic Case': 346.44,
    'Quarantined Collection Case': 710.88,
    'Confidential Collection Case': 447.11,
    'Gargoyle Case': 658.88,
    'Creepy Crawly Case': 363.44,
    'Rainy Day Cosmetic Case': 4.00,
    'Abominable Cosmetic Case': 2.66,
    'Unleash the Beast Cosmetic Case': 1.88,
    'Winter 2017 Cosmetic Case': 9.00,
    'Blue Moon Cosmetic Case': 2.22,
    'Violet Vermin Case': 35.00,
    'Winter 2018 Cosmetic Case': 0.33,
    'Summer 2019 Cosmetic Case': 2.88,
    'Spooky Spoils Case': 2.11,
    'Winter 2019 Cosmetic Case': 0.22,
    'Summer 2020 Cosmetic Case': 13.77,
    'Winter 2020 Cosmetic Case': 0.11,
    'Summer 2021 Cosmetic Case': 0.44,
    'Crimson Cache Case': 21.00,
    'Winter 2021 Cosmetic Case': 0.11,
    'Summer 2022 Cosmetic Case': 1.44,
    'Ghoulish Gains Case': 9.66,
    'Winter 2022 Cosmetic Case': 0.11,
    'Summer 2023 Cosmetic Case': 0.44,
    'Bone-Chilling Bonanza Case': 4.00,
    'Winter 2023 Cosmetic Case': 0.11,
    'Summer 2024 Cosmetic Case': 0.66,
    'Terrifying Trove Case': 2.22,
    'Winter 2024 Cosmetic Case': 0.11,
    'Summer 2025 Cosmetic Case': 0.33,
    'Spectral Stash Case': 0.66,
    'Winter 2025 Cosmetic Case': 0.11,
    'Summer 2026 Cosmetic Case': 0.22,
    'Haunted Hoard Case': 1.11,
  },
  bySeries: {
    1: 424.00,
    26: 6.33,
    103: 12.00,
  }
};
