from pathlib import Path
import importlib.util
p = Path(__file__).resolve().parents[1]/'scripts/update_backpack_prices.py'
spec=importlib.util.spec_from_file_location('price_updater',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
leaf=lambda currency,value,**kw:{'currency':currency,'value':value,**kw}
items={}
items['Mann Co. Supply Crate']={'prices':{'6':{'Tradable':{'Craftable':[None,leaf('metal',3)]}}}}
items['Team Captain']={'prices':{
 '5':{'Tradable':{'Craftable':{'13':[leaf('keys',230,last_update=5),leaf('keys',240,last_update=8)],'99':leaf('keys',2)}}},
 '6':{'Tradable':{'Craftable':[leaf('metal',10)]}}
 }}
items['Mann Co. Supply Crate Key']={'prices':{'6':{'Tradable':{'Craftable':[leaf('metal',65.88)]}}}}
items['Mann Co. Supply Munition']={'prices':{'6':{'Tradable':{'Craftable':{'103':leaf('metal',0.22)}}}}}
a=m.extract({'response':{'items':items}})
assert a['crates']['series-1']==3
assert a['crates']['series-103']==0.22
assert a['items']['teamcaptain']['qualities']['Unusual']['effects']['burningflames']==15811.2
assert a['items']['teamcaptain']['qualities']['Unusual']['effectsById']['99']==131.76
assert a['items']['teamcaptain']['qualities']['Unique']['priceRef']==10
assert a['keys']['manncosupplycratekey']==65.88
assert m.quote(leaf('metal',10,value_high=14),65.88)==12
print('Beta 0.7.1 market schema parser PASS')
