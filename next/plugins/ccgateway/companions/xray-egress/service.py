"""Fail-closed Xray supervisor and source-aware DNS over local SOCKS + DoH.

No DNS cache: a query never inherits another binding's answer. No host DNS,
proxy environment, HTTP redirect, or unverified TLS fallback is used.
"""
import http.client
import json
import os
from pathlib import Path
import socket
import socketserver
import ssl
import struct
import subprocess
import threading

ROOT = Path('/config')
LIMIT = threading.BoundedSemaphore(64)


def exact(sock, count):
    data = b''
    while len(data) < count:
        part = sock.recv(count - len(data))
        if not part:
            raise OSError('short read')
        data += part
    return data


def socks(port, address, target_port):
    sock = socket.create_connection(('127.0.0.1', port), timeout=8)
    try:
        sock.sendall(b'\x05\x01\x00')
        if exact(sock, 2) != b'\x05\x00':
            raise OSError('SOCKS authentication')
        sock.sendall(b'\x05\x01\x00\x01' + socket.inet_aton(address) + struct.pack('!H', target_port))
        head = exact(sock, 4)
        if head[:2] != b'\x05\x00' or head[3] not in (1, 3, 4):
            raise OSError('SOCKS connection')
        length = {1: 4, 4: 16}.get(head[3])
        if length is None:
            length = exact(sock, 1)[0]
        exact(sock, length + 2)
        return sock
    except BaseException:
        sock.close()
        raise


def resolve(data, source):
    if len(data) < 12 or len(data) > 4096 or data[2] & 0x80 or data[4:6] != b'\x00\x01':
        return None
    try:
        # Atomically replaced by the controller, only after routes are installed.
        binding = json.loads((ROOT / 'dns.json').read_text()).get(source)
        if not binding:
            return None
        with socks(binding['port'], '1.1.1.1', 443) as raw:
            with ssl.create_default_context().wrap_socket(raw, server_hostname='cloudflare-dns.com') as tls:
                conn = http.client.HTTPSConnection('cloudflare-dns.com', timeout=8)
                conn.sock = tls
                conn.request('POST', '/dns-query', body=data,
                             headers={'Content-Type': 'application/dns-message', 'Accept': 'application/dns-message'})
                response = conn.getresponse()
                answer = response.read(65536)
                if response.status != 200 or len(answer) < 12 or len(answer) > 65535 or answer[:2] != data[:2]:
                    raise OSError('invalid DoH response')
                return answer
    except Exception:
        # Bounded SERVFAIL, never resolve locally or change the chosen egress.
        return data[:2] + bytes([data[2] | 0x80, (data[3] & 0xf0) | 2]) + data[4:6] + b'\x00' * 6 + data[12:]


class UDP(socketserver.BaseRequestHandler):
    def handle(self):
        data, sock = self.request
        answer = resolve(data, self.client_address[0])
        if answer:
            # Large answers force the client to retry over TCP.
            if len(answer) > 1232:
                answer = answer[:2] + bytes([answer[2] | 2, answer[3]]) + b'\x00' * 8
            sock.sendto(answer, self.client_address)


class TCP(socketserver.BaseRequestHandler):
    def handle(self):
        self.request.settimeout(10)
        try:
            count = struct.unpack('!H', exact(self.request, 2))[0]
            if count > 4096:
                return
            answer = resolve(exact(self.request, count), self.client_address[0])
            if answer:
                self.request.sendall(struct.pack('!H', len(answer)) + answer)
        except OSError:
            pass


class Bounded(socketserver.ThreadingMixIn):
    daemon_threads = True
    allow_reuse_address = True

    def process_request(self, request, client_address):
        if not LIMIT.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            LIMIT.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            LIMIT.release()


class UDPServer(Bounded, socketserver.UDPServer):
    pass


class TCPServer(Bounded, socketserver.TCPServer):
    pass


def main():
    # A restart always starts closed; persisted routes are replayed by the controller.
    subprocess.run(['nft', '-f', '/config/boot.nft'], check=True)
    subprocess.run(['ip', 'rule', 'add', 'fwmark', '1', 'lookup', '100'], check=True)
    subprocess.run(['ip', 'route', 'add', 'local', '0.0.0.0/0', 'dev', 'lo', 'table', '100'], check=True)
    servers = [UDPServer(('0.0.0.0', 53), UDP), TCPServer(('0.0.0.0', 53), TCP)]
    for server in servers:
        threading.Thread(target=server.serve_forever, daemon=True).start()
    child = subprocess.Popen(['xray', 'run', '-config', '/config/boot.json'])
    os._exit(child.wait() or 1)


if __name__ == '__main__':
    main()
