/* Public simulator-only promo codes. No secret enforcement is possible on static GitHub Pages. */
const PROMO_CODES = Object.freeze({
  UNUSUAL100: {type:'random-unusual',description:'One random Unusual (unsellable)',oncePerSave:true},
  WORMYARD: {type:'mannco-keys',quantity:25,description:'25 Mann Co. Supply Crate Keys',oncePerSave:true},
  KEYS25: {type:'mannco-keys',quantity:500,description:'25 Mann Co. Supply Crate Keys',oncePerSave:false}
});
