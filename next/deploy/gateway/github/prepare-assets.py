#!/usr/bin/env python3
"""Export an existing signed next core release as GitHub Release assets.

This does not sign, upload or deploy. Gateway verifies the signature on import.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re
import shutil


def prepare(publish, digest, output):
    if not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise ValueError("manifest digest must be lowercase SHA256")
    raw = (publish / (digest + ".json")).read_bytes()
    envelope = json.loads(raw)
    payload = base64.b64decode(envelope["payload"], validate=True)
    if hashlib.sha256(payload).hexdigest() != digest:
        raise ValueError("manifest payload digest mismatch")
    if not envelope.get("key_id") or len(base64.b64decode(envelope["signature"], validate=True)) != 64:
        raise ValueError("a signed manifest is required")
    manifest = json.loads(payload)
    if manifest.get("manifest_version") != 1 or not manifest.get("platforms"):
        raise ValueError("unsupported manifest")
    bundles = {}
    for platform in manifest["platforms"]:
        bundle_digest = platform["bundle_digest"]
        if not re.fullmatch(r"[0-9a-f]{64}", bundle_digest):
            raise ValueError("invalid bundle digest")
        source = publish / (bundle_digest + ".tar.gz")
        if source.stat().st_size != platform["bundle_bytes"]:
            raise ValueError("bundle size mismatch")
        with source.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != bundle_digest:
                raise ValueError("bundle SHA256 mismatch")
        bundles[source.name] = source
    # A fresh output directory prevents mixing assets from different releases.
    output.mkdir(parents=True, exist_ok=False)
    for name, source in bundles.items():
        shutil.copyfile(source, output / name)
    (output / "next-core-manifest.json").write_bytes(raw)
    return manifest["release_id"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--publish-dir", type=Path, required=True)
    parser.add_argument("--manifest-digest", required=True)
    parser.add_argument("--output", type=Path, required=True, help="new directory; must not exist")
    args = parser.parse_args()
    version = prepare(args.publish_dir, args.manifest_digest, args.output)
    print(f"Prepared signed assets for {version} in {args.output}")


if __name__ == "__main__":
    main()
