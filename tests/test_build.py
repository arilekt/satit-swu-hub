"""Run: python -m unittest discover -s tests -p test_build.py"""
import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

source = Path(__file__).resolve().parents[1] / "tools/stamp_build.py"
spec = importlib.util.spec_from_file_location("stamp_build", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "data").mkdir()
        self.old_root = module.ROOT
        module.ROOT = self.root
        self.html = '<small id="build-info" data-build-id="old">old</small><script src="./js/app.js?v=old"></script><link href="./css/style.css?v=old">'
        (self.root / "index.html").write_text(self.html, encoding="utf-8")

    def tearDown(self):
        module.ROOT = self.old_root
        self.temp.cleanup()

    def test_stamp_matches_manifest_and_asset_versions(self):
        module.stamp("0.2.0")
        info = json.loads((self.root / "data/build.json").read_text(encoding="utf-8"))
        html = (self.root / "index.html").read_text(encoding="utf-8")
        self.assertEqual(info["version"], "0.2.0")
        self.assertRegex(info["build_id"], r"^\d{8}-\d{6}$")
        self.assertIn('data-build-id="' + info["build_id"] + '"', html)
        self.assertIn("./js/app.js?v=" + info["build_id"], html)
        self.assertIn("./css/style.css?v=" + info["build_id"], html)
        self.assertEqual(datetime.fromisoformat(info["updated_at"]).utcoffset(), timedelta(hours=7))

    def test_bad_version_leaves_files_unchanged(self):
        with self.assertRaises(ValueError):
            module.stamp("not a version")
        self.assertEqual((self.root / "index.html").read_text(encoding="utf-8"), self.html)

    def test_missing_marker_is_rejected(self):
        (self.root / "index.html").write_text("no marker", encoding="utf-8")
        with self.assertRaises(ValueError):
            module.stamp("0.2.0")


if __name__ == "__main__":
    unittest.main()
