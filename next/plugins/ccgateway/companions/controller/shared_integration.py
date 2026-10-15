"""Explicit isolated Docker test; uses unique prefix and never production state."""
import json
import os
from pathlib import Path
import time
import socket
from unittest.mock import patch

from manager import Manager, tar_file


def main():
    root = os.environ['TEST_RUNTIME_ROOT']
    if '/checks/xray-migration-' not in root or not root.endswith('/isolated-runtime'):
        raise RuntimeError('isolated root required')
    m = Manager(root, 'ccgateway-app:0.1.55', 'ccgateway-egress:0.1.55', prefix='ccg-xray-test')
    aid = 'd0123456789abcdef'
    desired = {'revision': 'a' * 64, 'direct': True, 'enabled': True,
               'auth': {'mode': 'api_key', 'api_key': 'test-key-unused'},
               'network': {'pool': '10.0.0.0/8', 'allocation': 'random'}}
    result = m.apply(aid, desired)
    assert result['status'] == 'ready', result
    identity = m.owned(aid, 'app').id
    time.sleep(5)
    result = m.shared.migrate(aid, 'shared_xray')
    assert result['ready'], result
    assert m.owned(aid, 'app').id == identity
    print(json.dumps({'test': 'migration', 'result': result}), flush=True)
    other = 'dfedcba9876543210'
    assert m.apply(other, desired)['status'] == 'ready'
    assert m.shared.migrate(other, 'shared_xray')['ready']
    c = m.shared.container()
    boot = c.attrs['State']['StartedAt']
    assert m.apply(aid, {**desired, 'revision': 'b' * 64})['status'] == 'ready'
    assert m.shared.container().attrs['State']['StartedAt'] == boot
    print(json.dumps({'test': 'update_no_restart', 'passed': True}), flush=True)
    c.restart(timeout=5)
    m.shared.recover()
    assert m.public(aid)['status'] == 'ready'
    print(json.dumps({'test': 'xray_restart_recovery', 'passed': True}), flush=True)
    # Exercise real authenticated proxy transports and source-aware DNS.
    fixture_dir = str(Path(root).parent / 'fixture')
    fixture_name = 'ccg-xray-test-proxy-fixture'
    try:
        fixture = m.docker.containers.get(fixture_name)
        fixture.remove(force=True)
    except Exception:
        pass
    (Path(fixture_dir) / 'events.jsonl').unlink(missing_ok=True)
    fixture_network = m.name('d0000000000000000', 'xray-uplink')
    fixture = m.docker.containers.run('ccgateway-xray:1', detach=True, name=fixture_name,
        entrypoint=['python', '/tests/shared_proxy_fixture.py'], network=fixture_network,
        volumes={fixture_dir: {'bind': '/fixture', 'mode': 'rw'},
                 str(Path(root).parent / 'controller'): {'bind': '/tests', 'mode': 'ro'}},
        cap_drop=['ALL'], mem_limit='128m', pids_limit=80)
    fixture.reload()
    address = fixture.attrs['NetworkSettings']['Networks'][fixture_network]['IPAddress']
    original_dns = socket.getaddrinfo
    def fixture_dns(host, port, *args, **kwargs):
        return original_dns(address if host in ('proxy.fixture.test', 'wrong.fixture.test') else host, port, *args, **kwargs)
    cert = (Path(fixture_dir) / 'cert.pem').read_bytes()
    c.put_archive('/usr/local/share/ca-certificates', tar_file('fixture.crt', cert))
    m.shared.exec(c, ['update-ca-certificates'])
    c.restart(timeout=5)
    m.shared.recover()
    with patch('network.socket.getaddrinfo', side_effect=fixture_dns):
        bad_tls = {**desired, 'revision': '6' * 64, 'direct': False,
                   'proxy': {'protocol': 'https', 'host': 'wrong.fixture.test', 'port': 35082,
                             'username': 'fixture', 'password': 'test-only-password'}}
        try:
            m.apply(aid, bad_tls)
        except RuntimeError:
            pass
        else:
            raise AssertionError('untrusted proxy TLS unexpectedly accepted')
    print(json.dumps({'test': 'proxy_tls_hostname_validation', 'passed': True}), flush=True)
    time.sleep(1)
    with patch('network.socket.getaddrinfo', side_effect=fixture_dns):
        for index, protocol in enumerate(('http', 'https', 'socks5')):
            proxy = {'protocol': protocol, 'host': 'proxy.fixture.test', 'port': 35081 + index,
                     'username': 'fixture', 'password': 'test-only-password'}
            target = {**desired, 'revision': str(index + 1) * 64, 'proxy': proxy, 'direct': False}
            result = m.apply(aid, target)
            assert result['status'] == 'ready', result
            events = [json.loads(line) for line in (Path(fixture_dir) / 'events.jsonl').read_text().splitlines()]
            label = 'socks' if protocol == 'socks5' else protocol
            assert any(e['label'] == label and e['host'] == '1.1.1.1' for e in events), events
            assert any(e['label'] == label and e['host'] != '1.1.1.1' for e in events), events
            assert m.public(other)['status'] == 'ready'
            other_app = m.owned(other, 'app')
            m._activate(other, m.state(other), other_app, c, desired['revision'])
            print(json.dumps({'test': 'authenticated_proxy_and_dns', 'protocol': protocol, 'passed': True}), flush=True)
            if protocol == 'http':
                app = m.owned(aid, 'app')
                app.exec_run(['rm', '-f', '/tmp/xray-stream.json'])
                app.put_archive('/tmp', tar_file('fixture.crt', cert))
                stream_script = "const fs=require('fs');(async()=>{let r=await fetch('https://198.18.0.10/stream');let t=await r.text();let es=t.split('\\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));fs.writeFileSync('/tmp/xray-stream.json',JSON.stringify(es));})().catch(e=>{fs.writeFileSync('/tmp/xray-stream.json',JSON.stringify({error:e.message}));process.exit(1)});"
                app.exec_run(['node', '-e', stream_script], detach=True, environment={'NODE_EXTRA_CA_CERTS': '/tmp/fixture.crt'})
                time.sleep(1)
        time.sleep(11)
        code, out = m.owned(aid, 'app').exec_run(['cat', '/tmp/xray-stream.json'])
        assert code == 0
        events = json.loads(out)
        assert isinstance(events, list) and len(events) == 100, events
        assert [e['index'] for e in events] == list(range(100))
        assert all(e['via'] == 'http' for e in events), events
        print(json.dumps({'test': 'existing_sse_during_proxy_switch', 'count': 100, 'passed': True}), flush=True)
        try:
            m.apply(aid, {**target, 'revision': '4' * 64, 'proxy': {**proxy, 'password': 'wrong'}})
        except RuntimeError:
            pass
        else:
            raise AssertionError('bad proxy unexpectedly ready')
        assert m.public(aid)['status'] != 'ready'
        assert not m.shared.data['bindings'][aid]['active']
        print(json.dumps({'test': 'bad_credentials_fail_closed', 'passed': True}), flush=True)
    assert m.apply(aid, {**desired, 'revision': '5' * 64})['status'] == 'ready'
    fixture.remove(force=True)
    # A new controller process must discover existing API entries instead of adding duplicates.
    m._shared = None
    m.online.clear()
    m.shared.recover()
    assert m.public(aid)['status'] == 'ready'
    print(json.dumps({'test': 'controller_restart_recovery', 'passed': True}), flush=True)
    # TCP DNS, with a complete framed response, from the actual account namespace.
    dns_probe = "const n=require('net');let q=Buffer.from('123401000001000000000000076578616d706c6503636f6d0000010001','hex'),b=Buffer.alloc(2);b.writeUInt16BE(q.length);let s=n.connect(53,process.argv[1]),r=Buffer.alloc(0);s.setTimeout(10000,()=>process.exit(2));s.on('connect',()=>s.write(Buffer.concat([b,q])));s.on('data',x=>{r=Buffer.concat([r,x]);if(r.length>=2&&r.length>=r.readUInt16BE(0)+2)process.exit((r[5]&15)===0?0:3)});s.on('error',()=>process.exit(4));"
    assert m.owned(aid, 'app').exec_run(['node', '-e', dns_probe, m.state(aid)['gateway_ip']])[0] == 0
    print(json.dumps({'test': 'tcp_dns', 'passed': True}), flush=True)
    unknown = m.docker.containers.run('ccgateway-app:0.1.55', detach=True,
        name='ccg-xray-test-unknown', entrypoint=['node', '-e', 'setInterval(()=>{},1000)'],
        network=m.name(aid, 'net'), cap_drop=['ALL'], mem_limit='128m', pids_limit=64)
    try:
        m.oneshot(m.egress_image, entrypoint=['ip'],
            command=['route', 'replace', 'default', 'via', m.state(aid)['gateway_ip']],
            network_mode='container:' + unknown.id, cap_drop=['ALL'], cap_add=['NET_ADMIN'])
        code, _ = unknown.exec_run(['node', '-e', "fetch('https://1.1.1.1',{signal:AbortSignal.timeout(3000)}).then(()=>process.exit(0)).catch(()=>process.exit(1))"])
        assert code != 0
    finally:
        unknown.remove(force=True)
    print(json.dumps({'test': 'unknown_source_blocked', 'passed': True}), flush=True)
    result = m.shared.migrate(aid, 'per_account_singbox')
    assert result['ready'], result
    assert m.owned(aid, 'app').id == identity
    print(json.dumps({'test': 'rollback', 'result': result}), flush=True)
    original_activate = m._activate
    attempts = []
    def fail_once(*args):
        attempts.append(True)
        if len(attempts) == 1:
            raise RuntimeError('injected migration probe failure')
        return original_activate(*args)
    with patch.object(m, '_activate', side_effect=fail_once):
        try:
            for _ in range(15):
                outcome = m.shared.migrate(aid, 'shared_xray')
                if outcome.get('status') != 'busy':
                    raise AssertionError('injected migration unexpectedly succeeded')
                time.sleep(1)
        except RuntimeError:
            pass
        else:
            raise AssertionError('migration remained busy')
    assert m.shared.status(aid) == {'backend': 'per_account_singbox', 'migration': None, 'ready': True}
    assert m.owned(aid, 'app').id == identity
    print(json.dumps({'test': 'failed_migration_automatic_rollback', 'passed': True}), flush=True)
    state = m.state(aid)
    state['egress_migration'] = {'target': 'shared_xray', 'from': 'per_account_singbox', 'phase': 'stopped'}
    m.save(aid, state)
    m.owned(aid, 'app').stop(timeout=5)
    m.shared.recover()
    assert m.shared.status(aid) == {'backend': 'per_account_singbox', 'migration': None, 'ready': True}
    print(json.dumps({'test': 'interrupted_migration_recovery', 'passed': True}), flush=True)
    m.block(other)
    result = m.shared.migrate(other, 'per_account_singbox')
    assert result['backend'] == 'per_account_singbox' and not result['ready']
    assert m.owned(other, 'app').status != 'running'
    print(json.dumps({'test': 'disabled_offline_rollback', 'passed': True}), flush=True)
    m.delete(aid)
    m.delete(other)
    time.sleep(1)
    m.shared.collect()
    assert not m.shared.data['nodes']
    print(json.dumps({'test': 'unused_outbound_collection', 'passed': True}), flush=True)
    c.remove(force=True)
    m.docker.networks.get(m.name('d0000000000000000', 'xray-uplink')).remove()
    print(json.dumps({'test': 'cleanup', 'passed': True}), flush=True)


if __name__ == '__main__':
    main()
