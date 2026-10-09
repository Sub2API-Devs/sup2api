"""Byte tunnel GET /accounts/<key>/tunnel (CONTRACTS §53.5).

    python -m unittest -v test_tunnel
"""
import http.client
import json
import socket
import threading
import unittest
from unittest.mock import patch
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from manager import Handler
from test_manager import Base, CONTROLLER_KEY, REV


class AccountHandler(BaseHTTPRequestHandler):
    """Stands in for the account container on <app_ip>:8787."""
    protocol_version = 'HTTP/1.1'

    def log_message(self, *args):
        pass

    def do_POST(self):
        body = self.rfile.read(int(self.headers['Content-Length']))
        self.server.seen.append((self.path, self.headers.get('Authorization'), body))
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Transfer-Encoding', 'chunked')
        self.end_headers()
        for part in (b'event: one\n\n', b'event: two\n\n'):
            self.wfile.write(b'%x\r\n%s\r\n' % (len(part), part))
            self.wfile.flush()
            # The second event is only sent after the client saw the first:
            # proves the tunnel forwards bytes as they arrive.
            self.server.release.wait(5)
        self.wfile.write(b'0\r\n\r\n')

    def do_GET(self):
        raw = json.dumps({'path': self.path}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


class _Keep:
    """Buffered reader that survives HTTPResponse closing it (one tunnel, many responses)."""

    def __init__(self, f):
        self.f = f

    def __getattr__(self, name):
        return getattr(self.f, name)

    def close(self):
        pass


class _Sock:
    def __init__(self, f):
        self.f = _Keep(f)

    def makefile(self, *args, **kwargs):
        return self.f


def upgrade_request(aid, revision=REV, key=CONTROLLER_KEY, extra=b''):
    return (f'GET /accounts/{aid}/tunnel HTTP/1.1\r\nHost: gateway.test\r\n'
            f'Authorization: Bearer {key}\r\nX-CCG-Revision: {revision}\r\n'
            'Connection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n').encode() + extra


class TunnelTests(Base):
    def setUp(self):
        super().setUp()
        self.controller = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.controller.key, self.controller.manager = CONTROLLER_KEY, self.m
        self.controller.daemon_threads = True
        threading.Thread(target=self.controller.serve_forever, daemon=True).start()
        self.account = ThreadingHTTPServer(('127.0.0.1', 0), AccountHandler)
        self.account.daemon_threads = True
        self.account.seen, self.account.release = [], threading.Event()
        threading.Thread(target=self.account.serve_forever, daemon=True).start()
        p = patch('manager.ACCOUNT_PORT', self.account.server_address[1])
        p.start()
        self.addCleanup(p.stop)
        self.apply('7')
        state = self.m.state('7')
        state['app_ip'] = '127.0.0.1'
        self.m.save('7', state)

    def tearDown(self):
        self.account.release.set()
        for server in (self.controller, self.account):
            server.shutdown()
            server.server_close()
        super().tearDown()

    def call(self, path, headers, method='GET'):
        conn = http.client.HTTPConnection('127.0.0.1', self.controller.server_address[1], timeout=10)
        try:
            conn.request(method, path, headers=headers)
            res = conn.getresponse()
            return res.status, json.loads(res.read() or b'null')
        finally:
            conn.close()

    def headers(self, **extra):
        return {'Authorization': 'Bearer ' + CONTROLLER_KEY, 'X-CCG-Revision': REV,
                'Connection': 'Upgrade', 'Upgrade': 'ccg-tunnel', **extra}

    def test_tunnel_carries_http_with_streaming_and_half_close(self):
        sock = socket.create_connection(self.controller.server_address, timeout=10)
        self.addCleanup(sock.close)
        body = b'{"model":"x"}'
        request = (b'POST /v1/messages HTTP/1.1\r\nHost: 10.0.0.3:8787\r\nAuthorization: Bearer account-key\r\n'
                   b'Content-Type: application/json\r\nContent-Length: %d\r\n\r\n%s' % (len(body), body))
        # The model request is pipelined right behind the upgrade request, so
        # part of it sits in the controller's buffered reader already.
        sock.sendall(upgrade_request('7', extra=request))
        f = sock.makefile('rb')
        status = f.readline()
        self.assertEqual(status.split()[1], b'101')
        head = {}
        while (line := f.readline()) not in (b'\r\n', b''):
            name, value = line.decode().split(':', 1)
            head[name.strip().lower()] = value.strip()
        self.assertEqual(head['upgrade'], 'ccg-tunnel')
        self.assertEqual(head['connection'], 'Upgrade')
        res = http.client.HTTPResponse(_Sock(f), method='POST')
        res.begin()
        self.assertEqual(res.status, 200)
        self.assertEqual(res.getheader('Content-Type'), 'text/event-stream')
        self.assertEqual(res.read1(), b'event: one\n\n')  # before the rest exists
        self.account.release.set()
        self.assertEqual(res.read(), b'event: two\n\n')
        self.assertEqual(self.account.seen, [('/v1/messages', 'Bearer account-key', body)])
        # Same tunnel, next request (the account connection is keep-alive).
        sock.sendall(b'GET /admin/status HTTP/1.1\r\nHost: x\r\n\r\n')
        res = http.client.HTTPResponse(_Sock(f), method='GET')
        res.begin()
        self.assertEqual(json.loads(res.read()), {'path': '/admin/status'})
        # Client EOF reaches the account side, whose close comes back as EOF.
        sock.shutdown(socket.SHUT_WR)
        self.assertEqual(f.read(), b'')

    def test_upgrade_header_case_and_connection_list(self):
        sock = socket.create_connection(self.controller.server_address, timeout=10)
        self.addCleanup(sock.close)
        sock.sendall(upgrade_request('7').replace(b'Connection: Upgrade', b'Connection: keep-alive, upgrade')
                     .replace(b'Upgrade: ccg-tunnel', b'Upgrade: CCG-Tunnel'))
        self.assertEqual(sock.makefile('rb').readline().split()[1], b'101')

    def test_rejections(self):
        path = '/accounts/7/tunnel'
        self.assertEqual(self.call(path, self.headers(Authorization='Bearer ' + 'x' * 32)), (401, {'error': 'unauthorized'}))
        self.assertEqual(self.call(path, self.headers(**{'X-CCG-Revision': 'b' * 64})), (409, {'error': 'not_synchronized'}))
        self.assertEqual(self.call(path, self.headers(**{'X-CCG-Revision': ''})), (409, {'error': 'not_synchronized'}))
        self.assertEqual(self.call('/accounts/8/tunnel', self.headers()), (409, {'error': 'not_synchronized'}))
        self.assertEqual(self.call(path, self.headers(Upgrade='websocket')), (400, {'error': 'invalid_request'}))
        self.assertEqual(self.call(path, self.headers(Connection='keep-alive')), (400, {'error': 'invalid_request'}))
        self.assertEqual(self.call(path, self.headers(), method='POST'), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(self.account.seen, [])

    def test_stopped_runtime_is_not_synchronized(self):
        self.app('7').stop()
        self.assertEqual(self.call('/accounts/7/tunnel', self.headers()), (409, {'error': 'not_synchronized'}))

    def test_unreachable_account_is_runtime_unavailable(self):
        closed = socket.socket()
        closed.bind(('127.0.0.1', 0))
        port = closed.getsockname()[1]
        closed.close()
        with patch('manager.ACCOUNT_PORT', port):
            self.assertEqual(self.call('/accounts/7/tunnel', self.headers()), (503, {'error': 'runtime_unavailable'}))


if __name__ == '__main__':
    unittest.main()
