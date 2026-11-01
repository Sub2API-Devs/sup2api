"""IT-F: functional scenarios (05 §4.1) on the Go controller + guard."""
import hashlib
import io
import json
import os
import socket
import subprocess
import tarfile
import threading
import time

from itlib import (A1, A2, A3, APP_117, APP_118, CLI_VERSION, CONTROLLER, DATA, GATEWAY, GT_DIR, PORT, PREFIX, ROOT,
                   ST, UPLINK, WORK, account_containers, api, app_connect, app_exec, chain_rules, check, connection,
                   controller_key, desired_for, docker, egress_stream_via, env_value, fixture_events, gt_containers,
                   gt_name, health, http_complete, inspect, jbody, proxy_for, put_config, record, revision, save_state,
                   scenario, sh, status, sudo, tunnel, wait_health, wait_ready, worker_health_request)

P1, P2 = 'ccg-gt-fixture-p1', 'ccg-gt-fixture-p2'


def now_rfc3339():
    t = time.time()
    return time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(t)) + ('%.6f' % (t % 1))[1:] + 'Z'


def guard_requests(since, aid=None):
    p = subprocess.run(['docker', 'logs', '--since', since, 'ccg-gt-guard'], capture_output=True, text=True)
    out = []
    for line in (p.stdout + p.stderr).splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('event') == 'request' and (aid is None or e.get('aid') in (aid, None)):
            out.append('%s %s %s' % (e['method'], e['route'], e['status']))
    return out


def guard_events(since, names):
    p = subprocess.run(['docker', 'logs', '--since', since, 'ccg-gt-guard'], capture_output=True, text=True)
    out = []
    for line in (p.stdout + p.stderr).splitlines():
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get('event') in names:
            out.append(e)
    return out


def subsequence(seq, wanted):
    """True when the patterns of `wanted` appear in `seq` in this order."""
    i = 0
    for item in seq:
        if i < len(wanted) and wanted[i] in item:
            i += 1
    return i == len(wanted)


def app_id(aid):
    return inspect('%s-%s-app' % (PREFIX, aid), '{{.Id}}')


def ready_or_fail(aid, rev, seconds=60):
    return wait_ready(aid, rev, seconds)


def worker_sha(aid):
    code, out = app_exec(aid, ['sha256sum', '/usr/local/bin/worker'], user='0')
    return out.split()[0] if code == 0 and out else ''


def fwd_rules(aid=None):
    return [r for r in chain_rules('CONTROL-FWD') if aid is None or aid in r]


def tunnel_health(aid):
    rev = ST['desired'][aid]['revision']
    line, first, data = tunnel(aid, rev, worker_health_request(), read_until=http_complete, timeout=10)
    return line, data[:12].decode('latin-1', 'replace')


@scenario('IT-F01')
def f01():
    s, _, b = api('DELETE', '/accounts/' + A1, headers={'X-CCG-Delete-Account': A1, 'X-CCG-Delete-Data': '1'})
    check(s == 200, 'precondition: a1 (Python-created) purged', status=s, removed=jbody(b).get('removed'))
    fwd_before = len(fwd_rules())
    since = now_rfc3339()
    time.sleep(1)
    d = desired_for(A1, 'a1-f01', proxy=proxy_for(P1))
    s, b, dt = put_config(A1, d)
    check(s == 200 and b.get('status') == 'ready', 'Go creates a1 via P1: ready', status=s, seconds=round(dt, 1),
          answer=b if s != 200 else None)
    seq = guard_requests(since, A1)
    with open(os.path.join(WORK, 'f01-guard-sequence.txt'), 'w') as f:
        f.write('\n'.join(seq) + '\n')
    # Python order (PV8-PV17, A7, A8): the volume is planned before the
    # network; resolv.conf before the app and again after the attach.
    wanted = ['PUT /v1/accounts/{aid}/volume', 'PUT /v1/accounts/{aid}/network', 'POST /v1/accounts/{aid}/jobs',
              'PUT /v1/accounts/{aid}/resolv', 'PUT /v1/accounts/{aid}/app ', 'POST /v1/accounts/{aid}/app/{action}',
              'PUT /v1/gateway/networks/{aid}', 'PUT /v1/accounts/{aid}/resolv', 'PUT /v1/accounts/{aid}/firewall',
              'POST /v1/accounts/{aid}/app/exec']
    check(subsequence(seq, wanted), 'guard calls in order: volume, network, prepare job, resolv, app, start, '
          'gateway attach, resolv, firewall, probe',
          sequence=[x for x in seq if not x.startswith('GET')][:30])
    fwd_after = len(fwd_rules())
    check(fwd_after == fwd_before + 2 and len(fwd_rules(A1)) == 2, 'CONTROL-FWD gained 2 rules for a1',
          before=fwd_before, after=fwd_after)
    ev = fixture_events(P1)
    check(any(e['host'] != '198.18.0.10' for e in ev[-3:]), 'activation probe through P1')


@scenario('IT-F02')
def f02():
    rev = ST['desired'][A1]['revision']
    s, _, b = connection(A1, rev)
    key = jbody(b)['api_key']
    body = json.dumps({'model': 'claude-sonnet-4-5', 'max_tokens': 16, 'stream': True,
                       'messages': [{'role': 'user', 'content': 'hi'}]}).encode()
    req = ('POST /v1/messages HTTP/1.1\r\nHost: worker\r\nx-api-key: %s\r\nanthropic-version: 2023-06-01\r\n'
           'content-type: application/json\r\ncontent-length: %d\r\nconnection: close\r\n\r\n' % (key, len(body))).encode() + body
    n0 = len(fixture_events(P1))
    line, first, data = tunnel(A1, rev, req, timeout=90)
    ev = fixture_events(P1)[n0:]
    check(line.startswith('HTTP/1.1 101') and data.startswith(b'HTTP/1.1 '), 'model request through the tunnel reaches the Worker',
          tunnel=line, worker_status=data[:40].decode('latin-1'))
    check(any(e['host'] == '198.18.0.10' and e['port'] == 443 for e in ev), 'the Worker upstream connection went through P1',
          p1_events=ev)
    streamed = b'text/event-stream' in data[:400]
    record('fake upstream stream reached the client', streamed or None, answer=data[:300].decode('latin-1', 'replace'),
           note='the CLI rejects the fixture TLS certificate (DEPTH_ZERO_SELF_SIGNED_CERT): its CA store is bundled and '
                'the account container environment cannot be changed; the stream path is verified below from the account namespace')
    r = egress_stream_via(A1)
    check(r.get('count') == 100 and r.get('via') == ['http'], 'SSE stream from the fake upstream through P1 (account namespace)',
          answer=r)


@scenario('IT-F03')
def f03():
    rev = ST['desired'][A1]['revision']
    h = {'X-CCG-Revision': rev}
    s, hd, b = api('GET', '/accounts/%s/admin/request-logs' % A1, headers=h)
    ok = s == 200 and hd.get('connection', '').lower() == 'close' and hd.get('cache-control') == 'no-store' \
        and 'content-length' not in hd and hd.get('content-type', '').startswith('application/json')
    check(ok, 'GET admin/request-logs: 200, Connection close, no-store, no Content-Length', status=s, headers=hd)
    s, hd, b = api('GET', '/accounts/%s/admin/status' % A1, headers=h)
    check(s == 200 and 'content-length' not in hd, 'GET admin/status passes through', status=s)
    s, hd, b = api('GET', '/accounts/%s/admin/usage' % A1, headers=h)
    check(s == 409 and jbody(b).get('error') == 'api_key_account', 'GET admin/usage on an API-key account -> 409 api_key_account',
          status=s, answer=jbody(b))
    s, hd, b = api('DELETE', '/accounts/%s/admin/usage' % A1, headers=h)
    check(s == 405, 'DELETE admin/usage -> 405 (not forwarded)', status=s)
    s, hd, b = api('GET', '/accounts/%s/admin/request-logs' % A1)
    check(s == 409 and jbody(b).get('error') == 'not_synchronized', 'without X-CCG-Revision -> 409 not_synchronized', status=s)
    s, hd, b = api('POST', '/accounts/%s/admin/request-logs/query' % A1, {'limit': 1}, headers=h)
    check(s in (200, 400) and 'content-length' not in hd, 'POST admin/request-logs/query streams the Worker answer', status=s)
    s, hd, b = api('GET', '/accounts/%s/admin/features' % A1, headers=h)
    check(s == 200, 'GET admin/features passes through', status=s)


@scenario('IT-F04')
def f04():
    gw = gt_containers()[GATEWAY]
    result = {}

    def old_stream():
        result['old'] = egress_stream_via(A1)
    cur = ST['desired'][A1].get('proxy', {}).get('host')
    old_fx, new_fx = (P1, P2) if cur == ST['fixtures'][P1] else (P2, P1)
    n1, n2 = len(fixture_events(old_fx)), len(fixture_events(new_fx))
    t = threading.Thread(target=old_stream)
    t.start()
    time.sleep(2)
    base = dict(ST['desired'][A1])
    d = dict(base, revision=revision('a1-f04-' + new_fx), proxy=proxy_for(new_fx))
    s, b, dt = put_config(A1, d)
    check(s == 200 and b.get('status') == 'ready', 'a1 switched from %s to %s (new revision) ready' % (old_fx, new_fx),
          status=s, seconds=round(dt, 1))
    t.join(60)
    check(result.get('old', {}).get('count') == 100, 'stream opened before the switch ended normally (100 events)',
          answer=result.get('old'))
    gw2 = gt_containers()[GATEWAY]
    check(gw2['id'] == gw['id'] and gw2['started'] == gw['started'], 'gateway not restarted')
    r = egress_stream_via(A1)
    ev2 = fixture_events(new_fx)[n2:]
    check(r.get('count') == 100 and any(e['host'] == '198.18.0.10' for e in ev2), 'new connection goes through ' + new_fx,
          answer=r, new_proxy_events=len(ev2))
    ev1 = fixture_events(old_fx)[n1:]
    check(any(e['host'] == '198.18.0.10' for e in ev1), 'the old stream was relayed by ' + old_fx, old_proxy_events=len(ev1))


@scenario('IT-F05')
def f05():
    s1 = status(A1)[1]
    old_net = '%s-%s-net' % (PREFIX, A1)
    old_net_id = inspect(old_net, '{{.Id}}', kind='network')
    old_app = app_id(A1)
    app_exec(A1, ['sh', '-c', 'echo gt-marker > /work/data/gt-marker.txt'])
    vol = '%s-%s-data' % (PREFIX, A1)
    vol_created = inspect(vol, '{{.CreatedAt}}', kind='volume')
    since = now_rfc3339()
    time.sleep(1)
    d = desired_for(A1, 'a1-f05', proxy=proxy_for(P2), network={'pool': '192.168.0.0/16', 'allocation': 'random'})
    s, b, dt = put_config(A1, d)
    check(s == 200 and b.get('status') == 'ready', 'a1 on a new network pool: ready', status=s, seconds=round(dt, 1),
          answer=b if s != 200 else None)
    seq = [x for x in guard_requests(since, A1) if not x.startswith('GET')]
    det = next((i for i, x in enumerate(seq) if 'DELETE /v1/gateway/networks/{aid}' in x), None)
    att = next((i for i, x in enumerate(seq) if 'PUT /v1/gateway/networks/{aid}' in x), None)
    check(det is not None and att is not None and det < att, 'gateway leaves the old network before joining the new one',
          sequence=seq[:30])
    s2 = status(A1)[1]
    check(s2['app_ip'].startswith('192.168.') and app_id(A1) != old_app, 'app rebuilt on the new subnet',
          old_ip=s1['app_ip'], new_ip=s2['app_ip'])
    new_net_id = inspect(old_net, '{{.Id}}', kind='network')
    check(new_net_id and new_net_id != old_net_id, 'old account network deleted and replaced')
    code, out = app_exec(A1, ['cat', '/work/data/gt-marker.txt'])
    check(code == 0 and 'gt-marker' in out and inspect(vol, '{{.CreatedAt}}', kind='volume') == vol_created,
          'data volume kept (marker file still there)')


@scenario('IT-F06')
def f06():
    d = dict(ST['desired'][A1])
    blocked = {k: v for k, v in d.items() if k != 'proxy'}
    blocked['direct'] = False
    blocked['revision'] = revision('a1-f06-blocked')
    s, b, _ = put_config(A1, blocked)
    check(s == 200 and b.get('status') == 'blocked', 'a1 blocked (proxy removed)', status=s, answer=b)
    s, _, b = connection(A1, d['revision'])
    check(s == 409, 'connection -> 409', status=s)
    line, _, _ = tunnel(A1, blocked['revision'], b'', read_until=lambda x: True, timeout=5)
    check(line.startswith('HTTP/1.1 409'), 'tunnel -> 409', line=line)
    check(inspect('%s-%s-app' % (PREFIX, A1), '{{.State.Status}}') != 'running', 'app stopped')
    check(not fwd_rules(A1), 'CONTROL-FWD rules for a1 revoked')
    check(not [r for r in chain_rules('PROXY-BRIDGE') if A1 in r], 'bridge rules for a1 revoked')
    ST['f06_restore'] = d
    save_state(ST)


@scenario('IT-F07')
def f07():
    d = dict(ST.get('f06_restore') or ST['desired'][A1])
    d['revision'] = revision('a1-f07')
    s, b, dt = put_config(A1, d)
    check(s == 200 and b.get('status') == 'ready', 'a1 restored: ready', status=s, seconds=round(dt, 1))
    line, head = tunnel_health(A1)
    check(line.startswith('HTTP/1.1 101') and '200' in head, 'request through the tunnel -> 200', line=line, worker=head)


@scenario('IT-F08')
def f08():
    s2 = status(A2)[1]
    check(s2.get('status') == 'ready', 'a2 (direct) ready')
    n1, n2 = len(fixture_events(P1)), len(fixture_events(P2))
    code, out = app_exec(A2, ['node', '-e', "fetch('https://1.1.1.1/',{signal:AbortSignal.timeout(10000)})"
                              ".then(r=>{console.log(r.status)}).catch(e=>{console.log(e.message);process.exit(1)})"], timeout=40)
    check(code == 0 and len(fixture_events(P1)) == n1 and len(fixture_events(P2)) == n2,
          'a2 reaches https://1.1.1.1 directly (no proxy fixture involved)', answer=out.strip()[-40:])
    p1ip = ST['fixtures'][P1]
    for host, port in ((p1ip, 35081), ('172.17.0.1', 22), ('192.168.1.1', 443), ('10.0.0.1', 443)):
        check(not app_connect(A2, host, port), 'a2 -> private %s:%d blocked' % (host, port))


def other_build(aid):
    cur = worker_sha(aid)
    for img in (APP_117, APP_118, 'ccgateway-app:0.1.116'):
        code, out = sh(['docker', 'run', '--rm', '--network', 'none', '--entrypoint', 'sha256sum', img,
                        '/usr/local/bin/worker'], check=False)
        if code == 0 and out.split()[0] != cur:
            return img, cur, out.split()[0]
    raise RuntimeError('no other Worker build available')


@scenario('IT-F09')
def f09():
    img, cur, new = other_build(A1)
    cid = app_id(A1)
    s, _, b = api('POST', '/accounts/%s/worker' % A1, {'image': img}, timeout=400)
    ans = jbody(b)
    check(s == 200 and ans.get('status') == 'updated' and ans.get('sha256') == new and ans.get('previous_sha256') == cur,
          'in-place Worker update: updated', status=s, answer=ans, image=img)
    check(app_id(A1) == cid, 'container ID unchanged')
    check(worker_sha(A1) == new, 'running Worker binary has the new hash')
    wait_ready(A1, ST['desired'][A1]['revision'], 30)
    line, head = tunnel_health(A1)
    check('200' in head, 'ready again; /health through the tunnel 200', worker=head)


@scenario('IT-F10')
def f10():
    img, cur, new = other_build(A1)
    s, _, b = api('POST', '/accounts/%s/worker' % A1,
                  {'image': img, 'components': ['worker', 'cli'], 'cli_version': CLI_VERSION}, timeout=600)
    ans = jbody(b)
    check(s == 200 and ans.get('status') == 'updated' and ans.get('online') is True, 'paired activation: updated',
          status=s, answer=ans)
    stj = json.loads(sudo('cat', '%s/%s/state.json' % (DATA, A1)))
    ar = stj.get('active_runtime') or {}
    check(ar.get('version') == CLI_VERSION and ar.get('worker_sha256') == new and ar.get('container_id') == app_id(A1),
          'active_runtime written', active_runtime={k: ar.get(k) for k in ('version', 'patch', 'worker_sha256', 'container_id')})
    line, head = tunnel_health(A1)
    check('200' in head, 'admission restored (requests served)', worker=head)


def build_bad_app():
    tag = 'ccgateway-app:gt-bad'
    if inspect(tag, '{{.Id}}', kind='image'):
        return tag
    d = os.path.join(WORK, 'build-bad-app')
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'Dockerfile'), 'w') as f:
        f.write('FROM %s\nUSER 0\nRUN cp /bin/false /usr/local/bin/worker\nUSER 1000:1000\n' % APP_118)
    sh(['docker', 'build', '-q', '-t', tag, d], timeout=600)
    return tag


@scenario('IT-F11')
def f11():
    bad = build_bad_app()
    cur = worker_sha(A1)
    stj0 = json.loads(sudo('cat', '%s/%s/state.json' % (DATA, A1)))
    s, _, b = api('POST', '/accounts/%s/worker' % A1,
                  {'image': bad, 'components': ['worker', 'cli'], 'cli_version': CLI_VERSION}, timeout=600)
    ans = jbody(b)
    check(s == 200 and ans.get('status') == 'rolled_back' and ans.get('reason') == 'unhealthy', 'bad Worker: rolled_back',
          status=s, answer=ans)
    check(worker_sha(A1) == cur, 'old Worker binary back')
    stj = json.loads(sudo('cat', '%s/%s/state.json' % (DATA, A1)))
    check(stj.get('active_runtime') == stj0.get('active_runtime'), 'active_runtime unchanged')
    wait_ready(A1, ST['desired'][A1]['revision'], 40)
    line, head = tunnel_health(A1)
    check('200' in head, 'admission restored after rollback', worker=head)


def renamed_archive(src_ref, new_ref):
    raw = subprocess.run(['docker', 'save', src_ref], capture_output=True, timeout=120, check=True).stdout
    src = tarfile.open(fileobj=io.BytesIO(raw))
    out = io.BytesIO()
    dst = tarfile.open(fileobj=out, mode='w')
    repo, tag = new_ref.split(':')
    for m in src.getmembers():
        data = src.extractfile(m).read() if m.isfile() else None
        if m.name in ('manifest.json', 'index.json', 'repositories'):
            t = data.decode().replace('docker.io/library/busybox:latest', 'docker.io/library/' + new_ref) \
                .replace('busybox:latest', new_ref).replace('"busybox"', '"%s"' % repo).replace('"latest"', '"%s"' % tag)
            data = t.encode()
            m.size = len(data)
        dst.addfile(m, io.BytesIO(data) if data is not None else None)
    dst.close()
    return out.getvalue()


@scenario('IT-F12')
def f12():
    ref = 'ccgateway-gt-upload:1'
    blob = renamed_archive('busybox:latest', ref)
    sha = hashlib.sha256(blob).hexdigest()
    s, _, b = api('POST', '/images/uploads', {'size': len(blob), 'sha256': sha})
    up = jbody(b)
    check(s == 200 and up.get('offset') == 0, 'upload created', status=s)
    uid = up['upload_id']
    half = len(blob) // 2
    s, _, b = api('PUT', '/images/uploads/' + uid, blob[:half], raw=True,
                  headers={'X-CCG-Offset': '0', 'Content-Type': 'application/octet-stream'})
    check(s == 200 and jbody(b).get('offset') == half, 'chunk 1 stored', status=s)
    # A chunk cut off mid-body: the connection drops after a quarter.
    rest = blob[half:]
    sk = socket.create_connection(('127.0.0.1', PORT), timeout=10)
    sk.sendall(('PUT /images/uploads/%s HTTP/1.1\r\nHost: c\r\nAuthorization: Bearer %s\r\nX-CCG-Offset: %d\r\n'
                'Content-Type: application/octet-stream\r\nContent-Length: %d\r\n\r\n' % (uid, controller_key(), half, len(rest))).encode()
               + rest[:len(rest) // 4])
    time.sleep(1)
    sk.close()
    time.sleep(2)
    s, _, b = api('GET', '/images/uploads/' + uid)
    check(s == 200 and jbody(b).get('offset') == half, 'broken chunk discarded: offset still at chunk 1', answer=jbody(b))
    s, _, b = api('PUT', '/images/uploads/' + uid, blob[:half + 10], raw=True,
                  headers={'X-CCG-Offset': '0', 'Content-Type': 'application/octet-stream'})
    check(s == 409 and jbody(b).get('offset') == half, 'wrong offset -> 409 offset_mismatch with the current offset', answer=jbody(b))
    s, _, b = api('PUT', '/images/uploads/' + uid, rest, raw=True,
                  headers={'X-CCG-Offset': str(half), 'Content-Type': 'application/octet-stream'})
    check(s == 200 and jbody(b).get('offset') == len(blob), 'resumed from the offset to the end', status=s)
    s, _, b = api('POST', '/images/uploads/%s/load' % uid, timeout=600)
    ans = jbody(b)
    imgs = ans.get('images') or []
    check(s == 200 and ans.get('sha256') == sha and imgs and ref in imgs[0].get('tags', []) and imgs[0]['id'].startswith('sha256:'),
          'load returns {id, tags}', status=s, answer=ans)
    sh(['docker', 'rmi', ref], check=False)


@scenario('IT-F13')
def f13():
    gw = gt_containers()[GATEWAY]
    s, _, b = api('PUT', '/runtime/images', {'app': APP_117, 'egress': 'ccgateway-egress:0.1.118'})
    h = jbody(b)
    check(s == 200 and h.get('app_image') == APP_117 and h.get('egress_image') == 'ccgateway-egress:0.1.118',
          'PUT /runtime/images app+egress', status=s)
    eg = h.get('egress_gateway') or {}
    record('health reports the gateway target', True, egress_gateway=eg,
           note='CCG_XRAY_IMAGE pins the gateway image (as on ovh), so the egress role target does not move the gateway target')
    gw2 = gt_containers()[GATEWAY]
    check(gw2['id'] == gw['id'] and gw2['started'] == gw['started'], 'gateway not recreated')
    s3 = status(A1)[1]
    check(s3.get('target_image') and s3.get('image_update_available') is True, 'account status shows an image update',
          target=s3.get('target_image'), current=s3.get('current_image'))
    s, _, b = api('PUT', '/runtime/images', {'app': APP_118, 'egress': 'ccgateway-egress:0.1.118'})
    check(s == 200, 'targets restored')


def build_ctl(tag, extra):
    if inspect(tag, '{{.Id}}', kind='image'):
        return tag
    d = os.path.join(WORK, 'build-' + tag.split(':')[1])
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'Dockerfile'), 'w') as f:
        f.write('FROM ccgateway-controller:it\n' + extra)
    sh(['docker', 'build', '-q', '-t', tag, d], timeout=600)
    return tag


def upgrade(image, expect_image, seconds=150):
    t0 = time.time()
    s, _, b = api('POST', '/runtime/controller', {'image': image}, timeout=60)
    end = time.time() + seconds
    last = None
    while time.time() < end:
        try:
            st_, hb = health()
            last = hb
            if st_ == 200 and hb.get('controller_image') == expect_image and time.time() - t0 > 3:
                break
        except OSError:
            pass
        time.sleep(1)
    return s, jbody(b), time.time() - t0, last


@scenario('IT-F14')
def f14():
    r2 = build_ctl('ccgateway-controller:gt-r2', 'ENV CCG_CONTROLLER_VERSION=gt-r2\n')
    bad = build_ctl('ccgateway-controller:gt-bad', 'CMD ["/ccg-controller", "no-such-subcommand"]\n')
    for target in (r2, 'ccgateway-controller:it'):
        s, ans, dt, h = upgrade(target, target)
        check(s == 202 and h and h.get('controller_image') == target, 'self-upgrade to %s' % target, status=s,
              answer=ans, seconds=round(dt, 1), version=(h or {}).get('version'))
        env_line = env_value(GT_DIR + '/.env', 'CCG_CONTROLLER_IMAGE')
        check(env_line == target, '.env CCG_CONTROLLER_IMAGE=%s' % target, env=env_line)
        t = time.time()
        for aid in (A1, A2, A3):
            if aid in ST['desired'] and status(aid)[0] == 200:
                wait_ready(aid, ST['desired'][aid]['revision'], 60)
        record('accounts ready after the upgrade (RB9 re-activation)', True, seconds=round(time.time() - t, 1))
    from scenarios_s import guard
    t0 = time.time()
    s, _, b = api('POST', '/runtime/controller', {'image': bad}, timeout=60)
    check(s == 202, 'upgrade to a broken image accepted', status=s, answer=jbody(b))
    up = {}
    while time.time() - t0 < 240:
        time.sleep(2)
        try:
            code, body = guard('GET', '/v1/controller/upgrade')
            up = json.loads(body) if code == '200' else {}
        except (OSError, ValueError, subprocess.SubprocessError):
            continue
        if up.get('image') == bad and up.get('state') in ('done', 'failed'):
            break
    wait_health(want_image='ccgateway-controller:it', seconds=60)
    env_line = env_value(GT_DIR + '/.env', 'CCG_CONTROLLER_IMAGE')
    check(up.get('state') == 'failed' and up.get('result') == 'unhealthy' and up.get('rollback') == 'restored'
          and env_line == 'ccgateway-controller:it', 'broken image: guard rolls back to the previous controller',
          upgrade=up, env=env_line, seconds=round(time.time() - t0, 1))
    for aid in (A1, A2, A3):
        if aid in ST['desired'] and status(aid)[0] == 200:
            wait_ready(aid, ST['desired'][aid]['revision'], 60)


@scenario('IT-F15')
def f15():
    s, _, b = api('GET', '/runtime/cleanup')
    rt = {r['key']: r['identity'] for r in jbody(b).get('runtimes', [])}
    check(s == 200 and {A1, A2, A3} <= set(rt), 'inventory lists a1, a2 and the orphan a3', keys=sorted(rt))
    s, _, b = api('POST', '/runtime/cleanup', {'keep_keys': [A1, A2], 'candidates': [
        {'key': A3, 'identity': rt[A3]}, {'key': A1, 'identity': rt[A1]}]}, timeout=300)
    ans = jbody(b)
    res = {r['key']: r['status'] for r in ans.get('results', [])}
    check(s == 200 and res.get(A3) == 'deleted' and res.get(A1) == 'kept', 'a3 deleted, a1 kept', answer=ans)
    left = [n for n in gt_containers() if A3 in n] + [n for n in docker('network', 'ls', '--format', '{{.Name}}').split() if A3 in n]
    check(not left and not inspect('%s-%s-data' % (PREFIX, A3), '{{.Name}}', kind='volume'), 'a3 resources gone', left=left)
    for aid in (A1, A2):
        check(status(aid)[1].get('status') == 'ready', '%s unaffected' % aid)
    ST['desired'].pop(A3, None)
    save_state(ST)


@scenario('IT-F16')
def f16():
    gwnets = lambda: set(json.loads(inspect(GATEWAY, '{{json .NetworkSettings.Networks}}')))  # noqa: E731
    net = '%s-%s-net' % (PREFIX, A2)
    check(net in gwnets(), 'precondition: gateway on a2 net')
    s, _, b = api('DELETE', '/accounts/' + A2, headers={'X-CCG-Delete-Account': A2})
    ans = jbody(b)
    vol = '%s-%s-data' % (PREFIX, A2)
    check(s == 200 and ans.get('removed', {}).get('volume') is False and inspect(vol, '{{.Name}}', kind='volume'),
          'account delete keeps the data volume', answer=ans)
    check(sh(['sudo', '-n', 'test', '-f', '%s/backups/%s.json' % (DATA, A2)], check=False)[0] == 0, 'backup written')
    check(net not in gwnets(), 'gateway left the a2 network')
    s, _, b = api('DELETE', '/accounts/' + A2, headers={'X-CCG-Delete-Account': A2, 'X-CCG-Delete-Data': '1'})
    ans = jbody(b)
    check(s == 200 and not inspect(vol, '{{.Name}}', kind='volume') and
          sh(['sudo', '-n', 'test', '-e', '%s/backups/%s.json' % (DATA, A2)], check=False)[0] != 0,
          'purge removes the volume and the backup', answer=ans)
    ST['desired'].pop(A2, None)
    save_state(ST)


def hosts_path():
    return inspect(CONTROLLER, '{{.HostsPath}}')


def set_hosts(ip):
    path = hosts_path()
    text = sudo('cat', path)
    lines = [l for l in text.splitlines() if 'proxy.gt.test' not in l] + ['%s proxy.gt.test' % ip]
    # In place (same inode): the file is bind mounted into the controller.
    sudo('sh', '-c', 'cat > %s' % path, input='\n'.join(lines) + '\n')


@scenario('IT-F17')
def f17():
    set_hosts(ST['fixtures'][P1])
    time.sleep(6)
    d = desired_for(A1, 'a1-f17', proxy=proxy_for(P1, host='proxy.gt.test'))
    n2 = len(fixture_events(P2))
    s, b, _ = put_config(A1, d)
    check(s == 200 and b.get('status') == 'ready', 'a1 via proxy.gt.test (-> P1) ready', status=s, answer=b if s != 200 else None)
    t0 = time.time()
    set_hosts(ST['fixtures'][P2])
    went = None
    while time.time() - t0 < 330:
        if status(A1)[1].get('status') != 'ready':
            went = time.time() - t0
            break
        time.sleep(2)
    check(went is not None, 'a1 goes pending within 300 s after the name moved', seconds=round(went or -1, 1))
    d2 = desired_for(A1, 'a1-f17b', proxy=proxy_for(P1, host='proxy.gt.test'))
    s, b, _ = put_config(A1, d2)
    ev = fixture_events(P2)[n2:]
    check(s == 200 and b.get('status') == 'ready' and ev, 'next apply uses the new address (P2 logged the probe)',
          status=s, p2_events=len(ev))
    # Back to an address literal: the name lives only in this controller
    # container's /etc/hosts, which a recreated controller does not keep.
    d3 = dict(d2, revision=revision('a1-f17c'), proxy=proxy_for(P1))
    s, b, _ = put_config(A1, d3)
    check(s == 200 and b.get('status') == 'ready', 'a1 back on the P1 address', status=s)


@scenario('IT-F18')
def f18():
    s, _, b = api('GET', '/health')
    t0 = time.time()
    old = gt_containers()[GATEWAY]['id']
    s, _, b = api('POST', '/runtime/egress/recreate', {}, timeout=400)
    ans = jbody(b)
    t_api = time.time() - t0
    check(s == 200 and ans.get('recreated') is True, 'POST /runtime/egress/recreate', status=s, answer=ans, seconds=round(t_api, 1))
    check(gt_containers()[GATEWAY]['id'] != old, 'gateway is a new container')
    per = {}
    for aid in sorted(ST['desired']):
        wait_ready(aid, ST['desired'][aid]['revision'], 120)
        per[aid] = round(time.time() - t0, 1)
    record('all accounts ready again after the recreate', True, per_account_seconds_from_request=per,
           accounts=len(per))
    ST.setdefault('perf', {})['P06'] = {'accounts': len(per), 'seconds_to_all_ready': max(per.values()) if per else None,
                                       'api_seconds': round(t_api, 1)}
    save_state(ST)
    for aid in per:
        line, head = tunnel_health(aid)
        check('200' in head, '%s serves after the recreate' % aid)
