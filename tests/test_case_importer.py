import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('update_cases',Path(__file__).resolve().parents[1]/'scripts/update_cases.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class TestCaseImporter(unittest.TestCase):
 def test_case_graded_items_image_and_key(self):
  def pic(s):return f'<li><img alt="{s}" src="https://community.fastly.steamstatic.com/economy/image/abcdef" /></li>'
  doc='''<h1>Guide</h1><p>Container information · Series #149</p><h2>Summer 2025 Cosmetic Case</h2><p>Requires a Summer 2025 Cosmetic Key to open.</p><img alt="Summer 2025 Cosmetic Case" src="https://community.steamstatic.com/economy/image/abcdef"/><h4>Individual Item Odds · case opening</h4>'''
  for grade in ['Mercenary','Commando','Assassin','Elite']:
   doc+=f'<h5>{grade} Grade</h5>'+''.join(pic(grade+str(i)) for i in range(3))
  doc+='<h2>Available trade-up routes</h2>'+pic('duplicate')
  c=mod.parse_collection(doc,'source')
  self.assertEqual(c['name'],'Summer 2025 Cosmetic Case')
  self.assertEqual(c['series'],149)
  self.assertEqual(len(c['pool']),12)
  self.assertEqual(c['keyName'],'Summer 2025 Cosmetic Key')
  self.assertEqual(c['pool'][0]['grade'],'Mercenary')
  self.assertTrue(c['pool'][0]['image'].startswith('https://'))
 def test_cannot_inject_external_image(self):
  self.assertFalse(mod.safe_image('https://evil.example/abc'))
  self.assertFalse(mod.safe_image('javascript:alert(1)'))
if __name__=='__main__':unittest.main()
