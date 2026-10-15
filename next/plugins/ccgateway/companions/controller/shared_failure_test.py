"""Opt-in real-network fault audit. Never uses production names, roots or credentials."""
import contextlib
import json
import os
from pathlib import Path
import time

from manager import Manager
from shared_egress import routes

IP_PROBE = r"""const https=require('https');let r=https.get({hostname:'1.1.1.1',path:'/cdn-cgi/trace',timeout:3500},s=>{s.resume();s.on('end',()=>{console.log(JSON.stringify({reached:true,status:s.statusCode}));process.exit(0)})});r.on('timeout',()=>r.destroy());r.on('error',e=>{console.log(JSON.stringify({reached:false,code:e.code||'timeout'}));process.exit(1)});setTimeout(()=>process.exit(2),4500);"""
DNS_PROBE = r"""const d=require('dgram');let s=d.createSocket('udp4');let q=Buffer.from('123401000001000000000000076578616d706c6503636f6d0000010001','hex');s.on('message',b=>{console.log(JSON.stringify({rcode:b[3]&15}));process.exit((b[3]&15)===0?0:1)});s.on('error',()=>process.exit(1));s.send(q,53,process.argv[1]);setTimeout(()=>process.exit(2),3500);"""


def main():
    root = Path(os.environ['TEST_RUNTIME_ROOT'])
    if '/checks/xray-failclosed-' not in str(root) or root.name != 'isolated-runtime':
        raise RuntimeError('isolated audit root required')
    m = Manager(str(root), 'ccgateway-app:0.1.55', 'ccgateway-egress:0.1.55', prefix='ccg-fault-test')
    aid = 'dfa11face00000001'
    fixture = gateway = None
    result = []
    def record(name, **fields):
        entry = {'test': name, **fields}
        result.append(entry)
        (root.parent / 'fault-results.json').write_text(json.dumps(result, indent=2))
        print(json.dumps(entry), flush=True)
    def probe(kind='ip', address=None):
        command = ['node', '-e', IP_PROBE] if kind == 'ip' else ['node', '-e', DNS_PROBE, address or m.state(aid)['gateway_ip']]
        code, out = m.owned(aid, 'app').exec_run(command)
        return code == 0
    def both_blocked(name):
        ip, dns = probe(), probe('dns')
        record(name, ip_reached=ip, dns_resolved=dns)
        assert not ip and not dns, name
    desired = {'revision': 'a' * 64, 'direct': True, 'enabled': True,
               'auth': {'mode': 'api_key', 'api_key': 'fault-test-unused-key'}}
    try:
        assert m.apply(aid, desired)['status'] == 'ready'
        for _ in range(10):
            status = m.shared.migrate(aid, 'shared_xray')
            if status.get('ready'):
                break
            time.sleep(1)
        else:
            raise RuntimeError('test runtime busy')
        gateway = m.shared.container()
        assert probe() and probe('dns')
        record('explicit_direct_baseline', passed=True)
        gateway.stop(timeout=5)
        both_blocked('gateway_container_stopped_direct_account')
        gateway.start()
        time.sleep(1)
        both_blocked('gateway_restarted_before_controller_replay')
        m.shared.recover()
        assert probe()

        # Local authenticated HTTP proxy, on the gateway uplink. No public port.
        network = m.name('d0000000000000000', 'xray-uplink')
        fixture_dir = root.parent / 'fixture'
        fixture = m.docker.containers.run('ccgateway-xray:1', detach=True, name='ccg-fault-test-proxy',
            entrypoint=['python', '/tests/shared_proxy_fixture.py'], network=network,
            volumes={str(fixture_dir): {'bind': '/fixture', 'mode': 'rw'},
                     str(root.parent / 'controller'): {'bind': '/tests', 'mode': 'ro'}},
            cap_drop=['ALL'], mem_limit='128m', pids_limit=80)
        fixture.reload()
        address = fixture.attrs['NetworkSettings']['Networks'][network]['IPAddress']
        desired = {**desired, 'revision': 'b' * 64, 'direct': False,
                   'proxy': {'protocol': 'http', 'host': address, 'port': 35081,
                             'username': 'fixture', 'password': 'test-only-password'}}
        time.sleep(1)
        assert m.apply(aid, desired)['status'] == 'ready'
        assert probe() and probe('dns')
        record('authenticated_proxy_baseline', passed=True)
        fixture.stop(timeout=2)
        both_blocked('upstream_proxy_stopped_with_direct_outbound_also_loaded')
        assert m.state(aid)['egress_backend'] == 'shared_xray'
        assert not any(c.name == m.name(aid, 'egress') for c in m.docker.containers.list())
        fixture.start()
        time.sleep(1)
        assert probe()

        tag = m.shared.data['bindings'][aid]['tag']
        m.shared.api(gateway, 'rmo', tag=tag)
        m.shared.loaded_nodes.discard(tag)
        both_blocked('selected_outbound_missing')
        m.shared.sync(gateway)
        assert probe()
        m.shared.api(gateway, 'adrules', routes({}))
        both_blocked('source_route_missing')
        m.shared.sync(gateway)

        # A frozen DNS supervisor leaves the separate Xray child alive.
        script = "import os,signal; p=[int(x) for x in os.listdir('/proc') if x.isdigit() and open('/proc/'+x+'/cmdline','rb').read().split(bytes([0]))[1:2]==[b'/usr/local/lib/ccg/service.py']]; assert len(p)==1,p; os.kill(p[0],signal.SIGSTOP); print(p[0])"
        pid = m.shared.exec(gateway, ['python', '-c', script]).decode().strip()
        try:
            record('dns_supervisor_frozen', ip_reached=probe(), dns_resolved=probe('dns'))
        finally:
            m.shared.exec(gateway, ['python', '-c', 'import os,signal;os.kill(' + pid + ',signal.SIGCONT)'])
        assert probe('dns')
        # No controller process / heartbeat is running during this test.
        record('controller_absent_current_policy', ip_reached=probe(), dns_resolved=probe('dns'))

        gateway.stop(timeout=5)
        both_blocked('gateway_container_stopped_proxy_account')
        gateway.start()
        time.sleep(1)
        m.shared.recover()
        assert probe()
        m.shared.exec(gateway, ['nft', 'delete', 'table', 'inet', 'ccg_shared'])
        ip = probe()
        record('gateway_firewall_missing_forwarding_disabled', ip_reached=ip)
        assert not ip
        m.shared.sync(gateway)
        assert probe()

        resolved = probe('dns', '127.0.0.11')
        record('docker_embedded_dns_bypass', resolved=resolved)
        assert not resolved
        app = m.owned(aid, 'app')
        app.restart(timeout=5)
        ip = probe()
        record('worker_restarted_before_route_activation', ip_reached=ip)
        assert not ip
        m.shared.apply(aid, m.state(aid), desired)
        assert probe()
        record('recovery_complete', passed=True)
    finally:
        # Dispose only the exact isolated resources created by this audit.
        if gateway:
            with contextlib.suppress(Exception):
                gateway.unpause()
            with contextlib.suppress(Exception):
                gateway.start()
        with contextlib.suppress(Exception):
            m.delete(aid)
        if fixture:
            with contextlib.suppress(Exception):
                fixture.remove(force=True)
        if gateway:
            with contextlib.suppress(Exception):
                gateway.remove(force=True)
        with contextlib.suppress(Exception):
            m.docker.networks.get(m.name('d0000000000000000', 'xray-uplink')).remove()
        record('cleanup', remaining_containers=[c.name for c in m.docker.containers.list(all=True) if c.name.startswith('ccg-fault-test-')])


if __name__ == '__main__':
    main()
