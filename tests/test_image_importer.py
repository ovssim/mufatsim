"""Unit tests for image manifest pagination/URL cleanup. Run: python -m unittest discover -s tests"""
import importlib.util
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('update_images',Path(__file__).resolve().parents[1]/'scripts/update_images.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class SchemaTests(unittest.TestCase):
    def test_http_steam_url_upgraded(self):
        self.assertEqual(mod.secure_icon('http://media.steampowered.com/apps/440/icons/test.png'),
                         'https://media.steampowered.com/apps/440/icons/test.png')
        self.assertEqual(mod.secure_icon('https://evil.example/a.png'),'')
    def test_pagination_and_aliases(self):
        def icon(idx,name):
            return {'item_name':name, 'defindex':idx,
                    'image_url_large':f'http://media.steampowered.com/apps/440/icons/item{idx}.png'}
        pages={0:{'result':{'items':[icon(i,f'The Example Hat {i}') for i in range(20)],'next':250}},
               250:{'result':{'items':[icon(i,f'Example Tool {i}') for i in range(20,40)]}}}
        out=mod.export(lambda cursor:pages[cursor])
        self.assertEqual(out['metadata']['pages'],2)
        self.assertEqual(out['metadata']['itemCount'],40)
        self.assertIn('examplehat0',out['normalized'])
        self.assertEqual(out['byIndex']['23'], 'https://media.steampowered.com/apps/440/icons/item23.png')

if __name__=='__main__':unittest.main()
