import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("prepare_assets", Path(__file__).with_name("prepare-assets.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AssetExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bundle = b"fixture bundle"
        digest = hashlib.sha256(self.bundle).hexdigest()
        self.bundle_path = self.root / (digest + ".tar.gz")
        self.bundle_path.write_bytes(self.bundle)
        payload = json.dumps({"manifest_version": 1, "release_id": "v1.2.3", "platforms": [
            {"bundle_digest": digest, "bundle_bytes": len(self.bundle)}]}).encode()
        self.digest = hashlib.sha256(payload).hexdigest()
        self.envelope = json.dumps({"key_id": "test-only", "payload": base64.b64encode(payload).decode(),
                                    "signature": base64.b64encode(bytes(64)).decode()}).encode()
        self.manifest_path = self.root / (self.digest + ".json")
        self.manifest_path.write_bytes(self.envelope)
        self.output = self.root / "assets"

    def test_preserves_signed_bytes_and_only_exports_declared_assets(self):
        (self.root / "release.key").write_text("do not copy")
        self.assertEqual(module.prepare(self.root, self.digest, self.output), "v1.2.3")
        self.assertEqual((self.output / "next-core-manifest.json").read_bytes(), self.envelope)
        self.assertEqual(set(p.name for p in self.output.iterdir()), {"next-core-manifest.json", self.bundle_path.name})

    def test_rejects_changed_payload(self):
        data = json.loads(self.envelope)
        data["payload"] = base64.b64encode(b"{}").decode()
        self.manifest_path.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, "payload digest"):
            module.prepare(self.root, self.digest, self.output)
        self.assertFalse(self.output.exists())

    def test_rejects_corrupted_bundle_of_same_length(self):
        self.bundle_path.write_bytes(b"X" * len(self.bundle))
        with self.assertRaisesRegex(ValueError, "SHA256"):
            module.prepare(self.root, self.digest, self.output)
        self.assertFalse(self.output.exists())

    def test_refuses_existing_output(self):
        self.output.mkdir()
        (self.output / "keep").write_text("existing")
        with self.assertRaises(FileExistsError):
            module.prepare(self.root, self.digest, self.output)
        self.assertEqual((self.output / "keep").read_text(), "existing")


if __name__ == "__main__":
    unittest.main()
