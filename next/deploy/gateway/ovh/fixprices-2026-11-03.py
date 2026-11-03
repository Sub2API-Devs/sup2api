# Fix Claude model prices to the official table (platform.claude.com pricing, 2026-11-03).
#   python3 -I fixprices.py show|apply
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
            d = r.read()
            return None if not d else json.loads(d).get("data")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path}: HTTP {e.code} {e.read()[:500]!r}")
env = dict(l.split("=", 1) for l in (ROOT / ".env").read_text().splitlines() if "=" in l)
TOKEN = call("POST", "/auth/login", {"email": env["SUB2API_BOOTSTRAP_ADMIN_EMAIL"], "password": env["SUB2API_BOOTSTRAP_ADMIN_PASSWORD"]})["access_token"]
env.clear()
FIX = {  # id -> official per-MTok config
    308: ("claude-sonnet-5-5", {"p": 2, "c": 10, "cr": 0.1, "cc": 2.5, "cc1h": 4}),
    124: ("claude-sonnet-4-6", {"p": 3, "c": 15, "cr": 0.3, "cc": 3.75, "cc1h": 6}),
    109: ("claude-haiku-4-5-20251001", {"p": 1, "c": 5, "cr": 0.1, "cc": 1.25, "cc1h": 2}),
}
DELETE = {116: "claude-opus-4-6-20260205", 118: "claude-opus-4-7-20260416"}
step = sys.argv[1]
for pid, model in [(k, v[0]) for k, v in FIX.items()] + list(DELETE.items()):
    p = call("GET", f"/prices/{pid}")
    assert p["model"] == model, (pid, p["model"], model)
    print("before", json.dumps({k: p.get(k) for k in ("id", "model", "mode", "source", "config", "expression")}))
if step == "apply":
    for pid, (model, cfg) in FIX.items():
        p = call("PATCH", f"/prices/{pid}", {"mode": "per_token", "config": cfg, "confirm": True,
                                              "note": "2026-11-03 official price (platform.claude.com/docs/en/about-claude/pricing)"})
        print("after ", json.dumps({k: p.get(k) for k in ("id", "model", "mode", "source", "config", "expression")}))
    for pid in DELETE:
        call("DELETE", f"/prices/{pid}")
        print("deleted", pid, DELETE[pid])
