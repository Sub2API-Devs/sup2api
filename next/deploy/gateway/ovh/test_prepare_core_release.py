"""Isolated shell preflight tests; no Docker, SSH or production mutation."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
SH = os.environ.get("TEST_SH") or shutil.which("sh")


@unittest.skipUnless(SH, "POSIX sh required")
class ReleasePreparationTests(unittest.TestCase):
    def test_shell_syntax(self):
        for script in (HERE / "prepare-core-release.sh", HERE.parent.parent / "docker/build-go.sh"):
            subprocess.run([SH, "-n", str(script)], check=True)

    def test_invalid_version_or_sha_never_runs_tools(self):
        for version, sha in (("../old", "a" * 40), ("0.1.63", "HEAD"), ("0.1.63;id", "a" * 40)):
            result = subprocess.run([SH, str(HERE / "prepare-core-release.sh"), version, sha], capture_output=True)
            self.assertEqual(result.returncode, 2)

    def test_wrong_sha_never_creates_release(self):
        with tempfile.TemporaryDirectory() as temp:
            env = dict(os.environ, SUP2API_MANAGED_DIR=temp)
            result = subprocess.run([SH, str(HERE / "prepare-core-release.sh"), "0.1.63", "0" * 40], env=env, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(b"Git SHA mismatch", result.stderr)
            self.assertEqual(list(Path(temp).iterdir()), [])

    def test_required_dev_key_fails_before_build_or_key_generation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            env = dict(os.environ, REQUIRE_EXISTING_DEV_KEY="1")
            script = HERE.parent.parent / "docker/build-go.sh"
            result = subprocess.run([SH, str(script), str(root / "src"), str(root / "out"), str(root / "keys")], env=env, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(b"refusing key generation", result.stderr)
            self.assertEqual(list(root.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
