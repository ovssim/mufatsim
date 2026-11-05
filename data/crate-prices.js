// Simulator crate acquisition prices in REFINED metal. Not market quotes.
// A price may be set byId (e.g. series-30) or bySeries.
// Only verified historical containers are shown; unknown series are not invented.
const CRATE_PRICES = {
  byId: {
    'winter-2024': 0.11
  },
  bySeries: {
    1: 3.00,
    26: 0.55,
    103: 0.22
  }
};
