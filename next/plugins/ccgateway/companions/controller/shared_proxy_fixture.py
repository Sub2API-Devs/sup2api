"""Authenticated HTTP, HTTPS and SOCKS5 forwarders for isolated integration tests."""
import base64
import json
import os
import select
import socket
import socketserver
import ssl
import threading
import time

USER, PASSWORD = 'fixture', 'test-only-password'
LOG = threading.Lock()
VIA = {}


def exact(s, n):
    data = b''
    while len(data) < n:
        part = s.recv(n - len(data))
        if not part:
            raise OSError('EOF')
        data += part
    return data


def relay(client, host, port, ready, label):
    if port != 443:
        raise OSError('fixture only forwards HTTPS')
    target = ('127.0.0.1', 35084) if host == '198.18.0.10' else (host, port)
    with socket.create_connection(target, timeout=10) as upstream:
        VIA[upstream.getsockname()[1]] = label
        with LOG, open('/fixture/events.jsonl', 'a') as f:
            f.write(json.dumps({'label': label, 'host': host, 'port': port}) + '\n')
        ready()
        while True:
            reads, _, _ = select.select([client, upstream], [], [], 30)
            if not reads:
                return
            for source in reads:
                data = source.recv(65536)
                if not data:
                    return
                (upstream if source is client else client).sendall(data)


class HTTP(socketserver.BaseRequestHandler):
    def handle(self):
        client = self.request
        client.settimeout(10)
        try:
            data = b''
            while not data.endswith(b'\r\n\r\n'):
                data += exact(client, 1)
                if len(data) > 8192:
                    return
            lines = data.decode('ascii').split('\r\n')
            method, target, _ = lines[0].split(' ')
            headers = dict(line.lower().split(': ', 1) for line in lines[1:] if ': ' in line)
            expected = 'basic ' + base64.b64encode(f'{USER}:{PASSWORD}'.encode()).decode().lower()
            if method != 'CONNECT' or headers.get('proxy-authorization') != expected:
                client.sendall(b'HTTP/1.1 407 Proxy Authentication Required\r\nContent-Length: 0\r\n\r\n')
                return
            host, port = target.rsplit(':', 1)
            relay(client, host, int(port), lambda: client.sendall(b'HTTP/1.1 200 OK\r\n\r\n'), self.server.label)
        except (OSError, ValueError):
            pass


class SOCKS(socketserver.BaseRequestHandler):
    def handle(self):
        c = self.request
        c.settimeout(10)
        try:
            version, count = exact(c, 2)
            methods = exact(c, count)
            if version != 5 or 2 not in methods:
                return
            c.sendall(b'\x05\x02')
            version, n = exact(c, 2)
            user = exact(c, n).decode()
            password = exact(c, exact(c, 1)[0]).decode()
            if version != 1 or user != USER or password != PASSWORD:
                c.sendall(b'\x01\x01')
                return
            c.sendall(b'\x01\x00')
            head = exact(c, 4)
            if head[:3] != b'\x05\x01\x00':
                return
            if head[3] == 1:
                host = socket.inet_ntoa(exact(c, 4))
            elif head[3] == 3:
                host = exact(c, exact(c, 1)[0]).decode()
            else:
                return
            port = int.from_bytes(exact(c, 2), 'big')
            relay(c, host, port, lambda: c.sendall(b'\x05\x00\x00\x01' + b'\x00' * 6), 'socks')
        except (OSError, ValueError):
            pass


class Server(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True


class Stream(socketserver.BaseRequestHandler):
    def handle(self):
        try:
            data = b''
            while not data.endswith(b'\r\n\r\n'):
                data += exact(self.request, 1)
            self.request.sendall(b'HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n')
            for index in range(100):
                self.request.sendall(('data: ' + json.dumps({'index': index, 'via': VIA.get(self.client_address[1])}) + '\n\n').encode())
                time.sleep(.1)
        except OSError:
            pass


for port, handler, label in [(35081, HTTP, 'http'), (35082, HTTP, 'https'), (35083, SOCKS, 'socks'), (35084, Stream, 'stream')]:
    server = Server(('0.0.0.0', port), handler)
    server.label = label
    if label in ('https', 'stream'):
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain('/fixture/cert.pem', '/fixture/key.pem')
        server.socket = context.wrap_socket(server.socket, server_side=True)
    threading.Thread(target=server.serve_forever, daemon=True).start()
threading.Event().wait()
