import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('catalog_guard',ROOT/'scripts/preserve_catalog_cache.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def mkrow(key,n):
    return {'id':f'series-{n}' if key=='historical' else f'case-{n}',
            'series':n,'name':f'Mann Co. Supply Crate Series #{n}' if key=='historical' else f'Test Cosmetic Case {n}',
            'pool':[{'name':f'Item {j} of {n}'} for j in range(3 if key=='historical' else 8)]}

class Preservation(unittest.TestCase):
    def setUp(self):
        self.dir=tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        base=Path(self.dir.name)
        self.prev_manifests=mod.MANIFESTS
        self.prev_backups=mod.BACKUPS
        mod.MANIFESTS={key:{**value,'path':base/f'{key}.json'} for key,value in self.prev_manifests.items()}
        mod.BACKUPS=base/'backup'
        self.addCleanup(lambda: setattr(mod,'MANIFESTS',self.prev_manifests))
        self.addCleanup(lambda: setattr(mod,'BACKUPS',self.prev_backups))

    def test_empty_bundled_keeps_live_50_cases(self):
        mod.write_data(mod.MANIFESTS['cases']['path'],{'cases':[]})
        mod.write_data(mod.MANIFESTS['historical']['path'],{'crates':[mkrow('historical',i) for i in range(1,14)]})
        remote=lambda key: {'cases':[mkrow(key,i) for i in range(50)]} if key=='cases' else {'crates':[mkrow(key,i) for i in range(1,51)]}
        mod.before(fetcher=remote)
        # Simulate importer updating only two known cases, while truncated historical data remains.
        mod.write_data(mod.MANIFESTS['cases']['path'],{'cases':[mkrow('cases',51),mkrow('cases',52)]})
        mod.write_data(mod.MANIFESTS['historical']['path'],{'crates':[]})
        mod.after()
        self.assertEqual(len(mod.read_data(mod.MANIFESTS['cases']['path'])['cases']),52)
        self.assertEqual(len(mod.read_data(mod.MANIFESTS['historical']['path'])['crates']),50)

    def test_cannot_deploy_empty_catalog(self):
        mod.write_data(mod.MANIFESTS['cases']['path'],{'cases':[]})
        mod.write_data(mod.MANIFESTS['historical']['path'],{'crates':[mkrow('historical',i) for i in range(1,14)]})
        mod.before(fetcher=lambda key: {})
        with self.assertRaisesRegex(SystemExit,'REFUSING TO DEPLOY'):
            mod.after()

    def test_preserves_richer_entry_on_partial_update(self):
        old=mkrow('cases',20)
        old['pool'].append({'name':'Bonus item'})
        new=mkrow('cases',20)
        merged=mod.merge({'cases':[old]},{'cases':[new]},'cases')
        self.assertEqual(len(merged['cases'][0]['pool']),9)

if __name__=='__main__': unittest.main()
