"""Host-side account runtime controller; bind only to loopback, access over SSH.

Docker SDK owns container lifecycle; sing-box owns proxy protocols. The control
API is never exposed on a business network. State is root-private on this host.
"""
import contextlib
from datetime import datetime, timezone
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
import shutil
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import docker
import requests
from network import configuration, business_rules, network_policy, host_routes, allocate_subnet, allocate_addresses
from images import ImageManager, ImageUploadError

# Runtime keys (CCGATEWAY-DRAFT-RUNTIMES §1): an account id, or a draft key
# created by the editor before the account exists. Every key that reaches a
# path, container or volume name passes this pattern first.
KEY_PATTERN = r'(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})'
KEY = re.compile(KEY_PATTERN)
DRAFT = re.compile(r'd[0-9a-f]{16}')
REVISION = re.compile(r'[a-f0-9]{64}')
LABEL = 'io.sup2api.ccgateway.account'
PROXY_VARS = ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
              'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy')

AUTH_LABEL = 'io.sup2api.ccgateway.auth'
IMAGE_LABEL = 'io.sup2api.ccgateway.image'
NETWORK_LABEL = 'io.sup2api.ccgateway.network'
AUTH_VARS = ('ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')
IMAGE_CACHE_SECONDS = 30

ROUTE = re.compile(r'/accounts(?:/(' + KEY_PATTERN + r')(?:/(config|status|v1/messages(?:/count_tokens)?|'
                   r'connection|migrate-auth|admin/(?:status|usage|features|request-logs|auth/(?:session|start|complete|cancel|logout))))?)?')
IMAGE_ROUTE = re.compile(r'/images(?:/(upload|load/([a-zA-Z0-9_-]{22})))?')


class BadRequest(ValueError):
    """The request itself is invalid (answered 400 invalid_request)."""


class NotDraft(ValueError):
    """Only draft runtimes can be deleted through the API."""


class ImagePullFailed(RuntimeError):
    """A configured image is missing locally and could not be pulled."""


def check(aid):
    if not isinstance(aid, str) or not KEY.fullmatch(aid):
        raise BadRequest('invalid runtime key')
    return aid


def rfc3339(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def upstream_headers(inbound, secret):
    headers = {'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json'}
    for name in ('anthropic-version', 'anthropic-beta', 'x-ccgateway-session-id', 'x-ccgateway-session-scope', 'x-ccgateway-request-policy'):
        if name in inbound:
            headers[name] = inbound[name]
    return headers


def authentication(raw):
    # Missing auth preserves compatibility with existing OAuth controllers.
    raw = {'mode': 'oauth'} if raw is None else raw
    if not isinstance(raw, dict):
        raise BadRequest('invalid authentication')
    if raw == {'mode': 'oauth'}:
        return raw
    if raw.get('mode') != 'api_key' or set(raw) - {'mode', 'api_key', 'base_url'}:
        raise BadRequest('invalid authentication')
    key, base = raw.get('api_key'), raw.get('base_url') or 'https://api.anthropic.com'
    if not isinstance(key, str) or not 8 <= len(key) <= 512 or any(ord(c) < 33 or ord(c) > 126 for c in key):
        raise BadRequest('invalid API key')
    if not isinstance(base, str) or len(base) > 2048 or any(c.isspace() for c in base):
        raise BadRequest('invalid base URL')
    url = urlsplit(base)
    if url.scheme != 'https' or not url.hostname or url.username is not None or url.password is not None or '?' in base or '#' in base:
        raise BadRequest('invalid base URL')
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


def image_of(container):
    # Docker's inspect data names the image actually running (also for
    # containers created before IMAGE_LABEL existed); the label is a fallback.
    return container.attrs.get('Image') or container.labels.get(IMAGE_LABEL, '')


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
        self.network_lock = threading.RLock()
        self.online = {}  # Never trust persisted readiness after controller restart.
        self.boots =
        self.image_seen = (0.0, '')  # (monotonic time, app image id)
        self.version = os.getenv('CCG_CONTROLLER_VERSION') or 'dev'
        # 镜像管理器
        self.image_manager = ImageManager(self.docker, self.root / 'uploads')

    def health(self):
        return {'version': self.version, 'app_image': self.app_image, 'egress_image': self.egress_image,
                'network_policy_version': 1}

    def guard(self, aid):
        check(aid)
        with self.lock:
            return self.locks.setdefault(aid, threading.RLock())

    def dir(self, aid):
        return self.root / check(aid)

    def name(self, aid, role):
        return f'{self.prefix}-{check(aid)}-{role}'

    def owned(self, aid, role):
        c = self.docker.containers.get(self.name(aid, role))
        if c.labels.get(LABEL) != aid:
            raise ValueError('container ownership mismatch')
        return c

    def state(self, aid):
        p = self.dir(aid) / 'state.json'
        return json.loads(p.read_text()) if p.exists() else None

    def save(self, aid, state):
        write_private(self.dir(aid) / 'state.json', json.dumps(state))

    def app_image_id(self):
        # Status is polled often; resolve the configured tag at most every 30 s.
        # Never pull or change readiness: this is informational only.
        seen, image_id = self.image_seen
        if not image_id or time.monotonic() - seen > IMAGE_CACHE_SECONDS:
            image_id = self.docker.images.get(self.app_image).id
            self.image_seen = (time.monotonic(), image_id)
        return image_id

    def ensure_image(self, ref):
        """Return the local image for ref (tag or name@sha256:digest), pulling it once if absent."""
        try:
            return self.docker.images.get(ref)
        except docker.errors.NotFound:
            pass
        try:
            self.docker.images.pull(ref)
            return self.docker.images.get(ref)
        except (docker.errors.DockerException, requests.exceptions.RequestException) as e:
            raise ImagePullFailed('image pull failed') from e

    def common(self, aid):
        return dict(labels={LABEL: aid}, detach=True, init=True,
                    cap_drop=['ALL'], security_opt=['no-new-privileges:true'],
                    pids_limit=256, log_config=docker.types.LogConfig(
                        type='json-file', config={'max-size': '20m', 'max-file': '3'}))

    def helper(self, aid, app, script, rules):
        # Fixed helper image, no Docker socket, no host network/PID namespaces.
        d = self.dir(aid)
        write_private(d / 'app.nft', rules)
        helper_image = image_of(self.owned(aid, 'egress'))
        self.docker.containers.run(helper_image, entrypoint=['sh', '-ec'],
            command=[script], network_mode='container:' + app.id,
            cap_drop=['ALL'], cap_add=['NET_ADMIN'], security_opt=['no-new-privileges:true'],
            volumes={str(d / 'app.nft'): {'bind': '/app.nft', 'mode': 'ro'}},
            remove=True)

    def ensure_network(self, aid, role, policy, internal):
        with self.network_lock:
            try:
                network = self.docker.networks.get(self.name(aid, role))
                if (network.attrs.get('Labels') or {}).get(LABEL) != aid:
                    raise ValueError('network ownership mismatch')
                return network
            except docker.errors.NotFound:
                pass
            occupied = host_routes()
            for n in self.docker.networks.list():
                for cfg in n.attrs.get('IPAM', {}).get('Config') or []:
                    if cfg.get('Subnet'):
                        subnet = ipaddress.ip_network(cfg['Subnet'])
                        if subnet.version == 4:
                            occupied.append(subnet)
            subnet = allocate_subnet(policy, occupied)
            return self.docker.networks.create(self.name(aid, role), driver='bridge',
                internal=internal, labels={LABEL: aid, NETWORK_LABEL: json.dumps(policy, sort_keys=True)},
                enable_ipv6=False, ipam=docker.types.IPAMConfig(pool_configs=[
                    docker.types.IPAMPool(subnet=str(subnet), gateway=str(subnet.network_address + 1))]))

    def provision(self, aid, auth=None, policy=None):
        # Serialize allocation and replacement across accounts. Otherwise two
        # parallel reconciliations could select the same still-free subnet.
        with self.network_lock:
            return self._provision(aid, auth, policy)

    def _provision(self, aid, auth=None, policy=None):
        policy = network_policy(policy)
        auth = authentication(auth)
        d = self.dir(aid)
        d.mkdir(mode=0o700, exist_ok=True)
        state = self.state(aid)
        # Hash with a private per-account salt; never persist upstream keys in
        # controller state or expose a credential fingerprint in status.
        salt = state['admin_key'] if state else secrets.token_urlsafe(32)
        fingerprint = hmac.new(salt.encode(), json.dumps(auth, sort_keys=True).encode(), hashlib.sha256).hexdigest()
        existing = None
        if state:
            with contextlib.suppress(docker.errors.NotFound):
                existing = self.owned(aid, 'app')
            # Defaults apply to new containers only. A tag/digest change must
            # never replace a working account (including after controller restart).
            if existing and state.get('network') == policy and existing.labels.get(AUTH_LABEL) == fingerprint:
                return state
        # Credential/network changes must not incidentally upgrade the image.
        image_ref = image_of(existing) if existing else self.app_image
        image = self.ensure_image(image_ref)
        # Validate the new image before an existing container is replaced.
        image_env = image.attrs['Config'].get('Env') or []
        if any(v.split('=', 1)[0] in PROXY_VARS + AUTH_VARS for v in image_env):
            raise ValueError('business image contains account credentials or proxy environment variables')
        if not state or state.get('network') != policy:
            old_subnets, occupied = [], []
            for n in self.docker.networks.list():
                for cfg in n.attrs.get('IPAM', {}).get('Config') or []:
                    if cfg.get('Subnet'):
                        subnet = ipaddress.ip_network(cfg['Subnet'])
                        if subnet.version == 4:
                            (old_subnets if (n.attrs.get('Labels') or {}).get(LABEL) == aid else occupied).append(subnet)
            occupied.extend(r for r in host_routes() if r not in old_subnets)
            first = allocate_subnet(policy, occupied)
            allocate_subnet(policy, occupied + [first])
            # Validate capacity/conflicts before removing working containers.
        if existing:
            self.online.pop(aid, None)
            with contextlib.suppress(docker.errors.NotFound):
                existing.remove(force=True)
        if not state or state.get('network') != policy:
            self.online.pop(aid, None)
            self.boots.pop(aid, None)
            with contextlib.suppress(docker.errors.NotFound):
                self.owned(aid, 'egress').remove(force=True)
            for role in ('net', 'uplink'):
                with contextlib.suppress(docker.errors.NotFound):
                    old = self.docker.networks.get(self.name(aid, role))
                    if (old.attrs.get('Labels') or {}).get(LABEL) != aid:
                        raise ValueError('network ownership mismatch')
                    old.remove()
        network = self.ensure_network(aid, 'net', policy, True)
        uplink = self.ensure_network(aid, 'uplink', policy, False)
        network.reload()
        subnet = ipaddress.ip_network(network.attrs['IPAM']['Config'][0]['Subnet'])
        if state and state.get('network') == policy:
            gateway_ip, app_ip = state['gateway_ip'], state['app_ip']
            uplink_ip = state['uplink_ip']
        else:
            gateway_ip, app_ip = allocate_addresses(subnet, policy['allocation'])
            uplink_subnet = ipaddress.ip_network(uplink.attrs['IPAM']['Config'][0]['Subnet'])
            uplink_ip = allocate_addresses(uplink_subnet, policy['allocation'], 1)[0]
        write_private(d / 'resolv.conf', f'nameserver {gateway_ip}\noptions timeout:2 attempts:2\n')
        # resolv.conf contains only the ordinary internal DNS address.
        os.chmod(d / 'resolv.conf', 0o644)
        state = state or {'api_key': secrets.token_urlsafe(32), 'admin_key': salt,
                 'app_ip': app_ip, 'gateway_ip': gateway_ip, 'revision': '', 'status': 'pending',
                 'created_at': rfc3339(time.time())}
        state.update(network=policy, gateway_ip=gateway_ip, app_ip=app_ip, uplink_ip=uplink_ip,
                     revision='', status='pending')
        self.save(aid, state)
        volume = self.docker.volumes.create(self.name(aid, 'data'), labels={LABEL: aid})
        self.docker.containers.run(image_ref, entrypoint=['sh', '-ec'],
            command=['mkdir -p /work/config /work/data; chown -R 1000:1000 /work'],
            user='0', network_mode='none', volumes={volume.name: {'bind': '/work', 'mode': 'rw'}}, remove=True)
        env = {}
        env.update(CCG_API_KEY=state['api_key'], CCG_ADMIN_KEY=state['admin_key'], CCG_EXTERNAL_EGRESS='1')
        if auth['mode'] == 'api_key':
            env.update(ANTHROPIC_API_KEY=auth['api_key'], ANTHROPIC_BASE_URL=auth['base_url'])
        options = self.common(aid)
        options['labels'][AUTH_LABEL] = fingerprint
        options['labels'][IMAGE_LABEL] = image.id
        self.docker.containers.create(image_ref, name=self.name(aid, 'app'),
            network=network.name, networking_config={network.name: self.docker.api.create_endpoint_config(ipv4_address=app_ip)}, user='1000:1000', environment=env,
            volumes={volume.name: {'bind': '/work', 'mode': 'rw'},
                     str(d / 'resolv.conf'): {'bind': '/etc/resolv.conf', 'mode': 'ro'}},
            mem_limit='2g', nano_cpus=2000000000, **options)
        state['auth_mode'] = auth['mode']
        self.save(aid, state)
        return state

    def apply(self, aid, desired):
        with self.guard(aid):
            if (self.state(aid) or {}).get('migration_failed'):
                raise BadRequest('failed migration draft must be discarded')
            if not isinstance(desired, dict):
                raise BadRequest('invalid configuration')
            revision = desired.get('revision', '')
            if not isinstance(revision, str) or not REVISION.fullmatch(revision):
                raise BadRequest('invalid revision')
            try:
                policy = network_policy(desired.get('network'))
            except (ValueError, TypeError) as e:
                raise BadRequest('invalid network policy') from e
            if not desired.get('proxy') or not desired.get('enabled', True):
                return self.block(aid)
            old = None
            with contextlib.suppress(docker.errors.NotFound):
                old = self.owned(aid, 'egress')
            egress_image = image_of(old) if old else self.egress_image
            self.ensure_image(egress_image)
            state = self.provision(aid, desired.get('auth'), policy)
            if self.public(aid)['revision'] == revision:
                app, egress = self.owned(aid, 'app'), self.owned(aid, 'egress')
                if app.status == 'running' and egress.status == 'running':
                    return self.public(aid)
            self.online.pop(aid, None)
            reuse_egress = old is not None and state.get('revision') == revision
            state['status'] = 'syncing'
            self.save(aid, state)
            # Config validation happens before the old egress is stopped.
            try:
                config, rules = configuration(desired['proxy'], state['app_ip'], state['gateway_ip'])
            except (ValueError, KeyError, TypeError) as e:
                raise BadRequest('invalid proxy') from e
            d = self.dir(aid)
            write_private(d / 'sing-box.json', json.dumps(config))
            write_private(d / 'firewall.nft', rules)
            self.docker.containers.run(egress_image,
                entrypoint=['sing-box', 'check', '-c', '/config/sing-box.json'],
                network_mode='none', volumes={str(d): {'bind': '/config', 'mode': 'ro'}}, remove=True)
            try:
                old = self.owned(aid, 'egress')
            except docker.errors.NotFound:
                old = None
            if old and not reuse_egress:
                old.remove(force=True)
            egress = old if reuse_egress else None
            if egress is None:
                egress = self.docker.containers.create(egress_image, name=self.name(aid, 'egress'),
                    network=self.name(aid, 'uplink'),
                    networking_config={self.name(aid, 'uplink'): self.docker.api.create_endpoint_config(ipv4_address=state['uplink_ip'])},
                    cap_add=['NET_ADMIN'],
                    sysctls={'net.ipv4.ip_forward': '0', 'net.ipv6.conf.all.disable_ipv6': '1'},
                    volumes={str(d): {'bind': '/config', 'mode': 'ro'}}, mem_limit='128m',
                    **self.common(aid))
                self.docker.networks.get(self.name(aid, 'net')).connect(egress, ipv4_address=state['gateway_ip'])
            if egress.status != 'running':
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

    def migrate_auth(self, aid, source):
        """Explicit control-plane operation; only the independent draft is changed."""
        check(source)
        if not DRAFT.fullmatch(aid) or aid == source:
            raise BadRequest('migration requires a separate draft')
        # Stable order prevents two manual operations deadlocking.
        with self.guard(min(aid, source)), self.guard(max(aid, source)):
            target_state, source_state = self.state(aid), self.state(source)
            if not target_state or not source_state or source_state.get('auth_mode') != 'oauth':
                raise BadRequest('migration requires OAuth runtimes')
            if target_state.get('auth_migrated_from') == source:
                return {'migrated': True}
            if target_state.get('auth_migrated_from'):
                raise BadRequest('draft already migrated')
            target = self.owned(aid, 'app')
            self.owned(source, 'app')
            volumes = {}
            for key, mount in ((source, '/source'), (aid, '/target')):
                volume = self.docker.volumes.get(self.name(key, 'data'))
                if (volume.attrs.get('Labels') or {}).get(LABEL) != key:
                    raise BadRequest('volume ownership mismatch')
                volumes[volume.name] = {'bind': mount, 'mode': 'ro' if key == source else 'rw'}
            # Never mount the Docker socket, share source writes, or run the
            # target CLI while its config is being populated.
            target.stop(timeout=10)
            self.online.pop(aid, None)
            try:
                self.docker.containers.run(image_of(target), user='1000:1000',
                    entrypoint=['sh', '-ec'], command=[
                        'test -d /source/config && test ! -L /source/config; '
                        'test -d /target/config && test ! -L /target/config; '
                        'test ! -e /target/config/.credentials.json; '
                        'cp -a /source/config/. /target/config/'],
                    network_mode='none', volumes=volumes, cap_drop=['ALL'],
                    security_opt=['no-new-privileges:true'], remove=True)
                target_state['auth_migrated_from'] = source
                self.save(aid, target_state)
            except Exception:
                target_state['migration_failed'] = True
                self.save(aid, target_state)
                raise
            target.start()
            # Readiness is re-established by apply's firewall/connectivity checks.
            return {'migrated': True}

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

    def delete(self, aid, account=False):
        """Remove a runtime completely; idempotent. Drafts always; an account
        runtime only when the caller says so explicitly (account=True): the
        core retires it after a re-authorization replaced it."""
        check(aid)
        if not DRAFT.fullmatch(aid) and not account:
            raise NotDraft('only draft runtimes can be deleted')
        with self.guard(aid):
            if account and self.state(aid):
                backup = self.root / 'backups'
                backup.mkdir(mode=0o700, exist_ok=True)
                write_private(backup / (aid + '.json'), json.dumps(self.state(aid)))
            self.online.pop(aid, None)
            self.boots.pop(aid, None)
            # Containers first: the egress is attached to the network and the
            # app container mounts the volume.
            for role in ('egress', 'app'):
                with contextlib.suppress(docker.errors.NotFound):
                    self.owned(aid, role).remove(force=True)
            for role in ('net', 'uplink'):
                with contextlib.suppress(docker.errors.NotFound):
                    network = self.docker.networks.get(self.name(aid, role))
                    if (network.attrs.get('Labels') or {}).get(LABEL) != aid:
                        raise ValueError('network ownership mismatch')
                    network.remove()
            with contextlib.suppress(docker.errors.NotFound):
                volume = self.docker.volumes.get(self.name(aid, 'data'))
                if (volume.attrs.get('Labels') or {}).get(LABEL) != aid:
                    raise ValueError('volume ownership mismatch')
                if not account:
                    volume.remove(force=True)
                # Retired account data is retained for manual recovery. Draft
                # cancellation still deletes its independent volume.
            d = self.dir(aid)
            if d.is_dir() and not d.is_symlink():
                shutil.rmtree(d)
        return {'deleted': True}

    def runtimes(self):
        out = []
        for entry in sorted(self.root.iterdir()):
            if not KEY.fullmatch(entry.name) or entry.is_symlink() or not entry.is_dir():
                continue
            aid = entry.name
            try:
                state = self.state(aid) or {}
                created = state.get('created_at') or rfc3339(entry.stat().st_mtime)
            except (OSError, ValueError):
                continue  # removed concurrently
            if state.get('status') == 'blocked':
                status = 'blocked'
            else:
                try:
                    status = self.public(aid)['status']
                except (docker.errors.DockerException, ValueError):
                    status = 'pending'
            out.append({'key': aid, 'status': status, 'created_at': created})
        return {'runtimes': out}

    def public(self, aid):
        state = self.state(aid) or {}
        if aid in self.online:
            try:
                containers = [self.owned(aid, role) for role in ('app', 'egress')]
                if any(c.status != 'running' for c in containers) or tuple(c.attrs['State']['StartedAt'] for c in containers) != self.boots.get(aid):
                    self.online.pop(aid, None)
            except docker.errors.NotFound:
                self.online.pop(aid, None)
        current_image, target_id = '', ''
        with contextlib.suppress(docker.errors.NotFound):
            current_image = image_of(self.owned(aid, 'app'))
        with contextlib.suppress(docker.errors.DockerException):
            target_id = self.app_image_id()
        return {'account_id': aid, 'container': self.name(aid, 'app'),
                'current_image': current_image, 'target_image': self.app_image,
                'image_update_available': bool(current_image and target_id and current_image != target_id),
                'target_image_available': bool(target_id),
                'status': 'ready' if self.online.get(aid) == state.get('revision') and aid in self.online else 'pending',
                'revision': self.online.get(aid, ''), 'auth_mode': state.get('auth_mode', 'oauth'),
                'network': state.get('network'), 'app_ip': state.get('app_ip', ''),
                'gateway_ip': state.get('gateway_ip', ''), 'uplink_ip': state.get('uplink_ip', '')}

    def connection(self, aid, revision):
        # Private control-plane response, never a public account/UI payload.
        # The model body goes straight to this one account over the pinned SSH
        # transport; the controller no longer relays model traffic.
        with self.guard(aid):
            state = self.state(aid)
            if not state or not revision or self.public(aid)['revision'] != revision:
                return None
            return {'app_ip': state['app_ip'], 'port': 8787,
                    'api_key': state['api_key'], 'revision': revision}


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

    def fail(self, status, code, close=False):
        if close:
            self.close_connection = True
        return self.reply(status, {'error': code})

    def handle_image_upload(self):
        """处理 POST /images/upload"""
        try:
            # 获取镜像名称和可选的 SHA256
            image_name = self.headers.get('X-Image-Name', 'uploaded-image')
            expected_sha256 = self.headers.get('X-Image-SHA256')

            # 获取 Content-Length
            try:
                content_length = int(self.headers.get('Content-Length', '0'))
            except ValueError:
                return self.fail(400, 'invalid_content_length')

            if content_length <= 0 or content_length > (2 * 1024 * 1024 * 1024):
                return self.fail(400, 'invalid_content_length')

            # 读取镜像数据并上传
            result = self.server.manager.image_manager.upload_image_data(
                image_name, self.rfile, expected_sha256
            )
            return self.reply(200, result)

        except ImageUploadError as e:
            return self.fail(400, str(e))
        except Exception as e:
            return self.fail(500, 'upload_failed')

    def handle_image_load(self, upload_id):
        """处理 POST /images/load/<upload_id>"""
        try:
            result = self.server.manager.image_manager.load_image(upload_id)
            return self.reply(200, result)
        except ImageUploadError as e:
            return self.fail(400, str(e))
        except Exception as e:
            return self.fail(500, 'load_failed')

    def handle_request(self):
        self.response_started = False
        manager = self.server.manager
        key = self.headers.get('Authorization', '').removeprefix('Bearer ')
        if not hmac.compare_digest(key, self.server.key):
            return self.fail(401, 'unauthorized', close=True)
        if self.path == '/health':
            self.close_connection = True  # any request body is left unread
            if self.command != 'GET':
                return self.fail(405, 'method_not_allowed')
            return self.reply(200, manager.health())

        # 处理镜像上传端点
        image_match = IMAGE_ROUTE.fullmatch(self.path)
        if image_match:
            action, upload_id = image_match[1], image_match[2]
            if action == 'upload':
                if self.command != 'POST':
                    return self.fail(405, 'method_not_allowed')
                return self.handle_image_upload()
            elif action and action.startswith('load/'):
                if self.command != 'POST':
                    return self.fail(405, 'method_not_allowed')
                return self.handle_image_load(upload_id)

        match = ROUTE.fullmatch(self.path)
        if not match:
            return self.fail(404, 'not_found', close=True)
        aid, path = match[1], match[2]
        try:
            n = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.fail(400, 'invalid_request', close=True)
        if n < 0 or n > (32 << 20) or self.headers.get('Transfer-Encoding'):
            return self.fail(400, 'invalid_request', close=True)
        body = self.rfile.read(n)
        try:
            if aid is None:
                if self.command != 'GET':
                    return self.fail(405, 'method_not_allowed')
                return self.reply(200, manager.runtimes())
            if path is None:
                if self.command != 'DELETE':
                    return self.fail(405, 'method_not_allowed')
                try:
                    # Deleting an account's runtime needs the header naming it
                    # again (a retired runtime after re-authorization).
                    account = self.headers.get('X-CCG-Delete-Account', '') == aid
                    return self.reply(200, manager.delete(aid, account=account))
                except NotDraft:
                    return self.fail(405, 'method_not_allowed')
            if path == 'config' and self.command == 'PUT':
                try:
                    try:
                        desired = json.loads(body)
                    except ValueError as e:
                        raise BadRequest('invalid JSON') from e
                    result = manager.apply(aid, desired)
                except Exception:
                    manager.online.pop(aid, None)
                    raise
                return self.reply(200, result)
            if path == 'status' and self.command == 'GET':
                return self.reply(200, manager.public(aid))

            if path == 'migrate-auth':
                if self.command != 'POST':
                    return self.fail(405, 'method_not_allowed')
                try:
                    payload = json.loads(body)
                    source = payload.get('source') if isinstance(payload, dict) else None
                    check(source)
                except (ValueError, TypeError) as e:
                    raise BadRequest('invalid migration') from e
                return self.reply(200, manager.migrate_auth(aid, source))

            if path == 'connection':
                if self.command != 'GET':
                    return self.fail(405, 'method_not_allowed')
                connection = manager.connection(aid, self.headers.get('X-CCG-Revision', ''))
                if connection is None:
                    return self.fail(409, 'not_synchronized')
                return self.reply(200, connection)
            methods = ('GET', 'PUT') if path == 'admin/request-logs' else ('GET', 'POST')
            if path in ('config', 'status') or self.command not in methods:
                return self.fail(405, 'method_not_allowed')
            if path in ('admin/usage', 'admin/features') and self.command != 'GET':
                return self.fail(405, 'method_not_allowed')
            with manager.guard(aid):
                state = manager.state(aid)
                revision = self.headers.get('X-CCG-Revision', '')
                if not state or not revision or manager.public(aid)['revision'] != revision:
                    return self.fail(409, 'not_synchronized')
                if (path.startswith('admin/auth/') or path == 'admin/usage') and state.get('auth_mode') == 'api_key':
                    return self.fail(409, 'api_key_account')
                address = state['app_ip']
                secret = state['admin_key'] if path.startswith('admin/') else state['api_key']
            # No configuration writes on the request path. Concurrent streams
            # do not hold the account reconciliation lock.
            headers = upstream_headers(self.headers, secret)
            # Model execution has a one-hour deadline; leave time to relay its
            # terminal response. Keep management requests on their short limit.
            relay_timeout = 3660 if path == 'v1/messages' else 240
            if path == 'v1/messages':
                self.connection.settimeout(relay_timeout)
            with requests.Session() as session:
                session.trust_env = False
                with session.request(self.command, f'http://{address}:8787/{path}', data=body,
                                     headers=headers, stream=True, timeout=(5, relay_timeout), allow_redirects=False) as response:
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
        except BadRequest:
            self.close_connection = True
            if not self.response_started:
                self.fail(400, 'invalid_request')
        except ImagePullFailed:
            self.close_connection = True
            if not self.response_started:
                self.fail(503, 'image_pull_failed')
        except Exception:
            self.close_connection = True
            if not self.response_started:
                self.fail(503, 'runtime_unavailable')

    do_GET = do_POST = do_PUT = do_DELETE = handle_request


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
