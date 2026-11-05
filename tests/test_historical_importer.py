import json
import sys
import unittest
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'scripts'))
from update_historical_crates import parse_detail, index_links, build


def table(name, items):
    tr=''.join(f'<tr><td>{label}</td><td>{odds:.2f}%</td><td>0.01 - 0.02</td></tr>' for label,odds in items)
    return (f'<html><h1>Expected value of {name}</h1><table><tr><th>Item Name</th><th>Likelihood</th><th>Value</th></tr>{tr}</table></html>')

class HistoricalTests(unittest.TestCase):
    def test_seeded_drops_have_unique_pools(self):
        data=json.loads((root/'data/historical-crates.json').read_text())
        crates=data['crates']
        self.assertGreaterEqual(len(crates),10)
        self.assertEqual(len({c['id'] for c in crates}),len(crates))
        pools=[tuple(i['name'] for i in c['pool']) for c in crates]
        self.assertEqual(len(set(pools)),len(pools))
        self.assertEqual(next(c for c in crates if c['id']=='series-30')['name'],'Salvaged Mann Co. Supply Crate Series #30')
        self.assertEqual(next(c for c in crates if c['id']=='series-103')['name'],'Mann Co. Supply Munition Series #103')
        self.assertEqual(next(c for c in crates if c['id']=='series-2')['pool'][0]['name'],'Black Box')
        self.assertTrue(all(not i.get('grade') for c in crates for i in c['pool']))
        self.assertTrue(all(c['verified'] and c['historical'] for c in crates))
    def test_parse_realistic_model_table(self):
        title='Salvaged Mann Co. Supply Crate Series #30'
        markup=table(title,[('Strange Ullapool Caber',19.8),('Strange Kritzkrieg',19.8),('Strange Holy Mackerel',19.8),('Strange Gunslinger',19.8),('Strange Machina',19.8),('Series 2 Unusual',.66)])
        crate=parse_detail(markup,'https://theletterzed.ca/tf2/crate/30/',title)
        self.assertEqual(crate['series'],30)
        self.assertEqual(len(crate['pool']),5)
        self.assertAlmostEqual(crate['unusualChance'],.0066)
        self.assertEqual(crate['pool'][0]['quality'],'Strange')
        self.assertNotIn('Series 2 Unusual',[i['name'] for i in crate['pool']])
    def test_bad_pool_rejected(self):
        title='Mann Co. Supply Crate Series #44'
        self.assertIsNone(parse_detail(table(title,[('Fake Prize',10),('Same Prize',10),('Other',10)]),'https://theletterzed.ca/tf2/crate/44/',title))
        self.assertIsNone(parse_detail(table('Made Up Crate Series #44',[('Fake',99)]),'https://theletterzed.ca/tf2/crate/44/'))
    def test_index_and_build_preserves_good_data(self):
        idx='<table><tr><td><a href="/tf2/crate/30/">Salvaged Mann Co. Supply Crate Series #30</a></td></tr><tr><td><a href="/tf2/crate/82/">Mann Co. Supply Munition Series #82</a></td></tr><tr><td><a href="/tf2/crate/xx/">Summer 2026 War Paint Case</a></td></tr></table>'
        self.assertEqual(len(index_links(idx)),2)
        t30='Salvaged Mann Co. Supply Crate Series #30'
        html30=table(t30,[('Strange Ullapool Caber',19.8),('Strange Kritzkrieg',19.8),('Strange Holy Mackerel',19.8),('Strange Gunslinger',19.8),('Strange Machina',19.8),('Series 2 Unusual',.66)])
        existing={'crates':json.loads((root/'data/historical-crates.json').read_text())['crates']}
        def fake(url):
            if url.endswith('/tf2/crates/'):return idx
            if url.endswith('/tf2/crate/30/'):return html30
            raise RuntimeError('offline')
        result=build(existing,fake)
        self.assertGreaterEqual(len(result['crates']),10)
        self.assertNotIn('Series 2 Unusual',[x['name'] for x in next(c for c in result['crates'] if c['series']==30)['pool']])

if __name__=='__main__':unittest.main()
