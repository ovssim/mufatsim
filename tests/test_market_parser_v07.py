from pathlib import Path
import importlib.util
p=Path(__file__).resolve().parents[1]/'scripts/update_backpack_prices.py'
spec=importlib.util.spec_from_file_location('price_updater',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
leaf=lambda c,v:{'currency':c,'value':v}
data={'response':{'items':{
 'Mann Co. Supply Crate':{'prices':{'6':{'Tradable':{'Craftable':{'1':leaf('metal',3),'103':leaf('metal',0.22)}}}}},
 'Team Captain':{'prices':{'5':{'Tradable':{'Craftable':{'13':leaf('keys',240)}}},'6':{'Tradable':{'Craftable':{'0':leaf('metal',10)}}}}},
 'Mann Co. Supply Crate Key':{'prices':{'6':{'Tradable':{'Craftable':{'0':leaf('metal',65.88)}}}}}
}}}
a=m.extract(data)
assert a['crates']['series-1']==3
assert a['crates']['series-103']==0.22
assert a['items']['teamcaptain']['qualities']['Unusual']['effects']['burningflames']==15811.2
assert a['items']['teamcaptain']['qualities']['Unique']['priceRef']==10
assert a['keys']['manncosupplycratekey']==65.88
print('backpack.tf fixture/parser PASS')
