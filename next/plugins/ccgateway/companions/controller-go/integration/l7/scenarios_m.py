"""IT-M: migration and rollback (05 §4.4), in the order of 04 §7."""
import json
import os
import subprocess
import time

from itlib import (A1, A2, A3, APP_117, APP_118, CHAIN, CLI_VERSION, CONTROLLER, DATA, ENVF, GATEWAY, PORT, ROOT,
                   ST, WORK, Fail, account_containers, api, chain_rules, check, desired_for, docker, file_hashes,
                   gt_containers, gt_name, health, inspect, jbody, put_config, proxy_for, record, revision,
                   save_state, scenario, sh, snapshot, start_fixture, status, sudo, wait_health, wait_ready,
                   fixture_events, iptables_chain)

L7 = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(WORK, 'gen')
PY_VERSION = '7a72fd3424e9'
GO_IMAGE = os.environ.get('GT_GO_CTL', 'ccgateway-controller:it')
# Mount sources and gateway files that stay under the runtime root (04 §2.6).
STAY = ('resolv.conf', 'app.nft')
GW_STAY = ('shared-egress/boot.json', 'shared-egress/boot.nft', 'shared-egress/dns.json',
           'shared-egress/active.nft', 'shared-egress/operation.json')


def gtctl(*args, input=None, timeout=900):
    p = subprocess.run(['sh', os.path.join(L7, 'gtctl.sh'), *args], capture_output=True, text=True,
                       input=input, timeout=timeout)
    return p.returncode, p.stdout, p.stderr


def make_files():
    """The kinds of files of 04 §2.6 on a Python-managed root."""
    # runtime.json
    s, _, b = api('PUT', '/runtime/images', {'app': APP_118, 'egress': 'ccgateway-egress:0.1.118'})
    check(s == 200, 'runtime.json via PUT /runtime/images', status=s)
    # uploads/: an unfinished chunked upload
    s, _, b = api('POST', '/images/uploads', {'size': 4096})
    up = jbody(b)
    check(s == 200 and 'upload_id' in up, 'unfinished upload created', status=s)
    s, _, b = api('PUT', '/images/uploads/' + up['upload_id'], b'\0' * 1024, raw=True,
                  headers={'X-CCG-Offset': '0', 'Content-Type': 'application/octet-stream'})
    check(s == 200 and jbody(b).get('offset') == 1024, 'upload chunk 1', status=s)
    ST['upload_id'] = up['upload_id']
    # backups/<a3>.json: an account delete without purge
    s, b, dt = put_config(A3, desired_for(A3, 'a3-py', direct=True))
    check(s == 200 and b.get('status') == 'ready', 'python a3 ready', status=s, seconds=round(dt, 1))
    s, _, b = api('DELETE', '/accounts/' + A3, headers={'X-CCG-Delete-Account': A3})
    check(s == 200, 'python a3 deleted (backup kept)', status=s, answer=jbody(b))
    # worker-backups/: in-place Worker update with another build
    s, _, b = api('POST', '/accounts/%s/worker' % A1, {'image': APP_117}, timeout=400)
    wb = jbody(b)
    check(s == 200 and wb.get('status') == 'updated', 'python worker update a1', status=s, answer=wb)
    # cli-backups/ and active_runtime: paired activation on a2
    s, _, b = api('POST', '/accounts/%s/worker' % A2,
                  {'image': APP_117, 'components': ['worker', 'cli'], 'cli_version': CLI_VERSION}, timeout=600)
    pb = jbody(b)
    check(s == 200 and pb.get('status') == 'updated', 'python paired activation a2', status=s, answer=pb)
    # history and unknown files
    script = ('set -e; cd %s; mkdir -p %s/worker-backups-before-0.1.114 controller-before-0.1.115; '
              'echo old > %s/worker-backups-before-0.1.114/worker.old; echo note > %s/notes.txt; '
              'echo old > controller-before-0.1.115/state.json; echo tmp > shared-egress/leftover.tmp; '
              'echo stray > stray-top.txt') % (ROOT, A1, A1, A1)
    sudo('sh', '-c', script)


@scenario('IT-M01')
def m01():
    h = wait_health()
    check(h.get('version') == PY_VERSION and 'guard-api-v1' not in h.get('features', []),
          'python 0.1.118 controller healthy', version=h.get('version'), image=h.get('controller_image'))
    # a2 direct first: the first apply creates the gateway and its uplink.
    s, b, dt = put_config(A2, desired_for(A2, 'a2-r1', direct=True))
    check(s == 200 and b.get('status') == 'ready', 'python a2 direct ready', status=s, seconds=round(dt, 1),
          answer=b if s != 200 else None)
    ST['fixtures'] = {n: start_fixture(n) for n in ('ccg-gt-fixture-p1', 'ccg-gt-fixture-p2')}
    save_state(ST)
    s, b, dt = put_config(A1, desired_for(A1, 'a1-r1', proxy=proxy_for('ccg-gt-fixture-p1')))
    check(s == 200 and b.get('status') == 'ready', 'python a1 via P1 ready', status=s, seconds=round(dt, 1),
          answer=b if s != 200 else None)
    ev = fixture_events('ccg-gt-fixture-p1')
    check(any(e['label'] == 'http' for e in ev), 'a1 activation probe went through P1', events=len(ev))
    make_files()
    for aid in (A1, A2):
        s, b = status(aid)
        check(s == 200 and b.get('status') == 'ready', '%s ready after file setup' % aid, status=b.get('status'))
    snap = snapshot('m01')
    record('baseline archived', True, files=len(snap['files']), containers=sorted(snap['containers']),
           bridge_rules=len(snap['bridge']), path=os.path.join(WORK, 'snapshot-m01.json'))


@scenario('IT-M02')
def m02():
    code, out, err = gtctl('guard-files')
    check(code == 0, 'compose files, .env and control network', out=out[-200:], err=err[-300:])
    p = subprocess.run(['sudo', '-n', 'docker', 'compose', '-p', 'ccgateway-gt', '--project-directory', '/opt/ccgateway-gt',
                        '-f', '/opt/ccgateway-gt/compose.yml', '--env-file', '/opt/ccgateway-gt/.env', 'run', '--rm',
                        '--no-deps', '--name', 'ccg-gt-guard-print', 'guard', 'ccgateway-guard', 'print-rules',
                        '--chain', CHAIN + '-PROXY-BRIDGE'], capture_output=True, text=True, timeout=300)
    with open(os.path.join(WORK, 'm02-print-rules.txt'), 'w') as f:
        f.write(p.stdout)
    kernel = chain_rules('PROXY-BRIDGE')
    with open(os.path.join(WORK, 'm02-python-chain.txt'), 'w') as f:
        f.write('\n'.join(kernel) + '\n')
    go = [l for l in p.stdout.splitlines() if l.startswith('-A ')]
    norm = lambda rules: sorted(canon(r) for r in rules)  # noqa: E731
    same = norm(go) == norm(kernel)
    check(p.returncode == 0 and len(kernel) > 0 and same, 'print-rules equals the Python bridge guard chain',
          go_rules=len(go), python_rules=len(kernel), stderr=p.stderr[-300:],
          only_go=sorted(set(norm(go)) - set(norm(kernel)))[:4], only_python=sorted(set(norm(kernel)) - set(norm(go)))[:4])
    p = subprocess.run(['sudo', '-n', 'docker', 'compose', '-p', 'ccgateway-gt', '--project-directory', '/opt/ccgateway-gt',
                        '-f', '/opt/ccgateway-gt/compose.yml', '--env-file', '/opt/ccgateway-gt/.env', 'run', '--rm',
                        '--no-deps', '--name', 'ccg-gt-guard-diff', 'guard', 'ccgateway-guard', 'diff-rules',
                        '--chain', CHAIN + '-PROXY-BRIDGE'], capture_output=True, text=True, timeout=300)
    check(p.returncode == 0 and 'identical' in p.stdout, 'diff-rules against the kernel chain: identical',
          out=p.stdout.strip()[-300:])
    # The Python unit stops (it flushes nothing on stop); the guard takes the chain over.
    gtctl('bridge-stop')
    code, out, err = sh_dc('up', '-d', '--no-deps', 'guard')
    check(code == 0, 'compose up guard', err=err[-300:])
    t0 = time.time()
    ok = False
    while time.time() - t0 < 60:
        if subprocess.run(['sudo', '-n', 'docker', 'exec', 'ccg-gt-guard', 'ccgateway-guard', 'ready'],
                          capture_output=True).returncode == 0:
            ok = True
            break
        time.sleep(1)
    check(ok, 'guard ready', seconds=round(time.time() - t0, 1))
    after = chain_rules('PROXY-BRIDGE')
    check(norm(after) == norm(kernel), 'bridge chain unchanged after the guard took over', rules=len(after))
    for aid in (A1, A2):
        s, b = status(aid)
        check(s == 200 and b.get('status') == 'ready', '%s still ready under the guard (Python controller)' % aid)
    ev0 = len(fixture_events('ccg-gt-fixture-p1'))
    rev = ST['desired'][A1]['revision']
    from itlib import egress_stream_via
    r = egress_stream_via(A1)
    check(r.get('count') == 100 and r.get('via') == ['http'], 'a1 egress through P1 works with guard rules', answer=r)


def canon(rule):
    """A rule as iptables -S prints it and as a restore line, compared without
    regard to option order: (option, value) pairs, comma lists sorted."""
    toks = rule.replace('"', '').split()
    pairs, i = [], 0
    while i < len(toks):
        opt, vals = toks[i], []
        i += 1
        while i < len(toks) and not toks[i].startswith('-'):
            vals.append(','.join(sorted(toks[i].split(','))))
            i += 1
        pairs.append(opt + ' ' + ' '.join(vals))
    return ' | '.join(sorted(pairs))


def sh_dc(*args, timeout=600):
    p = subprocess.run(['sudo', '-n', 'docker', 'compose', '-p', 'ccgateway-gt', '--project-directory', '/opt/ccgateway-gt',
                        '-f', '/opt/ccgateway-gt/compose.yml', '--env-file', '/opt/ccgateway-gt/.env', *args],
                       capture_output=True, text=True, timeout=timeout)
    return p.returncode, p.stdout, p.stderr


def env_with_image(image):
    lines = []
    for line in sudo('cat', ENVF).splitlines():
        lines.append('CCG_CONTROLLER_IMAGE=' + image if line.startswith('CCG_CONTROLLER_IMAGE=') else line)
    return '\n'.join(lines) + '\n'


def moved_path(p):
    return 'shared-egress-state.json' if p == 'shared-egress/state.json' else p


def stays(p):
    parts = p.split('/')
    if p in GW_STAY or (p.startswith('shared-egress/') and p != 'shared-egress/state.json'):
        return True
    if len(parts) >= 2 and parts[-1] in STAY and len(parts) == 2:
        return True
    # not a key directory and not a controller file: history, unknown top level
    top = parts[0]
    if top in ('.lock', 'runtime.json', 'uploads', 'backups', 'shared-egress'):
        return False
    import re
    return not re.fullmatch(r'(?:[1-9][0-9]*|d[0-9a-f]{16})', top)


def adopt(tag):
    """The gt install script on a host whose controller is the docker-run Python one."""
    before = account_containers()
    gw_before = gt_containers().get(GATEWAY)
    pre = snapshot('pre-' + tag)
    t0 = time.time()
    p = subprocess.run(['sudo', '-n', 'sh', os.path.join(GEN, 'gt-adopt.sh')], input=env_with_image(GO_IMAGE),
                       capture_output=True, text=True, timeout=600)
    t_script = time.time() - t0
    last = (p.stdout.strip().splitlines() or [''])[-1]
    check(last == 'CCG_RESULT=started', 'gt adopt script: CCG_RESULT=started', last=last, seconds=round(t_script, 1),
          out=p.stdout[-300:] if last != 'CCG_RESULT=started' else None)
    h = wait_health(want_feature='guard-api-v1', want_image=GO_IMAGE, seconds=90)
    t_health = time.time() - t0
    record('Go controller healthy', True, version=h.get('version'), seconds_from_start=round(t_health, 1))
    post_root, post_data = file_hashes(ROOT), file_hashes(DATA)
    moved_ok, problems = 0, []
    for p_, hsh in pre['files'].items():
        if stays(p_):
            if post_root.get(p_) != hsh:
                problems.append('stay-changed:' + p_)
        else:
            d = moved_path(p_)
            if post_data.get(d) != hsh:
                problems.append(('moved-changed:' if d in post_data else 'moved-missing:') + p_)
            elif p_ in post_root:
                problems.append('still-in-root:' + p_)
            else:
                moved_ok += 1
    record('state files moved byte for byte (right after the script)', not problems, moved=moved_ok,
           problems=problems[:20])
    adopted = sudo('cat', DATA + '/.adopted')
    keeps = [l for l in adopted.splitlines() if l.startswith('keep ')]
    record('.adopted journal', True, moved=sum(1 for l in adopted.splitlines() if l.startswith('mv ')), keeps=keeps)
    # Ready again (RB9) and nothing recreated.
    ready_t = {}
    for aid in sorted(before and [k.split('-')[2] for k in before]):
        st = ST['desired'].get(aid)
        if not st or st.get('_deleted'):
            continue
        dt = wait_ready(aid, st['revision'], seconds=60)
        ready_t[aid] = round(time.time() - t0 - t_health + dt * 0, 1)
    after = account_containers()
    same = all(after.get(n, {}).get('id') == v['id'] and after.get(n, {}).get('started') == v['started']
               for n, v in before.items())
    check(same, 'account containers: same IDs, not restarted', before={n: v['id'][:12] for n, v in before.items()},
          after={n: v['id'][:12] for n, v in after.items()})
    gw_after = gt_containers().get(GATEWAY)
    check(gw_after and gw_before and gw_after['id'] == gw_before['id'] and gw_after['started'] == gw_before['started'],
          'gateway not recreated or restarted')
    ready_after = time.time() - t0
    check(ready_after - t_health <= 15, 'accounts ready within 10-15 s of the Go controller start',
          ready_seconds_after_health=round(ready_after - t_health, 1), per_account=ready_t)
    # Bytes once the Go recover has run (it re-applies every ready runtime).
    post_data2 = file_hashes(DATA)
    changed = sorted(d for d, hsh in post_data.items() if post_data2.get(d) != hsh)
    record('state files after the Go recover pass', not changed, changed=changed[:20])
    ci = inspect(CONTROLLER)
    hc = ci['HostConfig']
    nets = ci['NetworkSettings']['Networks']
    mounts = [(m['Source'], m['Destination']) for m in ci['Mounts']]
    ok = (list(nets) == ['ccg-gt-control'] and nets['ccg-gt-control']['IPAddress'] == '172.29.255.10'
          and mounts == [(DATA, '/data')] and hc['CapDrop'] == ['ALL'] and hc['ReadonlyRootfs'] and not hc['Privileged']
          and ci['Config']['Labels'].get('com.docker.compose.project') == 'ccgateway-gt')
    check(ok, 'compose controller inspect (network, IP, mounts, caps, rootfs, labels)', networks=list(nets),
          mounts=mounts, capdrop=hc['CapDrop'], readonly=hc['ReadonlyRootfs'])
    ready = [a for a in (A1, A2, A3) if status(a)[1].get('status') == 'ready']
    fwd = chain_rules('CONTROL-FWD')
    check(len(fwd) >= 2 * len(ready), 'CONTROL-FWD has 2 rules per ready account', rules=len(fwd), ready=ready)
    with open(os.path.join(WORK, 'adopt-%s.out' % tag), 'w') as f:
        f.write(p.stdout + '\n--- stderr\n' + p.stderr)
    return before


@scenario('IT-M03')
def m03():
    adopt('m03')


@scenario('IT-M04')
def m04():
    before = gt_containers()
    for aid in (A1, A2):
        d = ST['desired'][aid]
        s, b, dt = put_config(aid, d)
        check(s == 200 and b.get('status') == 'ready' and b.get('revision') == d['revision'],
              'Go apply of the pre-adopt config for %s' % aid, status=s, seconds=round(dt, 2), answer=b if s != 200 else None)
    after = gt_containers()
    diff = {n: (v['id'][:12], after.get(n, {}).get('id', '')[:12]) for n, v in before.items()
            if after.get(n, {}).get('id') != v['id'] or after.get(n, {}).get('started') != v['started']}
    check(not diff, 'no container recreated or restarted by the same config (fingerprint, identity, tag)', changed=diff)


@scenario('IT-M05')
def m05():
    s, b, dt = put_config(A3, desired_for(A3, 'a3-go', proxy=proxy_for('ccg-gt-fixture-p2')))
    check(s == 200 and b.get('status') == 'ready', 'Go creates a3 via P2', status=s, seconds=round(dt, 1),
          answer=b if s != 200 else None)
    s, _, b = api('POST', '/accounts/%s/worker' % A3,
                  {'image': APP_117, 'components': ['worker', 'cli'], 'cli_version': CLI_VERSION}, timeout=600)
    pb = jbody(b)
    check(s == 200 and pb.get('status') == 'updated' and pb.get('online') is True, 'Go paired activation a3',
          status=s, answer=pb)
    wait_ready(A3, ST['desired'][A3]['revision'], 30)


@scenario('IT-M06')
def m06():
    code, out, err = gtctl('finish')
    check(code == 0 and out.strip().endswith('CCG_RESULT=done'), 'gt finish (S5 done: prev Python removed)',
          out=out[-200:])
    before = account_containers()
    t0 = time.time()
    code, out, err = gtctl('release')
    check(code == 0 and 'CCG_RELEASE=done' in out, 'release (04 §5.3 steps 2-4)', out=out[-300:], err=err[-300:])
    h = wait_health(seconds=60)
    check(h.get('version') == PY_VERSION, 'Python 0.1.118 back', version=h.get('version'),
          seconds=round(time.time() - t0, 1))
    for aid in (A1, A2, A3):
        dt = wait_ready(aid, ST['desired'][aid]['revision'], 60)
        record('%s ready under Python after release' % aid, True, seconds_after_health=round(dt, 1))
    s, _, b = api('GET', '/accounts')
    keys = [r['key'] for r in jbody(b).get('runtimes', [])]
    check(s == 200 and set(keys) >= {A1, A2, A3}, 'Python lists the Go-created a3', keys=keys)
    s, b, dt = put_config(A3, ST['desired'][A3])
    check(s == 200 and b.get('status') == 'ready', 'Python applies the same a3 config', status=s,
          answer=b if s != 200 else None)
    after = account_containers()
    same = all(after.get(n, {}).get('id') == v['id'] and after.get(n, {}).get('started') == v['started']
               for n, v in before.items())
    check(same, 'no account container recreated or restarted across release',
          changed=[n for n, v in before.items() if after.get(n, {}).get('id') != v['id']])
    s, b = status(A3)
    check(b.get('active_runtime') or True, 'a3 status readable by Python', cli=b.get('cli'))


@scenario('IT-M08')
def m08():
    """The old Python controller asked to upgrade itself to the Go image."""
    h0 = wait_health()
    check(h0.get('version') == PY_VERSION, 'Python controller is current')
    s, _, b = api('POST', '/runtime/controller', {'image': GO_IMAGE}, timeout=120)
    ans = jbody(b)
    time.sleep(8)
    h1 = wait_health(seconds=30)
    helper = inspect('ccg-gt-controller-upgrade', '{{.State.Status}}')
    ok = h1.get('version') == PY_VERSION and h1.get('controller_image') == h0.get('controller_image')
    record('Python upgrade request answer', s in (202, 503), status=s, answer=ans, helper_state=helper)
    check(ok, 'old controller unaffected', version=h1.get('version'), image=h1.get('controller_image'))
    if helper is not None:
        docker('rm', '-f', gt_name('ccg-gt-controller-upgrade'), check=False)
    for aid in (A1, A2, A3):
        s, b = status(aid)
        check(b.get('status') == 'ready', '%s still ready' % aid)


@scenario('IT-M07')
def m07():
    adopt('m07')
    code, out, err = gtctl('finish')
    check(code == 0 and out.strip().endswith('CCG_RESULT=done'), 'gt finish after the second adopt', out=out[-200:])


@scenario('IT-M09')
def m09():
    """S6 rehearsal: the docker-py gateway is replaced by the compose service."""
    gw = inspect(GATEWAY)
    check(gw['Config']['Labels'].get('com.docker.compose.project') != 'ccgateway-gt', 'precondition: legacy gateway')
    keys = sorted(k for k in ST['desired'] if status(k)[1].get('status') == 'ready')
    t0 = time.time()
    docker('rm', '-f', gt_name(GATEWAY))
    code, out, err = sh_dc('--profile', 'egress', 'up', '-d', '--no-deps', 'egress')
    t_up = time.time() - t0
    check(code == 0, 'compose --profile egress up -d --no-deps egress', err=err[-300:], seconds=round(t_up, 1))
    per = {}
    for aid in keys:
        wait_ready(aid, ST['desired'][aid]['revision'], 180)
        per[aid] = round(time.time() - t0, 1)
    record('outage: all accounts ready again', True, per_account_seconds=per, accounts=len(keys))
    gw = inspect(GATEWAY)
    lb = gw['Config']['Labels']
    check(lb.get('com.docker.compose.project') == 'ccgateway-gt' and lb.get('com.docker.compose.service') == 'egress'
          and lb.get('io.sup2api.ccgateway.shared') == 'ccg-gt', 'gateway is the compose egress service')
    code, out, err = sh_dc('ps', '--format', '{{.Name}} {{.Service}}')
    record('compose ps', True, out=out.strip())
    ST.setdefault('perf', {})['M09'] = {'accounts': len(keys), 'seconds_to_all_ready': max(per.values()) if per else None}
    save_state(ST)
