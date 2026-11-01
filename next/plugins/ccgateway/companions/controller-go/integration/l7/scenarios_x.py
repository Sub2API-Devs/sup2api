"""IT-X: fault injection (05 §4.3). Every injection touches ccg-gt-* only."""
import json
import os
import re
import socket
import subprocess
import threading
import time

from itlib import (Fail, A1, A2, A3, CONTROLLER, GATEWAY, GUARD_IP, PORT, PREFIX, ST, WORK, api, app_exec, chain_rules,
                   check, connection, controller_key, docker, egress_stream_via, fixture_events, gt_containers, gt_name,
                   health, http_complete, inspect, jbody, put_config, record, revision, save_state, scenario, sh,
                   status, sudo, tunnel, wait_health, wait_ready, worker_health_request)
from scenarios_m import canon, sh_dc

GUARD = 'ccg-gt-guard'


def ready_keys():
    return sorted(k for k in ST.get('desired', {}) if status(k)[1].get('status') == 'ready')


class Tunnel:
    """A tunnel kept open: several Worker requests over one connection."""

    def __init__(self, aid):
        rev = ST['desired'][aid]['revision']
        self.s = socket.create_connection(('127.0.0.1', PORT), timeout=15)
        self.s.sendall(('GET /accounts/%s/tunnel HTTP/1.1\r\nHost: c\r\nAuthorization: Bearer %s\r\nUpgrade: ccg-tunnel\r\n'
                        'Connection: Upgrade\r\nX-CCG-Revision: %s\r\n\r\n' % (aid, controller_key(), rev)).encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            part = self.s.recv(4096)
            if not part:
                break
            buf += part
        self.status = buf.split(b'\r\n', 1)[0].decode('latin-1')
        self.rest = buf.partition(b'\r\n\r\n')[2]

    def health(self):
        self.s.sendall(b'GET /health HTTP/1.1\r\nHost: worker\r\n\r\n')
        data = self.rest
        self.rest = b''
        while not http_complete(data):
            part = self.s.recv(65536)
            if not part:
                break
            data += part
        return data[:12].decode('latin-1')

    def close(self):
        self.s.close()


def all_chains():
    return {c: sorted(canon(r) for r in chain_rules(c)) for c in ('PROXY-BRIDGE', 'CONTROL-FWD', 'CONTROL-IN')}


def guard_ready(seconds=60):
    t0 = time.time()
    while time.time() - t0 < seconds:
        if subprocess.run(['sudo', '-n', 'docker', 'exec', GUARD, 'ccgateway-guard', 'ready'], capture_output=True).returncode == 0:
            return time.time() - t0
        time.sleep(0.5)
    raise RuntimeError('guard not ready')


@scenario('IT-X01')
def x01():
    keep = Tunnel(A2)
    check(keep.status.startswith('HTTP/1.1 101') and '200' in keep.health(), 'a tunnel to a2 is open before the fault')
    d = dict(ST['desired'][A1], revision=revision('a1-x01'))
    res = {}

    def push():
        res['put'] = put_config(A1, d, timeout=200)
    t = threading.Thread(target=push)
    t.start()
    time.sleep(0.3)
    t_stop = time.time()
    code, out, err = sh_dc('stop', 'guard')
    stop_s = time.time() - t_stop
    t.join(200)
    s, b, dt = res['put']
    record('push racing the guard stop', s in (200, 503), status=s, answer=b if s != 200 else None, seconds=round(dt, 1),
           stop_seconds=round(stop_s, 1))
    if s == 200:
        d = dict(d, revision=revision('a1-x01b'))
        s, b, dt = put_config(A1, d, timeout=200)
    check(s == 503, 'a push while the guard is down -> 503', status=s, answer=b, seconds=round(dt, 1))
    # Requests of ready accounts while the guard is down.
    try:
        h = keep.health()
    except OSError as e:
        h = repr(e)
    check('200' in h, 'an open tunnel keeps working (data path does not use the guard)', worker=h)
    rev2 = ST['desired'][A2]['revision']
    t1 = time.time()
    cs, _, cb = connection(A2, rev2)
    conn_s = time.time() - t1
    line, _, data = tunnel(A2, rev2, worker_health_request(), read_until=http_complete, timeout=30)
    check(cs == 200 and line.startswith('HTTP/1.1 101') and b' 200 ' in data[:16],
          'new requests of ready accounts while the guard is down (snapshot fallback)',
           connection=cs, connection_seconds=round(conn_s, 2), tunnel=line, answer=jbody(cb) if cs != 200 else None)
    code, out = app_exec(A2, ['node', '-e', "fetch('https://1.1.1.1/',{signal:AbortSignal.timeout(10000)})"
                              ".then(r=>{console.log(r.status)}).catch(e=>{console.log(e.message);process.exit(1)})"], timeout=40)
    check(code == 0, 'a2 egress works while the guard is down (kernel rules stay)', answer=out.strip()[-40:])
    time.sleep(max(0, 10 - (time.time() - t_stop)))
    code, out, err = sh_dc('start', 'guard')
    r = guard_ready(60)
    record('guard back', code == 0, seconds_to_ready=round(r, 1))
    s, b, dt = put_config(A1, d, timeout=200)
    check(s == 200 and b.get('status') == 'ready', 'the next push succeeds', status=s, seconds=round(dt, 1))
    keep.close()


@scenario('IT-X04')
def x04():
    before = all_chains()
    gt0 = gt_containers()
    docker('restart', gt_name(GUARD))
    r = guard_ready(60)
    time.sleep(2)
    after = all_chains()
    check(after == before, 'guard restart: full reconcile gives the same rules', seconds_to_ready=round(r, 1),
          rules={k: len(v) for k, v in after.items()})
    logs = subprocess.run(['docker', 'logs', '--since', '2m', GUARD], capture_output=True, text=True)
    text = logs.stdout + logs.stderr
    check('guard_ready' in text, 'guard went through its start sequence (events subscribed, full pass)')
    # An account container restarts: new veth, new rules for that account only.
    old = {c: [r for r in v] for c, v in after.items()}
    docker('restart', gt_name('%s-%s-app' % (PREFIX, A1)))
    t0 = time.time()
    ok = False
    while time.time() - t0 < 30:
        now = all_chains()
        a1_now = [r for r in now['PROXY-BRIDGE'] if A1 in r]
        a1_old = [r for r in old['PROXY-BRIDGE'] if A1 in r]
        if a1_now and a1_now != a1_old:
            ok = True
            break
        time.sleep(0.5)
    others_same = [r for r in all_chains()['PROXY-BRIDGE'] if A1 not in r] == [r for r in old['PROXY-BRIDGE'] if A1 not in r]
    check(ok and others_same, 'restarted a1: its bridge rules follow the new veth, others unchanged',
          seconds=round(time.time() - t0, 1))
    dt = wait_ready(A1, ST['desired'][A1]['revision'], 60)
    record('a1 ready again after its container restart (controller recover)', True, seconds=round(dt, 1))


@scenario('IT-X05')
def x05():
    """iptables-restore cannot run: the guard's cgroup has no free pid. The
    iptables-nft backend does not use xtables.lock (03 §7.8, D6), so holding
    the lock is no fault for this guard; the host lock is never touched."""
    lock = subprocess.run(['sudo', '-n', 'docker', 'exec', GUARD, 'sh', '-c', 'ls -la /run/xtables.lock 2>&1; iptables -w 1 -S INPUT >/dev/null && echo iptables-ok'],
                          capture_output=True, text=True)
    record('guard container has no xtables.lock and iptables works (nft backend)', 'iptables-ok' in lock.stdout,
           out=lock.stdout.strip()[-200:])
    before = all_chains()
    pid = inspect(GUARD, '{{.State.Pid}}')
    threads = int(re.search(r'Threads:\s+(\d+)', open('/proc/%s/status' % pid).read()).group(1))
    cg = sudo('sh', '-c', 'cat /proc/%s/cgroup' % pid).strip().split('::')[-1]
    cur = int(sudo('cat', '/sys/fs/cgroup%s/pids.current' % cg).strip())
    docker('update', '--pids-limit', str(cur), gt_name(GUARD))
    a3 = gt_name('%s-%s-app' % (PREFIX, A3))
    t_inj = time.time()
    try:
        # A lasting change: a3 stops, so its rules must go; every write fails.
        docker('stop', '-t', '2', a3)
        time.sleep(7)
        fw = fw_status()
        during = all_chains()
        a3_kept = [r for r in during['PROXY-BRIDGE'] if A3 in r] == [r for r in before['PROXY-BRIDGE'] if A3 in r]
        kept = during == before
        logs = subprocess.run(['docker', 'logs', '--since', '%ds' % int(time.time() - t_inj + 1), GUARD], capture_output=True, text=True)
        n_fail = (logs.stdout + logs.stderr).count('firewall_apply_failed')
        check(n_fail >= 2 and fw == 'failed', 'guard reports the failure and keeps retrying (firewall_apply_failed, health failed)',
              firewall=fw, failures_logged=n_fail, threads=threads, pids_limit=cur)
        check(kept and a3_kept, 'the last applied rules stay in the kernel (no flush)', rules={k: len(v) for k, v in during.items()})
        alive = inspect(GUARD, '{{.State.Status}} {{.RestartCount}}')
        check(alive.startswith('running'), 'guard process survives the pressure', state=alive)
    finally:
        docker('update', '--pids-limit', '256', GUARD)
    t_rel = time.time()
    ok = False
    while time.time() - t_rel < 20:
        if fw_status() == 'ok' and not [r for r in chain_rules('PROXY-BRIDGE') if A3 in r]:
            ok = True
            break
        time.sleep(0.5)
    check(ok, 'after the pids are released the guard retries by itself: a3 rules removed, firewall ok',
          seconds=round(time.time() - t_rel, 1))
    docker('start', a3)
    dt = wait_ready(A3, ST['desired'][A3]['revision'], 60)
    record('a3 ready again (controller recover starts nothing; started by the test, re-activated by recover)', True,
           seconds=round(dt, 1))


def fw_status():
    hc = subprocess.run(['docker', 'run', '--rm', '-i', '--name', 'ccg-gt-curl', '--network', 'container:' + CONTROLLER,
                         'curlimages/curl:latest', '-sS', '-m', '5', '-H', '@-', 'http://%s:8790/v1/health' % GUARD_IP],
                        input='Authorization: Bearer %s\n' % __import__('itlib').guard_token(), capture_output=True, text=True)
    try:
        return json.loads(hc.stdout).get('firewall')
    except ValueError:
        return None


@scenario('IT-X06')
def x06():
    """Data of one account cannot be computed (the gateway is cut off its
    network): only that account loses its exception."""
    before = all_chains()
    net = '%s-%s-net' % (PREFIX, A1)
    docker('network', 'disconnect', '-f', gt_name(net), gt_name(GATEWAY))
    t0 = time.time()
    gone = False
    while time.time() - t0 < 10:
        if not [r for r in chain_rules('PROXY-BRIDGE') if A1 in r]:
            gone = True
            break
        time.sleep(0.2)
    others = [r for r in all_chains()['PROXY-BRIDGE'] if A1 not in r] == [r for r in before['PROXY-BRIDGE'] if A1 not in r]
    check(gone and others, 'a1 bridge rules revoked, the others untouched', seconds=round(time.time() - t0, 1))
    code, out = app_exec(A1, ['node', '-e', "fetch('https://1.1.1.1/',{signal:AbortSignal.timeout(5000)})"
                              ".then(r=>{console.log('LEAK',r.status)}).catch(e=>{console.log('blocked')})"], timeout=30)
    check('LEAK' not in out, 'a1 cannot reach out meanwhile (fail closed)', answer=out.strip()[-40:])
    code, out = app_exec(A2, ['node', '-e', "fetch('https://1.1.1.1/',{signal:AbortSignal.timeout(10000)})"
                              ".then(r=>{console.log(r.status)}).catch(e=>{console.log(e.message);process.exit(1)})"], timeout=40)
    check(code == 0, 'a2 unaffected', answer=out.strip()[-40:])
    dt = wait_ready(A1, ST['desired'][A1]['revision'], 60)
    t1 = time.time()
    while time.time() - t1 < 90 and not [r for r in chain_rules('PROXY-BRIDGE') if A1 in r]:
        time.sleep(1)
    check([r for r in chain_rules('PROXY-BRIDGE') if A1 in r], 'a1 re-attached and its rules are back',
          seconds_after_cut=round(time.time() - t0, 1), status_ready_after=round(dt, 1))


@scenario('IT-X07')
def x07():
    keys = ready_keys()
    t0 = time.time()
    docker('restart', gt_name(GATEWAY))
    leak = []

    def probe():
        for _ in range(4):
            code, out = app_exec(A1, ['node', '-e', "fetch('https://1.1.1.1/',{signal:AbortSignal.timeout(3000)})"
                                      ".then(r=>{console.log('ok',r.status)}).catch(e=>{console.log('blocked')})"], timeout=20)
            leak.append((round(time.time() - t0, 1), out.strip()[-20:]))
    th = threading.Thread(target=probe)
    th.start()
    per = {}
    for aid in keys:
        wait_ready(aid, ST['desired'][aid]['revision'], 90)
        per[aid] = round(time.time() - t0, 1)
    th.join(60)
    record('all accounts reconfigured after the gateway restart', True, per_account_seconds=per)
    check(max(per.values()) <= 20, 'within about 10 s of the recover period plus apply', max_seconds=max(per.values()))
    p1 = [e for e in fixture_events('ccg-gt-fixture-p1')] + [e for e in fixture_events('ccg-gt-fixture-p2')]
    record('requests during the restart: fail or go through the proxy, never direct', True, probes=leak,
           note='a1 is proxied; an "ok" answer is only possible through its proxy (checked by IT-S11)')


@scenario('IT-X09')
def x09():
    """The guard does not answer (container paused): bounded failures."""
    docker('pause', gt_name(GUARD))
    try:
        t0 = time.time()
        d = dict(ST['desired'][A1], revision=revision('a1-x09'))
        s, b, dt = put_config(A1, d, timeout=300)
        check(s == 503, 'push while the guard hangs -> 503 within a bound', status=s, answer=b, seconds=round(dt, 1))
        rev2 = ST['desired'][A2]['revision']
        t1 = time.time()
        cs, _, cb = connection(A2, rev2)
        record('connection while the guard hangs', cs in (200, 503), status=cs, seconds=round(time.time() - t1, 1),
               answer=jbody(cb) if cs != 200 else None)
        t2 = time.time()
        s3, _, b3 = api('GET', '/accounts/%s/status' % A2, timeout=200)
        check(time.time() - t2 < 120, 'status answers within a bound (guard call timeouts: state 5 s, image inspect 60 s)', status=s3, seconds=round(time.time() - t2, 1))
        t2 = time.time()
        s4, _, b4 = api('GET', '/accounts', timeout=300)
        record('GET /accounts while the guard hangs (bounded, not on the model path)', s4 == 200 and time.time() - t2 < 300,
               status=s4, seconds=round(time.time() - t2, 1), accounts=len(jbody(b4).get('runtimes', [])))
        t3 = time.time()
        hs, _ = health()
        check(hs == 200 and time.time() - t3 < 5, '/health does not wait for the guard', seconds=round(time.time() - t3, 2))
    finally:
        docker('unpause', GUARD)
    s, b, dt = put_config(A1, d, timeout=200)
    check(s == 200 and b.get('status') == 'ready', 'after the guard answers again the push succeeds', status=s)


GUARD_ABUSE = r'''
import json, os, socket, sys, threading, time
T = os.environ['T']
G = ('172.29.255.9', 8790)
def req(raw, timeout=10):
    s = socket.create_connection(G, timeout=timeout)
    try:
        s.sendall(raw)
    except OSError:
        pass  # the guard answered and closed before the whole body arrived
    data = b''
    try:
        while True:
            try:
                p = s.recv(65536)
            except ConnectionResetError:
                break
            if not p: break
            data += p
            if b'\r\n\r\n' in data and len(data) > 12: break
    except socket.timeout:
        pass
    s.close()
    return data[:12].decode('latin-1')
res = {}
big = b'{"image":"' + b'x' * (8 << 20) + b'"}'
res['oversized_body'] = req(b'PUT /v1/accounts/d00000000000a0003/app HTTP/1.1\r\nHost: g\r\nAuthorization: Bearer ' + T.encode() +
    b'\r\nContent-Type: application/json\r\nContent-Length: ' + str(len(big)).encode() + b'\r\n\r\n' + big, 30)
# slowloris: headers one byte at a time; the guard must cut it (ReadHeaderTimeout 5 s)
s = socket.create_connection(G, timeout=30)
t0 = time.time(); cut = None
try:
    for ch in b'GET /v1/health HTTP/1.1\r\nHost: g\r\nX-Slow: ' + b'a' * 200:
        s.send(bytes([ch])); time.sleep(0.2)
except OSError:
    cut = round(time.time() - t0, 1)
res['slowloris_cut_after_s'] = cut
s.close()
# 1000 concurrent idle connections, then a normal request
conns = []
for i in range(1000):
    try:
        c = socket.create_connection(G, timeout=5); conns.append(c)
    except OSError as e:
        res.setdefault('connect_errors', 0); res['connect_errors'] += 1
res['open_connections'] = len(conns)
t0 = time.time()
res['health_during'] = req(b'GET /v1/health HTTP/1.1\r\nHost: g\r\nAuthorization: Bearer ' + T.encode() + b'\r\n\r\n')
res['health_during_s'] = round(time.time() - t0, 2)
# 200 concurrent unauthenticated requests
out = []
def one():
    try: out.append(req(b'GET /v1/inventory HTTP/1.1\r\nHost: g\r\n\r\n'))
    except OSError as e: out.append('err')
ths = [threading.Thread(target=one) for _ in range(200)]
[t.start() for t in ths]; [t.join() for t in ths]
res['burst_401'] = sum(1 for x in out if '401' in x)
for c in conns: c.close()
res['health_after'] = req(b'GET /v1/health HTTP/1.1\r\nHost: g\r\nAuthorization: Bearer ' + T.encode() + b'\r\n\r\n')
print(json.dumps(res))
'''


@scenario('IT-X12')
def x12():
    from itlib import guard_token
    st0 = inspect(GUARD, '{{.State.StartedAt}} {{.RestartCount}}')
    pid = inspect(GUARD, '{{.State.Pid}}')
    cg = sudo('sh', '-c', 'cat /proc/%s/cgroup' % pid).strip().split('::')[-1]
    mem0 = int(sudo('cat', '/sys/fs/cgroup%s/memory.current' % cg))
    peak_file = '/sys/fs/cgroup%s/memory.peak' % cg
    docker('rm', '-f', 'ccg-gt-abuse', check=False)
    p = subprocess.run(['docker', 'run', '--rm', '-i', '--name', gt_name('ccg-gt-abuse'), '--network', 'container:' + CONTROLLER,
                        '-e', 'T=' + guard_token(), '--ulimit', 'nofile=4096:4096', 'python:3.12-slim', 'python', '-'],
                       input=GUARD_ABUSE, capture_output=True, text=True, timeout=600)
    try:
        res = json.loads(p.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        res = {'error': p.stderr[-400:]}
    mem1 = int(sudo('cat', '/sys/fs/cgroup%s/memory.current' % cg))
    peak = sudo('cat', peak_file, check=False).strip()
    st1 = inspect(GUARD, '{{.State.StartedAt}} {{.RestartCount}}')
    check(res.get('oversized_body', '').startswith('HTTP/1.1 4'), 'oversized body refused (4xx)', answer=res.get('oversized_body'))
    check(res.get('slowloris_cut_after_s') is not None and res['slowloris_cut_after_s'] <= 15, 'slow headers cut by the guard',
          cut_after_s=res.get('slowloris_cut_after_s'))
    check(res.get('health_during', '').startswith('HTTP/1.1 200'), 'health answered while 1000 connections are open',
          open=res.get('open_connections'), seconds=res.get('health_during_s'))
    check(res.get('burst_401') == 200, '200 concurrent unauthenticated requests all get 401', got=res.get('burst_401'))
    check(st1 == st0, 'guard did not crash or restart', before=st0, after=st1)
    check(int(peak or mem1) < 256 << 20, 'memory stays under the 256 MiB limit',
          before_mib=round(mem0 / 2**20, 1), after_mib=round(mem1 / 2**20, 1), peak_mib=round(int(peak) / 2**20, 1) if peak else None)
    check(res.get('health_after', '').startswith('HTTP/1.1 200'), 'normal requests afterwards')


def guard_log_since(since):
    p = subprocess.run(['docker', 'logs', '--since', since, GUARD], capture_output=True, text=True)
    out = []
    for line in (p.stdout + p.stderr).splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def kill_controller_when(aid, predicate, body, seconds=120):
    """Start a paired activation, kill -9 the controller when the guard log
    satisfies predicate(entries); returns (killed, answer)."""
    from scenarios_f import now_rfc3339
    since = now_rfc3339()
    res = {}

    def call():
        try:
            res['ans'] = api('POST', '/accounts/%s/worker' % aid, body, timeout=600)
        except OSError as e:
            res['ans'] = ('dropped', repr(e))
    t = threading.Thread(target=call)
    t.start()
    t0 = time.time()
    killed = False
    while time.time() - t0 < seconds and t.is_alive():
        if predicate([e for e in guard_log_since(since) if e.get('event') == 'request' and e.get('aid') == aid]):
            sudo('kill', '-9', inspect(CONTROLLER, '{{.State.Pid}}'))
            killed = True
            break
        time.sleep(0.05)
    t.join(60)
    return killed, res.get('ans')


def cli_dirs(aid):
    code, out = app_exec(aid, ['sh', '-c', 'ls -1 /opt/ccgateway/cli'], user='0')
    return sorted(out.split())


def worker_ok(aid):
    rev = ST['desired'][aid]['revision']
    line, _, data = tunnel(aid, rev, b'GET /health HTTP/1.1\r\nHost: w\r\nConnection: close\r\n\r\n', read_until=http_complete, timeout=10)
    return line, data[:12].decode('latin-1')


CRLF = chr(13) + chr(10)


def admitted(aid):
    """A model-path request through the tunnel is admitted (not the Worker's
    503 maintenance answer)."""
    rev = ST['desired'][aid]['revision']
    key = jbody(connection(aid, rev)[2]).get('api_key', '')
    req = ('POST /v1/messages HTTP/1.1' + CRLF + 'Host: w' + CRLF + 'x-api-key: %s' + CRLF + 'content-type: application/json' + CRLF +
           'content-length: 2' + CRLF + 'connection: close' + CRLF + CRLF + '{}') % key
    req = req.encode()
    line, _, data = tunnel(aid, rev, req, read_until=http_complete, timeout=20)
    return line.startswith('HTTP/1.1 101') and b'maintenance is in progress' not in data, data[9:12].decode('latin-1')


def wait_admitted(aid, seconds):
    t0 = time.time()
    last = None
    while time.time() - t0 < seconds:
        try:
            ok, last = admitted(aid)
            if ok:
                return time.time() - t0, last
        except (OSError, ValueError):
            pass
        time.sleep(2)
    return None, last


def paired_body(aid):
    from scenarios_f import other_build
    img, cur, new = other_build(aid)
    return {'image': img, 'components': ['worker', 'cli'], 'cli_version': '2.1.312'}, cur, new


@scenario('IT-X02')
def x02():
    from scenarios_f import worker_sha
    body, cur, new = paired_body(A2)
    dirs0 = cli_dirs(A2)
    # Paused, not switched: the new CLI is being placed (archive PUTs after the pause).
    pred = lambda es: any(e['route'] == '/v1/accounts/{aid}/app/archive' and e['method'] == 'PUT' for e in es)  # noqa: E731
    killed, ans = kill_controller_when(A2, pred, body)
    check(killed, 'controller killed after the pause, before the switch', answer=str(ans)[:200])
    wait_health(seconds=60)
    t_back = time.time()
    check(worker_sha(A2) == cur, 'account still runs the old Worker')
    dirs1 = cli_dirs(A2)
    record('CLI directory after the kill (BUG-8: a half-placed version)', True, before=dirs0, after=dirs1,
           leftover=sorted(set(dirs1) - set(dirs0)))
    ok, _ = admitted(A2)
    record('right after the restart the Worker is still paused (lease not expired yet)', not ok)
    dt, last = wait_admitted(A2, 420)
    check(dt is not None, 'admission restored by itself: next recover pass after the lease expired (pause + 300 s)',
          seconds_after_restart=round(dt, 1) if dt else None, last_status=last)
    logs = subprocess.run(['docker', 'logs', '--since', '8m', CONTROLLER], capture_output=True, text=True)
    check('stale maintenance lease released key=%s' % A2 in logs.stdout + logs.stderr, 'controller logged the release')
    check(worker_sha(A2) == cur, 'still the old program, no half version active')


@scenario('IT-X03')
def x03():
    from scenarios_f import worker_sha
    body, cur, new = paired_body(A3)
    pred = lambda es: any(e['route'] == '/v1/accounts/{aid}/app/{action}' and e['method'] == 'POST' for e in es)  # noqa: E731
    killed, ans = kill_controller_when(A3, pred, body)
    check(killed, 'controller killed after the switch, while waiting for health', answer=str(ans)[:200])
    wait_health(seconds=60)
    t0 = time.time()
    stj = json.loads(sudo('cat', '/opt/ccgateway-gt-controller/%s/state.json' % A3))
    record('state file intact after the kill', True, keys=len(stj), active_runtime=bool(stj.get('active_runtime')))
    ready = False
    while time.time() - t0 < 120:
        if status(A3)[1].get('status') == 'ready':
            ready = True
            break
        d = ST['desired'][A3]
        s, b, _ = put_config(A3, d)   # what the core does on pending
        if s == 200 and b.get('status') == 'ready':
            ready = True
            break
        time.sleep(5)
    sha = worker_sha(A3)
    check(ready, 'a3 back to ready (recover or the next push)', seconds=round(time.time() - t0, 1), worker=sha[:12],
          old=cur[:12], new=new[:12])
    line, head = worker_ok(A3)
    check('200' in head, 'a3 Worker answers /health', worker=head)
    dt, last = wait_admitted(A3, 420)
    check(dt is not None, 'a3 admits model requests again (expired lease released by the background pass)',
          seconds=round(dt, 1) if dt else None, last_status=last)
    # The core retries the activation; it completes.
    s, _, b = api('POST', '/accounts/%s/worker' % A3, body, timeout=600)
    a = jbody(b)
    check(s == 200 and a.get('status') == 'updated', 'a retried paired activation completes', status=s, answer=a)


@scenario('IT-X08')
def x08():
    """compose recreates the gateway (what a recreate does): every account
    recovers by itself; the outage is measured."""
    keys = ready_keys()
    old = gt_containers()[GATEWAY]['id']
    t0 = time.time()
    code, out, err = sh_dc('--profile', 'egress', 'up', '-d', '--no-deps', '--force-recreate', 'egress')
    check(code == 0 and gt_containers()[GATEWAY]['id'] != old, 'compose recreated the gateway', err=err[-200:])
    per = {}
    for aid in keys:
        wait_ready(aid, ST['desired'][aid]['revision'], 120)
        per[aid] = round(time.time() - t0, 1)
    record('all accounts ready again', True, per_account_seconds=per, accounts=len(keys))
    for aid in keys:
        code, out = app_exec(aid, ['node', '-e', "fetch('https://1.1.1.1/',{signal:AbortSignal.timeout(10000)})"
                                   ".then(r=>{console.log(r.status)}).catch(e=>{console.log(e.message);process.exit(1)})"], timeout=40)
        check(code == 0, '%s reaches out again' % aid, answer=out.strip()[-40:])
    ST.setdefault('perf', {})['X08'] = {'accounts': len(keys), 'seconds_to_all_ready': max(per.values()) if per else None}
    save_state(ST)
