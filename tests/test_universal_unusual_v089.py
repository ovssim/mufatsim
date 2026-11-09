"""Historical test shim: v0.9.0 replaced global graded-case bonuses with case-local eligibility."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("test_case_grade_bulk_loadout_v090.py")), run_name="__main__")
