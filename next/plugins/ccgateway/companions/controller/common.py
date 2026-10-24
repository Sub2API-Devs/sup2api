"""What every controller module shares: key and image patterns, labels,
exceptions with their HTTP answers, and small file/Docker helpers.

Nothing here imports another controller module, so manager.py, cleanup.py,
shared_egress.py and runtime_updates.py all import from here instead of from
each other (no import cycle, no import inside functions).
"""
from datetime import datetime, timezone
import json
import os
import re

import docker
import requests

# Runtime keys (CCGATEWAY-DRAFT-RUNTIMES §1): an account id, or a draft key
# created by the editor before the account exists. Every key that reaches a
# path, container or volume name passes this pattern first.
KEY_PATTERN = r'(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})'
KEY = re.compile(KEY_PATTERN)
DRAFT = re.compile(r'd[0-9a-f]{16}')
REVISION = re.compile(r'[a-f0-9]{64}')
SHA256_HEX = re.compile(r'[0-9a-f]{64}')
VERSION = re.compile(r'[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}')  # a CLI version
# Same reference rules as the core (CONTRACTS §49.16).
IMAGE_REF = re.compile(r'[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?')
IMAGE_ID = re.compile(r'sha256:[0-9a-f]{64}')
CONTROLLER_NAME = re.compile(r'[a-z][a-z0-9-]{0,40}')
ELF_MAGIC = b'\x7fELF'

LABEL = 'io.sup2api.ccgateway.account'
AUTH_LABEL = 'io.sup2api.ccgateway.auth'
IMAGE_LABEL = 'io.sup2api.ccgateway.image'
NETWORK_LABEL = 'io.sup2api.ccgateway.network'
DISK_QUOTA_LABEL = 'io.sup2api.ccgateway.disk-quota-bytes'

ACCOUNT_PORT = 8787  # every account container listens here on its private network
DOCKER_SOCKET = '/var/run/docker.sock'
PROXY_VARS = ('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
              'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy')
AUTH_VARS = ('ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR')


class BadRequest(ValueError):
    """The request itself is invalid (answered 400 invalid_request)."""


class NotDraft(ValueError):
    """Only draft runtimes can be deleted through the API."""


class ImagePullFailed(RuntimeError):
    """A configured image is missing locally and could not be pulled."""


class InvalidImage(ValueError):
    """A business image carries credential or proxy environment variables."""


class InvalidCLIProfile(ValueError):
    """The selected image cannot provide the pinned CLI identity."""


class DiskQuotaUnavailable(RuntimeError):
    """A requested hard quota cannot be enforced by the storage backend."""


class UpgradeInProgress(RuntimeError):
    """The self-upgrade helper container is still running."""


class ActivationFailed(RuntimeError):
    """The containers run but the account cannot reach its upstream: the
    egress did not come up or the proxy check failed (audit B1: the core
    is told which, as egress_not_ready / proxy_check_failed)."""

    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


class RuntimeNotFound(LookupError):
    """The runtime has no app container of its own (answered 404 not_found)."""


class UnsupportedContainer(RuntimeError):
    """The worker program of this container cannot be located or replaced (409)."""


class ContainerChanged(RuntimeError):
    """The account container is no longer the one the operation started on (503)."""


class RuntimeBusy(RuntimeError):
    """The account lock stayed taken longer than a request may wait (503 runtime_unavailable)."""


class ResourceInUse(RuntimeError):
    """A container outside the runtime still uses one of its networks or its
    volume (409 resource_in_use); nothing was deleted."""

    def __init__(self, names):
        self.names = sorted(names)
        super().__init__('runtime resources in use by ' + ', '.join(self.names))


class OwnershipMismatch(ValueError):
    """A container, network or volume carries one of the runtime's names but
    not its account label: someone else's. Never touched; deleting the
    runtime answers 409 resource_in_use (nothing was deleted), any other
    endpoint 503 runtime_unavailable as before."""

    def __init__(self, name):
        self.names = [name]
        super().__init__(f'{name}: ownership mismatch (not this runtime\'s)')


# How each named failure is answered: (status, error code). Checked in order,
# so a subclass must come before its base class. Anything else is 503
# runtime_unavailable (a Docker error, a programming error).
ERRORS = (
    (BadRequest, 400, 'invalid_request'),
    (InvalidImage, 400, 'invalid_image'),
    (RuntimeNotFound, 404, 'not_found'),
    (NotDraft, 405, 'method_not_allowed'),
    (InvalidCLIProfile, 409, 'cli_profile_unavailable'),
    (UnsupportedContainer, 409, 'unsupported_container'),
    (UpgradeInProgress, 409, 'upgrade_in_progress'),
    (ResourceInUse, 409, 'resource_in_use'),
    (OwnershipMismatch, 409, 'resource_in_use'),
    (ImagePullFailed, 503, 'image_pull_failed'),
    (DiskQuotaUnavailable, 503, 'disk_quota_unavailable'),
    (ContainerChanged, 503, 'container_changed'),
    (RuntimeBusy, 503, 'runtime_unavailable'),  # expected under load: no traceback
    (ActivationFailed, 503, None),  # its own code: egress_not_ready / proxy_check_failed
)
UNNAMED = (503, 'runtime_unavailable')


def error_answer(exc, named=None):
    """(status, code, named) for an exception: named is False for a failure
    without a table entry (worth a traceback). `named` restricts the table to
    the exception types one endpoint can answer with."""
    for kind, status, code in ERRORS:
        if isinstance(exc, kind) and (named is None or kind in named):
            return status, code or exc.code, True
    return UNNAMED + (False,)


def check(aid):
    if not isinstance(aid, str) or not KEY.fullmatch(aid):
        raise BadRequest('invalid runtime key')
    return aid


def valid_image(ref):
    return isinstance(ref, str) and bool(IMAGE_REF.fullmatch(ref) or IMAGE_ID.fullmatch(ref))


def check_business_image(image):
    env = image.attrs['Config'].get('Env') or []
    if any(v.split('=', 1)[0] in PROXY_VARS + AUTH_VARS for v in env):
        raise InvalidImage('business image contains account credentials or proxy environment variables')


def rfc3339(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def write_private_bytes(path, data):
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'wb') as f:
        os.chmod(tmp, 0o600)
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


def write_private(path, value):
    write_private_bytes(path, value.encode('utf-8'))


def read_json(path, default=None):
    """The JSON content of path, default when the file does not exist."""
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return default


def absent_ok(action, *args, **kwargs):
    """Run a Docker call; False when its object does not exist (any other error propagates)."""
    try:
        action(*args, **kwargs)
    except docker.errors.NotFound:
        return False
    return True


def container_env(container):
    """The environment a container was created with, as a dict."""
    return dict(item.split('=', 1) for item in (container.attrs.get('Config') or {}).get('Env') or [] if '=' in item)


def boot_id(container):
    """Changes whenever the container (re)starts."""
    return container.attrs['State']['StartedAt']


def worker_session():
    """An HTTP session to an account Worker: never through a host proxy."""
    session = requests.Session()
    session.trust_env = False
    return session


def admin_headers(state):
    """Headers of a controller call to the account's Worker: its admin key
    only. Nothing of the caller's request (credentials included) is forwarded."""
    return {'Authorization': 'Bearer ' + state['admin_key'], 'Content-Type': 'application/json'}


def worker_request(session, state, method, path, **kwargs):
    """method <path> on the account Worker's admin port with its admin key; never follows a redirect."""
    return session.request(method, f'http://{state["app_ip"]}:{ACCOUNT_PORT}/{path}', headers=admin_headers(state),
                           allow_redirects=False, **kwargs)


def resolv_conf(gateway):
    """The account container's /etc/resolv.conf: only its internal DNS address."""
    return f'nameserver {gateway}\noptions timeout:2 attempts:2\n'


def is_elf(data):
    return data.startswith(ELF_MAGIC)
