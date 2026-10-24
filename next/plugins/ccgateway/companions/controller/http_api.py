"""The controller's HTTP API (CONTRACTS §49.14, §53): authentication, routing,
error answers, the byte tunnel and the admin pass-through to account Workers.
Runtime work is the Manager's (server.manager); this module only translates.
"""
import contextlib
import hmac
import json
import logging
import re
import socket
import threading
from http.server import BaseHTTPRequestHandler

from common import (KEY_PATTERN, ActivationFailed, BadRequest, ContainerChanged, DiskQuotaUnavailable, ImagePullFailed,
                    InvalidCLIProfile, InvalidImage, NotDraft, OwnershipMismatch, ResourceInUse, RuntimeBusy,
                    RuntimeNotFound, UnsupportedContainer, UpgradeInProgress, error_answer, worker_request,
                    worker_session)
from images import UploadError, MAX_CHUNK, UPLOAD_ID_PATTERN

log = logging.getLogger('ccgateway.controller')

ROUTE = re.compile(r'/accounts(?:/(' + KEY_PATTERN + r')(?:/(config|status|'
                   r'connection|tunnel|worker|egress|admin/(?:status|usage|features|request-logs(?:/(?:query|detail|read))?|cli|auth/(?:session|start|complete|cancel|logout|refresh))))?)?')
UPLOAD_ROUTE = re.compile(r'/images/uploads(?:/(' + UPLOAD_ID_PATTERN + r')(/load)?)?')
RUNTIME_ROUTE = re.compile(r'/runtime/(images|controller|cleanup)')
DECIMAL = re.compile(r'[0-9]{1,12}')
TUNNEL_IDLE_SECONDS = 3700
MAX_ACCOUNT_BODY = 32 << 20
# A request log file read reports where its bytes sit in the file.
LOG_READ_HEADERS = ('X-Log-File-Size', 'X-Log-Offset', 'X-Log-Length', 'X-Content-Type-Options')
# Methods the Worker accepts on each pass-through path; reading the request
# logs is POST with its query in the body (REQUEST-LOG-VIEWER-DESIGN.md §5).
PASS_THROUGH_METHODS = {'admin/request-logs': ('GET', 'PUT'), 'admin/request-logs/query': ('POST',),
                        'admin/request-logs/detail': ('POST',), 'admin/request-logs/read': ('POST',),
                        'admin/cli': ('GET', 'POST', 'PUT'), 'admin/usage': ('GET',), 'admin/features': ('GET',)}
# Paths the controller answers itself; any other method on them is 405.
LOCAL_PATHS = (None, 'config', 'status', 'connection', 'egress')
# The failures each group of endpoints names; anything else is 503
# runtime_unavailable with its traceback in the log. Only deleting a runtime
# names a same-name resource of someone else (409 resource_in_use: nothing
# was deleted); elsewhere it stays unnamed.
REQUEST_ERRORS = (BadRequest, NotDraft, ImagePullFailed, InvalidCLIProfile, DiskQuotaUnavailable, ActivationFailed,
                  ResourceInUse, RuntimeBusy)
DELETE_ERRORS = REQUEST_ERRORS + (OwnershipMismatch,)
MANAGEMENT_ERRORS = (BadRequest, InvalidImage, ImagePullFailed, UpgradeInProgress, RuntimeBusy)
WORKER_ERRORS = (BadRequest, InvalidImage, RuntimeNotFound, UnsupportedContainer, ImagePullFailed, ContainerChanged,
                 RuntimeBusy)
TUNNEL_ERRORS = (BadRequest, RuntimeBusy)
DROPPED = (BrokenPipeError, ConnectionResetError)


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def setup(self):
        super().setup()
        self.connection.settimeout(240)

    def log_message(self, *args):
        pass  # Requests may contain OAuth material; never log bodies or URLs.

    def note_failure(self, exc, outcome, trace=False):
        """One stderr line per failed request (audit B1): the method, the
        account key and the path, the exception's type and message, and what
        the core was told. Never the body or the headers; URLs only through
        the exception text of our own calls (an account address)."""
        log.warning('%s key=%s path=%s -> %s: %s: %s', self.command, self.account_key, self.request_path, outcome,
                    type(exc).__name__, str(exc)[:300], exc_info=trace)

    def answer_error(self, exc, named, dropped=DROPPED):
        """The one error answer: the request body may be left unread, so the
        connection is never reused; then log, then {"error": code} unless a
        response has already started."""
        self.close_connection = True
        if isinstance(exc, dropped):
            return self.note_failure(exc, 'connection dropped')
        status, code, known = error_answer(exc, named)
        self.note_failure(exc, f'{status} {code}', trace=not known)
        if not self.response_started:
            self.fail(status, code)

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

    def read_json(self, limit=64 << 10):
        try:
            return json.loads(self.read_body(limit))
        except ValueError as e:
            raise BadRequest('invalid JSON') from e

    # Entry point and routing.

    def handle_request(self):
        self.response_started = False
        self.account_key = self.request_path = None
        key = self.headers.get('Authorization', '').removeprefix('Bearer ')
        if not hmac.compare_digest(key, self.server.key):
            return self.fail(401, 'unauthorized', close=True)
        if self.path == '/health':
            self.close_connection = True  # any request body is left unread
            if self.command != 'GET':
                return self.fail(405, 'method_not_allowed')
            return self.reply(200, self.server.manager.health())
        route = UPLOAD_ROUTE.fullmatch(self.path) or RUNTIME_ROUTE.fullmatch(self.path)
        if route:
            return self.handle_management(route)
        match = ROUTE.fullmatch(self.path)
        if not match:
            return self.fail(404, 'not_found', close=True)
        aid, path = match[1], match[2]
        self.account_key, self.request_path = aid, path
        if path == 'tunnel':
            return self.handle_tunnel(aid)  # GET without a body; never read one
        if path == 'worker':
            return self.handle_worker(aid)
        try:
            return self.account_request(aid, path, self.read_body(MAX_ACCOUNT_BODY))
        except Exception as e:
            return self.answer_error(e, DELETE_ERRORS if path is None and self.command == 'DELETE' else REQUEST_ERRORS)

    do_GET = do_POST = do_PUT = do_DELETE = handle_request

    def account_request(self, aid, path, body):
        manager = self.server.manager
        if aid is None:
            if self.command != 'GET':
                return self.fail(405, 'method_not_allowed')
            return self.reply(200, manager.runtimes())
        endpoint = {(None, 'DELETE'): self.delete_runtime, ('config', 'PUT'): self.put_config,
                    ('status', 'GET'): self.get_status, ('connection', 'GET'): self.get_connection,
                    ('egress', 'GET'): self.get_egress, ('egress', 'POST'): self.post_egress}.get((path, self.command))
        if endpoint:
            return endpoint(aid, body)
        if path in LOCAL_PATHS:
            return self.fail(405, 'method_not_allowed')
        return self.pass_through(aid, path, body)

    # Endpoints the controller answers itself.

    def delete_runtime(self, aid, body):
        # Deleting an account's runtime needs the header naming it again (a
        # retired runtime, a deleted account); X-CCG-Delete-Data also removes
        # its data volume and recovery backup.
        account = self.headers.get('X-CCG-Delete-Account', '') == aid
        purge = self.headers.get('X-CCG-Delete-Data', '') == '1'
        if purge and not account:
            raise BadRequest('full deletion requires account confirmation')
        return self.reply(200, self.server.manager.delete(aid, account=account, purge=purge))

    def put_config(self, aid, body):
        try:
            desired = json.loads(body)
        except ValueError:
            desired = None  # apply answers 400 invalid_request and drops readiness, as for any refused configuration
        return self.reply(200, self.server.manager.apply(aid, desired))

    def get_status(self, aid, body):
        return self.reply(200, self.server.manager.public(aid))

    def get_connection(self, aid, body):
        connection = self.server.manager.connection(aid, self.headers.get('X-CCG-Revision', ''))
        if connection is None:
            return self.fail(409, 'not_synchronized')
        return self.reply(200, connection)

    def get_egress(self, aid, body):
        return self.reply(200, self.server.manager.shared.status(aid))

    def post_egress(self, aid, body):
        try:
            payload = json.loads(body)
        except ValueError as e:
            raise BadRequest('invalid egress request') from e
        if not isinstance(payload, dict) or set(payload) != {'backend'}:
            raise BadRequest('invalid egress request')
        return self.reply(200, self.server.manager.shared.migrate(aid, payload['backend']))

    # Pass-through to the account's Worker (admin key, revision checked).

    def pass_through(self, aid, path, body):
        if self.command not in PASS_THROUGH_METHODS.get(path, ('GET', 'POST')):
            return self.fail(405, 'method_not_allowed')
        target = self.worker_target(aid, path)
        if target is None:
            return None
        # No configuration writes on the request path. Concurrent streams
        # do not hold the account reconciliation lock.
        with worker_session() as session:
            with worker_request(session, target, self.command, path, data=body, stream=True,
                                timeout=(5, 240)) as response:
                self.relay(path, response)
        return None

    def worker_target(self, aid, path):
        """The runtime's state when it is ready at the caller's revision;
        otherwise answers 409 and returns None."""
        state = self.server.manager.ready_state(aid, self.headers.get('X-CCG-Revision', ''))
        if state is None:
            self.fail(409, 'not_synchronized')
            return None
        if (path.startswith('admin/auth/') or path == 'admin/usage') and state.get('auth_mode') == 'api_key':
            self.fail(409, 'api_key_account')
            return None
        return state

    def relay(self, path, response):
        self.send_response(response.status_code)
        self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
        self.send_header('Connection', 'close')
        self.send_header('Cache-Control', 'no-store')
        if path == 'admin/request-logs/read':
            for name in LOG_READ_HEADERS:
                if response.headers.get(name):
                    self.send_header(name, response.headers[name])
        self.end_headers()
        self.response_started = True
        self.close_connection = True
        # Write whatever arrives; never wait to fill a buffer.
        for chunk in response.iter_content(chunk_size=None):
            self.wfile.write(chunk)
            self.wfile.flush()

    # Uploads (/images/uploads...) and target images (/runtime/...).

    def handle_management(self, route):
        self.request_path = route[0]
        try:
            self.management_request(route)
        except OSError:
            self.close_connection = True  # the client went away while its error was answered
        return None

    def management_request(self, route):
        try:
            if route.re is RUNTIME_ROUTE:
                return self.runtime_endpoint(route[1])
            return self.upload_endpoint(route[1], route[2])
        except UploadError as e:
            self.close_connection = True
            if not self.response_started:
                self.reply(e.status, e.body())
        except Exception as e:
            self.answer_error(e, MANAGEMENT_ERRORS, DROPPED + (TimeoutError,))
        return None

    def runtime_endpoint(self, kind):
        manager = self.server.manager
        if kind == 'cleanup' and self.command == 'GET':
            self.read_body()
            return self.reply(200, manager.cleanup_inventory())
        if kind == 'cleanup' and self.command == 'POST':
            return self.reply(200, manager.cleanup_runtimes(self.read_json(8 << 20)))
        if kind == 'images' and self.command == 'GET':
            self.read_body()
            return self.reply(200, manager.runtime_images())
        if kind == 'images' and self.command == 'PUT':
            return self.reply(200, manager.set_runtime_images(self.read_json()))
        if kind == 'controller' and self.command == 'POST':
            return self.reply(202, manager.upgrade_controller(self.read_json()))
        return self.fail(405, 'method_not_allowed', close=True)

    def upload_endpoint(self, upload_id, load):
        uploads = self.server.manager.uploads
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

    # In-place worker update (CONTRACTS §53.7).

    def handle_worker(self, aid):
        """POST /accounts/<key>/worker: {"image"} replaces the Worker program,
        {"image", "components", "cli_version"} activates a Worker+CLI pair."""
        manager = self.server.manager
        try:
            if self.command != 'POST':
                return self.fail(405, 'method_not_allowed', close=True)
            desired = self.read_json()
            paired = isinstance(desired, dict) and 'components' in desired
            return self.reply(200, (manager.update_runtime if paired else manager.update_worker)(aid, desired))
        except Exception as e:
            return self.answer_error(e, WORKER_ERRORS)

    # Byte tunnel (CONTRACTS §53.5).

    def handle_tunnel(self, aid):
        """GET /accounts/<key>/tunnel: raw bytes to the account Worker's port."""
        self.close_connection = True  # the connection never returns to HTTP
        if self.command != 'GET':
            return self.fail(405, 'method_not_allowed')
        tokens = {t.strip().lower() for t in self.headers.get('Connection', '').split(',')}
        if (self.headers.get('Upgrade', '').strip().lower() != 'ccg-tunnel' or 'upgrade' not in tokens
                or self.headers.get('Transfer-Encoding') or self.headers.get('Content-Length', '0') != '0'):
            return self.fail(400, 'invalid_request')
        try:
            target = self.server.manager.connection(aid, self.headers.get('X-CCG-Revision', ''))
        except Exception as e:
            return self.answer_error(e, TUNNEL_ERRORS)
        if target is None:
            return self.fail(409, 'not_synchronized')
        try:
            upstream = socket.create_connection((target['app_ip'], target['port']), timeout=5)
        except OSError:
            return self.fail(503, 'runtime_unavailable')
        with upstream, contextlib.suppress(OSError):  # the client may already be gone
            self.send_response(101)
            self.send_header('Connection', 'Upgrade')
            self.send_header('Upgrade', 'ccg-tunnel')
            self.end_headers()
            self.response_started = True
            self.splice(upstream)
        return None

    def splice(self, upstream):
        """Copy bytes both ways until either side ends; content is never
        inspected or logged. Idle timeout or reset on either side ends both."""
        client = self.connection
        upstream.settimeout(TUNNEL_IDLE_SECONDS)
        client.settimeout(TUNNEL_IDLE_SECONDS)

        def close_both():
            for s in (client, upstream):
                with contextlib.suppress(OSError):
                    s.shutdown(socket.SHUT_RDWR)

        def pump(read, write, peer):
            try:
                while data := read():
                    write(data)
                with contextlib.suppress(OSError):
                    peer.shutdown(socket.SHUT_WR)
            except (OSError, ValueError):
                close_both()

        # rfile is buffered: read1 also returns bytes it already holds
        # (a request pipelined right behind the upgrade request).
        back = threading.Thread(target=pump, daemon=True, args=(lambda: upstream.recv(65536), self.wfile.write, client))
        back.start()
        pump(lambda: self.rfile.read1(65536), upstream.sendall, upstream)
        back.join()
