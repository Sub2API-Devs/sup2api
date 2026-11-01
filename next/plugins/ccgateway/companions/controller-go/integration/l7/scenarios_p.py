"""IT-P: performance (05 §4.5)."""
import calendar
import json
import re
import os
import statistics
import subprocess
import threading
import time

from itlib import (A1, A2, A3, CHAIN, GATEWAY, ST, WORK, account_containers, api, chain_rules, check, connection,
                   desired_for, docker, gt_containers, gt_name, http_complete, inspect, put_config, record,
                   save_state, scenario, sh, status, sudo, tunnel, wait_ready, worker_health_request)


def pct(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    k = min(len(xs) - 1, max(0, int(round(p / 100.0 * (len(xs) - 1)))))
    return xs[k]


def summary(xs):
    return {'n': len(xs), 'p50_ms': round(pct(xs, 50) * 1000, 2), 'p95_ms': round(pct(xs, 95) * 1000, 2),
            'mean_ms': round(statistics.mean(xs) * 1000, 2)}


def measure_ready(label):
    rev = ST['desired'][A1]['revision']
    conn, tun = [], []
    for _ in range(200):
        t = time.perf_counter()
        s, _, _ = connection(A1, rev)
        conn.append(time.perf_counter() - t)
        if s != 200:
            raise RuntimeError('connection %d' % s)
    for _ in range(200):
        t = time.perf_counter()
        line, _, _ = tunnel(A1, rev, b'', timeout=5, read_until=lambda d: True)
        tun.append(time.perf_counter() - t)
        if not line.startswith('HTTP/1.1 101'):
            raise RuntimeError(line)
    res = {'connection': summary(conn), 'tunnel_101': summary(tun)}
    ST.setdefault('perf', {}).setdefault(label, {})['P01'] = res
    save_state(ST)
    return res


def measure_ttfb(label):
    rev = ST['desired'][A1]['revision']
    first = []
    for _ in range(100):
        line, f, data = tunnel(A1, rev, worker_health_request(), read_until=http_complete, timeout=10)
        if not line.startswith('HTTP/1.1 101') or f is None or b' 200 ' not in data[:20]:
            raise RuntimeError('tunnel request failed: %s' % line)
        first.append(f)
    res = {'tunnel_first_byte': summary(first)}
    ST.setdefault('perf', {}).setdefault(label, {})['P02'] = res
    save_state(ST)
    return res


@scenario('IT-P01-python')
def p01_python():
    record('python readiness (200 connection, 200 tunnels)', True, **measure_ready('python'))


@scenario('IT-P02-python')
def p02_python():
    record('python first byte through the tunnel (100 Worker requests)', True, **measure_ttfb('python'))


@scenario('IT-P01')
def p01():
    go = measure_ready('go')
    py = ST['perf']['python']['P01']
    for k in ('connection', 'tunnel_101'):
        ok = go[k]['p50_ms'] <= py[k]['p50_ms'] and go[k]['p95_ms'] <= py[k]['p95_ms'] + 10
        record('readiness %s: Go p50 <= Python p50, p95 <= Python p95 + 10 ms' % k, ok, go=go[k], python=py[k])


@scenario('IT-P02')
def p02():
    go = measure_ttfb('go')['tunnel_first_byte']
    py = ST['perf']['python']['P02']['tunnel_first_byte']
    ok = go['p50_ms'] <= py['p50_ms'] * 1.05 or go['p50_ms'] - py['p50_ms'] < 1.0
    record('first byte: Go within 5% of Python (p50)', ok, go=go, python=py)


def cgroup_of(name):
    pid = inspect(name, '{{.State.Pid}}')
    return '/sys/fs/cgroup' + sudo('cat', '/proc/%s/cgroup' % pid).strip().split('::')[-1]


def cg_read(cg, f):
    return sudo('cat', '%s/%s' % (cg, f)).strip()


@scenario('IT-P03')
def p03():
    """3 accounts (the only synthetic keys allowed) x 10 concurrent tunnels for
    5 minutes; each tunnel sends Worker requests until it is recycled."""
    keys = [k for k in (A1, A2, A3) if k in ST.get('desired', {}) and status(k)[1].get('status') == 'ready']
    cg = cgroup_of('ccg-gt-controller')
    mem = [int(cg_read(cg, 'memory.current'))]
    stop = time.time() + 300
    errors, done = [], [0]
    lock = threading.Lock()
    from scenarios_x import Tunnel

    def worker(aid):
        while time.time() < stop:
            try:
                t = Tunnel(aid)
                if not t.status.startswith('HTTP/1.1 101'):
                    raise RuntimeError(t.status)
                # A paced client: 10 requests a second per tunnel, a new
                # tunnel every 20 s (a first run that reopened a tunnel every
                # 20 back-to-back requests opened ~1400 TCP connections a
                # second and ran the controller out of ephemeral ports).
                for _ in range(200):
                    if time.time() >= stop:
                        break
                    if '200' not in t.health():
                        raise RuntimeError('worker answer')
                    with lock:
                        done[0] += 1
                    time.sleep(0.1)
                t.close()
            except Exception as e:  # noqa: BLE001 - counted
                with lock:
                    errors.append('%s %s' % (aid, repr(e)[:80]))
                time.sleep(0.5)
    ths = [threading.Thread(target=worker, args=(k,)) for k in keys for _ in range(10)]
    [t.start() for t in ths]
    while time.time() < stop:
        time.sleep(15)
        mem.append(int(cg_read(cg, 'memory.current')))
    [t.join(60) for t in ths]
    mib = [round(m / 2**20, 1) for m in mem]
    ST.setdefault('perf', {})['P03'] = {'accounts': len(keys), 'tunnels': len(ths), 'requests': done[0],
                                       'errors': len(errors), 'memory_mib': mib}
    save_state(ST)
    check(not errors, 'no errors in 5 minutes', accounts=len(keys), tunnels=len(ths), requests=done[0],
          errors=errors[:5])
    check(max(mib[len(mib) // 2:]) <= max(mib[:len(mib) // 2]) * 1.2 + 5, 'controller memory stable', memory_mib=mib)


@scenario('IT-P04')
def p04():
    g, c = cgroup_of('ccg-gt-guard'), cgroup_of('ccg-gt-controller')
    use = lambda cg: int(re.search(r'usage_usec (\d+)', cg_read(cg, 'cpu.stat')).group(1))  # noqa: E731
    g0, c0, t0 = use(g), use(c), time.time()
    time.sleep(600)
    g1, c1, t1 = use(g), use(c), time.time()
    gp = (g1 - g0) / 1e6 / (t1 - t0) * 100
    cp = (c1 - c0) / 1e6 / (t1 - t0) * 100
    ST.setdefault('perf', {})['P04'] = {'guard_cpu_percent_of_one_core': round(gp, 3),
                                       'controller_cpu_percent_of_one_core': round(cp, 3), 'seconds': round(t1 - t0)}
    save_state(ST)
    check(gp < 2.0, 'guard CPU while idle < 2% of one core', guard_percent=round(gp, 3), controller_percent=round(cp, 3),
          seconds=round(t1 - t0))


def core_reconcile(aid, seconds):
    """What the core does for a runtime that is not ready at its revision:
    push the same desired configuration again (every 10 s here)."""
    t0 = time.time()
    while time.time() - t0 < seconds:
        st = status(aid)[1]
        if st.get('status') == 'ready' and st.get('revision') == ST['desired'][aid]['revision']:
            return round(time.time() - t0, 1)
        time.sleep(5)
        st = status(aid)[1]
        if st.get('status') != 'ready':
            put_config(aid, ST['desired'][aid])
    raise RuntimeError('%s not ready after %d s' % (aid, seconds))


@scenario('IT-P05')
def p05():
    keys = [k for k in (A1, A2, A3) if k in ST.get('desired', {})]
    names_ = [gt_name('%s-%s-app' % ('ccg-gt', k)) for k in keys]
    since = time.time()
    # Docker's event history on a busy host does not keep the window (L7
    # 2026-11-01: 3 of 40 events came back), so the events are streamed live.
    stream = subprocess.Popen(['docker', 'events', '--filter', 'type=container',
                               '--format', '{{.TimeNano}} {{.Action}} {{.Actor.Attributes.name}}'],
                              stdout=subprocess.PIPE, text=True)
    n = 0
    t0 = time.time()
    while n < 20 and time.time() - t0 < 30:
        name = names_[n % len(names_)]
        subprocess.run(['docker', 'restart', '-t', '1', name], capture_output=True, timeout=60)
        n += 1
    last = time.time()
    time.sleep(15)
    stream.terminate()
    out, _ = stream.communicate(timeout=10)
    events = [l.split() for l in out.splitlines()
              if 'ccg-gt-d' in l and len(l.split()) == 3 and l.split()[1] in ('start', 'die')]
    last_ev = max(int(e[0]) for e in events) / 1e9 if events else last
    logs = subprocess.run(['docker', 'logs', '--since', str(int(since) - 1), 'ccg-gt-guard'], capture_output=True, text=True)
    writes = []
    for line in (logs.stdout + logs.stderr).splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('event') == 'chain_written':
            ts = e['ts']
            sec = calendar.timegm(time.strptime(ts[:19], '%Y-%m-%dT%H:%M:%S')) + float('0.' + ts[20:-1].ljust(9, '0')[:9])
            writes.append((round(sec, 2), e.get('chain')))
    restores = sorted({w[0] for w in writes})  # one restore may write several chains
    restores = [w for w in restores if w >= since]
    after = [w for w in restores if w >= last_ev]
    first_after = (after[0] - last_ev) if after else None
    res = {'restarts': n, 'burst_seconds': round(last - t0, 1), 'container_events': len(events),
           'restores': len(restores), 'first_write_after_last_event_s': round(first_after, 3) if first_after is not None else None}
    ST.setdefault('perf', {})['P05'] = res
    save_state(ST)
    check(first_after is not None and first_after <= 1.0, 'rules rewritten within 1 s of the last event', **res)
    check(len(restores) < len(events), 'debounce: fewer iptables-restore runs than events', **res)
    per = {}
    for k in keys:
        per[k] = core_reconcile(k, 90)
    record('all accounts ready again after the burst', True, seconds=per)
