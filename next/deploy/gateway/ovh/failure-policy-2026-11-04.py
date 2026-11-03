# Failure policy: retry once on the same account, max_retries 3.  python3 -I fp.py show|apply
import json, pathlib, sys, urllib.request, urllib.error
ROOT = pathlib.Path.home() / "sup2api-managed"
TOKEN = None
def call(method, path, body=None):
    h = {"Content-Type": "application/json"}
    if TOKEN: h["Authorization"] = "Bearer " + TOKEN
    req = urllib.request.Request("http://127.0.0.1:3130/api/v1" + path, method=method, headers=h,
                                 data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read()).get("data")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path}: HTTP {e.code} {e.read()[:800]!r}")
env = dict(l.split("=", 1) for l in (ROOT / ".env").read_text().splitlines() if "=" in l)
TOKEN = call("POST", "/auth/login", {"email": env["SUB2API_BOOTSTRAP_ADMIN_EMAIL"], "password": env["SUB2API_BOOTSTRAP_ADMIN_PASSWORD"]})["access_token"]
env.clear()
cur = call("GET", "/settings/failure-policy")
p = cur["policy"]
keys = ("schema_version", "revision", "retry_enabled", "max_retries", "retries_per_account", "switch_account", "reset_sticky", "backoff_ms")
print("before", cur["configured"], json.dumps({k: p.get(k) for k in keys}))
if sys.argv[1] == "apply":
    rev = p["revision"]
    p["max_retries"], p["retries_per_account"] = 3, 1
    out = call("PUT", "/settings/failure-policy", {"expected_revision": rev, "policy": p})
    q = call("GET", "/settings/failure-policy")["policy"]
    print("after ", json.dumps({k: q.get(k) for k in keys}))
