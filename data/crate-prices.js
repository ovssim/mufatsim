// Simulator crate acquisition prices in REFINED metal. Not market quotes.
// Any missing crate retains its current demo price from catalog.js.
const CRATE_PRICES = {
  byId: {
    'unlocked-cosmetic': 4.00,
    'winter-2024': 0.11
  },
  bySeries: {
    1: 3.00,
    26: 0.55,
    103: 0.22
  }
};
