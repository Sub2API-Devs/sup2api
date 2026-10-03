#!/usr/bin/env python3
"""One-off before migration 0022: copy every plugin package still stored in
PostgreSQL into the primary gateway's package store (state volume of
sup2api-1, plugin-blobs/<sha[:2]>/<sha>). Verifies each digest; prints only
counts."""
import hashlib, os, subprocess, sys, tempfile

def psql(q):
    r = subprocess.run(["docker", "exec", "sup2api-pg-1", "psql", "-U", "sup2api", "-d", "sup2api", "-At", "-c", q],
                       capture_output=True, text=True, check=True)
    return r.stdout

out = tempfile.mkdtemp(prefix="plugin-blobs-")
sums = sorted(set(psql("select lower(package_sha256) from plugin_versions").split()))
for sha in sums:
    if len(sha) != 64 or any(c not in "0123456789abcdef" for c in sha):
        sys.exit(f"unexpected digest {sha!r}")
    data = bytes.fromhex(psql(f"select encode(package,'hex') from plugin_versions where lower(package_sha256)='{sha}' limit 1").strip())
    if hashlib.sha256(data).hexdigest() != sha:
        sys.exit(f"digest mismatch for {sha}")
    os.makedirs(f"{out}/{sha[:2]}", exist_ok=True)
    with open(f"{out}/{sha[:2]}/{sha}", "wb") as f:
        f.write(data)
subprocess.run(["chmod", "-R", "a+rX", out], check=True)
subprocess.run(["docker", "run", "--rm", "--user", "0", "-v", "sup2api-managed_state-1:/state", "-v", f"{out}:/in:ro",
                "--entrypoint", "sh", os.environ.get("GATEWAY_IMAGE", "sup2api-gateway:local"), "-c",
                "mkdir -p /state/plugin-blobs && cp -a /in/. /state/plugin-blobs/ && chown -R 1000:1000 /state/plugin-blobs && chmod -R go-rwx /state/plugin-blobs"],
               check=True)
subprocess.run(["rm", "-rf", out], check=True)
print(f"exported {len(sums)} packages")
