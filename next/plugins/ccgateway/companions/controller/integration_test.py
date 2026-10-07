"""Disposable real-Docker test. No Claude authorization or model calls.
Run as root on a dedicated Linux test host. Needs images already built.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import socketserver
import socket
import select
import threading
import time
import uuid
from http.server import ThreadingHTTPServer
import requests
from manager import Manager, Handler, LABEL


class Proxy(socketserver.StreamRequestHandler):
    def handle(self):
        first = self.rfile.readline()
        while self.rfile.readline().strip():
            pass
        if not first.startswith(b'CONNECT '):
            return
        self.server.hits += 1
        self.wfile.write(b'HTTP/1.1 200 Connection Established\r\n\r\n')
        self.wfile.flush()
        if first.split()[1] == b'1.1.1.1:443':
            # Only the DNS-over-HTTPS test reaches the public network.
            with socket.create_connection(('1.1.1.1', 443), timeout=10) as upstream:
                for _ in range(100):
                    ready, _, _ = select.select([self.connection, upstream], [], [], 10)
                    if not ready:
                        return
                    for source in ready:
                        data = source.recv(65536)
                        if not data:
                            return
                        (upstream if source is self.connection else self.connection).sendall(data)
            return
        # The test client makes plaintext HTTP to a documentation-only IP.
        self.rfile.readline()
        while self.rfile.readline().strip():
            pass
        data = self.server.marker.encode()
        self.wfile.write(b'HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Length: ' + str(len(data)).encode() + b'\r\n\r\n' + data)


class SocksProxy(socketserver.StreamRequestHandler):
    def handle(self):
        version, count = self.rfile.read(2)
        if version != 5 or 2 not in self.rfile.read(count):
            return
        self.wfile.write(b'\x05\x02'); self.wfile.flush()
        version, size = self.rfile.read(2)
        username = self.rfile.read(size)
        password = self.rfile.read(self.rfile.read(1)[0])
        if version != 1 or username != b'test-user' or password != b'test-password':
            self.wfile.write(b'\x01\x01'); return
        self.wfile.write(b'\x01\x00'); self.wfile.flush()
        version, command, _, kind = self.rfile.read(4)
        if version != 5 or command != 1:
            return
        self.rfile.read(4 if kind == 1 else 16 if kind == 4 else self.rfile.read(1)[0])
        self.rfile.read(2)
        self.wfile.write(b'\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00'); self.wfile.flush()
        self.rfile.readline()
        while self.rfile.readline().strip():
            pass
        self.wfile.write(b'HTTP/1.1 200 OK\r\nConnection: close\r\nContent-Length: 5\r\n\r\nSOCKS')


def main():
    prefix = 'ccgtest-' + uuid.uuid4().hex[:8]
    root = Path('/opt/ccg-runtime-tests') / prefix
    manager = Manager(root, 'ccg-app:account-dev', 'ccg-egress:dev', prefix, 'http://203.0.113.10/')
    servers = []
    control = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    control.daemon_threads = True
    control.manager, control.key = manager, 'test-controller-key-with-at-least-32-characters'
    threading.Thread(target=control.serve_forever, daemon=True).start()
    gateway = manager.docker.networks.get('bridge').attrs['IPAM']['Config'][0]['Gateway']
    try:
        for marker in ('proxy-A', 'proxy-B'):
            server = socketserver.ThreadingTCPServer((gateway, 0), Proxy)
            server.daemon_threads = True
            server.marker, server.hits = marker, 0
            threading.Thread(target=server.serve_forever, daemon=True).start()
            servers.append(server)
        def desired(index, revision):
            return {'revision': revision * 64, 'enabled': True,
                    'proxy': {'protocol': 'http', 'host': gateway, 'port': servers[index].server_address[1]}}
        manager.apply('1', desired(0, 'a'))
        manager.apply('2', desired(1, 'b'))
        origin = f'http://127.0.0.1:{control.server_port}'
        assert requests.get(origin + '/accounts/1/status', timeout=5).status_code == 401
        headers = {'Authorization': 'Bearer ' + control.key, 'X-CCG-Revision': 'a' * 64}
        status = requests.get(origin + '/accounts/1/admin/status', headers=headers, timeout=20)
        assert status.status_code == 200, status.status_code
        stale = requests.post(origin + '/accounts/1/v1/messages', json={},
            headers={**headers, 'X-CCG-Revision': 'f' * 64}, timeout=5)
        assert stale.status_code == 409
        def request(aid, target='http://203.0.113.10/'):
            app = manager.owned(aid, 'app')
            code, out = app.exec_run(['node', '-e',
                'fetch(process.argv[1],{signal:AbortSignal.timeout(4000)}).then(r=>r.text()).then(s=>process.stdout.write(s)).catch(()=>process.exit(2))', target])
            return code, out.decode()
        assert request('1') == (0, 'proxy-A'), request('1')
        assert request('2') == (0, 'proxy-B'), request('2')
        assert request('1', 'http://example.com/') == (0, 'proxy-A'), 'proxied DNS failed'
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(request, ['1', '2'] * 8))
        assert all(v == (0, 'proxy-A' if i % 2 == 0 else 'proxy-B') for i, v in enumerate(results)), results
        manager.apply('1', desired(1, 'c'))
        assert request('1') == (0, 'proxy-B')
        assert request('1', 'http://169.254.169.254/')[0] != 0
        assert request('1', 'http://[2606:4700:4700::1111]/')[0] != 0
        app = manager.owned('1', 'app')
        env = app.exec_run(['env'])[1].decode()
        assert not any(x + '=' in env for x in ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'))
        assert 'sing-box' not in app.exec_run(['sh', '-c', 'ls /config 2>/dev/null || true'])[1].decode()
        before = manager.owned('1', 'app').id
        manager.apply('1', desired(1, 'c'))
        assert manager.owned('1', 'app').id == before
        manager.owned('1', 'egress').stop(timeout=2)
        assert request('1')[0] != 0
        assert request('2') == (0, 'proxy-B')
        assert manager.public('1')['status'] != 'ready'
        manager.apply('1', desired(0, 'd'))
        assert request('1') == (0, 'proxy-A')
        socks = socketserver.ThreadingTCPServer((gateway, 0), SocksProxy)
        socks.daemon_threads = True
        threading.Thread(target=socks.serve_forever, daemon=True).start()
        servers.append(socks)
        manager.apply('1', {'enabled': True, 'revision': 'e' * 64,
            'proxy': {'protocol': 'socks5', 'host': gateway, 'port': socks.server_address[1],
                      'username': 'test-user', 'password': 'test-password'}})
        assert request('1') == (0, 'SOCKS')
        assert 'test-password' not in manager.owned('1', 'app').exec_run(['env'])[1].decode()
        # Repeated reconciliation retains both the business and egress identity.
        before_egress = manager.owned('1', 'egress').id
        current = manager.state('1')
        manager.apply('1', {'enabled': True, 'revision': current['revision'], 'proxy': {'protocol': 'socks5'}})
        assert manager.owned('1', 'egress').id == before_egress
        # Controller restart must not trust persisted readiness or create a
        # second business container for the account.
        original_app = manager.owned('1', 'app').id
        manager.lockfile.close()
        manager = Manager(root, 'ccg-app:account-dev', 'ccg-egress:dev', prefix, 'http://203.0.113.10/')
        control.manager = manager
        assert manager.public('1')['status'] == 'pending'
        manager.apply('1', desired(0, 'f'))
        assert manager.owned('1', 'app').id == original_app
        assert request('1') == (0, 'proxy-A')
        # Authentication is control-plane state; proxy updates preserve the app.
        account_auth = {'mode': 'api_key', 'api_key': 'test-api-key-one', 'base_url': 'https://relay.example'}
        config = {**desired(0, '1'), 'auth': account_auth}
        manager.apply('1', config)
        app = manager.owned('1', 'app')
        env = app.attrs['Config']['Env']
        assert 'ANTHROPIC_API_KEY=test-api-key-one' in env
        assert not any(v.split('=',1)[0].lower().endswith('_proxy') for v in env)
        assert 'test-api-key-one' not in (root / '1' / 'state.json').read_text()
        app.exec_run(['sh', '-ec', 'echo retained > /work/data/auth-test'])
        first_app = app.id
        other_app = manager.owned('2', 'app').id
        manager.apply('1', config)
        assert manager.owned('1', 'app').id == first_app
        manager.apply('1', {**desired(1, '2'), 'auth': account_auth})
        assert manager.owned('1', 'app').id == first_app
        assert request('1') == (0, 'proxy-B')
        forbidden = requests.post(origin + '/accounts/1/admin/auth/start', json={},
            headers={**headers, 'X-CCG-Revision': '2' * 64}, timeout=5)
        assert forbidden.status_code == 409
        manager.apply('1', {**desired(1, '3'), 'auth': {**account_auth, 'api_key': 'test-api-key-two'}})
        app = manager.owned('1', 'app')
        assert app.id != first_app
        assert 'ANTHROPIC_API_KEY=test-api-key-two' in app.attrs['Config']['Env']
        assert app.exec_run(['cat', '/work/data/auth-test'])[1].strip() == b'retained'
        assert manager.owned('2', 'app').id == other_app
        assert request('1') == (0, 'proxy-B')
        manager.apply('1', desired(0, '4'))
        assert not any(v.startswith('ANTHROPIC_') for v in manager.owned('1', 'app').attrs['Config']['Env'])
        assert request('1') == (0, 'proxy-A')
        print(json.dumps({'api_key_rotation': 'PASS', 'data_preserved': 'PASS', 'oauth_environment': 'PASS', 'api_key_proxy_switch': 'PASS'}))
        manager.block('1')
        assert manager.owned('1', 'app').status != 'running'
        print(json.dumps({'isolated_accounts': 2, 'concurrent_requests': 16, 'proxy_switch': 'PASS',
                          'fail_closed': 'PASS', 'dns_over_proxy': 'PASS', 'private_ipv6_blocked': 'PASS',
                          'socks5_auth': 'PASS', 'unchanged_config_reused': 'PASS', 'restart_recovery': 'PASS',
                          'proxy_environment': 'ABSENT', 'model_calls': 0}))
    finally:
        control.shutdown(); control.server_close()
        for c in manager.docker.containers.list(all=True, filters={'label': LABEL}):
            if c.name.startswith(prefix + '-') and c.name.endswith('-egress') and c.status != 'running':
                print(c.logs(tail=20).decode())
        for server in servers:
            server.shutdown(); server.server_close()
        # Cleanup only this invocation's named and labeled Docker resources.
        for c in manager.docker.containers.list(all=True, filters={'label': LABEL}):
            if c.name.startswith(prefix + '-'):
                c.remove(force=True)
        for n in manager.docker.networks.list(filters={'label': LABEL}):
            if n.name.startswith(prefix + '-'):
                n.remove()
        for v in manager.docker.volumes.list(filters={'label': LABEL}):
            if v.name.startswith(prefix + '-'):
                v.remove()
        # Retain only sanitized pass/fail output, not generated runtime secrets.
        import shutil
        if root.parent == Path('/opt/ccg-runtime-tests') and root.name == prefix:
            shutil.rmtree(root)


if __name__ == '__main__':
    main()
