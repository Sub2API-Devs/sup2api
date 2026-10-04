"""Host-side account runtime controller; bind only to loopback, access over SSH.

Docker SDK owns container lifecycle; sing-box owns proxy protocols. The control
API is never exposed on a business network. State is root-private on this host.
"""
import contextlib
import fcntl
import hmac
import hashlib
from urllib.parse import urlsplit
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import docker
import requests
from network import configuration, business_rules

ID = re.compile(r'^[1-9][0-9]{0,17}$')
REVISION = re.compile(r'^[a-f0-9]{64}$')
LABEL = 'io.sup2api.ccgateway.account'
PROXY_VARS = ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
              'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy')

AUTH_LABEL = 'io.sup2api.ccgateway.auth'
AUTH_VARS = ('ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')


def upstream_headers(inbound, secret):
    headers = {'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json'}
    for name in ('anthropic-version', 'anthropic-beta', 'x-ccgateway-session-id', 'x-ccgateway-session-scope'):
        if name in inbound:
            headers[name] = inbound[name]
    return headers


def authentication(raw):
    # Missing auth preserves compatibility with existing OAuth controllers.
    raw = {'mode': 'oauth'} if raw is None else raw
    if not isinstance(raw, dict):
        raise ValueError('invalid authentication')
    if raw == {'mode': 'oauth'}:
        return raw
    if raw.get('mode') != 'api_key' or set(raw) - {'mode', 'api_key', 'base_url'}:
        raise ValueError('invalid authentication')
    key, base = raw.get('api_key'), raw.get('base_url') or 'https://api.anthropic.com'
    if not isinstance(key, str) or not 8 <= len(key) <= 512 or any(ord(c) < 33 or ord(c) > 126 for c in key):
        raise ValueError('invalid API key')
    if not isinstance(base, str) or len(base) > 2048 or any(c.isspace() for c in base):
        raise ValueError('invalid base URL')
    url = urlsplit(base)
    if url.scheme != 'https' or not url.hostname or url.username is not None or url.password is not None or '?' in base or '#' in base:
        raise ValueError('invalid base URL')
    base = base.rstrip('/').removesuffix('/v1')
    return {'mode': 'api_key', 'api_key': key, 'base_url': base}


def write_private(path, value):
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        os.chmod(tmp, 0o600)
        f.write(value)
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


class Manager:
    def __init__(self, root, app_image, egress_image, prefix='ccg', probe_url='https://www.gstatic.com/generate_204'):
        if not re.fullmatch(r'[a-z][a-z0-9-]{0,24}', prefix):
            raise ValueError('invalid prefix')
        self.root = Path(root).resolve()
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(self.root, 0o700)
        # One authoritative writer per state directory, including across processes.
        self.lockfile = open(self.root / '.lock', 'w')
        fcntl.flock(self.lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.docker = docker.from_env(timeout=60)
        self.app_image, self.egress_image, self.prefix = app_image, egress_image, prefix
        self.probe_url = probe_url
        self.locks, self.lock = {}, threading.Lock()
        self.online = {}  # Never trust persisted readiness after controller restart.
        self.boots = {}

    def guard(self, aid):
        if not ID.fullmatch(aid):
            raise ValueError('invalid account')
        with self.lock:
            return self.locks.setdefault(aid, threading.RLock())

    def name(self, aid, role):
        return f'{self.prefix}-{aid}-{role}'

    def owned(self, aid, role):
        c = self.docker.containers.get(self.name(aid, role))
        if c.labels.get(LABEL) != aid:
            raise ValueError('container ownership mismatch')
        return c

    def state(self, aid):
        p = self.root / aid / 'state.json'
        return json.loads(p.read_text()) if p.exists() else None

    def save(self, aid, state):
        write_private(self.root / aid / 'state.json', json.dumps(state))

    def common(self, aid):
        return dict(labels={LABEL: aid}, detach=True, init=True,
                    cap_drop=['ALL'], security_opt=['no-new-privileges:true'],
                    pids_limit=256, log_config=docker.types.LogConfig(
                        type='json-file', config={'max-size': '20m', 'max-file': '3'}))

    def helper(self, aid, app, script, rules):
        # Fixed helper image, no Docker socket, no host network/PID namespaces.
        d = self.root / aid
        write_private(d / 'app.nft', rules)
        self.docker.containers.run(self.egress_image, entrypoint=['sh', '-ec'],
            command=[script], network_mode='container:' + app.id,
            cap_drop=['ALL'], cap_add=['NET_ADMIN'], security_opt=['no-new-privileges:true'],
            volumes={str(d / 'app.nft'): {'bind': '/app.nft', 'mode': 'ro'}},
            remove=True)

    def provision(self, aid, auth=None):
        auth = authentication(auth)
        d = self.root / aid
        d.mkdir(mode=0o700, exist_ok=True)
        state = self.state(aid)
        # Hash with a private per-account salt; never persist upstream keys in
        # controller state or expose a credential fingerprint in status.
        salt = state['admin_key'] if state else secrets.token_urlsafe(32)
        fingerprint = hmac.new(salt.encode(), json.dumps(auth, sort_keys=True).encode(), hashlib.sha256).hexdigest()
        if state:
            try:
                existing = self.owned(aid, 'app')
                if existing.labels.get(AUTH_LABEL) == fingerprint:
                    return state
                self.online.pop(aid, None)
                existing.remove(force=True)
            except docker.errors.NotFound:
                pass
        try:
            network = self.docker.networks.get(self.name(aid, 'net'))
            if network.attrs.get('Labels', {}).get(LABEL) != aid:
                raise ValueError('network ownership mismatch')
        except docker.errors.NotFound:
            network = self.docker.networks.create(self.name(aid, 'net'), driver='bridge',
                internal=True, labels={LABEL: aid}, enable_ipv6=False)
        network.reload()
        subnet = ipaddress.ip_network(network.attrs['IPAM']['Config'][0]['Subnet'])
        gateway_ip, app_ip = str(subnet.network_address + 2), str(subnet.network_address + 3)
        write_private(d / 'resolv.conf', f'nameserver {gateway_ip}\noptions timeout:2 attempts:2\n')
        # resolv.conf contains only the ordinary internal DNS address.
        os.chmod(d / 'resolv.conf', 0o644)
        state = state or {'api_key': secrets.token_urlsafe(32), 'admin_key': salt,
                 'app_ip': app_ip, 'gateway_ip': gateway_ip, 'revision': '', 'status': 'pending'}
        self.save(aid, state)
        volume = self.docker.volumes.create(self.name(aid, 'data'), labels={LABEL: aid})
        self.docker.containers.run(self.app_image, entrypoint=['sh', '-ec'],
            command=['mkdir -p /work/config /work/data; chown -R 1000:1000 /work'],
            user='0', network_mode='none', volumes={volume.name: {'bind': '/work', 'mode': 'rw'}}, remove=True)
        env = {}
        image_env = self.docker.images.get(self.app_image).attrs['Config'].get('Env', [])
        if any(v.split('=', 1)[0] in PROXY_VARS + AUTH_VARS for v in image_env):
            raise ValueError('business image contains account credentials or proxy environment variables')
        env.update(CCG_API_KEY=state['api_key'], CCG_ADMIN_KEY=state['admin_key'], CCG_EXTERNAL_EGRESS='1')
        if auth['mode'] == 'api_key':
            env.update(ANTHROPIC_API_KEY=auth['api_key'], ANTHROPIC_BASE_URL=auth['base_url'])
        options = self.common(aid)
        options['labels'][AUTH_LABEL] = fingerprint
        app = self.docker.containers.create(self.app_image, name=self.name(aid, 'app'),
            network=network.name, networking_config={network.name: self.docker.api.create_endpoint_config(ipv4_address=app_ip)}, user='1000:1000', environment=env,
            volumes={volume.name: {'bind': '/work', 'mode': 'rw'},
                     str(d / 'resolv.conf'): {'bind': '/etc/resolv.conf', 'mode': 'ro'}},
            mem_limit='2g', nano_cpus=2000000000, **options)
        state['auth_mode'] = auth['mode']
        self.save(aid, state)
        return state

    def apply(self, aid, desired):
        with self.guard(aid):
            revision = desired.get('revision', '')
            if not REVISION.fullmatch(revision):
                raise ValueError('invalid revision')
            if not desired.get('proxy') or not desired.get('enabled', True):
                return self.block(aid)
            state = self.provision(aid, desired.get('auth'))
            if self.public(aid)['revision'] == revision:
                app, egress = self.owned(aid, 'app'), self.owned(aid, 'egress')
                if app.status == 'running' and egress.status == 'running':
                    return self.public(aid)
            self.online.pop(aid, None)
            state['status'] = 'syncing'
            self.save(aid, state)
            # Config validation happens before the old egress is stopped.
            config, rules = configuration(desired['proxy'], state['app_ip'], state['gateway_ip'])
            d = self.root / aid
            write_private(d / 'sing-box.json', json.dumps(config))
            write_private(d / 'firewall.nft', rules)
            self.docker.containers.run(self.egress_image,
                entrypoint=['sing-box', 'check', '-c', '/config/sing-box.json'],
                network_mode='none', volumes={str(d): {'bind': '/config', 'mode': 'ro'}}, remove=True)
            try:
                old = self.owned(aid, 'egress')
            except docker.errors.NotFound:
                old = None
            if old:
                old.remove(force=True)
            egress = self.docker.containers.create(self.egress_image, name=self.name(aid, 'egress'),
                network='bridge', cap_add=['NET_ADMIN'],
                sysctls={'net.ipv4.ip_forward': '0', 'net.ipv6.conf.all.disable_ipv6': '1'},
                volumes={str(d): {'bind': '/config', 'mode': 'ro'}}, mem_limit='128m',
                **self.common(aid))
            self.docker.networks.get(self.name(aid, 'net')).connect(egress, ipv4_address=state['gateway_ip'])
            egress.start()
            app = self.owned(aid, 'app')
            if app.status != 'running':
                app.start()
            # Atomic nft replacement inside the account namespace. Nothing is
            # configured in the host's default routing table or firewall.
            script = ('if nft list table inet ccg_app >/dev/null 2>&1; then '
                      '{ printf "delete table inet ccg_app\\n"; cat /app.nft; } | nft -f -; '
                      'else nft -f /app.nft; fi; '
                      f'ip route replace default via {state["gateway_ip"]}')
            self.helper(aid, app, script, business_rules(state['gateway_ip']))
            for _ in range(30):
                egress.reload()
                if egress.status != 'running':
                    raise RuntimeError('egress failed')
                code, _ = egress.exec_run(['sh', '-ec', 'ss -lnt | grep -q :15001'])
                if code == 0:
                    break
                time.sleep(.2)
            else:
                raise RuntimeError('egress not ready')
            # Probe through the business namespace, not through host networking.
            code, _ = app.exec_run(['node', '-e',
                'fetch(process.argv[1],{signal:AbortSignal.timeout(10000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))',
                self.probe_url])
            if code != 0:
                raise RuntimeError('account proxy connectivity check failed')
            state.update(revision=revision, status='ready')
            self.save(aid, state)
            app.reload(); egress.reload()
            self.boots[aid] = tuple(c.attrs['State']['StartedAt'] for c in (app, egress))
            self.online[aid] = revision
            return self.public(aid)

    def block(self, aid):
        self.online.pop(aid, None)
        state = self.state(aid)
        if state:
            for role in ('app', 'egress'):
                with contextlib.suppress(docker.errors.NotFound):
                    self.owned(aid, role).stop(timeout=10)
            state['status'] = 'blocked'
            self.save(aid, state)
        return {'account_id': aid, 'status': 'blocked', 'revision': ''}

    def public(self, aid):
        state = self.state(aid) or {}
        if aid in self.online:
            try:
                containers = [self.owned(aid, role) for role in ('app', 'egress')]
                if any(c.status != 'running' for c in containers) or tuple(c.attrs['State']['StartedAt'] for c in containers) != self.boots.get(aid):
                    self.online.pop(aid, None)
            except docker.errors.NotFound:
                self.online.pop(aid, None)
        return {'account_id': aid, 'container': self.name(aid, 'app'),
                'status': 'ready' if self.online.get(aid) == state.get('revision') and aid in self.online else 'pending',
                'revision': self.online.get(aid, ''), 'auth_mode': state.get('auth_mode', 'oauth')}


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def setup(self):
        super().setup()
        self.connection.settimeout(240)

    def log_message(self, *args):
        pass  # Requests may contain OAuth material; never log bodies or URLs.

    def reply(self, status, data):
        raw = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.response_started = True
        self.wfile.write(raw)

    def handle_request(self):
        self.response_started = False
        manager = self.server.manager
        key = self.headers.get('Authorization', '').removeprefix('Bearer ')
        if not hmac.compare_digest(key, self.server.key):
            self.close_connection = True
            return self.reply(401, {'error': 'unauthorized'})
        match = re.fullmatch(r'/accounts/([1-9][0-9]{0,17})/(config|status|v1/messages|admin/(?:status|auth/start|auth/complete|auth/cancel|auth/logout))', self.path)
        if not match:
            self.close_connection = True
            return self.reply(404, {'error': 'not found'})
        aid, path = match[1], match[2]
        try:
            n = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            self.close_connection = True
            return self.reply(400, {'error': 'invalid request framing'})
        if n < 0 or n > (32 << 20) or self.headers.get('Transfer-Encoding'):
            self.close_connection = True
            return self.reply(400, {'error': 'invalid request framing'})
        body = self.rfile.read(n)
        try:
            if path == 'config' and self.command == 'PUT':
                try:
                    result = manager.apply(aid, json.loads(body))
                except Exception:
                    manager.online.pop(aid, None)
                    raise
                return self.reply(200, result)
            if path == 'status' and self.command == 'GET':
                return self.reply(200, manager.public(aid))
            if path in ('config', 'status') or self.command not in ('GET', 'POST'):
                return self.reply(405, {'error': 'method not allowed'})
            with manager.guard(aid):
                state = manager.state(aid)
                revision = self.headers.get('X-CCG-Revision', '')
                if not state or not revision or manager.public(aid)['revision'] != revision:
                    return self.reply(409, {'error': 'account proxy not synchronized'})
                if path.startswith('admin/auth/') and state.get('auth_mode') == 'api_key':
                    return self.reply(409, {'error': 'API key accounts do not use OAuth authorization'})
                address = state['app_ip']
                secret = state['admin_key'] if path.startswith('admin/') else state['api_key']
            # No configuration writes on the request path. Concurrent streams
            # do not hold the account reconciliation lock.
            headers = upstream_headers(self.headers, secret)
            with requests.Session() as session:
                session.trust_env = False
                with session.request(self.command, f'http://{address}:8787/{path}', data=body,
                                     headers=headers, stream=True, timeout=(5, 240), allow_redirects=False) as response:
                    self.send_response(response.status_code)
                    self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                    self.send_header('Connection', 'close')
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    self.response_started = True
                    self.close_connection = True
                    for chunk in response.iter_content(chunk_size=1024):
                        self.wfile.write(chunk)
                        self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True
        except Exception:
            self.close_connection = True
            if not self.response_started:
                self.reply(503, {'error': 'account runtime unavailable'})

    do_GET = do_POST = do_PUT = handle_request


if __name__ == '__main__':
    os.umask(0o077)
    key = os.environ['CCG_CONTROLLER_KEY']
    if len(key) < 32:
        raise SystemExit('controller key must contain at least 32 characters')
    server = ThreadingHTTPServer(('127.0.0.1', int(os.getenv('CCG_CONTROLLER_PORT', '8787'))), Handler)
    server.daemon_threads = True
    server.key = key
    server.manager = Manager(os.environ['CCG_RUNTIME_ROOT'], os.environ['CCG_APP_IMAGE'],
                             os.environ['CCG_EGRESS_IMAGE'], os.getenv('CCG_RUNTIME_PREFIX', 'ccg'))
    server.serve_forever()
