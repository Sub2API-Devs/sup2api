"""HTTP golden recording for the Go controller (05-test-plan §6, 02 §8.5).

CI only; nothing imports this module. It drives the Python Handler over real
sockets with the in-memory FakeDocker of test_manager.py and records, for a
fixed sequence of raw requests:

  - the raw request bytes;
  - every call the Handler made into the Manager (name, JSON arguments, the
    JSON result or the exception), so that Go can replay the HTTP layer
    alone against stub business packages;
  - the request the pass-through sent to the Worker and the canned answer;
  - the answer: status, reason, headers (without Date and Server), body,
    and whether the controller closed the connection afterwards.

Cases tagged `intended` are the deliberate differences of 05 §8 (BUG-11,
BUG-12) and of the Go design (POST /runtime/egress/recreate, net/http's own
Content-Length parsing); the Go test checks them against
http-golden/intended.json instead of the Python answer recorded here.

    python differential_dump.py OUT_DIR      # writes OUT_DIR/python.json

Run on Linux with Python 3.12 from this directory (requirements.txt).
"""
import json
import os
from pathlib import Path
import platform
import shutil
import socket
import sys
import tempfile
import threading
from unittest.mock import patch
from http.server import ThreadingHTTPServer

import docker
import requests
from requests.structures import CaseInsensitiveDict

import common
import manager
from common import (ActivationFailed, ContainerChanged, ImagePullFailed, InvalidImage, OwnershipMismatch,
                    ResourceInUse, RuntimeBusy, RuntimeNotFound, UpgradeInProgress)
from http_api import Handler
from images import UploadError
from manager import Manager
import test_manager as tm

KEY = tm.CONTROLLER_KEY
REV = tm.REV
DRAFT = tm.DRAFT_KEY
HOST = 'controller.test'
RECORDED = {'health', 'runtimes', 'delete', 'apply', 'public', 'connection', 'ready_state', 'runtime_images',
            'set_runtime_images', 'upgrade_controller', 'cleanup_inventory', 'cleanup_runtimes', 'update_worker',
            'update_runtime', 'shared.status', 'uploads.create', 'uploads.status', 'uploads.delete', 'uploads.write',
            'uploads.load'}


def describe(exc):
    out = {'type': type(exc).__name__, 'message': str(exc)[:300]}
    if isinstance(exc, ActivationFailed):
        out['code'] = exc.code
    if isinstance(exc, (ResourceInUse, OwnershipMismatch)):
        out['names'] = list(exc.names)
    if isinstance(exc, UploadError):
        out.update(status=exc.status, code=exc.code, extra=json.dumps(exc.extra))
    return out


class Recorder:
    """Stands in for server.manager: records the Handler's calls."""

    def __init__(self, target, calls, prefix=''):
        self._target, self._calls, self._prefix = target, calls, prefix

    def __getattr__(self, name):
        attr = getattr(self._target, name)
        full = self._prefix + name
        if name in ('shared', 'uploads') and not self._prefix:
            return Recorder(attr, self._calls, name + '.')
        if full not in RECORDED:
            return attr

        def call(*args, **kwargs):
            shown = list(args)
            if full == 'uploads.write':
                shown = shown[:3]  # the reader is the request stream
            if full == 'delete':
                shown = [args[0], kwargs.get('account', False), kwargs.get('purge', False)]
            entry = {'call': full, 'args': json.dumps(shown)}
            self._calls.append(entry)
            try:
                result = attr(*args, **kwargs)
            except Exception as e:
                entry['error'] = describe(e)
                raise
            entry['result'] = json.dumps(result)
            return result
        return call


class WorkerPlan:
    """The pass-through's requests.Session: one canned answer per case."""
    answer = None
    seen = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def request(self, method, url, data=None, headers=None, **kwargs):
        plan = WorkerPlan.answer
        WorkerPlan.seen.append({'method': method, 'path': url.split(':8787/', 1)[1],
                                'headers': dict(headers or {}), 'body': (data or b'').decode('latin-1')})
        if plan is None or plan.get('error') == 'connect':
            raise requests.exceptions.ConnectionError('no route to the Worker')
        return CannedResponse(plan)


class CannedResponse:
    def __init__(self, plan):
        self.status_code = plan['status']
        self.headers = CaseInsensitiveDict(plan.get('headers') or {})
        self.chunks = plan.get('chunks') or []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def iter_content(self, chunk_size=None):
        for chunk in self.chunks:
            yield chunk.encode('latin-1')


def raw_request(method, target, body=b'', headers=(), key=KEY, auth=True, content_length=True):
    if isinstance(body, str):
        body = body.encode('latin-1')
    lines = [f'{method} {target} HTTP/1.1', f'Host: {HOST}']
    if auth:
        lines.append(f'Authorization: Bearer {key}')
    lines += [f'{k}: {v}' for k, v in headers]
    if content_length and body:
        lines.append(f'Content-Length: {len(body)}')
    return ('\r\n'.join(lines) + '\r\n\r\n').encode('latin-1') + body


def exchange(port, raw):
    """Send raw, read one answer; (answer, closed)."""
    sock = socket.create_connection(('127.0.0.1', port), timeout=10)
    try:
        sock.sendall(raw)
        f = sock.makefile('rb')
        status_line = f.readline()
        if not status_line:
            return {'status': None, 'reason': None, 'headers': [], 'body': '', 'closed': True}
        _, status, reason = status_line.decode('latin-1').rstrip('\r\n').split(' ', 2)
        headers = []
        while (line := f.readline()) not in (b'\r\n', b'\n', b''):
            name, value = line.decode('latin-1').rstrip('\r\n').split(':', 1)
            headers.append([name.strip(), value.strip()])
        length = next((int(v) for k, v in headers if k.lower() == 'content-length'), None)
        method = raw.split(b' ', 1)[0]
        if method == b'HEAD':
            body = b''
        elif length is not None:
            body = f.read(length)
        else:
            body = f.read()  # close-delimited (pass-through)
        sock.settimeout(1.0)
        try:
            closed = f.read1(1) == b''
        except (TimeoutError, socket.timeout):
            closed = False
        except OSError:
            closed = True
        kept = [h for h in headers if h[0].lower() not in ('date', 'server')]
        return {'status': int(status), 'reason': reason, 'headers': kept, 'body': body.decode('latin-1'),
                'closed': closed}
    finally:
        sock.close()


def closed_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


def patched(obj, name, value):
    return lambda: patch.object(obj, name, value)


def raising(exc):
    def fail(*args, **kwargs):
        raise exc
    return fail


class Dump:
    def __init__(self):
        self.tmp = tempfile.mkdtemp()
        for name in tm.ENVIRONMENT:
            os.environ.pop(name, None)
        self.fake = tm.FakeDocker()
        with patch('manager.docker.from_env', return_value=self.fake):
            self.m = Manager(self.tmp, 'app:test', 'egress:test', 'ccg', 'http://probe.invalid/')
        self.m._shared = tm.FakeShared(self.m)
        self.calls = []
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.server.key, self.server.manager = KEY, Recorder(self.m, self.calls)
        self.server.daemon_threads = True
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.cases = []
        self.upload_id = None

    def apply(self, aid, **extra):
        return self.m.apply(aid, {'revision': REV, 'proxy': {'protocol': 'http'}, **extra})

    def run(self, name, raw, setup=None, worker=None, intended=None):
        self.calls.clear()
        WorkerPlan.seen = []
        WorkerPlan.answer = worker
        ctx = setup() if setup else None
        try:
            if ctx is not None:
                with ctx:
                    answer = exchange(self.server.server_address[1], raw)
            else:
                answer = exchange(self.server.server_address[1], raw)
        finally:
            WorkerPlan.answer = None
        case = {'name': name, 'request': raw.decode('latin-1'), 'calls': list(self.calls),
                'worker': None, 'response': answer, 'intended': intended}
        if WorkerPlan.seen:
            case['worker'] = {'request': WorkerPlan.seen[-1], 'response': worker}
        self.cases.append(case)
        return answer

    def close(self):
        self.server.shutdown()
        self.server.server_close()
        self.m.lockfile.close()
        shutil.rmtree(self.tmp, ignore_errors=True)


def sequence(d):
    R = raw_request
    rev = [('X-CCG-Revision', REV)]
    d.apply('7')
    d.apply(DRAFT)
    d.apply('4', auth={'mode': 'api_key', 'api_key': 'sk-test-key-123'})
    d.apply('9')
    state = d.m.state('7')
    state['app_ip'] = '127.0.0.1'
    d.m.save('7', state)
    session = {'status': 200, 'headers': {'Content-Type': 'application/json'}, 'chunks': ['{"session":null}']}

    # Authentication, routing (H1, H3, H4, R23).
    d.run('auth-wrong-key', R('GET', '/accounts', key='wrong' * 8))
    d.run('auth-missing', R('GET', '/health', auth=False))
    d.run('health', R('GET', '/health'))
    d.run('health-post', R('POST', '/health', '{}'))
    d.run('health-query', R('GET', '/health?x=1'))
    d.run('route-nothing', R('GET', '/nothing'))
    d.run('route-dotdot', R('GET', '/accounts/../1/status'))
    d.run('route-zero-key', R('GET', '/accounts/0/status'))
    d.run('route-upper-draft', R('GET', '/accounts/D0123456789ABCDEF/status'))
    d.run('route-unknown-auth', R('GET', '/accounts/1/admin/auth/other'))
    d.run('route-double-slash', R('GET', '//accounts'))
    d.run('route-absolute-form', R('GET', f'http://{HOST}/accounts'))
    d.run('route-trailing-slash', R('GET', '/accounts/1/status/'))
    d.run('route-status-query', R('GET', '/accounts/7/status?x=1'))
    d.run('route-old-messages', R('POST', '/accounts/7/v1/messages', '{}', rev))
    d.run('route-old-upload', R('POST', '/images/upload', '{}'))
    d.run('route-old-images', R('GET', '/images'))
    d.run('route-cli-catalog', R('GET', '/accounts/7/admin/cli/catalog', headers=rev))
    d.run('route-logs-query-string', R('POST', '/accounts/7/admin/request-logs/query?limit=1', '{}', rev))
    d.run('route-runtime-slash', R('GET', '/runtime/images/'))

    # Account endpoints (R2-R7, R11, H5, H6, H8, H10).
    d.run('accounts-list', R('GET', '/accounts'))
    d.run('accounts-post', R('POST', '/accounts', '{}'))
    d.run('accounts-list-request-close', R('GET', '/accounts', headers=[('Connection', 'close')]))
    d.run('runtime-get', R('GET', f'/accounts/{DRAFT}'))
    d.run('status-delete', R('DELETE', f'/accounts/{DRAFT}/status'))
    d.run('egress-post', R('POST', '/accounts/1/egress', '{"backend":"shared_xray"}'))
    d.run('status', R('GET', '/accounts/7/status'))
    d.run('status-unknown-key', R('GET', '/accounts/1/status'))
    d.run('status-with-body', R('GET', '/accounts/7/status', '{"ignored": true}'))
    d.run('status-busy', R('GET', '/accounts/7/status'),
          setup=patched(d.m, 'public', raising(RuntimeBusy('account lock busy'))))
    d.run('status-docker-error', R('GET', '/accounts/7/status'),
          setup=patched(d.m, 'public', raising(docker.errors.APIError('daemon error'))))
    d.run('connection-no-revision', R('GET', '/accounts/7/connection'))
    d.run('connection-wrong-revision', R('GET', '/accounts/7/connection', headers=[('X-CCG-Revision', 'b' * 64)]))
    d.run('connection', R('GET', '/accounts/7/connection', headers=rev))
    d.run('connection-busy', R('GET', '/accounts/7/connection', headers=rev),
          setup=patched(d.m, 'connection', raising(RuntimeBusy('account lock busy'))))
    d.run('egress', R('GET', '/accounts/7/egress'))
    d.run('config-not-json', R('PUT', '/accounts/1/config', 'not json'))
    d.run('config-empty-body', R('PUT', '/accounts/1/config'))
    d.run('config-list', R('PUT', '/accounts/1/config', '[]'))
    d.run('config-bad-revision', R('PUT', '/accounts/1/config', json.dumps({'revision': 'x', 'proxy': {}})))

    def no_images():
        saved = dict(d.fake.images.tags)
        d.fake.images.tags.clear()

        class Restore:
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                d.fake.images.tags.update(saved)
        return Restore()
    body = json.dumps({'revision': REV, 'proxy': {'protocol': 'http'}})
    d.run('config-pull-failed', R('PUT', '/accounts/2/config', body), setup=no_images)
    d.run('config-docker-error', R('PUT', '/accounts/31/config', body),
          setup=patched(d.fake.networks, 'create', raising(docker.errors.APIError('daemon error'))))
    d.run('config-invalid-image-unnamed', R('PUT', '/accounts/9/config', body),
          setup=patched(d.m, 'apply', raising(InvalidImage('business image contains account credentials'))))
    d.run('config-proxy-check-failed', R('PUT', '/accounts/9/config', body),
          setup=patched(d.m, 'apply', raising(ActivationFailed('proxy_check_failed',
                                                                'account proxy connectivity check failed'))))
    d.run('config-ownership-unnamed', R('PUT', '/accounts/9/config', body),
          setup=patched(d.m, 'apply', raising(OwnershipMismatch('ccg-9-app'))))
    d.run('config-ready', R('PUT', '/accounts/9/config', body))
    d.run('config-blocked', R('PUT', '/accounts/12/config', json.dumps({'revision': REV, 'proxy': None})))
    d.run('config-leading-zero-length', R('PUT', '/accounts/9/config', body,
                                          headers=[('Content-Length', '0' + str(len(body)))], content_length=False))
    d.run('config-too-large', R('PUT', '/accounts/9/config', headers=[('Content-Length', str((32 << 20) + 1))]))
    d.run('config-chunked', R('PUT', '/accounts/9/config', '2\r\n{}\r\n0\r\n\r\n',
                              headers=[('Transfer-Encoding', 'chunked')], content_length=False))
    d.run('delete-account-unconfirmed', R('DELETE', '/accounts/9'))
    d.run('delete-data-unconfirmed', R('DELETE', '/accounts/9', headers=[('X-CCG-Delete-Data', '1')]))
    d.run('delete-wrong-confirmation', R('DELETE', '/accounts/9', headers=[('X-CCG-Delete-Account', '8')]))
    d.run('delete-foreign-name', R('DELETE', '/accounts/21', headers=[('X-CCG-Delete-Account', '21')]),
          setup=patched(d.m, 'delete', raising(OwnershipMismatch('ccg-21-data'))))
    d.run('delete-in-use', R('DELETE', '/accounts/21', headers=[('X-CCG-Delete-Account', '21')]),
          setup=patched(d.m, 'delete', raising(ResourceInUse(['debug-shell']))))
    d.run('delete-draft', R('DELETE', f'/accounts/{DRAFT}'))
    d.run('delete-draft-again', R('DELETE', f'/accounts/{DRAFT}'))
    d.run('delete-account', R('DELETE', '/accounts/9', headers=[('X-CCG-Delete-Account', '9'),
                                                                   ('X-CCG-Delete-Data', '1')]))

    # Pass-through (T9-T13).
    d.apply(DRAFT)
    d.run('pass-not-synchronized', R('GET', f'/accounts/{DRAFT}/admin/auth/session'))
    d.run('pass-session', R('GET', f'/accounts/{DRAFT}/admin/auth/session', headers=rev), worker=session)
    d.run('pass-session-delete', R('DELETE', f'/accounts/{DRAFT}/admin/auth/session', headers=rev))
    d.run('pass-refresh-empty-body', R('POST', f'/accounts/{DRAFT}/admin/auth/refresh', headers=rev), worker=session)
    d.run('pass-cli-put', R('PUT', '/accounts/7/admin/cli', '{"auto_update":false}', rev), worker=session)
    d.run('pass-logs-post', R('POST', '/accounts/7/admin/request-logs', '{}', rev))
    d.run('pass-status-put', R('PUT', '/accounts/7/admin/status', '{}', rev))
    d.run('pass-usage-post', R('POST', '/accounts/7/admin/usage', '{}', rev))
    d.run('pass-log-read', R('POST', '/accounts/7/admin/request-logs/read', '{}', rev),
          worker={'status': 200, 'headers': {'Content-Type': 'application/octet-stream', 'X-Log-File-Size': '9',
                                             'X-Log-Offset': '2', 'X-Log-Length': '3',
                                             'X-Content-Type-Options': 'nosniff', 'X-Other': 'dropped'},
                  'chunks': ['ab', 'c']})
    d.run('pass-log-query-headers-dropped', R('POST', '/accounts/7/admin/request-logs/query', '{}', rev),
          worker={'status': 200, 'headers': {'Content-Type': 'application/json', 'X-Log-Offset': '2'},
                  'chunks': ['{"rows": []}']})
    d.run('pass-api-key-session', R('GET', '/accounts/4/admin/auth/session', headers=rev))
    d.run('pass-api-key-usage', R('GET', '/accounts/4/admin/usage', headers=rev))
    d.run('pass-api-key-features', R('GET', '/accounts/4/admin/features', headers=rev),
          worker={'status': 200, 'headers': {'Content-Type': 'application/json'}, 'chunks': ['{"features": []}']})
    d.run('pass-caller-headers', R('GET', '/accounts/7/admin/status', headers=rev + [
        ('Anthropic-Beta', 'a'), ('X-CCGateway-Request-Policy', '{}'), ('X-Api-Key', 'caller')]), worker=session)
    d.run('pass-worker-error-status', R('GET', '/accounts/7/admin/status', headers=rev),
          worker={'status': 500, 'headers': {'Content-Type': 'text/plain'}, 'chunks': ['boom']})
    d.run('pass-worker-no-content-type', R('GET', '/accounts/7/admin/features', headers=rev),
          worker={'status': 404, 'headers': {}, 'chunks': ['{"error":"not_found"}']})
    d.run('pass-worker-unreachable', R('GET', '/accounts/7/admin/status', headers=rev), worker={'error': 'connect'})
    d.run('pass-ready-busy', R('GET', '/accounts/7/admin/status', headers=rev),
          setup=patched(d.m, 'ready_state', raising(RuntimeBusy('account lock busy'))))

    # Tunnel rejections (T1-T3).
    up = [('X-CCG-Revision', REV), ('Connection', 'Upgrade'), ('Upgrade', 'ccg-tunnel')]
    d.run('tunnel-wrong-key', R('GET', '/accounts/7/tunnel', headers=up, key='x' * 32))
    d.run('tunnel-wrong-revision', R('GET', '/accounts/7/tunnel', headers=[('X-CCG-Revision', 'b' * 64)] + up[1:]))
    d.run('tunnel-unknown-account', R('GET', '/accounts/8/tunnel', headers=up))
    d.run('tunnel-websocket', R('GET', '/accounts/7/tunnel', headers=up[:2] + [('Upgrade', 'websocket')]))
    d.run('tunnel-no-upgrade-token', R('GET', '/accounts/7/tunnel',
                                       headers=[up[0], ('Connection', 'keep-alive'), up[2]]))
    d.run('tunnel-post', R('POST', '/accounts/7/tunnel', headers=up))
    d.run('tunnel-length-00', R('GET', '/accounts/7/tunnel', headers=up + [('Content-Length', '00')]))
    d.run('tunnel-length-1', R('GET', '/accounts/7/tunnel', 'x', up))
    d.run('tunnel-busy', R('GET', '/accounts/7/tunnel', headers=up),
          setup=patched(d.m, 'connection', raising(RuntimeBusy('account lock busy'))))
    d.run('tunnel-unreachable', R('GET', '/accounts/7/tunnel', headers=up),
          setup=lambda: patch('manager.ACCOUNT_PORT', closed_port()))

    # In-place Worker update (R9, H10).
    updated = {'status': 'updated', 'sha256': 'a' * 64, 'previous_sha256': 'b' * 64, 'path': '/app/worker',
               'online': True}
    paired = {'status': 'updated', 'cli_version': '2.1.312', 'online': True}
    worker = '/accounts/21/worker'
    d.run('worker-get', R('GET', worker))
    d.run('worker-not-json', R('POST', worker, 'not json'))
    d.run('worker-too-large', R('POST', worker, '{"image":"' + 'a' * (64 << 10) + '"}'))
    d.run('worker-update', R('POST', worker, '{"image": "app:new"}'),
          setup=patched(d.m, 'update_worker', lambda aid, desired: dict(updated)))
    d.run('worker-pair', R('POST', worker, json.dumps({'image': 'app:new', 'components': ['worker', 'cli'],
                                                         'cli_version': '2.1.312'})),
          setup=patched(d.m, 'update_runtime', lambda aid, desired: dict(paired)))
    d.run('worker-components-not-object', R('POST', worker, '["components"]'),
          setup=patched(d.m, 'update_worker', raising(common.BadRequest('invalid image reference'))))
    d.run('worker-not-found', R('POST', worker, '{"image": "app:new"}'),
          setup=patched(d.m, 'update_worker', raising(RuntimeNotFound('no app container'))))
    d.run('worker-container-changed', R('POST', worker, '{"image": "app:new"}'),
          setup=patched(d.m, 'update_worker', raising(ContainerChanged('container changed'))))
    d.run('worker-ownership-unnamed', R('POST', worker, '{"image": "app:new"}'),
          setup=patched(d.m, 'update_worker', raising(OwnershipMismatch('ccg-21-app'))))
    d.run('worker-invalid-image', R('POST', worker, '{"image": "app:empty"}'),
          setup=patched(d.m, 'update_worker', raising(InvalidImage('no worker program'))))

    # Uploads (R12-R16).
    created = d.run('upload-create', R('POST', '/images/uploads', '{"size": 5}'))
    uid = json.loads(created['body'])['upload_id']
    up_path = f'/images/uploads/{uid}'
    d.run('upload-list', R('GET', '/images/uploads'))
    d.run('upload-create-list', R('POST', '/images/uploads', '[5]'))
    d.run('upload-create-extra-key', R('POST', '/images/uploads', '{"size": 5, "other": 1}'))
    d.run('upload-create-not-json', R('POST', '/images/uploads', 'not json'))
    d.run('upload-create-zero', R('POST', '/images/uploads', '{"size": 0}'))
    d.run('upload-chunk', R('PUT', up_path, 'abc', [('X-CCG-Offset', '0')]))
    d.run('upload-chunk-offset-mismatch', R('PUT', up_path, 'de', [('X-CCG-Offset', '0')]))
    d.run('upload-chunk-plus-offset', R('PUT', up_path, 'de', [('X-CCG-Offset', '+3')]))
    d.run('upload-chunk-no-offset', R('PUT', up_path, 'de'))
    d.run('upload-chunk-empty', R('PUT', up_path, headers=[('X-CCG-Offset', '3'), ('Content-Length', '0')]))
    d.run('upload-chunk-too-large', R('PUT', up_path, headers=[('X-CCG-Offset', '3'),
                                                                ('Content-Length', str((64 << 20) + 1))]))
    d.run('upload-chunk-chunked', R('PUT', up_path, '2\r\nde\r\n0\r\n\r\n',
                                    [('X-CCG-Offset', '3'), ('Transfer-Encoding', 'chunked')], content_length=False))
    d.run('upload-chunk-beyond-size', R('PUT', up_path, 'defg', [('X-CCG-Offset', '3')]))
    d.run('upload-status', R('GET', up_path))
    d.run('upload-load-incomplete', R('POST', up_path + '/load'))
    d.run('upload-load-get', R('GET', up_path + '/load'))
    d.run('upload-patch-free-method', R('POST', up_path, '{}'))
    d.run('upload-delete', R('DELETE', up_path))
    d.run('upload-unknown', R('GET', '/images/uploads/' + 'A' * 22))

    # Runtime administration (R17-R22).
    d.run('runtime-images', R('GET', '/runtime/images'))
    d.run('runtime-images-extra-key', R('PUT', '/runtime/images', '{"app": "app:test", "other": 1}'))
    d.run('runtime-images-empty', R('PUT', '/runtime/images', '{}'))
    d.run('runtime-images-invalid-image', R('PUT', '/runtime/images', '{"app": "app:creds"}'),
          setup=patched(d.m, 'set_runtime_images', raising(InvalidImage('credentials in the image'))))
    d.run('runtime-images-delete', R('DELETE', '/runtime/images'))
    d.run('controller-empty', R('POST', '/runtime/controller', '{}'))
    d.run('controller-in-progress', R('POST', '/runtime/controller', '{"image": "ccg/controller:new"}'),
          setup=patched(d.m, 'upgrade_controller', raising(UpgradeInProgress('helper running'))))
    d.run('controller-pull-failed', R('POST', '/runtime/controller', '{"image": "ccg/controller:new"}'),
          setup=patched(d.m, 'upgrade_controller', raising(ImagePullFailed('manifest unknown'))))
    d.run('controller-accepted', R('POST', '/runtime/controller', '{"image": "ccg/controller:new"}'),
          setup=patched(d.m, 'upgrade_controller', lambda desired: {'accepted': True}))
    d.run('controller-get', R('GET', '/runtime/controller'))
    d.run('cleanup-inventory', R('GET', '/runtime/cleanup'))
    d.run('cleanup-empty', R('POST', '/runtime/cleanup', '{}'))
    candidates = [{'key': str(i), 'identity': 'a' * 64} for i in range(1000, 1800)]
    d.run('cleanup-large', R('POST', '/runtime/cleanup', json.dumps({'keep_keys': [], 'candidates': candidates})))
    d.run('cleanup-put', R('PUT', '/runtime/cleanup', '{}'))

    # Deliberate differences (intended.json).
    d.run('auth-bare-key', R('GET', '/accounts', auth=False, headers=[('Authorization', KEY)]), intended='BUG-11')
    d.run('auth-non-ascii', R('GET', '/accounts', auth=False, headers=[('Authorization', 'Bearer \xe9' + KEY)]),
          intended='BUG-11')
    d.run('method-head', R('HEAD', '/accounts'), intended='BUG-12')
    d.run('method-patch', R('PATCH', '/accounts/7/status', '{}'), intended='BUG-12')
    d.run('method-patch-wrong-key', R('PATCH', '/accounts/7/status', '{}', key='x' * 32), intended='BUG-12')
    d.run('method-options-health', R('OPTIONS', '/health'), intended='BUG-12')
    d.run('egress-recreate', R('POST', '/runtime/egress/recreate', '{}'), intended='02-7.4')
    d.run('length-plus-sign', R('GET', '/accounts/7/status', headers=[('Content-Length', '+0')], content_length=False),
          intended='net/http')
    d.run('length-not-decimal', R('PUT', '/accounts/9/config', '{}', [('Content-Length', '0x2')],
                                  content_length=False), intended='net/http')


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    d = Dump()
    try:
        with patch('manager.business_rules', return_value='table inet ccg_app {}\n'), \
                patch('requests.Session', WorkerPlan):
            sequence(d)
    finally:
        d.close()
    doc = {'generator': 'companions/controller/differential_dump.py', 'python': platform.python_version(),
           'controller_key': KEY, 'cases': d.cases}
    (out / 'python.json').write_text(json.dumps(doc, indent=1, ensure_ascii=True) + '\n')
    print(f'{len(d.cases)} cases -> {out / "python.json"}')


if __name__ == '__main__':
    main()
