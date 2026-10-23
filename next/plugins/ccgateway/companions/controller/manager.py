"""Host-side account runtime controller; binds only to loopback.

The core reaches it through the Caddy HTTPS gateway on the same host or over
SSH port forwarding (CONTRACTS §49.16, §53.9); model requests go to the
account Worker through GET connection / tunnel, never through this process's
HTTP relay. Docker SDK owns container lifecycle; sing-box (or the shared Xray
gateway) owns proxy protocols. The control API is never exposed on a business
network. State is root-private on this host.

Modules (none imports this one, so there is no import cycle):
  common          patterns, labels, exceptions and their HTTP answers, helpers
  dockerfs        single files inside containers, staged replace
  http_api        the HTTP API (Handler): routing, errors, tunnel, pass-through
  worker_update   in-place Worker update (§53.7), Manager mixin
  runtime_updates paired Worker+CLI activation
  runtime_admin   health, target images, self-upgrade, cleanup, Manager mixin
  shared_egress   the shared Xray gateway; cleanup: orphan inventory
  network / images / cli_profiles / upgrade
This module: the account runtime lifecycle (Manager) and the entry point
`python manager.py`.
"""
import contextlib
import fcntl
import hmac
import hashlib
import ipaddress
import json
import logging
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import sys
import threading
import time
from http.server import ThreadingHTTPServer
from types import SimpleNamespace
from urllib.parse import urlsplit

import docker
import requests

from cli_profiles import validate_profile, resolve_profile
# Several names below are only re-exported: tests and the manual scripts in
# this directory (integration_test.py, *_probe.py, offline_migrate_account.py)
# import them from manager.
from common import (ACCOUNT_PORT, AUTH_LABEL, CONTROLLER_NAME, DISK_QUOTA_LABEL, DRAFT, IMAGE_LABEL, KEY, KEY_PATTERN,
                    LABEL, NETWORK_LABEL, REVISION, SHA256_HEX, ActivationFailed, BadRequest, ContainerChanged,
                    DiskQuotaUnavailable, ImagePullFailed, InvalidCLIProfile, InvalidImage, NotDraft, ResourceInUse,
                    RuntimeBusy, RuntimeNotFound, UnsupportedContainer, UpgradeInProgress, absent_ok, boot_id, check,
                    check_business_image, read_json, rfc3339, valid_image, worker_session, write_private,
                    write_private_bytes)
from dockerfs import (WORKER_DIR, WORKER_MAX_BYTES, WORKER_NAMES, WORKER_SOURCE, container_identity, image_of,
                      read_single_file, tar_file, worker_idle, worker_target)
from http_api import Handler, ROUTE, RUNTIME_ROUTE, UPLOAD_ROUTE, upstream_headers
from images import Uploads
from network import configuration, business_rules, network_policy, host_routes, allocate_subnet, allocate_addresses
from runtime_admin import FEATURES, RuntimeAdmin
from shared_egress import OWNER as SHARED_OWNER, SharedEgress
from worker_update import (WORKER_HEALTH_SCRIPT, WORKER_RESTART_TIMEOUT, WorkerUpdates)

log = logging.getLogger('ccgateway.controller')

# Every operational telemetry channel Claude Code exposes through an environment
# variable, and nothing that removes a capability: CLAUDE_CODE_DISABLE_WEB_FETCH,
# CLAUDE_CODE_DISABLE_ARTIFACT, ENABLE_CLAUDEAI_MCP_SERVERS and
# CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL stay out because they turn
# a tool, a connector or a marketplace install off. The WebFetch domain check has
# no environment switch at all; only the skipWebFetchPreflight settings key stops
# it, so it keeps its normal behaviour.
# The Worker sets the same values in engine.telemetryDefaults: that copy reaches
# every CLI process on a Worker restart, this one survives a Worker image that
# predates it.
TELEMETRY_ENV = {
    'DISABLE_AUTOUPDATER': '1',
    'DISABLE_TELEMETRY': '1',
    'DO_NOT_TRACK': '1',
    'DISABLE_ERROR_REPORTING': '1',
    'DISABLE_GROWTHBOOK': '1',
    'CLAUDE_CODE_ENABLE_TELEMETRY': '0',
    'DISABLE_FEEDBACK_COMMAND': '1',
    'CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY': '1',
}
IMAGE_CACHE_SECONDS = 30
LOAD_TIMEOUT = 1800  # docker load of a large archive may stay silent for minutes
# Longest wait for the account lock on the request path (connection, tunnel,
# admin pass-through); the core gives up on connection after 15 s.
REQUEST_LOCK_WAIT = 20
# How often the proxy host names of ready runtimes are resolved again (B9).
PROXY_RECHECK_SECONDS = 300
# Container names of a runtime after <prefix>-<key>-: its role, optionally
# with a suffix (a rollback copy of a manual migration keeps label and volume).
ACCOUNT_CONTAINER_ROLE = re.compile(r'(?:app|egress)(?:-[A-Za-z0-9_.-]+)?')
DEFAULT_ACCOUNT_DISK_GIB = 10
DEFAULT_ENV_FILE = '/opt/ccgateway-runtime.env'
DEFAULT_CONTROLLER_NAME = 'ccg-controller'
# Creates the volume layout and drops what an earlier container's Worker kept
# in place (locale/timezone come from the new container's environment).
PREPARE_VOLUME = ('mkdir -p /work/config /work/data; rm -f /work/data/environment.json; '
                  'printf \'{"auto_update":false,"channel":"stable"}\\n\' > /work/data/cli-update.json; '
                  'chown -R 1000:1000 /work')
NFT_REPLACE = ('if nft list table inet ccg_app >/dev/null 2>&1; then '
               '{ printf "delete table inet ccg_app\\n"; cat /app.nft; } | nft -f -; '
               'else nft -f /app.nft; fi; ')
PROBE_SCRIPT = ('fetch(process.argv[1],{signal:AbortSignal.timeout(10000)})'
                '.then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))')
# POSIX locale names (ja_JP.UTF-8, C, POSIX) and IANA zone names
# (Asia/Tokyo, UTC, Etc/GMT+5): what the core sends.
LOCALE = re.compile(r'(?:C|POSIX|[A-Za-z]{2,3}(?:_[A-Za-z0-9]{2,8}){0,2})(?:\.[A-Za-z0-9-]{1,16})?(?:@[A-Za-z0-9]{1,16})?')
TIMEZONE = re.compile(r'[A-Za-z][A-Za-z0-9_+-]{0,63}(?:/[A-Za-z0-9][A-Za-z0-9_+-]{0,63}){0,3}')


def environment_value(key, value):
    pattern, limit = (LOCALE, 64) if key == 'locale' else (TIMEZONE, 128)
    if not isinstance(value, str) or len(value) > limit or value and (not pattern.fullmatch(value) or value == 'Local'):
        raise BadRequest('invalid ' + key)
    return value


def authentication(raw):
    # Missing auth preserves compatibility with existing OAuth controllers.
    raw = {'mode': 'oauth'} if raw is None else raw
    if not isinstance(raw, dict):
        raise BadRequest('invalid authentication')
    # locale and timezone become LANG/LC_ALL/TZ of the account container: the
    # core validates them (account settings), the controller checks the shape
    # again (audit B11). Empty means "not set".
    environment = {key: environment_value(key, raw.get(key, '')) for key in ('locale', 'timezone')}
    environment = {key: value for key, value in environment.items() if value}
    if set(raw) <= {'mode', 'locale', 'timezone'} and raw.get('mode') == 'oauth':
        return {'mode': 'oauth', **environment}
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
    return {'mode': 'api_key', 'api_key': key, 'base_url': base, **environment}


def auth_fingerprint(salt, auth):
    """Credential identity of a container (its AUTH_LABEL). Hashed with a
    private per-account salt: upstream keys are never persisted in controller
    state and status never exposes a credential fingerprint."""
    identity = {key: value for key, value in auth.items() if key not in ('locale', 'timezone')}
    return hmac.new(salt.encode(), json.dumps(identity, sort_keys=True).encode(), hashlib.sha256).hexdigest()


def first_subnet(network):
    return ipaddress.ip_network(network.attrs['IPAM']['Config'][0]['Subnet'])


class Manager(RuntimeAdmin, WorkerUpdates):
    def __init__(self, root, app_image, egress_image, prefix='ccg', probe_url='https://www.gstatic.com/generate_204'):
        if not re.fullmatch(r'[a-z][a-z0-9-]{0,24}', prefix):
            raise ValueError('invalid prefix')
        self._configure_from_environment()
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
        self.runtime_lock, self.upgrade_lock = threading.Lock(), threading.Lock()
        # Target images set through PUT /runtime/images override the environment
        # only while the environment is the one they were saved against: an SSH
        # (re)install that rewrote CCG_APP_IMAGE / CCG_EGRESS_IMAGE wins.
        self.env_images = {'app': app_image, 'egress': egress_image}
        self._restore_runtime_images()
        self.uploads = Uploads(docker.from_env(timeout=LOAD_TIMEOUT), self.root / 'uploads')
        self._shared = None

    def _configure_from_environment(self):
        disk_gib = os.getenv('CCG_ACCOUNT_DISK_GIB', str(DEFAULT_ACCOUNT_DISK_GIB))
        if not re.fullmatch(r'[1-9][0-9]{0,3}', disk_gib) or not 1 <= int(disk_gib) <= 1024:
            raise ValueError('CCG_ACCOUNT_DISK_GIB must be an integer between 1 and 1024')
        self.account_disk_bytes = int(disk_gib) << 30
        # Storage without project quotas gets unbounded volumes, reported as
        # such, unless the operator requires every new volume to be limited.
        required = os.getenv('CCG_ACCOUNT_DISK_QUOTA_REQUIRED', '0')
        if required not in ('0', '1'):
            raise ValueError('CCG_ACCOUNT_DISK_QUOTA_REQUIRED must be 0 or 1')
        self.require_disk_quota = required == '1'
        self.disk_quota_support = 'unknown'
        # Name and port of this controller's own container (an isolated test
        # instance on the same host uses others; self-upgrade must not touch
        # the production controller).
        self.controller_name = os.getenv('CCG_CONTROLLER_NAME') or DEFAULT_CONTROLLER_NAME
        if not CONTROLLER_NAME.fullmatch(self.controller_name):
            raise ValueError('invalid controller name')
        self.controller_port = int(os.getenv('CCG_CONTROLLER_PORT') or '8787')
        self.version = os.getenv('CCG_CONTROLLER_VERSION') or 'dev'
        self.controller_image = os.getenv('CCG_CONTROLLER_IMAGE', '')
        self.env_file = os.getenv('CCG_RUNTIME_ENV_FILE') or DEFAULT_ENV_FILE

    def _restore_runtime_images(self):
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

    @property
    def shared(self):
        with self.lock:
            if self._shared is None:
                self._shared = SharedEgress(self)
            return self._shared

    # Names, ownership, state.

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

    def owned_resource(self, collection, aid, role):
        """The network or volume <prefix>-<key>-<role>, None when absent;
        ValueError when the name is taken by someone else's resource."""
        try:
            item = collection.get(self.name(aid, role))
        except docker.errors.NotFound:
            return None
        if (item.attrs.get('Labels') or {}).get(LABEL) != aid:
            raise ValueError(f'{role} ownership mismatch')
        return item

    def state(self, aid):
        return read_json(self.dir(aid) / 'state.json')

    def save(self, aid, state):
        write_private(self.dir(aid) / 'state.json', json.dumps(state))

    def save_desired(self, aid, desired):
        """What the core asked for (without credentials): shared-egress
        migration and the proxy recheck read it back."""
        write_private(self.dir(aid) / 'egress-desired.json', json.dumps({k: v for k, v in desired.items() if k != 'auth'}))

    def drop_readiness(self, aid):
        self.online.pop(aid, None)
        self.boots.pop(aid, None)

    # Images, one-shot helpers, networks, volumes.

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
        helper_image = (image_of(self.shared.container()) if (self.state(aid) or {}).get('egress_backend') == 'shared_xray'
                        else image_of(self.owned(aid, 'egress')))
        self.oneshot(helper_image, entrypoint=['sh', '-ec'],
            command=[script], network_mode='container:' + app.id,
            cap_drop=['ALL'], cap_add=['NET_ADMIN'], security_opt=['no-new-privileges:true'],
            volumes={str(d / 'app.nft'): {'bind': '/app.nft', 'mode': 'ro'}})

    def docker_ipv4_subnets(self):
        """(labels, subnet) of every IPv4 subnet of every Docker network."""
        for n in self.docker.networks.list():
            for cfg in n.attrs.get('IPAM', {}).get('Config') or []:
                subnet = ipaddress.ip_network(cfg['Subnet']) if cfg.get('Subnet') else None
                if subnet is not None and subnet.version == 4:
                    yield n.attrs.get('Labels') or {}, subnet

    def ensure_network(self, aid, role, policy, internal):
        with self.network_lock:
            network = self.owned_resource(self.docker.networks, aid, role)
            if network is not None:
                return network
            occupied = host_routes() + [subnet for _, subnet in self.docker_ipv4_subnets()]
            subnet = allocate_subnet(policy, occupied)
            return self.docker.networks.create(self.name(aid, role), driver='bridge',
                internal=internal, labels={LABEL: aid, NETWORK_LABEL: json.dumps(policy, sort_keys=True)},
                enable_ipv6=False, ipam=docker.types.IPAMConfig(pool_configs=[
                    docker.types.IPAMPool(subnet=str(subnet), gateway=str(subnet.network_address + 1))]))

    def account_volume(self, aid, allow_unbounded=False):
        """Native Docker local-volume project quota. Never replace saved data."""
        volume = self._data_volume(aid, allow_unbounded)
        labels = volume.attrs.get('Labels') or {}
        if labels.get(LABEL) != aid:
            raise ValueError('volume ownership mismatch')
        size = (volume.attrs.get('Options') or {}).get('size')
        if not size and DISK_QUOTA_LABEL not in labels and allow_unbounded:
            return volume, 0
        if (volume.attrs.get('Driver') != 'local' or not isinstance(size, str) or
                not re.fullmatch(r'[1-9][0-9]{0,14}', size) or
                labels.get(DISK_QUOTA_LABEL) != size or not (1 << 30) <= int(size) <= (1024 << 30)):
            raise DiskQuotaUnavailable('Existing volume requires explicit disk quota migration')
        self.disk_quota_support = 'available'
        # The stored limit wins: changing a default must never resize or
        # replace a volume which may contain authorization and request history.
        return volume, int(size)

    def _data_volume(self, aid, allow_unbounded):
        """The existing volume, or a new one: with a hard size limit, or
        unbounded where the storage has no project quotas and that is allowed."""
        name = self.name(aid, 'data')
        try:
            return self.docker.volumes.get(name)
        except docker.errors.NotFound:
            pass
        try:
            return self.docker.volumes.create(name, driver='local',
                driver_opts={'size': str(self.account_disk_bytes)},
                labels={LABEL: aid, DISK_QUOTA_LABEL: str(self.account_disk_bytes)})
        except docker.errors.APIError as error:
            if 'no quota support' not in str(error).lower():
                raise
            self.disk_quota_support = 'unavailable'
            if self.require_disk_quota or not allow_unbounded:
                raise DiskQuotaUnavailable('Docker data volumes do not support disk quotas') from error
        return self.docker.volumes.create(name, driver='local', labels={LABEL: aid})

    def verify_disk_quota(self, image, volume, disk_bytes):
        if not disk_bytes:
            return
        # XFS project quotas make statfs on the quota root report its hard limit.
        # Validate before replacing any running container or network.
        script = ("const fs=require('fs'),s=fs.statfsSync('/work',{bigint:true});"
                  f"if(s.blocks<=0n||s.blocks*s.bsize>BigInt('{disk_bytes}'))process.exit(42);")
        try:
            self.oneshot(image, entrypoint=['node'], command=['-e', script], user='1000:1000',
                network_mode='none', cap_drop=['ALL'], security_opt=['no-new-privileges:true'],
                volumes={volume.name: {'bind': '/work', 'mode': 'ro'}})
        except docker.errors.DockerException as error:
            raise DiskQuotaUnavailable('The account volume does not expose its enforced quota') from error

    # Provision: the app container, its networks and volume.

    def provision(self, aid, auth=None, policy=None, cli=None):
        # Serialize allocation and replacement across accounts. Otherwise two
        # parallel reconciliations could select the same still-free subnet.
        with self.network_lock:
            state = self._provision(aid, auth, policy, cli)
        # Outside the network lock: a slow account Worker must not hold up
        # the reconciliation of other accounts.
        if state.get('environment_pending') and isinstance(state.get('environment_desired'), dict):
            self._sync_environment(aid, state)
        return state

    def _sync_environment(self, aid, state):
        """Apply a locale/timezone change to the existing container in place.

        Docker cannot change a container's environment and account containers
        are never recreated for this: a Worker with PUT /admin/environment
        applies it to every CLI process it starts afterwards (and keeps it in
        its data volume). An older Worker (404/405), a stopped container or a
        failed call leaves environment_pending set, as before; the next
        reconciliation tries again. Never fails the apply."""
        desired = state['environment_desired']
        created = state.get('environment_created') or {}
        # An empty value means "the container's own value": a value fixed at
        # container creation cannot be cleared without a new container.
        if any(not desired.get(key) and created.get(key) for key in ('locale', 'timezone')):
            return
        try:
            if self.owned(aid, 'app').status != 'running':
                return
            with worker_session() as session:
                response = session.request('PUT', f'http://{state["app_ip"]}:{ACCOUNT_PORT}/admin/environment',
                    json=desired, headers={'Authorization': 'Bearer ' + state['admin_key']},
                    timeout=(3, 10), allow_redirects=False)
                if response.status_code != 200:
                    return
                view = response.json()
        except (docker.errors.DockerException, requests.exceptions.RequestException, ValueError, KeyError):
            return
        if not isinstance(view, dict) or any(view.get(key) != desired.get(key) for key in ('locale', 'timezone')):
            return
        state['environment'] = desired
        state['environment_pending'] = False
        state.pop('environment_desired', None)
        self.save(aid, state)

    def _provision(self, aid, auth=None, policy=None, cli=None):
        try:
            cli = validate_profile(cli)
        except ValueError as e:
            raise BadRequest(str(e)) from e
        policy = network_policy(policy)
        auth = authentication(auth)
        self.dir(aid).mkdir(mode=0o700, exist_ok=True)
        state = self.state(aid)
        salt = state['admin_key'] if state else secrets.token_urlsafe(32)
        fingerprint = auth_fingerprint(salt, auth)
        environment = {key: auth.get(key, '') for key in ('locale', 'timezone')}
        existing = None
        if state:
            with contextlib.suppress(docker.errors.NotFound):
                existing = self.owned(aid, 'app')
            if self._keep_existing(aid, state, existing, policy, fingerprint, cli, environment):
                return state
        # Everything is validated before a working container or network goes.
        plan = self._plan_container(aid, state, existing, cli)
        if not state or state.get('network') != policy:
            self._check_subnet_capacity(aid, policy)
        self._remove_replaced(aid, state, existing, policy)
        addresses = self._addresses(aid, state, policy)
        state = self._record_runtime(aid, state, salt, policy, addresses, plan)
        self._create_app(aid, state, auth, fingerprint, plan, addresses)
        state['auth_mode'] = auth['mode']
        if plan.cli is not None:
            state['cli'] = plan.cli
        state.update(environment=environment, environment_created=environment, environment_pending=False)
        state.pop('environment_desired', None)
        self.save(aid, state)
        return state

    @staticmethod
    def _same_runtime(state, existing, cli):
        """Whether cli keeps the CLI the container runs. Defaults apply to new
        containers only: a tag/digest change must never replace a working
        account (including after controller restart)."""
        active = state.get('active_runtime') or {}
        active_matches = (existing and active.get('container_identity') == container_identity(existing)
                          and cli is not None and cli['version'] == active.get('version'))
        saved = state.get('cli') or {}
        return (cli is None or saved == cli or active_matches or
                cli.get('version') == saved.get('version') and
                cli.get('request_mode') in ('direct', 'build') and
                saved.get('request_mode') in ('direct', 'build'))

    def _keep_existing(self, aid, state, existing, policy, fingerprint, cli, environment):
        """True when the existing container stays (same network, credentials
        and CLI; a locale/timezone change is applied in place)."""
        same_runtime = self._same_runtime(state, existing, cli)
        if existing and state.get('network') == policy and existing.labels.get(AUTH_LABEL) == fingerprint:
            if not same_runtime:
                raise InvalidCLIProfile('CLI version changes require a packaged in-place Worker+CLI activation')
            self._note_environment(aid, state, environment)
            return True
        active = state.get('active_runtime') or {}
        if existing and active.get('container_identity') == container_identity(existing) and cli is not None and not same_runtime:
            raise InvalidCLIProfile('activate a packaged Worker+CLI pair before selecting a different CLI version')
        return False

    def _note_environment(self, aid, state, environment):
        current = state.get('environment', {'locale': '', 'timezone': ''})
        # State written before in-place changes: the values the container was
        # created with are the last applied ones.
        state.setdefault('environment_created', current)
        state['environment_pending'] = environment != current
        if state['environment_pending']:
            state['environment_desired'] = environment  # provision() pushes it to the Worker
        else:
            state.pop('environment_desired', None)
        self.save(aid, state)

    def _plan_container(self, aid, state, existing, cli):
        """Image, CLI and volume of the container to create, all validated:
        nothing has been stopped or removed yet."""
        # Credential/network changes must not incidentally upgrade the image.
        if existing is None and cli is None and os.getenv('CCG_DEFAULT_CLI_VERSION'):
            try:
                cli = validate_profile({'version': os.environ['CCG_DEFAULT_CLI_VERSION'], 'request_mode': 'build', 'disable_auto_update': True})
            except ValueError as e:
                raise BadRequest('invalid controller default CLI version') from e
        saved_cli = (state or {}).get('cli', {})
        version_changed = cli is not None and saved_cli.get('version') != cli['version']
        retired_mode = cli is not None and saved_cli.get('request_mode') not in ('direct', 'build')
        # Migrating the removed agent path also installs the current Worker.
        image_ref = image_of(existing) if existing and not version_changed and not retired_mode else self.app_image
        image = self.ensure_image(image_ref)
        check_business_image(image)
        try:
            cli_env = resolve_profile(self, image_ref, cli)
        except (ValueError, docker.errors.DockerException) as e:
            raise InvalidCLIProfile('requested CLI version/mode is unavailable or invalid in the selected image') from e
        # An enforced quota never silently becomes unbounded; legacy data
        # always stays usable, and unbounded storage only while not required.
        recorded = state.get('disk_quota', {}).get('status', 'legacy_unbounded') if state else None
        legacy = recorded == 'legacy_unbounded'
        unbounded = legacy or recorded in (None, 'unbounded') and not self.require_disk_quota
        volume, disk_bytes = self.account_volume(aid, allow_unbounded=unbounded)
        self.verify_disk_quota(image_ref, volume, disk_bytes)
        return SimpleNamespace(image_ref=image_ref, image=image, cli=cli, cli_env=cli_env, volume=volume,
                               disk_bytes=disk_bytes, legacy=legacy)

    def _check_subnet_capacity(self, aid, policy):
        """Two free subnets for a new network policy, before anything goes."""
        old_subnets, occupied = [], []
        for labels, subnet in self.docker_ipv4_subnets():
            (old_subnets if labels.get(LABEL) == aid else occupied).append(subnet)
        occupied.extend(r for r in host_routes() if r not in old_subnets)
        first = allocate_subnet(policy, occupied)
        allocate_subnet(policy, occupied + [first])

    def _remove_replaced(self, aid, state, existing, policy):
        if existing:
            self.online.pop(aid, None)
            absent_ok(existing.remove, force=True)
        if state and state.get('network') == policy:
            return
        self.drop_readiness(aid)
        with contextlib.suppress(docker.errors.NotFound):
            self.owned(aid, 'egress').remove(force=True)
        for role in ('net', 'uplink'):
            old = self.owned_resource(self.docker.networks, aid, role)
            if old is not None:
                absent_ok(old.remove)

    def _addresses(self, aid, state, policy):
        network = self.ensure_network(aid, 'net', policy, True)
        uplink = self.ensure_network(aid, 'uplink', policy, False)
        network.reload()
        if state and state.get('network') == policy:
            return SimpleNamespace(network=network, gateway_ip=state['gateway_ip'], app_ip=state['app_ip'],
                                   uplink_ip=state['uplink_ip'])
        gateway_ip, app_ip = allocate_addresses(first_subnet(network), policy['allocation'])
        uplink_ip = allocate_addresses(first_subnet(uplink), policy['allocation'], 1)[0]
        return SimpleNamespace(network=network, gateway_ip=gateway_ip, app_ip=app_ip, uplink_ip=uplink_ip)

    def _record_runtime(self, aid, state, salt, policy, addresses, plan):
        d = self.dir(aid)
        write_private(d / 'resolv.conf', f'nameserver {addresses.gateway_ip}\noptions timeout:2 attempts:2\n')
        # resolv.conf contains only the ordinary internal DNS address.
        os.chmod(d / 'resolv.conf', 0o644)
        state = state or {'api_key': secrets.token_urlsafe(32), 'admin_key': salt,
                          'app_ip': addresses.app_ip, 'gateway_ip': addresses.gateway_ip, 'revision': '',
                          'status': 'pending', 'created_at': rfc3339(time.time())}
        state.update(network=policy, gateway_ip=addresses.gateway_ip, app_ip=addresses.app_ip,
                     uplink_ip=addresses.uplink_ip, revision='', status='pending')
        state['disk_quota'] = {'limit_bytes': plan.disk_bytes, 'status': 'enforced' if plan.disk_bytes
                               else 'legacy_unbounded' if plan.legacy else 'unbounded'}
        self.save(aid, state)
        return state

    def app_environment(self, state, auth, plan):
        env = {**plan.cli_env, **TELEMETRY_ENV}
        env.update(CCG_API_KEY=state['api_key'], CCG_ADMIN_KEY=state['admin_key'], CCG_EXTERNAL_EGRESS='1')
        if plan.disk_bytes:
            env['CCG_ACCOUNT_DISK_QUOTA_BYTES'] = str(plan.disk_bytes)
        if auth['mode'] == 'api_key':
            env.update(ANTHROPIC_API_KEY=auth['api_key'], ANTHROPIC_BASE_URL=auth['base_url'])
        locale, timezone = auth.get('locale', ''), auth.get('timezone', '')
        if locale:
            env['LANG'] = locale if '.' in locale else f'{locale}.UTF-8'
            env['LC_ALL'] = env['LANG']
        if timezone:
            env['TZ'] = timezone
        return env

    def _create_app(self, aid, state, auth, fingerprint, plan, addresses):
        self.oneshot(plan.image_ref, entrypoint=['sh', '-ec'], command=[PREPARE_VOLUME],
            user='0', network_mode='none', volumes={plan.volume.name: {'bind': '/work', 'mode': 'rw'}})
        options = self.common(aid)
        options['labels'][AUTH_LABEL] = fingerprint
        options['labels'][IMAGE_LABEL] = plan.image.id
        network = addresses.network.name
        self.docker.containers.create(plan.image_ref, name=self.name(aid, 'app'), network=network,
            networking_config={network: self.docker.api.create_endpoint_config(ipv4_address=addresses.app_ip)},
            user='1000:1000', environment=self.app_environment(state, auth, plan),
            volumes={plan.volume.name: {'bind': '/work', 'mode': 'rw'},
                     str(self.dir(aid) / 'resolv.conf'): {'bind': '/etc/resolv.conf', 'mode': 'ro'}},
            mem_limit='1g', nano_cpus=2000000000, **options)

    # Apply: PUT /accounts/<key>/config.

    def apply(self, aid, desired):
        with self.guard(aid):
            revision, policy, direct = self._validate_desired(aid, desired)
            state = self.state(aid)
            if state:
                self.save_desired(aid, desired)
            if not (desired.get('proxy') or direct) or not desired.get('enabled', True):
                return self.block(aid)
            if state and state.get('egress_backend') == 'shared_xray':
                return self._apply_shared(aid, state, desired, policy, revision)
            return self._apply_dedicated(aid, state, desired, policy, revision, direct)

    def _validate_desired(self, aid, desired):
        if (self.state(aid) or {}).get('migration_failed'):
            raise BadRequest('failed migration draft must be discarded')
        if not isinstance(desired, dict):
            raise BadRequest('invalid configuration')
        try:
            validate_profile(desired.get('cli'))
        except ValueError as e:
            raise BadRequest(str(e)) from e
        revision = desired.get('revision', '')
        if not isinstance(revision, str) or not REVISION.fullmatch(revision):
            raise BadRequest('invalid revision')
        try:
            policy = network_policy(desired.get('network'))
        except (ValueError, TypeError) as e:
            raise BadRequest('invalid network policy') from e
        # No proxy egresses directly only when the core says so (direct):
        # an older core without the flag still gets the runtime blocked.
        return revision, policy, desired.get('direct') is True and not desired.get('proxy')

    def _apply_shared(self, aid, state, desired, policy, revision):
        if state.get('network') != policy:
            raise BadRequest('migrate back before changing network allocation')
        if state.get('egress_migration') and state['egress_migration'].get('phase') == 'failed':
            raise BadRequest('resume or rollback failed egress migration')
        if self.public(aid)['revision'] == revision:
            return self.public(aid)
        self.shared.remove(aid)
        state = self.provision(aid, desired.get('auth'), policy, desired.get('cli'))
        return self.shared.apply(aid, state, desired)

    def _apply_dedicated(self, aid, state, desired, policy, revision, direct):
        old = None
        with contextlib.suppress(docker.errors.NotFound):
            old = self.owned(aid, 'egress')
        egress_image = image_of(old) if old else self.egress_image
        self.ensure_image(egress_image)
        had_state = state is not None
        state = self.provision(aid, desired.get('auth'), policy, desired.get('cli'))
        if not had_state:
            self.save_desired(aid, desired)
        if self.public(aid)['revision'] == revision:
            app, egress = self.owned(aid, 'app'), self.owned(aid, 'egress')
            if app.status == 'running' and egress.status == 'running':
                return self.public(aid)
        self.online.pop(aid, None)
        state['status'] = 'syncing'
        self.save(aid, state)
        egress = self._egress(aid, state, desired, direct, egress_image, old is not None)
        app = self.owned(aid, 'app')
        if app.status != 'running':
            app.start()
        self._activate(aid, state, app, egress, revision)
        return self.public(aid)

    def _egress(self, aid, state, desired, direct, egress_image, had_egress):
        """The running egress with the configuration desired asks for. The
        running one is kept only with the very configuration it runs: the
        same revision can resolve the proxy host to another address (B9)."""
        # Config validation happens before the old egress is stopped.
        try:
            config, rules = configuration(None if direct else desired['proxy'], state['app_ip'], state['gateway_ip'])
        except (ValueError, KeyError, TypeError) as e:
            raise BadRequest('invalid proxy') from e
        d = self.dir(aid)
        reuse = False
        if had_egress:
            with contextlib.suppress(OSError, ValueError):
                reuse = json.loads((d / 'sing-box.json').read_text()) == config
        write_private(d / 'sing-box.json', json.dumps(config))
        write_private(d / 'firewall.nft', rules)
        self.oneshot(egress_image, entrypoint=['sing-box', 'check', '-c', '/config/sing-box.json'],
                     network_mode='none', volumes={str(d): {'bind': '/config', 'mode': 'ro'}})
        try:
            old = self.owned(aid, 'egress')
        except docker.errors.NotFound:
            old = None
        if old and not reuse:
            old.remove(force=True)
        egress = (old if reuse else None) or self._create_egress(aid, state, egress_image)
        if egress.status != 'running':
            egress.start()
        return egress

    def _create_egress(self, aid, state, egress_image):
        uplink = self.name(aid, 'uplink')
        egress = self.docker.containers.create(egress_image, name=self.name(aid, 'egress'), network=uplink,
            networking_config={uplink: self.docker.api.create_endpoint_config(ipv4_address=state['uplink_ip'])},
            cap_add=['NET_ADMIN'], sysctls={'net.ipv4.ip_forward': '0', 'net.ipv6.conf.all.disable_ipv6': '1'},
            volumes={str(self.dir(aid)): {'bind': '/config', 'mode': 'ro'}}, mem_limit='128m',
            **self.common(aid))
        self.docker.networks.get(self.name(aid, 'net')).connect(egress, ipv4_address=state['gateway_ip'])
        return egress

    def business_firewall(self, aid, app, gateway_ip):
        """The ccg_app rules and the default route inside the account's
        network namespace (atomic nft replacement; nothing in the host's
        routing table or firewall). A (re)started container has neither:
        Docker gives it a fresh namespace."""
        self.helper(aid, app, NFT_REPLACE + f'ip route replace default via {gateway_ip}', business_rules(gateway_ip))

    def _activate(self, aid, state, app, egress, revision):
        """Business firewall and default route, egress readiness, proxied probe,
        then readiness at revision. Shared by apply and the in-place worker
        update (a container restart rebuilds the account network namespace)."""
        self.business_firewall(aid, app, state['gateway_ip'])
        for _ in range(30):
            egress.reload()
            if egress.status != 'running':
                raise RuntimeError('egress failed')
            code, _ = egress.exec_run(['sh', '-ec', 'ss -lnt | grep -q :15001'])
            if code == 0:
                break
            time.sleep(.2)
        else:
            raise ActivationFailed('egress_not_ready', 'egress not ready')
        # Probe through the business namespace, not through host networking.
        code, _ = app.exec_run(['node', '-e', PROBE_SCRIPT, self.probe_url])
        if code != 0:
            raise ActivationFailed('proxy_check_failed', 'account proxy connectivity check failed')
        state.update(revision=revision, status='ready')
        self.save(aid, state)
        app.reload()
        egress.reload()
        self.boots[aid] = tuple(boot_id(c) for c in (app, egress))
        self.online[aid] = revision

    def block(self, aid):
        self.online.pop(aid, None)
        state = self.state(aid)
        if state:
            for role in ('app', 'egress'):
                with contextlib.suppress(docker.errors.NotFound):
                    self.owned(aid, role).stop(timeout=10)
            state['status'] = 'blocked'
            self.save(aid, state)
            if state.get('egress_backend') == 'shared_xray':
                self.shared.remove(aid)
        return {'account_id': aid, 'status': 'blocked', 'revision': ''}

    # Delete: DELETE /accounts/<key>.

    def delete(self, aid, account=False, purge=False):
        """Remove a runtime completely; idempotent. Drafts always; an account
        runtime only when the caller says so explicitly (account=True): the
        purge=True also removes account data and recovery metadata.

        Every container of the runtime goes, also copies a manual migration
        left behind (<prefix>-<key>-app-rollback-<tag>, same label and volume),
        which used to keep the volume busy forever. Everything is checked
        before anything is removed: a same-name resource of someone else is a
        ValueError, a container outside the runtime that still uses one of its
        networks or the volume to be removed is ResourceInUse (409)."""
        check(aid)
        if not DRAFT.fullmatch(aid) and not account:
            raise NotDraft('only draft runtimes can be deleted')
        remove_volume = not account or purge
        with self.guard(aid):
            containers, networks, volume = self._deletion_plan(aid, remove_volume)
            self._detach_shared(aid)
            state = self.state(aid)
            if account and not purge and state:
                backup = self.root / 'backups'
                backup.mkdir(mode=0o700, exist_ok=True)
                write_private(backup / (aid + '.json'), json.dumps(state))
            self.drop_readiness(aid)
            removed = self._remove_resources(aid, containers, networks, volume if remove_volume else None)
            d = self.dir(aid)
            if d.is_dir() and not d.is_symlink():
                shutil.rmtree(d)
            if purge:
                with contextlib.suppress(FileNotFoundError):
                    (self.root / 'backups' / (aid + '.json')).unlink()
        return {'deleted': True, 'removed': removed}

    def _remove_resources(self, aid, containers, networks, volume):
        """Containers first (they hold the networks and the volume), then the
        networks, then the volume when given (retired account data is kept for
        manual recovery unless purged; a draft's volume always goes)."""
        removed = {'containers': [], 'networks': [], 'volume': False}
        for container in containers:
            if absent_ok(container.remove, force=True):
                log.info('delete key=%s removed container %s', aid, container.name)
                removed['containers'].append(container.name)
        for network in networks:
            self._disconnect_shared_gateway(network)
            if absent_ok(network.remove):
                removed['networks'].append(network.name)
        if volume is not None:
            removed['volume'] = absent_ok(volume.remove, force=True)
        return removed

    def account_containers(self, aid):
        """Every container of this runtime, stopped ones included: the account
        label says it is ours, the name <prefix>-<key>-app|egress[-suffix]
        keeps the containers of another controller instance (another prefix,
        same key) out."""
        check(aid)
        found = self.docker.containers.list(all=True, filters={'label': f'{LABEL}={aid}'}, ignore_removed=True)
        return sorted((c for c in found if c.labels.get(LABEL) == aid and self.container_of(aid, c.name)),
                      key=lambda c: c.name)

    def container_of(self, aid, name):
        """Whether name is a container name of runtime aid (its role, optionally suffixed)."""
        head = f'{self.prefix}-{aid}-'
        return name.startswith(head) and bool(ACCOUNT_CONTAINER_ROLE.fullmatch(name[len(head):]))

    def _deletion_plan(self, aid, remove_volume):
        """(containers, networks, volume) of the runtime; nothing is changed."""
        for role in ('app', 'egress'):
            absent_ok(self.owned, aid, role)  # a same-name foreign container raises
        containers = self.account_containers(aid)
        networks = [n for n in (self.owned_resource(self.docker.networks, aid, role) for role in ('net', 'uplink')) if n]
        volume = self.owned_resource(self.docker.volumes, aid, 'data')
        ours, gateway = {c.id for c in containers}, self._shared_gateway_id()
        foreign = set()
        for network in networks:
            foreign.update(endpoint.get('Name') or cid for cid, endpoint in (network.attrs.get('Containers') or {}).items()
                           if cid not in ours and cid != gateway)
        if volume is not None and remove_volume:
            for c in self.docker.containers.list(all=True, filters={'volume': volume.name}, ignore_removed=True):
                if c.id in ours:
                    continue
                if self._stale_helper(c):
                    containers.append(c)  # this controller's own leftover one-shot helper
                else:
                    foreign.add(c.name)
        if foreign:
            raise ResourceInUse(foreign)
        return containers, networks, volume

    def _stale_helper(self, container):
        """A one-shot helper of this controller that never ran or has ended
        (older controllers left failed ones behind in "Created")."""
        return container.name.startswith(f'{self.prefix}-oneshot-') and container.status in ('created', 'exited', 'dead')

    def _detach_shared(self, aid):
        if ((self.state(aid) or {}).get('egress_backend') == 'shared_xray'
                or ((self.root / 'shared-egress' / 'state.json').exists() and aid in self.shared.data['bindings'])):
            self.shared.remove(aid, disconnect=True)

    def _shared_gateway_id(self):
        """Id of this controller's shared egress gateway, attached to every
        shared account's network (detached by _detach_shared), or None."""
        try:
            gateway = self.docker.containers.get(f'{self.prefix}-shared-egress')
        except docker.errors.NotFound:
            return None
        return gateway.id if gateway.labels.get(SHARED_OWNER) == self.prefix else None

    def _disconnect_shared_gateway(self, network):
        gateway = self._shared_gateway_id()
        network.reload()
        if gateway and gateway in (network.attrs.get('Containers') or {}):
            absent_ok(network.disconnect, gateway, force=True)

    # Readiness and the request path.

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
            out.append({'key': aid, 'status': self._listed_status(aid, state), 'created_at': created})
        return {'runtimes': out}

    def _listed_status(self, aid, state):
        if state.get('status') == 'blocked':
            return 'blocked'
        try:
            return self.public(aid)['status']
        except (docker.errors.DockerException, ValueError):
            return 'pending'

    def readiness(self, aid, state):
        """The revision the containers are online at ('' when none). Drops
        readiness the containers no longer back (stopped, restarted, gone).
        Two inspects, no image lookup: the request path calls this."""
        if aid not in self.online:
            return ''
        try:
            if state.get('egress_backend') == 'shared_xray':
                containers = [self.owned(aid, 'app'), self.shared.container()]
                if not self.shared.healthy(aid, state):
                    self.online.pop(aid, None)
            else:
                containers = [self.owned(aid, role) for role in ('app', 'egress')]
            if any(c.status != 'running' for c in containers) or tuple(boot_id(c) for c in containers) != self.boots.get(aid):
                self.online.pop(aid, None)
        except docker.errors.NotFound:
            self.online.pop(aid, None)
        return self.online.get(aid, '')

    def public(self, aid):
        state = self.state(aid) or {}
        online = self.readiness(aid, state)
        current_image, target_id = '', ''
        with contextlib.suppress(docker.errors.NotFound):
            current_image = image_of(self.owned(aid, 'app'))
        with contextlib.suppress(docker.errors.DockerException):
            target_id = self.app_image_id()
        return {'account_id': aid, 'container': self.name(aid, 'app'), 'cli': state.get('cli'), 'active_runtime': state.get('active_runtime'),
                'current_image': current_image, 'target_image': self.app_image,
                'image_update_available': bool(current_image and target_id and current_image != target_id),
                'target_image_available': bool(target_id),
                'environment_pending': bool(state.get('environment_pending')),
                'disk_quota': state.get('disk_quota', {'limit_bytes': 0, 'status': 'legacy_unbounded'}),
                'status': 'ready' if aid in self.online and online == state.get('revision') else 'pending',
                'revision': online, 'auth_mode': state.get('auth_mode', 'oauth'),
                'network': state.get('network'), 'app_ip': state.get('app_ip', ''),
                'gateway_ip': state.get('gateway_ip', ''), 'uplink_ip': state.get('uplink_ip', '')}

    @contextlib.contextmanager
    def request_guard(self, aid):
        """The account lock for the request path (connection, tunnel, admin
        pass-through): never wait longer than the core does (audit B8). A
        long apply or paired update answers 503 runtime_unavailable instead."""
        guard = self.guard(aid)
        if not guard.acquire(timeout=REQUEST_LOCK_WAIT):
            raise RuntimeBusy('account runtime is busy')
        try:
            yield
        finally:
            guard.release()

    def connection(self, aid, revision):
        # Private control-plane response, never a public account/UI payload.
        # The same check guards the byte tunnel (GET .../tunnel).
        with self.request_guard(aid):
            state = self.state(aid)
            if not state or not revision or self.readiness(aid, state) != revision:
                return None
            return {'app_ip': state['app_ip'], 'port': ACCOUNT_PORT,
                    'api_key': state['api_key'], 'revision': revision}

    # Proxy host names that moved (audit B9).

    def pinned_proxy(self, aid, state):
        """(host, port, pinned address) of a runtime whose proxy is a host
        name, else None. The address is the one its egress dials."""
        with contextlib.suppress(OSError, ValueError, KeyError, IndexError, TypeError):
            proxy = read_json(self.dir(aid) / 'egress-desired.json', {}).get('proxy')
            host = proxy['host'] if isinstance(proxy, dict) else None
            if not isinstance(host, str) or not host or self._is_address(host):
                return None
            address = self._pinned_address(aid, state)
            return (host, int(proxy['port']), address) if isinstance(address, str) else None
        return None

    @staticmethod
    def _is_address(host):
        try:
            ipaddress.ip_address(host)
        except ValueError:
            return False
        return True  # an address literal never moves

    def _pinned_address(self, aid, state):
        if state.get('egress_backend') == 'shared_xray':
            binding = self.shared.data['bindings'].get(aid) or {}
            endpoint = (self.shared.data['nodes'].get(binding.get('tag')) or {}).get('endpoint')
            return endpoint[0] if endpoint else None
        return json.loads((self.dir(aid) / 'sing-box.json').read_text())['outbounds'][0]['server']

    def proxy_moved(self, aid):
        """Whether the proxy host name no longer resolves to the address the
        egress was pinned to. A failed lookup is no evidence: the runtime
        keeps working with the pinned address."""
        pinned = self.pinned_proxy(aid, self.state(aid) or {})
        if pinned is None:
            return False
        host, port, address = pinned
        try:
            found = {info[4][0] for info in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)}
        except OSError:
            return False
        return bool(found) and address not in found

    def recheck_proxies(self):
        """Drop readiness of every ready runtime whose proxy moved: the core's
        next reconciliation (status pending) applies the configuration again,
        which resolves the host anew and rebuilds the egress."""
        for aid in sorted(self.online):
            guard = self.guard(aid)
            if not guard.acquire(blocking=False):
                continue  # an apply or update is running; it resolves anew anyway
            try:
                if aid in self.online and self.proxy_moved(aid):
                    log.warning('proxy of key=%s resolves to another address; runtime marked pending', aid)
                    self.drop_readiness(aid)
            except Exception as e:
                log.warning('proxy recheck key=%s: %s: %s', aid, type(e).__name__, str(e)[:300])
            finally:
                guard.release()

    def watch_proxies(self):
        while True:
            time.sleep(PROXY_RECHECK_SECONDS)
            self.recheck_proxies()


def main():
    os.umask(0o077)
    # Failures go to stderr (the container log), one line each, without
    # request bodies or headers (audit B1); the request log stays off.
    logging.basicConfig(stream=sys.stderr, level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s %(message)s')
    key = os.environ['CCG_CONTROLLER_KEY']
    if len(key) < 32:
        raise SystemExit('controller key must contain at least 32 characters')
    server = ThreadingHTTPServer(('127.0.0.1', int(os.getenv('CCG_CONTROLLER_PORT') or '8787')), Handler)
    server.daemon_threads = True
    server.key = key
    server.manager = Manager(os.environ['CCG_RUNTIME_ROOT'], os.environ['CCG_APP_IMAGE'],
                             os.environ['CCG_EGRESS_IMAGE'], os.getenv('CCG_RUNTIME_PREFIX', 'ccg'))
    threading.Thread(target=server.manager.shared.run, daemon=True).start()
    threading.Thread(target=server.manager.watch_proxies, daemon=True).start()
    server.serve_forever()


if __name__ == '__main__':
    main()
