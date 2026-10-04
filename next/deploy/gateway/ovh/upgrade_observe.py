#!/usr/bin/env python3
"""Runs a console-driven primary-first upgrade on the ovh managed cluster and
records what each node actually did. Secrets are read from .env, never printed."""
import json, os, subprocess, sys, threading, time, urllib.request, urllib.error, uuid

M = os.path.expanduser("~/sup2api-managed")
PORTS = {"sup2api-1": 3130, "sup2api-2": 3131, "sup2api-3": 3132, "sup2api-4": 3133}
CONTAINER = {n: f"sup2api-managed-{n}-1" for n in PORTS}
RESTART = sys.argv[2] if len(sys.argv) > 2 else ""
env = dict(l.split("=", 1) for l in open(f"{M}/.env").read().splitlines() if "=" in l)
T0 = time.time()
log = open(f"{M}/upgrade-{time.strftime('%Y%m%dT%H%M%S')}.log", "w")
lock = threading.Lock()
def rec(kind, **kw):
    kw.update(t=round(time.time() - T0, 2), kind=kind)
    with lock:
        log.write(json.dumps(kw) + "\n"); log.flush()
def say(msg):
    print(f"[{time.time()-T0:7.2f}s] {msg}", flush=True); rec("note", msg=msg)

def http(method, url, body=None, headers=None, timeout=5):
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return 0, str(e).encode()

def psql(q):
    return subprocess.run(["docker", "exec", "sup2api-pg-1", "psql", "-U", "sup2api", "-d", "sup2api", "-AtF|", "-c", q],
                          capture_output=True, text=True).stdout.strip()

stop = threading.Event()
def traffic():
    while not stop.is_set():
        for n, p in PORTS.items():
            code, _ = http("GET", f"http://127.0.0.1:{p}/api/v1/key/prices", timeout=3)
            rec("http", node=n, code=code)
        time.sleep(0.1)
def processes():
    last = {}
    while not stop.is_set():
        for n, c in CONTAINER.items():
            out = subprocess.run(["docker", "top", c, "-eo", "pid,args"], capture_output=True, text=True).stdout
            lines = out.splitlines()[1:]
            core = [l.split()[0] for l in lines if l.split()[1:2] and l.split()[1].endswith("/bin/sub2api")]
            plugins = sum(1 for l in lines if "/plugins/" in l)
            state = (tuple(core), plugins, "running" if out else "container-down")
            if last.get(n) != state:
                last[n] = state
                rec("proc", node=n, core_pids=list(core), plugins=plugins, container="up" if out else "down")
        time.sleep(0.5)
def cluster():
    last = None
    while not stop.is_set():
        nodes = psql("select node_id,mode,ready,stopped,left(release_digest,8),left(shell_boot_id,8),left(core_boot_id,8) from updater.nodes order by 1")
        plan = psql("select u.status,u.cursor,coalesce(s.node_id||':'||s.action||':'||s.status,'') from updater.upgrades u left join updater.steps s on s.upgrade_id=u.id and s.step_id=u.cursor where u.cluster_id='sup2api' order by u.created_at desc limit 1")
        state = (nodes, plan)
        if state != last:
            last = state
            rec("cluster", nodes=nodes.splitlines(), plan=plan)
        time.sleep(0.5)

target = sys.argv[1]
base = "http://127.0.0.1:3130/api/v1"
code, body = http("POST", f"{base}/auth/login", {"email": env["SUB2API_BOOTSTRAP_ADMIN_EMAIL"], "password": env["SUB2API_BOOTSTRAP_ADMIN_PASSWORD"]})
if code != 200:
    sys.exit(f"admin login failed: HTTP {code}")
auth = {"Authorization": "Bearer " + json.loads(body)["data"]["access_token"]}
code, body = http("POST", f"{base}/system/upgrades/preflight", {"release_digest": target}, auth)
pf = json.loads(body).get("data", {})
say(f"preflight HTTP {code}: blockers={pf.get('blockers')} nodes={pf.get('nodes')}")
if code != 200 or pf.get("blockers"):
    sys.exit(1)
for f in (traffic, processes, cluster):
    threading.Thread(target=f, daemon=True).start()
time.sleep(3)
code, body = http("POST", f"{base}/system/upgrades", {"release_digest": target, "expected_revision": pf["expected_revision"], "idempotency_key": str(uuid.uuid4())}, auth)
plan = json.loads(body).get("data", {})
say(f"create plan HTTP {code}: id={plan.get('id')} order={plan.get('nodes')}")
if code not in (200, 202):
    stop.set(); sys.exit(body.decode()[:500])
pid = plan["id"]
restarted = False
while True:
    status = psql(f"select status||'|'||cursor from updater.upgrades where id='{pid}'")
    rows = {r.split("|")[0]: r.split("|") for r in psql("select node_id,mode,ready,stopped from updater.nodes").splitlines()}
    if RESTART and not restarted and rows.get(RESTART, [None, None, None, "f"])[3] == "t" and rows.get("sup2api-1", [None, "local"])[1] != "local":
        say(f"fault: docker restart {CONTAINER[RESTART]} (stopped follower, primary not serving)")
        subprocess.run(["docker", "restart", "-t", "60", CONTAINER[RESTART]], capture_output=True)
        say("fault: restart returned")
        restarted = True
    if status.startswith("completed") or status.startswith("paused"):
        say(f"plan {status}")
        break
    time.sleep(0.5)
for _ in range(120):
    ok = all(http("GET", f"http://127.0.0.1:{p}/api/v1/key/prices")[0] == 401 for p in PORTS.values())
    if ok:
        break
    time.sleep(1)
time.sleep(3)
stop.set()
time.sleep(1)
rec("events", rows=psql(f"select id,kind,message,created_at from updater.events where upgrade_id='{pid}' order by id").splitlines())
say("done; log " + log.name)
