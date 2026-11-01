"""IT-P: performance (05 §4.5)."""
import json
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
