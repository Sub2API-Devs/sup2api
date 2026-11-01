#!/usr/bin/env python3
"""Library of the L7 system-integration driver for the ccgateway guard + Go controller
(next/docs/ccgateway-guard/05-test-plan.md §4), run on ovh against the
isolated instance of 04 §7 (prefix ccg-gt, controller on 127.0.0.1:28787).

Usage: python3 ccg_it.py IT-M01 [IT-M02 ...]   (one or more scenario ids)
       python3 ccg_it.py list

Only synthetic draft keys d00000000000a0001..a0003 are used; no real account
credential is read or copied. Every docker object the driver creates is named
ccg-gt-*; every name passes gt_name() before a docker call that changes it.
Results are appended to $GT_WORK/results.jsonl (one JSON object per check).
"""
import base64
import hashlib
import http.client
import json
import os
import re
import socket
import subprocess
import sys
import time

WORK = os.environ.get('GT_WORK', os.path.expanduser('~/ccg-gt-l7'))
STATE_FILE = os.path.join(WORK, 'it-state.json')
RESULTS = os.path.join(WORK, 'results.jsonl')
PREFIX = 'ccg-gt'
PORT = 28787
ROOT = '/opt/ccgateway-gt-runtime'
DATA = '/opt/ccgateway-gt-controller'
GT_DIR = '/opt/ccgateway-gt'
ENVF = '/opt/ccgateway-gt-runtime.env'
CHAIN = 'CCG-GT'
GUARD_IP = '172.29.255.9'
CTL_IP = '172.29.255.10'
UPLINK = 'ccg-gt-d0000000000000000-xray-uplink'
GATEWAY = 'ccg-gt-shared-egress'
CONTROLLER = 'ccg-gt-controller'
A1, A2, A3 = 'd00000000000a0001', 'd00000000000a0002', 'd00000000000a0003'
APP_118, APP_117 = 'ccgateway-app:0.1.118', 'ccgateway-app:0.1.117'
CLI_VERSION = '2.1.312'
FIXTURE_SRC = os.path.join(WORK, 'src/next/plugins/ccgateway/companions/controller/shared_proxy_fixture.py')
POOL = {'pool': '10.0.0.0/8', 'allocation': 'random'}
FAKE_AUTH = {'mode': 'api_key', 'api_key': 'gt-fake-key-not-a-secret', 'base_url': 'https://198.18.0.10'}

SCENARIOS = {}


def scenario(sid):
    def wrap(fn):
        SCENARIOS[sid] = fn
        return fn
    return wrap


# ---------------------------------------------------------------- state, results

def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_state(st):
    tmp = STATE_FILE + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(st, f, indent=1, sort_keys=True)
    os.replace(tmp, STATE_FILE)


ST = load_state()
CURRENT = {'id': None}


def record(check, ok, **details):
    entry = {'ts': time.strftime('%Y-%m-%dT%H:%M:%S'), 'scenario': CURRENT['id'], 'check': check,
             'result': 'pass' if ok is True else ('skip' if ok is None else 'fail'), **details}
    with open(RESULTS, 'a') as f:
        f.write(json.dumps(entry, sort_keys=True) + '\n')
    print(json.dumps(entry, sort_keys=True), flush=True)
    return ok


class Fail(Exception):
    pass


def check(cond, check_name, **details):
    record(check_name, bool(cond), **details)
    if not cond:
        raise Fail(check_name)


# ---------------------------------------------------------------- shell, docker

def sh(cmd, check=True, timeout=600, input=None):
    """Run a command list; returns (code, stdout). Never logs secrets."""
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, input=input)
    if check and p.returncode != 0:
        raise RuntimeError('command failed (%d): %s: %s' % (p.returncode, ' '.join(cmd[:4]), p.stderr[-400:]))
    return p.returncode, p.stdout


def gt_name(name):
    if not (name.startswith('ccg-gt-') or name.startswith('ccgateway-gt')):
        raise SystemExit('SAFETY: refusing to touch ' + name)
    return name


def docker(*args, check=True, timeout=600):
    return sh(['docker', *args], check=check, timeout=timeout)[1]


def inspect(name, fmt=None, kind='container'):
    args = ['inspect', '--type', kind]
    if fmt:
        args += ['--format', fmt]
    code, out = sh(['docker', *args, name], check=False)
    if code != 0:
        return None
    return out.strip() if fmt else json.loads(out)[0]


def sudo(*args, check=True, input=None, timeout=600):
    return sh(['sudo', '-n', *args], check=check, input=input, timeout=timeout)[1]


def gt_containers():
    out = docker('ps', '-a', '--no-trunc', '--filter', 'name=^ccg-gt-',
                 '--format', '{{.ID}} {{.Names}}')
    res = {}
    for line in out.splitlines():
        cid, name = line.split()
        res[name] = {'id': cid, 'started': inspect(name, '{{.State.StartedAt}}'),
                     'status': inspect(name, '{{.State.Status}}')}
    return res


def account_containers():
    return {k: v for k, v in gt_containers().items() if re.fullmatch(r'ccg-gt-d[0-9a-f]{16}-app', k)}


def iptables_chain(chain):
    code, out = sh(['sudo', '-n', 'iptables', '-w', '5', '-S', chain], check=False)
    return out.splitlines() if code == 0 else None


def chain_rules(suffix):
    lines = iptables_chain(CHAIN + '-' + suffix) or []
    return [l for l in lines if l.startswith('-A ')]


def env_value(path, name):
    for line in sudo('cat', path).splitlines():
        if line.startswith(name + '='):
            return line.split('=', 1)[1]
    return None


def controller_key():
    if 'key' not in ST:
        ST['key'] = env_value(ENVF, 'CCG_CONTROLLER_KEY')
    return ST['key']


def guard_token():
    return env_value(GT_DIR + '/.env', 'CCG_GUARD_TOKEN')


# ---------------------------------------------------------------- controller API

def api(method, path, body=None, headers=None, timeout=300, raw=False, key=None):
    """One request to the isolated controller; returns (status, headers, body)."""
    conn = http.client.HTTPConnection('127.0.0.1', PORT, timeout=timeout)
    h = {'Authorization': 'Bearer ' + (key if key is not None else controller_key())}
    if body is not None and not raw:
        body = json.dumps(body).encode()
        h['Content-Type'] = 'application/json'
    h.update(headers or {})
    try:
        conn.request(method, path, body=body, headers=h)
        r = conn.getresponse()
        data = r.read()
        return r.status, dict((k.lower(), v) for k, v in r.getheaders()), data
    finally:
        conn.close()


def jbody(data):
    try:
        return json.loads(data)
    except ValueError:
        return {'_raw': data[:300].decode('utf-8', 'replace')}


def health():
    s, _, b = api('GET', '/health', timeout=10)
    return s, jbody(b)


def wait_health(want_feature=None, want_image=None, seconds=90):
    end = time.time() + seconds
    last = None
    while time.time() < end:
        try:
            s, b = health()
            last = (s, b)
            if s == 200 and (want_feature is None or want_feature in b.get('features', [])) \
                    and (want_image is None or b.get('controller_image') == want_image):
                return b
        except OSError as e:
            last = repr(e)
        time.sleep(1)
    raise Fail('controller not healthy: %r' % (last,))


def revision(tag):
    return hashlib.sha256(('gt-' + tag).encode()).hexdigest()


def desired_for(aid, rev_tag, proxy=None, direct=False, enabled=True, network=None, auth=None, cli=None):
    d = {'revision': revision(rev_tag), 'direct': direct, 'enabled': enabled, 'auth': auth or FAKE_AUTH,
         'network': network or POOL}
    if proxy is not None:
        d['proxy'] = proxy
    if cli is not None:
        d['cli'] = cli
    return d


def put_config(aid, desired, timeout=300):
    t = time.time()
    s, _, b = api('PUT', '/accounts/%s/config' % aid, desired, timeout=timeout)
    ST.setdefault('desired', {})[aid] = desired
    save_state(ST)
    return s, jbody(b), time.time() - t


def status(aid):
    s, _, b = api('GET', '/accounts/%s/status' % aid, timeout=30)
    return s, jbody(b)


def connection(aid, rev):
    return api('GET', '/accounts/%s/connection' % aid, headers={'X-CCG-Revision': rev}, timeout=30)


def wait_ready(aid, rev, seconds=60):
    end = time.time() + seconds
    t0 = time.time()
    last = None
    while time.time() < end:
        try:
            s, b = status(aid)
            last = b
            if s == 200 and b.get('status') == 'ready' and b.get('revision') == rev:
                return time.time() - t0
        except OSError as e:
            last = repr(e)
        time.sleep(0.5)
    raise Fail('%s not ready at %s: %r' % (aid, rev[:8], last))


def tunnel(aid, rev, payload=b'', read_until=None, timeout=30):
    """Open the byte tunnel; send payload; return (status line, first byte delay, bytes)."""
    s = socket.create_connection(('127.0.0.1', PORT), timeout=timeout)
    try:
        req = ('GET /accounts/%s/tunnel HTTP/1.1\r\nHost: controller\r\nAuthorization: Bearer %s\r\n'
               'Upgrade: ccg-tunnel\r\nConnection: Upgrade\r\nX-CCG-Revision: %s\r\n\r\n' % (aid, controller_key(), rev))
        t0 = time.time()
        s.sendall(req.encode() + payload)
        buf = b''
        while b'\r\n\r\n' not in buf:
            part = s.recv(65536)
            if not part:
                break
            buf += part
        head, _, rest = buf.partition(b'\r\n\r\n')
        line = head.split(b'\r\n', 1)[0].decode('latin-1')
        if not line.startswith('HTTP/1.1 101'):
            return line, None, rest
        first = None
        data = rest
        if data:
            first = time.time() - t0
        deadline = time.time() + timeout
        while time.time() < deadline:
            if read_until and read_until(data):
                break
            try:
                part = s.recv(65536)
            except socket.timeout:
                break
            if not part:
                break
            if first is None:
                first = time.time() - t0
            data += part
        return line, first, data
    finally:
        s.close()


def worker_health_request():
    return b'GET /health HTTP/1.1\r\nHost: worker\r\nConnection: close\r\n\r\n'


def http_complete(data):
    head, sep, body = data.partition(b'\r\n\r\n')
    if not sep:
        return False
    m = re.search(rb'(?i)content-length:\s*(\d+)', head)
    return bool(m) and len(body) >= int(m.group(1))


# ---------------------------------------------------------------- fixtures

def fixture_dir(name):
    return os.path.join(WORK, 'fixtures', name)


def start_fixture(name):
    """shared_proxy_fixture.py in a python:3.12-slim container on the uplink."""
    gt_name(name)
    d = fixture_dir(name)
    os.makedirs(d, exist_ok=True)
    os.chmod(d, 0o777)
    if not os.path.exists(os.path.join(d, 'cert.pem')):
        sh(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=198.18.0.10',
            '-addext', 'subjectAltName=IP:198.18.0.10,DNS:proxy.gt.test', '-keyout', os.path.join(d, 'key.pem'),
            '-out', os.path.join(d, 'cert.pem')])
        os.chmod(os.path.join(d, 'key.pem'), 0o644)
    if inspect(name, '{{.State.Status}}') == 'running':
        return fixture_ip(name)
    docker('rm', '-f', name, check=False)
    docker('run', '-d', '--name', name, '--network', UPLINK, '--cap-drop', 'ALL', '--memory', '128m',
           '--pids-limit', '80', '-v', d + ':/fixture', '-v', FIXTURE_SRC + ':/tests/shared_proxy_fixture.py:ro',
           'python:3.12-slim', 'python', '-u', '/tests/shared_proxy_fixture.py')
    time.sleep(1)
    return fixture_ip(name)


def fixture_ip(name):
    return inspect(name, '{{(index .NetworkSettings.Networks "%s").IPAddress}}' % UPLINK)


def fixture_events(name):
    try:
        with open(os.path.join(fixture_dir(name), 'events.jsonl')) as f:
            return [json.loads(l) for l in f if l.strip()]
    except FileNotFoundError:
        return []


def proxy_for(name, protocol='http', host=None, password='test-only-password'):
    return {'protocol': protocol, 'host': host or ST['fixtures'][name], 'port': 35081 if protocol == 'http' else 35083,
            'username': 'fixture', 'password': password}


def app_exec(aid, cmd, user='1000:1000', env=None, check=False, timeout=120):
    args = ['exec', '-u', user]
    for k, v in (env or {}).items():
        args += ['-e', '%s=%s' % (k, v)]
    name = gt_name('%s-%s-app' % (PREFIX, aid))
    code, out = sh(['docker', *args, name, *cmd], check=check, timeout=timeout)
    return code, out


def egress_stream_via(aid):
    """Inside the account container: an HTTPS SSE stream from the fake upstream
    (198.18.0.10 behind the proxy fixture), trusting only the fixture CA."""
    cert = open(os.path.join(fixture_dir('ccg-gt-fixture-p1'), 'cert.pem'), 'rb').read()
    name = gt_name('%s-%s-app' % (PREFIX, aid))
    sh(['docker', 'exec', '-i', '-u', '1000:1000', name, 'sh', '-c', 'cat > /tmp/gt-fixture.crt'], input=cert.decode())
    script = ("(async()=>{let r=await fetch('https://198.18.0.10/stream');let t=await r.text();"
              "let es=t.split('\\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));"
              "console.log(JSON.stringify({status:r.status,count:es.length,via:[...new Set(es.map(e=>e.via))]}))})()"
              ".catch(e=>{console.log(JSON.stringify({error:String(e.message)}));process.exit(1)})")
    code, out = app_exec(aid, ['node', '-e', script], env={'NODE_EXTRA_CA_CERTS': '/tmp/gt-fixture.crt'}, timeout=60)
    try:
        return json.loads(out.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return {'error': 'exit %d' % code, 'out': out[-200:]}


def app_connect(aid, host, port, seconds=4):
    """TCP connect from the account container (1000:1000); True if it connects."""
    script = ("const n=require('net');let s=n.connect(%d,'%s');s.setTimeout(%d,()=>process.exit(2));"
              "s.on('connect',()=>process.exit(0));s.on('error',()=>process.exit(1));") % (port, host, seconds * 1000)
    code, _ = app_exec(aid, ['node', '-e', script], timeout=seconds + 20)
    return code == 0


def ctl_curl(args, name='ccg-gt-curl', network=None, timeout=60):
    """curl from a throwaway container in the controller's network namespace
    (04 §6.3), or on the given network."""
    gt_name(name)
    docker('rm', '-f', name, check=False)
    net = network or ('container:' + CONTROLLER)
    code, out = sh(['docker', 'run', '--rm', '--name', name, '--network', net, 'curlimages/curl:latest',
                    '-sS', '-o', '/dev/stdout', '-w', '\n%{http_code}', *args], check=False, timeout=timeout)
    lines = out.rstrip('\n').rsplit('\n', 1)
    code_str = lines[-1] if lines else ''
    return code, code_str, lines[0] if len(lines) == 2 else ''


# ---------------------------------------------------------------- snapshots

def file_hashes(base):
    out = sudo('sh', '-c', 'cd %s && find . -xdev \\( -type f -o -type l \\) -print0 | sort -z | '
               'xargs -0r sha256sum' % base)
    res = {}
    for line in out.splitlines():
        h, p = line.split('  ', 1)
        res[p[2:]] = h
    return res


def snapshot(tag):
    snap = {'files': file_hashes(ROOT), 'containers': gt_containers(),
            'bridge': chain_rules('PROXY-BRIDGE'), 'ts': time.time()}
    if sh(['sudo', '-n', 'test', '-d', DATA], check=False)[0] == 0:
        snap['data_files'] = file_hashes(DATA)
    ST.setdefault('snapshots', {})[tag] = snap
    save_state(ST)
    with open(os.path.join(WORK, 'snapshot-%s.json' % tag), 'w') as f:
        json.dump(snap, f, indent=1, sort_keys=True)
    return snap
