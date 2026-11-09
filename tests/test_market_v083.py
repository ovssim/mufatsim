from pathlib import Path
import importlib.util
p=Path(__file__).resolve().parents[1]/'scripts/update_backpack_prices.py'
spec=importlib.util.spec_from_file_location('market',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def price(val):return {'value':val,'currency':'metal','last_update':1}
data={'response':{'items':{
 'Winter 2024 Cosmetic Case':{'prices':{'6':{'Tradable':{'Non-Craftable':{'0':price(.55)}}}}},
 'Winter 2024 Cosmetic Key':{'prices':{'6':{'Tradable':{'Non-Craftable':{'0':price(65.88)}}}}},
 'Mann Co. Supply Crate':{'prices':{'6':{'Tradable':{'Non-Craftable':{'50':price(25)}}}}},
 'Team Captain':{'prices':{'6':{'Tradable':{'Craftable':{'0':price(2)},'Non-Craftable':{'0':price(1)}}}}},
}}}
r=m.extract(data)
assert r['crates']['name:winter2024cosmeticcase']==.55
assert r['keys']['winter2024cosmetickey']==65.88
assert r['crates']['series-50']==25
assert r['items']['teamcaptain']['qualities']['Unique']['priceRef']==2
print('price importer v0.8.3 mixed craftability PASS')
