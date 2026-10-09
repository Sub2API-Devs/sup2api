"""Host-side account runtime controller; binds only to loopback.

The core reaches it over an SSH tunnel or through the Caddy HTTPS gateway on
the same host (CONTRACTS §49.16, §53). Docker SDK owns container lifecycle;
sing-box owns proxy protocols. The control API is never exposed on a business
network. State is root-private on this host.
"""
import contextlib
from datetime import datetime, timezone
import fcntl
import hmac
import hashlib
import io
from urllib.parse import urlsplit
import ipaddress
import json
import os
from pathlib import Path
import posixpath
import re
import secrets
import shutil
import socket
import tarfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import docker
import requests
from network import configuration, business_rules, network_policy, host_routes, allocate_subnet, allocate_addresses
from images import Uploads, UploadError, MAX_CHUNK

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
ACCOUNT_PORT = 8787  # every account container listens here on its private network
TUNNEL_IDLE_SECONDS = 3700
LOAD_TIMEOUT = 1800  # docker load of a large archive may stay silent for minutes
FEATURES = ('tunnel', 'uploads', 'runtime-images', 'self-upgrade', 'worker-update')
# Same reference rules as the core (CONTRACTS §49.16).
IMAGE_REF = re.compile(r'[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?')
IMAGE_ID = re.compile(r'sha256:[0-9a-f]{64}')
DEFAULT_ENV_FILE = '/opt/ccgateway-runtime.env'
DEFAULT_CONTROLLER_NAME = 'ccg-controller'
CONTROLLER_NAME = re.compile(r'[a-z][a-z0-9-]{0,40}')
DOCKER_SOCKET = '/var/run/docker.sock'

# In-place worker update (CONTRACTS §53.7). The account container is never
# recreated: only its program file is replaced and only it is restarted.
WORKER_SOURCE = '/usr/local/bin/worker'  # the program inside a worker image
WORKER_DIR = '/usr/local/bin'
WORKER_NAMES = ('worker', 'ccgateway')  # new images / older `docker-entrypoint.sh ccgateway`
WORKER_MAX_BYTES = 256 << 20
WORKER_BACKUPS = 5
WORKER_BACKUP_NAME = re.compile(r'[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}')
WORKER_IDLE_WAIT, WORKER_IDLE_INTERVAL = 120, 2
WORKER_HEALTH_WAIT, WORKER_HEALTH_INTERVAL = 30, 1
WORKER_RESTART_TIMEOUT = 30
WORKER_HEALTH_SCRIPT = ("fetch('http://127.0.0.1:8787/health',{signal:AbortSignal.timeout(3000)})"
                        ".then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))")
SHA256_HEX = re.compile(r'[0-9a-f]{64}')

ROUTE = re.compile(r'/accounts(?:/(' + KEY_PATTERN + r')(?:/(config|status|v1/messages(?:/count_tokens)?|'
                   r'connection|tunnel|worker|migrate-auth|admin/(?:status|usage|features|request-logs|auth/(?:session|start|complete|cancel|logout))))?)?')
UPLOAD_ROUTE = re.compile(r'/images/uploads(?:/([A-Za-z0-9_-]{22})(/load)?)?')
RUNTIME_ROUTE = re.compile(r'/runtime/(images|controller)')
DECIMAL = re.compile(r'[0-9]{1,12}')


class BadRequest(ValueError):
    """The request itself is invalid (answered 400 invalid_request)."""


class NotDraft(ValueError):
    """Only draft runtimes can be deleted through the API."""


class ImagePullFailed(RuntimeError):
    """A configured image is missing locally and could not be pulled."""


class InvalidImage(ValueError):
    """A business image carries credential or proxy environment variables."""


class UpgradeInProgress(RuntimeError):
    """The self-upgrade helper container is still running."""


class RuntimeNotFound(LookupError):
    """The runtime has no app container of its own (answered 404 not_found)."""


class UnsupportedContainer(RuntimeError):
    """The worker program of this container cannot be located or replaced (409)."""


class ContainerChanged(RuntimeError):
    """The account container is no longer the one the operation started on (503)."""


def valid_image(ref):
    return isinstance(ref, str) and bool(IMAGE_REF.fullmatch(ref) or IMAGE_ID.fullmatch(ref))


def check_business_image(image):
    env = image.attrs['Config'].get('Env') or []
    if any(v.split('=', 1)[0] in PROXY_VARS + AUTH_VARS for v in env):
        raise InvalidImage('business image contains account credentials or proxy environment variables')


def check(aid):
    if not isinstance(aid, str) or not KEY.fullmatch(aid):
        raise BadRequest('invalid runtime key')
    return aid


def rfc3339(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def upstream_headers(inbound, secret):
    headers = {'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json'}
    for name in ('anthropic-version', 'anthropic-beta', 'x-ccgateway-session-scope', 'x-ccgateway-request-policy', 'x-claude-code-agent-id'):
        if name in inbound:
            headers[name] = inbound[name]
    return headers


def authentication(raw):
    # Missing auth preserves compatibility with existing OAuth controllers.
    raw = {'mode': 'oauth'} if raw is None else raw
    if not isinstance(raw, dict):
        raise BadRequest('invalid authentication')
    # Extract locale and timezone if present (pass through without validation)
    locale = raw.get('locale', '')
    timezone = raw.get('timezone', '')
    if raw == {'mode': 'oauth'} or (set(raw) <= {'mode', 'locale', 'timezone'} and raw.get('mode') == 'oauth'):
        result = {'mode': 'oauth'}
        if locale:
            result['locale'] = locale
        if timezone:
            result['timezone'] = timezone
        return result
    if raw.get('mode') != 'api_key' or set(raw) - {'mode', 'api_key', 'base_url', 'locale', 'timezone'}:
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
    result = {'mode': 'api_key', 'api_key': key, 'base_url': base}
    if locale:
        result['locale'] = locale
    if timezone:
        result['timezone'] = timezone
    return result


def write_private(path, value):
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        os.chmod(tmp, 0o600)
        f.write(value)
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


def write_private_bytes(path, data):
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'wb') as f:
        os.chmod(tmp, 0o600)
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


def image_of(container):
    # Docker's inspect data names the image actually running (also for
    # containers created before IMAGE_LABEL existed); the label is a fallback.
    return container.attrs.get('Image') or container.labels.get(IMAGE_LABEL, '')


def read_single_file(chunks, limit=WORKER_MAX_BYTES):
    """Content of the only entry of a get_archive tar stream; it must be a regular file."""
    buf, size = io.BytesIO(), 0
    for chunk in chunks:
        size += len(chunk)
        if size > limit + (1 << 20):  # headers and padding of one entry
            raise ValueError('archive too large')
        buf.write(chunk)
    buf.seek(0)
    try:
        with tarfile.open(fileobj=buf, mode='r:') as tar:
            members = tar.getmembers()
            if len(members) != 1 or not members[0].isreg() or members[0].size > limit:
                raise ValueError('not a single regular file')
            data = tar.extractfile(members[0]).read()
    except tarfile.TarError as e:
        raise ValueError('invalid archive') from e
    if len(data) != members[0].size:
        raise ValueError('truncated archive')
    return data


def tar_file(name, data):
    """One root-owned 0755 regular file, for put_archive."""
    info = tarfile.TarInfo(name)
    info.size, info.mode, info.uid, info.gid = len(data), 0o755, 0, 0
    info.uname = info.gname = 'root'
    info.mtime = int(time.time())
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w') as tar:
        tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def worker_target(container):
    """(path, basename) of the worker program the container runs (§53.7 step 3).

    The first entry of Path + Args whose basename is a worker name. Only the
    bare name (resolved through PATH) or /usr/local/bin/<name> are accepted:
    anything else would make the replaced file differ from the program run.
    """
    attrs = container.attrs
    for entry in [attrs.get('Path')] + list(attrs.get('Args') or []):
        if not isinstance(entry, str):
            continue
        base = posixpath.basename(entry)
        if base in WORKER_NAMES:
            if entry not in (base, posixpath.join(WORKER_DIR, base)):
                raise UnsupportedContainer('worker program outside ' + WORKER_DIR)
            return posixpath.join(WORKER_DIR, base), base
    raise UnsupportedContainer('container command runs no worker program')


def worker_idle(container, base):
    """No process besides docker-init and the worker itself (no running CLI request)."""
    top = container.top(ps_args='-eo pid,comm')
    titles = top.get('Titles') or []
    if 'COMMAND' not in titles:
        raise RuntimeError('unexpected process list')
    column = titles.index('COMMAND')
    allowed = {'docker-init', base[:15]}  # Linux truncates comm to 15 characters
    return all(len(p) > column and p[column] in allowed for p in top.get('Processes') or [])


def container_identity(container):
    """What must not change while the worker is replaced (§53.7 step 10)."""
    attrs, config = container.attrs, container.attrs.get('Config') or {}
    return json.dumps({'id': container.id, 'image': attrs.get('Image'), 'config_image': config.get('Image'),
                       'user': config.get('User'), 'labels': container.labels,
                       'mounts': sorted(json.dumps(m, sort_keys=True) for m in attrs.get('Mounts') or []),
                       'path': attrs.get('Path'), 'args': attrs.get('Args')}, sort_keys=True)


class Manager:
    def __init__(self, root, app_image, egress_image, prefix='ccg', probe_url='https://www.gstatic.com/generate_204'):
        if not re.fullmatch(r'[a-z][a-z0-9-]{0,24}', prefix):
            raise ValueError('invalid prefix')
        # Name and port of this controller's own container (an isolated test
        # instance on the same host uses others; self-upgrade must not touch
        # the production controller).
        self.controller_name = os.getenv('CCG_CONTROLLER_NAME') or DEFAULT_CONTROLLER_NAME
        if not CONTROLLER_NAME.fullmatch(self.controller_name):
            raise ValueError('invalid controller name')
        self.controller_port = int(os.getenv('CCG_CONTROLLER_PORT') or '8787')
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
        self.boots = {}
        self.image_seen = (0.0, '')  # (monotonic time, app image id)
        self.version = os.getenv('CCG_CONTROLLER_VERSION') or 'dev'
        self.controller_image = os.getenv('CCG_CONTROLLER_IMAGE', '')
        self.env_file = os.getenv('CCG_RUNTIME_ENV_FILE') or DEFAULT_ENV_FILE
        self.runtime_lock, self.upgrade_lock = threading.Lock(), threading.Lock()
        # Target images set through PUT /runtime/images override the environment
        # only while the environment is the one they were saved against: an SSH
        # (re)install that rewrote CCG_APP_IMAGE / CCG_EGRESS_IMAGE wins.
        self.env_images = {'app': app_image, 'egress': egress_image}
        runtime = self.root / 'runtime.json'
        with contextlib.suppress(FileNotFoundError):
            try:
                saved = json.loads(runtime.read_text())
            except ValueError:
                saved = None
            if (isinstance(saved, dict) and saved.get('env') == self.env_images
                    and valid_image(saved.get('app')) and valid_image(saved.get('egress'))):
                self.app_image, self.egress_image = saved['app'], saved['egress']
            else:
                runtime.unlink()  # stale, old format or damaged: the environment applies
        self.uploads = Uploads(docker.from_env(timeout=LOAD_TIMEOUT), self.root / 'uploads')

    def health(self):
        return {'version': self.version, 'app_image': self.app_image, 'egress_image': self.egress_image,
                'controller_image': self.controller_image, 'network_policy_version': 1,
                'features': list(FEATURES)}

    def runtime_images(self):
        return {'app': self.app_image, 'egress': self.egress_image, 'controller': self.controller_image}

    def set_runtime_images(self, desired):
        if not isinstance(desired, dict) or set(desired) - {'app', 'egress'}:
            raise BadRequest('invalid runtime images')
        if not all(valid_image(ref) for ref in desired.values()):
            raise BadRequest('invalid image reference')
        if not desired:
            return self.health()  # nothing to change: nothing is written
        with self.runtime_lock:
            for role, ref in desired.items():
                image = self.ensure_image(ref)
                if role == 'app':
                    check_business_image(image)
            app, egress = desired.get('app', self.app_image), desired.get('egress', self.egress_image)
            write_private(self.root / 'runtime.json',
                          json.dumps({'app': app, 'egress': egress, 'env': self.env_images}))
            self.app_image, self.egress_image = app, egress
            self.image_seen = (0.0, '')
        return self.health()

    def upgrade_controller(self, desired):
        ref = desired.get('image') if isinstance(desired, dict) and set(desired) == {'image'} else None
        if not valid_image(ref):
            raise BadRequest('invalid image reference')
        env_dir = posixpath.dirname(self.env_file)
        if not posixpath.isabs(self.env_file) or env_dir == '/':
            raise RuntimeError('invalid runtime environment file path')
        with self.upgrade_lock:
            self.ensure_image(ref)
            helper_name = self.controller_name + '-upgrade'
            with contextlib.suppress(docker.errors.NotFound):
                helper = self.docker.containers.get(helper_name)
                if helper.status == 'running':
                    raise UpgradeInProgress('controller upgrade in progress')
                helper.remove(force=True)  # a finished helper that was not auto-removed
            # The new image runs its own upgrade.py. The environment file's
            # directory is mounted (not the file) so it can be replaced atomically.
            self.docker.containers.run(ref, ['python', 'upgrade.py', ref], name=helper_name,
                remove=True, detach=True, network_mode='host',
                environment={'CCG_RUNTIME_ENV_FILE': self.env_file, 'CCG_CONTROLLER_NAME': self.controller_name,
                             'CCG_CONTROLLER_PORT': str(self.controller_port)},
                volumes={DOCKER_SOCKET: {'bind': DOCKER_SOCKET, 'mode': 'rw'},
                         env_dir: {'bind': env_dir, 'mode': 'rw'}})
        return {'accepted': True}

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

    def oneshot(self, image, **kwargs):
        """containers.run(..., remove=True) that also removes the container
        when it cannot start (docker-py leaves it behind in "Created", e.g.
        a helper joining the namespace of an app container that exited)."""
        name = f'{self.prefix}-oneshot-{secrets.token_hex(8)}'
        try:
            return self.docker.containers.run(image, name=name, remove=True, **kwargs)
        except BaseException:
            with contextlib.suppress(docker.errors.DockerException):
                self.docker.containers.get(name).remove(force=True)
            raise

    def helper(self, aid, app, script, rules):
        # Fixed helper image, no Docker socket, no host network/PID namespaces.
        d = self.dir(aid)
        write_private(d / 'app.nft', rules)
        helper_image = image_of(self.owned(aid, 'egress'))
        self.oneshot(helper_image, entrypoint=['sh', '-ec'],
            command=[script], network_mode='container:' + app.id,
            cap_drop=['ALL'], cap_add=['NET_ADMIN'], security_opt=['no-new-privileges:true'],
            volumes={str(d / 'app.nft'): {'bind': '/app.nft', 'mode': 'ro'}})

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
        check_business_image(image)
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
        self.oneshot(image_ref, entrypoint=['sh', '-ec'],
            command=['mkdir -p /work/config /work/data; chown -R 1000:1000 /work'],
            user='0', network_mode='none', volumes={volume.name: {'bind': '/work', 'mode': 'rw'}})
        env = {}
        env.update(CCG_API_KEY=state['api_key'], CCG_ADMIN_KEY=state['admin_key'], CCG_EXTERNAL_EGRESS='1')
        if auth['mode'] == 'api_key':
            env.update(ANTHROPIC_API_KEY=auth['api_key'], ANTHROPIC_BASE_URL=auth['base_url'])
        # Apply locale and timezone configuration from account settings
        locale = auth.get('locale', '')
        timezone = auth.get('timezone', '')
        if locale:
            env['LANG'] = locale if '.' in locale else f'{locale}.UTF-8'
            env['LC_ALL'] = env['LANG']
        if timezone:
            env['TZ'] = timezone
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
            self.oneshot(egress_image,
                entrypoint=['sing-box', 'check', '-c', '/config/sing-box.json'],
                network_mode='none', volumes={str(d): {'bind': '/config', 'mode': 'ro'}})
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
            self._activate(aid, state, app, egress, revision)
            return self.public(aid)

    def _activate(self, aid, state, app, egress, revision):
        """Business firewall and default route, egress readiness, proxied probe,
        then readiness at revision. Shared by apply and the in-place worker
        update (a container restart rebuilds the account network namespace)."""
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
                self.oneshot(image_of(target), user='1000:1000',
                    entrypoint=['sh', '-ec'], command=[
                        'test -d /source/config && test ! -L /source/config; '
                        'test -d /target/config && test ! -L /target/config; '
                        'test ! -e /target/config/.credentials.json; '
                        'cp -a /source/config/. /target/config/'],
                    network_mode='none', volumes=volumes, cap_drop=['ALL'],
                    security_opt=['no-new-privileges:true'])
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
        # The same check guards the byte tunnel (GET .../tunnel).
        with self.guard(aid):
            state = self.state(aid)
            if not state or not revision or self.public(aid)['revision'] != revision:
                return None
            return {'app_ip': state['app_ip'], 'port': ACCOUNT_PORT,
                    'api_key': state['api_key'], 'revision': revision}

    # In-place worker update (CONTRACTS §53.7). Never provision, create, remove
    # or recreate the account container: replace one file, restart only it.

    def worker_program(self, ref):
        """Step 1: the program of image ref (from a never-started temporary container) and its SHA-256."""
        self.ensure_image(ref)
        temp = self.docker.containers.create(ref, entrypoint=['true'], network_disabled=True)
        try:
            try:
                chunks, _ = temp.get_archive(WORKER_SOURCE)
                data = read_single_file(chunks)
            except (docker.errors.NotFound, ValueError) as e:
                raise InvalidImage('image has no worker program') from e
        finally:
            with contextlib.suppress(docker.errors.DockerException, requests.exceptions.RequestException):
                temp.remove(force=True)
        return data, hashlib.sha256(data).hexdigest()

    def _same(self, aid, identity):
        """The account's app container, provided it is still the one the update started on."""
        try:
            container = self.owned(aid, 'app')
        except (docker.errors.NotFound, ValueError) as e:
            raise ContainerChanged('account container changed') from e
        if container_identity(container) != identity:
            raise ContainerChanged('account container changed')
        return container

    @staticmethod
    def _sha256(container, path):
        code, out = container.exec_run(['sha256sum', path], user='0')
        digest = (out or b'').decode(errors='replace').split(' ', 1)[0]
        return digest if code == 0 and SHA256_HEX.fullmatch(digest) else None

    @staticmethod
    def _discard(container, path):
        with contextlib.suppress(Exception):
            container.exec_run(['rm', '-f', path], user='0')

    def _stage(self, container, target, data, digest):
        """Put data next to target as <target>.next-<random> (root, 0755) and verify it."""
        tmp = f'{target}.next-{secrets.token_hex(6)}'
        try:
            if not container.put_archive(WORKER_DIR, tar_file(posixpath.basename(tmp), data)):
                raise RuntimeError('copy into container failed')
            code, _ = container.exec_run(['chmod', '0755', tmp], user='0')
            if code != 0:
                raise RuntimeError('chmod failed')
            code, out = container.exec_run(['stat', '-c', '%u:%g:%a', tmp], user='0')
            if code != 0 or (out or b'').strip() != b'0:0:755':
                raise RuntimeError('unexpected owner or mode')
            if self._sha256(container, tmp) != digest:
                raise RuntimeError('copied program differs')
        except BaseException:
            self._discard(container, tmp)
            raise
        return tmp

    def _swap(self, container, tmp, target):
        code, _ = container.exec_run(['mv', '-f', tmp, target], user='0')
        if code != 0:
            self._discard(container, tmp)
            raise RuntimeError('replace failed')

    def _wait_idle(self, aid, identity, base):
        deadline = time.monotonic() + WORKER_IDLE_WAIT
        while True:
            container = self._same(aid, identity)
            if worker_idle(container, base):
                return container
            if time.monotonic() >= deadline:
                return None
            time.sleep(WORKER_IDLE_INTERVAL)

    def _backup_worker(self, aid, container, target, digest):
        """Step 6: <root>/<key>/worker-backups/<UTC time>-<sha[:12]>, 0600, newest 5 kept."""
        chunks, _ = container.get_archive(target)
        try:
            data = read_single_file(chunks)
        except ValueError as e:
            raise UnsupportedContainer('worker program is not a regular file') from e
        if hashlib.sha256(data).hexdigest() != digest:
            raise RuntimeError('backup differs from the installed program')
        folder = self.dir(aid) / 'worker-backups'
        folder.mkdir(mode=0o700, exist_ok=True)
        os.chmod(folder, 0o700)
        name = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + digest[:12]
        write_private_bytes(folder / name, data)
        backups = sorted(p for p in folder.iterdir()
                         if WORKER_BACKUP_NAME.fullmatch(p.name) and p.is_file() and not p.is_symlink())
        for old in backups[:-WORKER_BACKUPS]:
            old.unlink()
        return data

    def _worker_healthy(self, aid, identity):
        deadline = time.monotonic() + WORKER_HEALTH_WAIT
        while True:
            container = self._same(aid, identity)
            if container.status != 'running':
                return False  # exited: no restart policy brings it back
            with contextlib.suppress(docker.errors.APIError):
                code, _ = container.exec_run(['node', '-e', WORKER_HEALTH_SCRIPT])
                if code == 0:
                    return True
            if time.monotonic() >= deadline:
                return False
            time.sleep(WORKER_HEALTH_INTERVAL)

    def _restart_healthy(self, aid, identity):
        """Restart only this container; healthy only if it really restarted and answers /health."""
        container = self._same(aid, identity)
        before = container.attrs['State'].get('StartedAt')
        with contextlib.suppress(docker.errors.APIError, requests.exceptions.RequestException):
            container.restart(timeout=WORKER_RESTART_TIMEOUT)
        container = self._same(aid, identity)
        if container.attrs['State'].get('StartedAt') == before:
            return False  # the old process may still be serving /health
        return self._worker_healthy(aid, identity)

    def _restore(self, aid, identity, target, data, digest):
        """Put the backup back: temporary file + mv while running; written
        directly into a stopped container (exec is impossible there and
        nothing executes the file)."""
        container = self._same(aid, identity)
        if container.status == 'running':
            self._swap(container, self._stage(container, target, data, digest), target)
            return
        if not container.put_archive(WORKER_DIR, tar_file(posixpath.basename(target), data)):
            raise RuntimeError('restore failed')
        chunks, _ = container.get_archive(target)
        if hashlib.sha256(read_single_file(chunks)).hexdigest() != digest:
            raise RuntimeError('restored program differs')

    def _reactivate(self, aid, identity, revision):
        """Step 9: firewall, route and probe again; readiness at the old revision or none."""
        app = self._same(aid, identity)
        try:
            state = self.state(aid)
            if not state or state.get('revision') != revision:
                raise RuntimeError('revision changed')
            self._activate(aid, state, app, self.owned(aid, 'egress'), revision)
            return True
        except Exception:
            # The core's next reconciliation applies the configuration again;
            # nothing is recreated here.
            self.online.pop(aid, None)
            return False

    def update_worker(self, aid, desired):
        """POST /accounts/<key>/worker {"image": ref} (CONTRACTS §53.7)."""
        check(aid)
        ref = desired.get('image') if isinstance(desired, dict) and set(desired) == {'image'} else None
        if not valid_image(ref):
            raise BadRequest('invalid image reference')
        data, digest = self.worker_program(ref)
        with self.guard(aid):
            try:
                container = self.owned(aid, 'app')
            except (docker.errors.NotFound, ValueError) as e:
                raise RuntimeNotFound('no account container') from e
            if container.status != 'running':
                return {'status': 'not_running'}
            identity = container_identity(container)
            target, base = worker_target(container)
            previous = self._sha256(container, target)
            if previous is None:
                raise UnsupportedContainer('worker program not readable')
            if previous == digest:
                return {'status': 'unchanged', 'sha256': digest}
            container = self._wait_idle(aid, identity, base)
            if container is None:
                return {'status': 'busy'}
            old = self._backup_worker(aid, container, target, previous)
            tmp = self._stage(container, target, data, digest)
            try:
                container = self._same(aid, identity)
                idle = worker_idle(container, base)
            except BaseException:
                self._discard(container, tmp)
                raise
            if not idle:
                self._discard(container, tmp)
                return {'status': 'busy'}
            self.public(aid)  # drops readiness that no longer matches the containers
            revision = (self.state(aid) or {}).get('revision', '')
            was_online = bool(revision) and self.online.get(aid) == revision
            self.online.pop(aid, None)
            self._swap(container, tmp, target)
            if self._restart_healthy(aid, identity):
                result = {'status': 'updated', 'previous_sha256': previous, 'sha256': digest, 'path': target}
            else:
                self._restore(aid, identity, target, old, previous)
                if not self._restart_healthy(aid, identity):
                    return {'status': 'rolled_back', 'reason': 'rollback_unhealthy', 'online': False}
                result = {'status': 'rolled_back', 'reason': 'unhealthy'}
            result['online'] = was_online and self._reactivate(aid, identity, revision)
            return result


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
        if self.close_connection:
            self.send_header('Connection', 'close')  # tell keep-alive clients
        self.end_headers()
        self.response_started = True
        self.wfile.write(raw)

    def fail(self, status, code, close=False):
        if close:
            self.close_connection = True
        return self.reply(status, {'error': code})

    def read_body(self, limit=64 << 10):
        """Read a small request body exactly; anything unusual is a bad request."""
        raw = self.headers.get('Content-Length', '0')
        if self.headers.get('Transfer-Encoding') or not DECIMAL.fullmatch(raw) or int(raw) > limit:
            raise BadRequest('invalid body')
        return self.rfile.read(int(raw))

    def read_json(self):
        try:
            return json.loads(self.read_body())
        except ValueError as e:
            raise BadRequest('invalid JSON') from e

    def handle_management(self, route):
        """Uploads (/images/uploads...) and target images (/runtime/...)."""
        try:
            self._management(route)
        except OSError:
            self.close_connection = True  # the client went away; nothing to answer

    def _management(self, route):
        manager = self.server.manager
        # Whatever fails, the request body may be left unread: never reuse the connection.
        try:
            if route.re is RUNTIME_ROUTE:
                kind = route[1]
                if kind == 'images' and self.command == 'GET':
                    self.read_body()
                    return self.reply(200, manager.runtime_images())
                if kind == 'images' and self.command == 'PUT':
                    return self.reply(200, manager.set_runtime_images(self.read_json()))
                if kind == 'controller' and self.command == 'POST':
                    return self.reply(202, manager.upgrade_controller(self.read_json()))
                return self.fail(405, 'method_not_allowed', close=True)
            uploads, upload_id, load = manager.uploads, route[1], route[2]
            if upload_id is None:
                if self.command != 'POST':
                    return self.fail(405, 'method_not_allowed', close=True)
                body = self.read_json()
                if not isinstance(body, dict) or set(body) - {'size', 'sha256'}:
                    raise BadRequest('invalid upload')
                return self.reply(200, uploads.create(body.get('size'), body.get('sha256')))
            if load:
                if self.command != 'POST':
                    return self.fail(405, 'method_not_allowed', close=True)
                self.read_body()
                return self.reply(200, uploads.load(upload_id))
            if self.command == 'PUT':
                raw, offset = self.headers.get('Content-Length', ''), self.headers.get('X-CCG-Offset', '')
                if (self.headers.get('Transfer-Encoding') or not DECIMAL.fullmatch(raw)
                        or not 1 <= int(raw) <= MAX_CHUNK or not DECIMAL.fullmatch(offset)):
                    raise BadRequest('invalid chunk')
                # Exactly Content-Length bytes: the connection stays usable.
                return self.reply(200, uploads.write(upload_id, int(offset), int(raw), self.rfile))
            if self.command in ('GET', 'DELETE'):
                self.read_body()
                return self.reply(200, (uploads.status if self.command == 'GET' else uploads.delete)(upload_id))
            return self.fail(405, 'method_not_allowed', close=True)
        except UploadError as e:
            self.close_connection = True
            if not self.response_started:
                self.reply(e.status, e.body())
        except BadRequest:
            self.close_connection = True
            if not self.response_started:
                self.fail(400, 'invalid_request')
        except InvalidImage:
            self.close_connection = True
            self.fail(400, 'invalid_image')
        except ImagePullFailed:
            self.close_connection = True
            self.fail(503, 'image_pull_failed')
        except UpgradeInProgress:
            self.close_connection = True
            self.fail(409, 'upgrade_in_progress')
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            self.close_connection = True
        except Exception:
            self.close_connection = True
            if not self.response_started:
                self.fail(503, 'runtime_unavailable')

    def handle_tunnel(self, aid):
        """GET /accounts/<key>/tunnel: raw bytes to <app_ip>:8787 (CONTRACTS §53.5)."""
        self.close_connection = True  # the connection never returns to HTTP
        if self.command != 'GET':
            return self.fail(405, 'method_not_allowed')
        tokens = {t.strip().lower() for t in self.headers.get('Connection', '').split(',')}
        if (self.headers.get('Upgrade', '').strip().lower() != 'ccg-tunnel' or 'upgrade' not in tokens
                or self.headers.get('Transfer-Encoding') or self.headers.get('Content-Length', '0') != '0'):
            return self.fail(400, 'invalid_request')
        try:
            target = self.server.manager.connection(aid, self.headers.get('X-CCG-Revision', ''))
        except BadRequest:
            return self.fail(400, 'invalid_request')
        except Exception:
            return self.fail(503, 'runtime_unavailable')
        if target is None:
            return self.fail(409, 'not_synchronized')
        try:
            upstream = socket.create_connection((target['app_ip'], ACCOUNT_PORT), timeout=5)
        except OSError:
            return self.fail(503, 'runtime_unavailable')
        with upstream, contextlib.suppress(OSError):  # the client may already be gone
            self.send_response(101)
            self.send_header('Connection', 'Upgrade')
            self.send_header('Upgrade', 'ccg-tunnel')
            self.end_headers()
            self.response_started = True
            upstream.settimeout(TUNNEL_IDLE_SECONDS)
            self.connection.settimeout(TUNNEL_IDLE_SECONDS)
            client = self.connection

            def pump(read, write, peer):
                # Content is never inspected or logged.
                try:
                    while data := read():
                        write(data)
                    with contextlib.suppress(OSError):
                        peer.shutdown(socket.SHUT_WR)
                except (OSError, ValueError):
                    # Idle timeout or reset on either side ends the whole tunnel.
                    for s in (client, upstream):
                        with contextlib.suppress(OSError):
                            s.shutdown(socket.SHUT_RDWR)

            # rfile is buffered: read1 also returns bytes it already holds
            # (a request pipelined right behind the upgrade request).
            back = threading.Thread(target=pump, daemon=True,
                                    args=(lambda: upstream.recv(65536), self.wfile.write, client))
            back.start()
            pump(lambda: self.rfile.read1(65536), upstream.sendall, upstream)
            back.join()

    def handle_worker(self, aid):
        """POST /accounts/<key>/worker: in-place worker update (CONTRACTS §53.7)."""
        try:
            if self.command != 'POST':
                return self.fail(405, 'method_not_allowed', close=True)
            return self.reply(200, self.server.manager.update_worker(aid, self.read_json()))
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True
            return None
        except Exception as e:
            # The request body may be left unread: never reuse the connection.
            self.close_connection = True
            if self.response_started:
                return None
            for kind, status, code in ((BadRequest, 400, 'invalid_request'), (InvalidImage, 400, 'invalid_image'),
                                       (RuntimeNotFound, 404, 'not_found'),
                                       (UnsupportedContainer, 409, 'unsupported_container'),
                                       (ImagePullFailed, 503, 'image_pull_failed'),
                                       (ContainerChanged, 503, 'container_changed')):
                if isinstance(e, kind):
                    return self.fail(status, code)
            return self.fail(503, 'runtime_unavailable')

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
        route = UPLOAD_ROUTE.fullmatch(self.path) or RUNTIME_ROUTE.fullmatch(self.path)
        if route:
            return self.handle_management(route)

        match = ROUTE.fullmatch(self.path)
        if not match:
            return self.fail(404, 'not_found', close=True)
        aid, path = match[1], match[2]
        if path == 'tunnel':
            return self.handle_tunnel(aid)  # GET without a body; never read one
        if path == 'worker':
            return self.handle_worker(aid)
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
            # do not hold the account reconciliation lock. (Legacy relay: the
            # core now talks to the account directly or through the tunnel.)
            headers = upstream_headers(self.headers, secret)
            # Model execution has a one-hour deadline; leave time to relay its
            # terminal response. Keep management requests on their short limit.
            relay_timeout = 3660 if path == 'v1/messages' else 240
            if path == 'v1/messages':
                self.connection.settimeout(relay_timeout)
            with requests.Session() as session:
                session.trust_env = False
                with session.request(self.command, f'http://{address}:{ACCOUNT_PORT}/{path}', data=body,
                                     headers=headers, stream=True, timeout=(5, relay_timeout), allow_redirects=False) as response:
                    self.send_response(response.status_code)
                    self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                    self.send_header('Connection', 'close')
                    self.send_header('Cache-Control', 'no-store')
                    self.end_headers()
                    self.response_started = True
                    self.close_connection = True
                    # Write whatever arrives; never wait to fill a buffer.
                    for chunk in response.iter_content(chunk_size=None):
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
    server = ThreadingHTTPServer(('127.0.0.1', int(os.getenv('CCG_CONTROLLER_PORT') or '8787')), Handler)
    server.daemon_threads = True
    server.key = key
    server.manager = Manager(os.environ['CCG_RUNTIME_ROOT'], os.environ['CCG_APP_IMAGE'],
                             os.environ['CCG_EGRESS_IMAGE'], os.getenv('CCG_RUNTIME_PREFIX', 'ccg'))
    server.serve_forever()
