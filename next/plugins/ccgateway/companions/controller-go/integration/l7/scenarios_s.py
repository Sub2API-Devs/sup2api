"""IT-S: security negative checks (05 §4.2), run with throwaway ccg-gt-* containers."""
import base64
import io
import json
import os
import re
import subprocess
import tarfile
import time

from itlib import (A1, A2, A3, CONTROLLER, app_exec, CTL_IP, GATEWAY, GUARD_IP, PREFIX, ROOT, ST, WORK, api, app_connect,
                   chain_rules, check, docker, fixture_events, gt_containers, gt_name, guard_token, inspect, jbody,
                   put_config, record, scenario, sh, status, sudo, wait_health, wait_ready, controller_key)

GUARD = 'http://%s:8790' % GUARD_IP
HOST_IP = '15.204.107.38'


def run_curl(args, net=None, name='ccg-gt-curl', token=None, body=None, timeout=10, exec_in=None):
    """curl from a throwaway container in the controller's namespace (or on
    `net`, or inside an existing gt container). The Authorization header goes
    through stdin (-H @-), never on a command line. Returns (http_code, body)."""
    hdr = ('Authorization: Bearer %s\n' % token) if token else ''
    cargs = ['-sS', '-m', str(timeout), '-H', '@-', '-o', '/dev/stdout', '-w', '\n%{http_code}']
    if body is not None:
        cargs += ['-H', 'Content-Type: application/json', '--data-binary', body]
    cargs += args
    if exec_in:
        cmd = ['docker', 'exec', '-i', gt_name(exec_in), 'curl', *cargs]
    else:
        gt_name(name)
        docker('rm', '-f', name, check=False)
        cmd = ['docker', 'run', '--rm', '-i', '--name', name, '--network', net or ('container:' + CONTROLLER),
               'curlimages/curl:latest', *cargs]
    p = subprocess.run(cmd, input=hdr, capture_output=True, text=True, timeout=timeout + 60)
    out = p.stdout.rstrip('\n')
    body_, _, code = out.rpartition('\n')
    return (code if code.isdigit() else '000'), body_


def guard(method, path, body=None, token=True, **kw):
    tok = guard_token() if token is True else token
    return run_curl(['-X', method, GUARD + path], token=tok, body=json.dumps(body) if isinstance(body, (dict, list)) else body, **kw)


def busybox(cmd, net=None, name='ccg-gt-bb', timeout=60, caps=()):
    gt_name(name)
    docker('rm', '-f', name, check=False)
    args = ['docker', 'run', '--rm', '--name', name, '--network', net or ('container:' + CONTROLLER)]
    for c in caps:
        args += ['--cap-add', c]
    p = subprocess.run(args + ['busybox:latest', 'sh', '-c', cmd], capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout + p.stderr


def st(aid):
    return status(aid)[1]


@scenario('IT-S01')
def s01():
    for port in (3130, 8010, 8795):
        for host in (GUARD_IP, HOST_IP, '172.17.0.1'):
            code, out = busybox('nc -w 4 %s %d </dev/null && echo CONNECTED || echo FAILED' % (host, port), timeout=40)
            check('CONNECTED' not in out, 'controller -> %s:%d (host loopback service) blocked' % (host, port),
                  out=out.strip()[-80:])


@scenario('IT-S02')
def s02():
    code, body = run_curl(['https://1.1.1.1/'], timeout=6)
    check(code == '000', 'controller -> 1.1.1.1:443 fails', http=code)
    code, out = busybox('nc -w 4 %s 443 </dev/null && echo CONNECTED || echo FAILED' % HOST_IP)
    check('CONNECTED' not in out, 'controller -> host public IP :443 fails', out=out.strip()[-80:])
    code, out = busybox('nc -w 4 %s 22 </dev/null && echo CONNECTED || echo FAILED' % HOST_IP)
    check('CONNECTED' not in out, 'controller -> host public IP :22 fails', out=out.strip()[-80:])
    code, out = busybox('nslookup www.gstatic.com', timeout=30)
    ok = code == 0 and re.search(r'Address:\s*\d+\.\d+\.\d+\.\d+', out.split('Name:', 1)[-1] if 'Name:' in out else '')
    check(ok, 'controller resolves a proxy domain (D1: control DNS allowed)', out=out.strip()[-200:])


@scenario('IT-S03')
def s03():
    s1 = st(A1)
    code, body = run_curl(['http://%s:8787/health' % s1['app_ip']])
    check(code == '200', 'controller -> a1 Worker :8787 reachable', http=code)
    code, out = busybox('nc -w 4 %s 22 </dev/null && echo CONNECTED || echo FAILED' % s1['app_ip'])
    check('CONNECTED' not in out, 'controller -> a1 other port (22) blocked', out=out.strip()[-60:])
    code, out = busybox('nc -w 4 %s 15001 </dev/null && echo CONNECTED || echo FAILED' % s1['gateway_ip'])
    check('CONNECTED' not in out, 'controller -> gateway on a1 net (:15001) blocked', out=out.strip()[-60:])
    # An account that is not ready: block a3, probe its old address, restore.
    s3 = st(A3)
    d3 = ST['desired'][A3]
    blocked = dict(d3, enabled=False, revision=d3['revision'])
    s, b, _ = put_config(A3, blocked)
    check(s == 200 and b.get('status') == 'blocked', 'a3 blocked', status=s)
    code, out = busybox('nc -w 4 %s 8787 </dev/null && echo CONNECTED || echo FAILED' % s3['app_ip'])
    check('CONNECTED' not in out, 'controller -> blocked a3 :8787 not reachable', out=out.strip()[-60:])
    rules = [r for r in chain_rules('CONTROL-FWD') if A3 in r]
    check(not rules, 'no CONTROL-FWD rule for the blocked account', rules=len(rules))
    s, b, _ = put_config(A3, d3)
    check(s == 200 and b.get('status') == 'ready', 'a3 restored', status=s)


@scenario('IT-S04')
def s04():
    p = subprocess.run(['curl', '-sS', '-m', '4', GUARD + '/v1/health'], capture_output=True, text=True)
    check(p.returncode != 0, 'host process -> guard :8790 fails', curl_exit=p.returncode)
    code, _ = run_curl([GUARD + '/v1/health'], net='bridge', timeout=4)
    check(code == '000', 'container on the default bridge -> guard fails', http=code)
    code, _ = run_curl([GUARD + '/v1/health'], net='ccg-gt-control', timeout=4)
    check(code == '000', 'other container on the control network -> guard fails', http=code)
    code, body = run_curl([GUARD + '/v1/health'], timeout=4)
    check(code in ('200', '401'), 'the controller itself reaches the guard (401 without a token = reached)', http=code)


@scenario('IT-S05')
def s05():
    code, body = guard('GET', '/v1/inventory', token='0' * 64)
    check(code == '401', 'wrong token -> 401', http=code, body=body[:120])
    code, body = guard('GET', '/v1/inventory', token='not-hex')
    check(code == '401', 'malformed token -> 401', http=code)
    code, body = guard('GET', '/v1/inventory', token=None)
    check(code == '401', 'no token -> 401', http=code)
    code, body = guard('GET', '/v1/inventory', net='ccg-gt-control', name='ccg-gt-curl12', timeout=4)
    record('right token from another address of the control network', code in ('401', '000'), http=code,
           note='000 = dropped by CCG-GT-CONTROL-IN before the guard; the guard\'s own 401 is covered by L2')
    # Replace the controller at .10 with a container compose did not start.
    docker('stop', gt_name(CONTROLLER))
    try:
        docker('run', '-d', '--name', gt_name('ccg-gt-impostor'), '--network', 'ccg-gt-control', '--ip', CTL_IP,
               '--entrypoint', 'sleep', 'curlimages/curl:latest', '600')
        time.sleep(3)
        code, body = guard('GET', '/v1/inventory', exec_in='ccg-gt-impostor')
        check(code == '403' and 'controller_unguarded' in body, 'impostor at .10 with the right token -> 403 controller_unguarded',
              http=code, body=body[:160])
        code, body = guard('GET', '/v1/health', exec_in='ccg-gt-impostor')
        check(code == '200' and json.loads(body).get('controller') == 'unguarded', 'guard health reports unguarded',
              http=code)
    finally:
        docker('rm', '-f', 'ccg-gt-impostor', check=False)
        docker('start', CONTROLLER)
    wait_health(seconds=60)
    for aid in (A1, A2, A3):
        wait_ready(aid, ST['desired'][aid]['revision'], 40)
    record('controller back, all ready', True)


@scenario('IT-S06')
def s06():
    prod = inspect('ccg-21-app', '{{.Id}} {{.State.StartedAt}} {{.State.Status}}')
    code, body = guard('GET', '/v1/accounts/21')
    ok = code == '404' or (code == '200' and json.loads(body).get('app') is None)
    check(ok, 'gt guard: account 21 resolves inside ccg-gt only (no production app)', http=code, body=body[:160])
    code, body = guard('GET', '/v1/accounts/21/app/top')
    check(code in ('404', '409'), 'gt guard: top of 21 -> not found', http=code, body=body[:120])
    code, body = guard('GET', '/v1/accounts/21/app/archive?path=/etc/hostname')
    check(code in ('404', '409'), 'gt guard: archive of 21 -> not found', http=code, body=body[:120])
    check(inspect('ccg-21-app', '{{.Id}} {{.State.StartedAt}} {{.State.Status}}') == prod,
          'production ccg-21-app unchanged (read only checks; no mutation was sent)')


def caddy_archive():
    """busybox:latest saved, its names rewritten to caddy:latest (no host tag changes)."""
    raw = subprocess.run(['docker', 'save', 'busybox:latest'], capture_output=True, timeout=120, check=True).stdout
    src = tarfile.open(fileobj=io.BytesIO(raw))
    out = io.BytesIO()
    dst = tarfile.open(fileobj=out, mode='w')
    for m in src.getmembers():
        data = src.extractfile(m).read() if m.isfile() else None
        if m.name in ('manifest.json', 'index.json', 'repositories'):
            text = data.decode().replace('docker.io/library/busybox:latest', 'docker.io/library/caddy:latest') \
                .replace('busybox:latest', 'caddy:latest').replace('"busybox"', '"caddy"')
            data = text.encode()
            m.size = len(data)
        dst.addfile(m, io.BytesIO(data) if data is not None else None)
    dst.close()
    return out.getvalue()


def upload_and_load(blob):
    import hashlib
    s, _, b = api('POST', '/images/uploads', {'size': len(blob), 'sha256': hashlib.sha256(blob).hexdigest()})
    uid = jbody(b)['upload_id']
    s, _, b = api('PUT', '/images/uploads/' + uid, blob, raw=True,
                  headers={'X-CCG-Offset': '0', 'Content-Type': 'application/octet-stream'})
    if s != 200:
        return s, jbody(b)
    s, _, b = api('POST', '/images/uploads/%s/load' % uid, timeout=600)
    return s, jbody(b)


@scenario('IT-S07')
def s07():
    before = inspect('caddy:latest', '{{.Id}}', kind='image')
    blob = caddy_archive()
    s, ans = upload_and_load(blob)
    check(s == 400 and ans.get('error') in ('load_forbidden', 'load_failed'), 'controller upload+load of caddy:latest refused',
          status=s, answer=ans)
    check(inspect('caddy:latest', '{{.Id}}', kind='image') == before, 'caddy:latest image ID unchanged',
          before=before, after=inspect('caddy:latest', '{{.Id}}', kind='image'))
    code, body = guard('GET', '/v1/health')
    with open(os.path.join(WORK, 'caddy.tar'), 'wb') as f:
        f.write(blob)
    p = subprocess.run(['docker', 'run', '--rm', '-i', '--name', 'ccg-gt-curl', '--network', 'container:' + CONTROLLER,
                        '-v', os.path.join(WORK, 'caddy.tar') + ':/caddy.tar:ro', 'curlimages/curl:latest', '-sS',
                        '-H', '@-', '-H', 'Content-Type: application/x-tar', '--data-binary', '@/caddy.tar',
                        '-w', '\n%{http_code}', GUARD + '/v1/images/load'],
                       input='Authorization: Bearer %s\n' % guard_token(), capture_output=True, text=True, timeout=300)
    body, _, code = p.stdout.rstrip('\n').rpartition('\n')
    check(code == '403' and 'load_forbidden' in body, 'guard images/load of caddy:latest -> 403 load_forbidden',
          http=code, body=body[:160])
    check(inspect('caddy:latest', '{{.Id}}', kind='image') == before, 'caddy:latest still unchanged')
    os.remove(os.path.join(WORK, 'caddy.tar'))


@scenario('IT-S08')
def s08():
    ref = 'docker.io/library/hello-world:latest'
    check(inspect(ref, '{{.Id}}', kind='image') is None, 'precondition: %s not on the host' % ref)
    code, body = guard('POST', '/v1/images/pull', {'ref': ref}, timeout=60)
    check(code == '403' and 'image_not_allowed' in body, 'guard pull by tag of a non-allowlisted repo -> 403',
          http=code, body=body[:160])
    s, _, b = api('PUT', '/runtime/images', {'app': ref})
    check(s in (400, 503) and s != 200, 'controller PUT /runtime/images with that ref refused', status=s, answer=jbody(b))
    check(inspect(ref, '{{.Id}}', kind='image') is None, 'nothing pulled')


def a3_resolv():
    return '%s/%s/resolv.conf' % (ROOT, A3)


def app_state(aid):
    return inspect('%s-%s-app' % (PREFIX, aid), '{{.Id}} {{.State.StartedAt}} {{.State.Status}}')


@scenario('IT-S09')
def s09():
    path = a3_resolv()
    before = app_state(A3)
    sudo('sh', '-c', 'mv %s %s.gt-orig && ln -s /etc/hostname %s' % (path, path, path))
    try:
        code, body = guard('POST', '/v1/accounts/%s/app/restart' % A3, {})
        check(code == '403' and 'mount_source' in body, 'restart with a symlinked resolv.conf -> 403', http=code, body=body[:160])
        check(app_state(A3) == before, 'a3 container untouched')
    finally:
        sudo('sh', '-c', 'rm -f %s && mv %s.gt-orig %s' % (path, path, path))
    wait_ready(A3, ST['desired'][A3]['revision'], 30)


@scenario('IT-S10')
def s10():
    path = a3_resolv()
    before = app_state(A3)
    sudo('ln', path, path + '.gt-link')
    try:
        code, body = guard('POST', '/v1/accounts/%s/app/restart' % A3, {})
        check(code == '403' and 'mount_source' in body, 'restart with a hard-linked resolv.conf (nlink 2) -> 403',
              http=code, body=body[:160])
        check(app_state(A3) == before, 'a3 container untouched')
    finally:
        sudo('rm', '-f', path + '.gt-link')
    wait_ready(A3, ST['desired'][A3]['revision'], 30)


@scenario('IT-S11')
def s11():
    s1 = st(A1)
    n0 = len(fixture_events('ccg-gt-fixture-p1'))
    code, out = app_exec(A1, ['node', '-e', "fetch('https://1.1.1.1/',{signal:AbortSignal.timeout(10000)})"
                              ".then(r=>{console.log(r.status);process.exit(0)}).catch(e=>{console.log(e.message);process.exit(1)})"],
                         timeout=40)
    ev = [e for e in fixture_events('ccg-gt-fixture-p1')[n0:] if e['host'] == '1.1.1.1']
    check(code == 0 and ev, 'a1 -> https://1.1.1.1 works only through P1 (the fixture logged it)', answer=out.strip()[-40:],
          p1_events=len(ev))
    net = '%s-%s-net' % (PREFIX, A1)
    bridge_gw = inspect(net, '{{(index .IPAM.Config 0).Gateway}}', kind='network')
    code, out = busybox('ip route replace default via %s 2>/dev/null; nc -w 4 1.1.1.1 443 </dev/null && echo CONNECTED || echo FAILED'
                        % bridge_gw, net=net, name='ccg-gt-bypass', caps=('NET_ADMIN',))
    check('CONNECTED' not in out, 'unknown container on a1 net via the bridge -> 1.1.1.1:443 fails', out=out.strip()[-80:])
    code, out = busybox('ip route replace default via %s; nc -w 4 1.1.1.1 443 </dev/null && echo CONNECTED || echo FAILED'
                        % s1['gateway_ip'], net=net, name='ccg-gt-bypass', caps=('NET_ADMIN',))
    check('CONNECTED' not in out, 'unknown container on a1 net via the gateway -> 1.1.1.1:443 fails', out=out.strip()[-80:])


@scenario('IT-S12')
def s12():
    s1 = st(A1)
    for host, port, what in ((s1['gateway_ip'], 10085, 'gateway Xray API'), (CTL_IP, 8787, 'controller'),
                             (GUARD_IP, 8790, 'guard'), ('172.17.0.1', 22, 'docker0 host address')):
        check(not app_connect(A1, host, port), 'a1 -> %s %s:%d fails' % (what, host, port))


@scenario('IT-S13')
def s13():
    before = set(gt_containers())
    s3 = st(A3)
    img = inspect('%s-%s-app' % (PREFIX, A3), '{{.Image}}')
    base = {'image': img, 'ipv4': s3['app_ip'], 'env': {'A': 'b'}, 'auth_label': 'x', 'image_label': img}
    cases = [
        ('Privileged field', 'PUT', '/v1/accounts/%s/app' % A3, dict(base, Privileged=True)),
        ('HostConfig field', 'PUT', '/v1/accounts/%s/app' % A3, dict(base, HostConfig={'Binds': ['/:/host']})),
        ('env name with a newline', 'PUT', '/v1/accounts/%s/app' % A3, dict(base, env={'BAD\nNAME': 'x'})),
        ('ipv4 outside the subnet', 'PUT', '/v1/accounts/%s/app' % A3, dict(base, ipv4='10.255.255.77')),
        ('exec in an account of another prefix', 'POST', '/v1/accounts/21/app/exec', {'argv': ['id'], 'user': '0'}),
        ('suffix with ../', 'DELETE', '/v1/accounts/%s/containers/..%%2F..%%2Fccg-gt-controller' % A3, None),
        ('suffix outside the role pattern', 'DELETE', '/v1/accounts/%s/containers/controller' % A3, None),
        ('aid with ../', 'GET', '/v1/accounts/..%2F21', None),
        ('job with an extra capability', 'POST', '/v1/accounts/%s/jobs' % A3,
         {'image': img, 'entrypoint': ['id'], 'argv': [], 'user': '0', 'volume': 'rw', 'caps': ['SYS_ADMIN']}),
        ('job with capabilities but no rw volume', 'POST', '/v1/accounts/%s/jobs' % A3,
         {'image': img, 'entrypoint': ['id'], 'argv': [], 'user': '0', 'volume': 'none', 'caps': ['CHOWN']}),
        ('job with an arbitrary user', 'POST', '/v1/accounts/%s/jobs' % A3,
         {'image': img, 'entrypoint': ['id'], 'argv': [], 'user': '0:0', 'volume': 'none', 'caps': []}),
        ('network outside RFC1918', 'PUT', '/v1/accounts/%s/network' % A3,
         {'subnet': '8.8.8.0/24', 'gateway': '8.8.8.1', 'policy_label': '{}'}),
    ]
    for what, m, path, body in cases:
        code, out = guard(m, path, body)
        check(code in ('400', '403', '404', '409'), 'guard refuses: ' + what, http=code, body=out[:140])
    after = set(gt_containers())
    check(after == before, 'no new Docker resource after the refused requests', new=sorted(after - before))
    check(app_state(A3) and 'running' in app_state(A3), 'a3 still running')


EXPECT_APP = {'User': '1000:1000', 'Memory': 1073741824, 'NanoCpus': 2000000000, 'PidsLimit': 256, 'Init': True,
              'CapDrop': ['ALL'], 'CapAdd': None, 'SecurityOpt': ['no-new-privileges:true'], 'Privileged': False,
              'LogConfig': {'Type': 'json-file', 'Config': {'max-file': '3', 'max-size': '20m'}}}


def host_config_view(c):
    hc = c['HostConfig']
    return {'User': c['Config']['User'], 'Memory': hc['Memory'], 'NanoCpus': hc['NanoCpus'], 'PidsLimit': hc['PidsLimit'],
            'Init': hc.get('Init'), 'CapDrop': hc['CapDrop'], 'CapAdd': hc['CapAdd'], 'SecurityOpt': hc['SecurityOpt'],
            'Privileged': hc['Privileged'], 'LogConfig': hc['LogConfig'], 'Binds': hc['Binds'],
            'NetworkMode': hc['NetworkMode'], 'Restart': hc['RestartPolicy']['Name'], 'ReadonlyRootfs': hc['ReadonlyRootfs'],
            'Devices': hc['Devices'], 'PidMode': hc['PidMode'], 'IpcMode': hc['IpcMode'], 'Sysctls': hc.get('Sysctls')}


@scenario('IT-S14')
def s14():
    views = {}
    for aid in (A1, A2, A3):
        c = inspect('%s-%s-app' % (PREFIX, aid))
        v = host_config_view(c)
        views[aid] = v
        exp = dict(EXPECT_APP, Binds=['%s-%s-data:/work:rw' % (PREFIX, aid), '%s/%s/resolv.conf:/etc/resolv.conf:ro' % (ROOT, aid)],
                   NetworkMode='%s-%s-net' % (PREFIX, aid))
        diff = {k: (v.get(k), e) for k, e in exp.items() if v.get(k) != e}
        extra = {k: v[k] for k in ('Devices', 'Sysctls') if v[k]} if any(v[k] for k in ('Devices', 'Sysctls')) else {}
        ok = not diff and not extra and v['Restart'] in ('', 'no') and v['PidMode'] in ('', 'private') and \
            v['IpcMode'] in ('private', 'shareable', '')
        check(ok, 'account container %s matches policy.App' % aid, diff=diff, extra=extra, restart=v['Restart'],
              created_by='python' if aid != A3 else 'go (guard)')
    same = {k for k in views[A1] if k not in ('Binds', 'NetworkMode') and views[A1][k] != views[A3][k]}
    check(not same, 'Go-created a3 and Python-created a1 have the same HostConfig', differs=sorted(same))
    c = inspect(CONTROLLER)
    hc = c['HostConfig']
    ok = (hc['NetworkMode'] == 'ccg-gt-control' and hc['CapDrop'] == ['ALL'] and not hc['CapAdd'] and hc['ReadonlyRootfs']
          and not hc['Privileged'] and hc['SecurityOpt'] == ['no-new-privileges:true'] and hc['Memory'] == 1 << 30
          and hc['PidsLimit'] == 512 and [m['Destination'] for m in c['Mounts']] == ['/data']
          and not any('docker.sock' in (m.get('Source') or '') for m in c['Mounts']) and hc['PidMode'] in ('', 'private'))
    check(ok, 'controller HostConfig (03 §4.9)', capadd=hc['CapAdd'], mounts=[m['Source'] for m in c['Mounts']])
    g = inspect('ccg-gt-guard')
    hc = g['HostConfig']
    caps = sorted(x.replace('CAP_', '') for x in (hc['CapAdd'] or []))
    ok = (hc['NetworkMode'] == 'host' and hc['PidMode'] == 'host' and caps == ['NET_ADMIN', 'SYS_ADMIN', 'SYS_PTRACE']
          and hc['CapDrop'] == ['ALL'] and hc['ReadonlyRootfs'] and not hc['Privileged']
          # label=disable is what Docker adds itself for pid: host (no SELinux here)
          and sorted(hc['SecurityOpt']) in (['no-new-privileges:true'], ['label=disable', 'no-new-privileges:true'])
          and hc['PidsLimit'] == 256 and hc['Memory'] == 256 << 20)
    check(ok, 'guard HostConfig (03 §9.6, U3)', capadd=hc['CapAdd'], mounts=sorted(m['Destination'] for m in g['Mounts']))
    gw = inspect(GATEWAY)
    hc = gw['HostConfig']
    ok = (sorted(x.replace('CAP_', '') for x in hc['CapAdd']) == ['NET_ADMIN', 'NET_BIND_SERVICE'] and hc['CapDrop'] == ['ALL']
          and hc['Init'] and hc['Memory'] == 384 << 20 and hc['PidsLimit'] == 256 and hc['NanoCpus'] == 2000000000
          and hc['Sysctls'] == {'net.ipv4.ip_forward': '0', 'net.ipv6.conf.all.disable_ipv6': '1'}
          and [(m['Destination'], m['RW']) for m in gw['Mounts']] == [('/config', False)]
          and gw['Mounts'][0]['Source'] == ROOT + '/shared-egress' and not hc['Privileged'])
    check(ok, 'gateway HostConfig (03 §4.8)', capadd=hc['CapAdd'], mounts=[(m['Source'], m['Destination']) for m in gw['Mounts']])


@scenario('IT-S15')
def s15():
    p = subprocess.run(['docker', 'exec', GATEWAY, 'ls', '-a', '/config'], capture_output=True, text=True)
    names = p.stdout.split()
    check(p.returncode == 0 and 'state.json' not in names, 'gateway /config has no state.json', files=names)


@scenario('IT-S16')
def s16():
    secrets = {'guard token': guard_token(), 'controller key': controller_key(), 'proxy password': 'test-only-password',
               'fake upstream api key': 'gt-fake-key-not-a-secret'}
    for aid in (A1, A2, A3):
        stj = json.loads(sudo('cat', '/opt/ccgateway-gt-controller/%s/state.json' % aid))
        secrets['%s api_key' % aid] = stj['api_key']
        secrets['%s admin_key' % aid] = stj['admin_key']
    logs = {}
    for name in ('ccg-gt-guard', CONTROLLER, GATEWAY):
        p = subprocess.run(['docker', 'logs', name], capture_output=True, text=True)
        logs[name] = p.stdout + p.stderr
    hits = {}
    for lname, text in logs.items():
        for sname, val in secrets.items():
            if val and val in text:
                hits.setdefault(lname, []).append(sname)
        oauth = [l for l in text.splitlines() if re.search(r'(?i)oauth|refresh_token|access_token', l)]
        if oauth:
            hits.setdefault(lname, []).append('oauth-like lines: %d' % len(oauth))
    sizes = {k: len(v.splitlines()) for k, v in logs.items()}
    check(not hits, 'no token, key, proxy password or OAuth material in guard/controller/gateway logs',
          hits=hits, lines=sizes, note='core not part of the isolated instance (driver calls the controller directly)')
