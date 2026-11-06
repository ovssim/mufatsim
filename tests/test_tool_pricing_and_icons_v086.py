"""Targeted regression tests for tool price indexes and Steam image aliases."""
import importlib.util
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def module(fname):
    spec=importlib.util.spec_from_file_location(fname,(ROOT/'scripts'/f'{fname}.py'))
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

P=module('update_backpack_prices')
I=module('update_images')

def quote(n):
    return {'value':n,'currency':'metal','last_update':4}

class ToolRegressionTests(unittest.TestCase):
    def test_nonzero_indexes_and_distinct_tools(self):
        data={'response':{'items':{
            'Strangifier':{'prices':{'6':{'Tradable':{'Non-Craftable':{
                '441':quote(11), '595':quote(22)
            }}}}},
            'Kit':{'prices':{'6':{'Tradable':{'Non-Craftable':{
                '1-205':quote(5), '3-205':quote(50)
            }}}}},
            'Strange Part: Heavies Killed':{'prices':{'6':{'Tradable':{
                'Craftable':{'0':quote(6.3)}
            }}}}
        }}}
        prices=P.extract(data)
        self.assertEqual(prices['items']['strangifier']['qualities']['Unique']['indices']['441'],11)
        self.assertEqual(prices['items']['strangifier']['qualities']['Unique']['indices']['595'],22)
        self.assertNotIn('priceRef',prices['items']['strangifier']['qualities']['Unique'])
        self.assertEqual(prices['items']['kit']['qualities']['Unique']['indices']['1-205'],5)
        self.assertEqual(prices['items']['kit']['qualities']['Unique']['indices']['3-205'],50)
        self.assertEqual(prices['items']['strangepartheavieskilled']['qualities']['Unique']['priceRef'],6.3)
        self.assertGreaterEqual(prices['metadata']['indexedQuotes'],5)

    def test_tool_names_have_images_and_targets(self):
        def icon(idx, label, *, name=None, attrs=None):
            return {'item_name':label,'name':name or label,'defindex':idx,
                    'attributes':attrs or [],
                    'image_url_large':f'http://media.steampowered.com/apps/440/icons/item{idx}.png'}
        items=[icon(i,f'Example Hat {i}') for i in range(35)]
        items += [icon(441,'Cow Mangler 5000'),icon(205,'Rocket Launcher')]
        items += [icon(5783,'Strangifier',name='Cow Mangler 5000 Strangifier',attrs=[{'name':'tool target item','value':441}])]
        items += [icon(5728,'Kit',name='Rocket Launcher Killstreakifier Basic',attrs=[{'name':'tool target item','value':205},{'name':'killstreak tier','value':1}])]
        items += [icon(6021,'Strange Part: Critical Kills')]
        parsed=I.export(lambda cursor:{'result':{'items':items}})
        self.assertEqual(parsed['normalized']['cowmangler5000strangifier'], parsed['byIndex']['5783'])
        self.assertEqual(parsed['normalized']['strangepartcriticalkills'], parsed['byIndex']['6021'])
        self.assertEqual(parsed['toolTargets']['cowmangler5000strangifier']['indexes'], ['441'])
        self.assertEqual(parsed['toolTargets']['rocketlauncherkillstreakkit']['indexes'], ['1-205'])
        self.assertEqual(parsed['toolTargets']['killstreakrocketlauncherkit']['indexes'], ['1-205'])

if __name__=='__main__': unittest.main()
