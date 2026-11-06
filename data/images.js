// Optional hand-verified Steam / TF2 Wiki images that display BEFORE the Steam API workflow runs.
// Steam schema on Pages supplies the rest. URLs are third-party hosted and can change.
const ITEM_IMAGES = {
  'Name Tag': 'https://wiki.teamfortress.com/wiki/Special:Redirect/file/Backpack_Name_Tag.png',
  'Description Tag': 'https://wiki.teamfortress.com/wiki/Special:Redirect/file/Backpack_Description_Tag.png',
  'An Extraordinary Abundance of Tinge': 'https://wiki.teamfortress.com/wiki/Special:Redirect/file/Backpack_An_Extraordinary_Abundance_of_Tinge.png',
  'A Distinctive Lack of Hue': 'https://wiki.teamfortress.com/wiki/Special:Redirect/file/Backpack_A_Distinctive_Lack_of_Hue.png',
  'Mann Co. Supply Crate Key': 'https://wiki.teamfortress.com/w/images/8/83/Backpack_Mann_Co._Supply_Crate_Key.png',
  "Brute's Braces": 'https://community.fastly.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEYeQpDCSTgqi1XjdvZD-CNC-UTpNY095dQl2dtlFUoY-bmMjJmJAWXUKIIDPZurFG6X3cw7Z43VdXl9uoAfAy6vIHYc-570OKlrZk/96fx96f',
  'Botler 2000': 'https://community.fastly.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEYeQpDCSTgtyxPjdrZX6LcWN8Tj8M54MFq1Td5lgQ1MLrmYDJjJlGaUPcGC6Nj91ztXiY368VgVoXg8-8CLFnqs4LGM7QpMsYMQZf6amd7YQ/96fx96f',
  'The Necroprancer': 'https://community.fastly.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEPaQRDCSTsvTtRh9j0DPyPDfI_iM4s6ZUE5jpqgwZ-erLlNWQ3cFPAB6RdX6Rppl7vDCVhvpVnAdHvr75VKw7q5YqSMrMqMdFSX56H1VCdOcM/96fx96f'
};
const CRATE_IMAGES = {
  'case-101': 'https://media.steampowered.com/apps/440/icons/cosmetic_case_tough_break_large.2c9cef4124df3eedd6d36f707cce32f8dd1272c8.png',
  'winter-2023': 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIYxQcWA_ruwdAidvjMuCFCuIPleVntcIG5jpqgwZ-erS3ZzMxKweaVfENDPY_9Q25CyNnvMQwBtWw87lfKF-6toGXNeQsMdxSX56Hr1vlXeM',
  'summer-2024': 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIYwocSBXrrCF8i8f1APeYAeM_mNsm4K9GzDtmlBMpZLHhDztmYAPHT6MKWvBt9lu5UHFm6sM6UYCw9rkEKF_otNPOOuQkN95OGcTRWP6AZ1zjqhVvsG7giBk',
  'winter-2024': 'https://community.steamstatic.com/economy/image/fWFc82js0fmoRAP-qOIPu5THSWqfSmTELLqcUywGkijVjZULUrsm1j-9xgEIYxQcWA_ruwdAidvjMuCFCuIPleVntcIB5jpqgwZ-euLhZjY0IACVAKMJD_ZvolG-DXAwvJY6AYbnp7lVfgzutdHANbUkNdtSX56HjHM37RQ'
};
