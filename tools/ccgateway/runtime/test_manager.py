"""Controller unit tests with an in-memory Docker client (no Docker needed).

Run on Linux (manager.py uses fcntl) from this directory, as CI does:
    pip install -r requirements.txt
    python -m unittest -v test_network test_headers test_manager
"""
import http.client
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer

import docker

import manager
from manager import Manager, Handler, LABEL, AUTH_LABEL, IMAGE_LABEL, ROUTE, NotDraft, BadRequest, check

DRAFT_KEY = 'd0123456789abcdef'
OTHER_DRAFT = 'dfedcba9876543210'
REV = 'a' * 64
CONTROLLER_KEY = 'k' * 32


def not_found(name):
    return docker.errors.NotFound(f'{name} not found')


class FakeContainer:
    def __init__(self, client, name, image, labels):
        self.client, self.name, self.id = client, name, 'cid-' + name + '-' + str(client.tick())
        self.labels = dict(labels or {})
        self.status = 'created'
        self.attrs = {'Image': client.images.resolve(image), 'State': {'StartedAt': ''}}
        self.removed = False

    def start(self):
        self.status = 'running'
        self.attrs['State']['StartedAt'] = 't%d' % self.client.tick()

    def stop(self, timeout=None):
        self.status = 'exited'

    def remove(self, force=False):
        self.client.containers.items.pop(self.name, None)
        self.removed = True

    def reload(self):
        pass

    def exec_run(self, cmd):
        return 0, b''


class FakeContainers:
    def __init__(self, client):
        self.client, self.items, self.runs = client, {}, []

    def get(self, name):
        if name not in self.items:
            raise not_found(name)
        return self.items[name]

    def create(self, image, name=None, labels=None, **kwargs):
        if name in self.items:
            raise docker.errors.APIError('Conflict: ' + name)
        c = FakeContainer(self.client, name, image, labels)
        self.items[name] = c
        return c

    def run(self, image, **kwargs):
        self.runs.append(image)


class FakeImage:
    def __init__(self, image_id, env):
        self.id, self.attrs = image_id, {'Config': {'Env': env}}


class FakeImages:
    def __init__(self):
        self.tags = {'app:test': 'sha256:app1', 'egress:test': 'sha256:egress1'}
        self.env = []
        self.registry = {}  # pullable refs -> image id
        self.pulls = []

    def resolve(self, ref):
        return self.tags.get(ref, ref)

    def get(self, ref):
        if ref not in self.tags:
            raise docker.errors.ImageNotFound(ref + ' not found')
        return FakeImage(self.tags[ref], list(self.env))

    def pull(self, ref):
        self.pulls.append(ref)
        if ref not in self.registry:
            raise docker.errors.APIError('manifest unknown')
        self.tags[ref] = self.registry[ref]
        return self.get(ref)


class FakeNetwork:
    def __init__(self, networks, name, labels, subnet):
        self.networks, self.name = networks, name
        self.attrs = {'Labels': dict(labels or {}), 'IPAM': {'Config': [{'Subnet': subnet}]}}
        self.connected, self.removed = [], False

    def reload(self):
        pass

    def connect(self, container, ipv4_address=None):
        self.connected.append((container.name, ipv4_address))

    def remove(self):
        self.networks.items.pop(self.name, None)
        self.removed = True


class FakeNetworks:
    def __init__(self):
        self.items, self.count = {}, 0

    def get(self, name):
        if name not in self.items:
            raise not_found(name)
        return self.items[name]

    def create(self, name, labels=None, **kwargs):
        self.count += 1
        n = FakeNetwork(self, name, labels, f'172.30.{self.count}.0/24')
        self.items[name] = n
        return n


class FakeVolume:
    def __init__(self, volumes, name, labels):
        self.volumes, self.name, self.attrs, self.removed = volumes, name, {'Labels': dict(labels or {})}, False

    def remove(self, force=False):
        self.volumes.items.pop(self.name, None)
        self.removed = True


class FakeVolumes:
    def __init__(self):
        self.items = {}

    def get(self, name):
        if name not in self.items:
            raise not_found(name)
        return self.items[name]

    def create(self, name, labels=None):
        # Docker returns the existing volume for an existing name.
        return self.items.setdefault(name, FakeVolume(self, name, labels))


class FakeAPI:
    def create_endpoint_config(self, **kwargs):
        return kwargs


class FakeDocker:
    def __init__(self):
        self.clock = 0
        self.images = FakeImages()
        self.containers = FakeContainers(self)
        self.networks = FakeNetworks()
        self.volumes = FakeVolumes()
        self.api = FakeAPI()

    def tick(self):
        self.clock += 1
        return self.clock


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.fake = FakeDocker()
        env = patch.dict(os.environ)
        env.start()
        self.addCleanup(env.stop)
        os.environ.pop('CCG_CONTROLLER_VERSION', None)
        self.m = self.make('app:test', 'egress:test')
        # Pure configuration generation is covered by test_network.py.
        for target, value in (('manager.configuration', ({'outbounds': []}, 'table inet x {}\n')),
                              ('manager.business_rules', 'table inet ccg_app {}\n')):
            p = patch(target, return_value=value)
            p.start()
            self.addCleanup(p.stop)

    def make(self, app_image, egress_image):
        with patch('manager.docker.from_env', return_value=self.fake):
            return Manager(self.tmp, app_image, egress_image, 'ccg', 'http://probe.invalid/')

    def tearDown(self):
        self.m.lockfile.close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def app(self, aid):
        return self.fake.containers.items.get(f'ccg-{aid}-app')

    def apply(self, aid, revision=REV, **extra):
        return self.m.apply(aid, {'revision': revision, 'proxy': {'protocol': 'http'}, **extra})

    def new_image(self):
        self.fake.images.tags['app:test'] = 'sha256:app2'
        self.m.image_seen = (0.0, '')  # skip the 30 s status cache


class KeyTests(unittest.TestCase):
    VALID = ['1', '42', '123456789012345678', DRAFT_KEY, 'd' + '0' * 16]
    INVALID = ['', '0', '01', '1234567890123456789', 'd', 'd' + 'a' * 15, 'd' + 'a' * 17,
               'D0123456789abcdef', 'd0123456789ABCDEF', 'd0123456789abcdeg', 'x0123456789abcdef',
               DRAFT_KEY + '\n', '1\n', '../1', '1/../2', 'd0123456789abcdef/..', '-1', ' 1', None, 1]

    def test_key_pattern(self):
        for key in self.VALID:
            self.assertEqual(check(key), key)
        for key in self.INVALID:
            with self.assertRaises(BadRequest, msg=repr(key)):
                check(key)

    def test_routes_only_accept_valid_keys(self):
        for key in self.VALID:
            self.assertEqual(ROUTE.fullmatch(f'/accounts/{key}/status')[1], key)
            self.assertEqual(ROUTE.fullmatch(f'/accounts/{key}/admin/auth/session')[2], 'admin/auth/session')
            m = ROUTE.fullmatch(f'/accounts/{key}')
            self.assertEqual((m[1], m[2]), (key, None))
        for key in self.INVALID:
            if isinstance(key, str):
                self.assertIsNone(ROUTE.fullmatch(f'/accounts/{key}/status'), repr(key))
        m = ROUTE.fullmatch('/accounts')
        self.assertEqual((m[1], m[2]), (None, None))
        for path in ('/accounts/', '/accounts/1/', '/accounts/1/admin/auth/other', '/accounts/1/status?x=1',
                     '/accounts/1/../2/status', '/accounts/1/admin/auth/session/x'):
            self.assertIsNone(ROUTE.fullmatch(path), path)


class ManagerTests(Base):
    def test_guard_and_paths_reject_traversal(self):
        for key in ('../x', '..', 'd0123456789abcdef/../../etc', '/etc'):
            with self.assertRaises(BadRequest):
                self.m.guard(key)
            with self.assertRaises(BadRequest):
                self.m.dir(key)
            with self.assertRaises(BadRequest):
                self.m.name(key, 'app')

    def test_first_provision_records_created_at_and_image(self):
        state = self.m.provision(DRAFT_KEY)
        self.assertRegex(state['created_at'], r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$')
        self.assertEqual(self.m.state(DRAFT_KEY)['created_at'], state['created_at'])
        app = self.app(DRAFT_KEY)
        self.assertEqual(app.labels[LABEL], DRAFT_KEY)
        self.assertEqual(app.labels[IMAGE_LABEL], 'sha256:app1')
        self.assertIn(AUTH_LABEL, app.labels)
        # A second provision keeps the original timestamp and container.
        again = self.m.provision(DRAFT_KEY)
        self.assertEqual(again['created_at'], state['created_at'])
        self.assertIs(self.app(DRAFT_KEY), app)

    def test_image_change_recreates_app_and_keeps_volume(self):
        state = self.m.provision('7')
        old = self.app('7')
        volume = self.fake.volumes.items['ccg-7-data']
        self.new_image()
        again = self.m.provision('7')
        new = self.app('7')
        self.assertTrue(old.removed)
        self.assertIsNot(new, old)
        self.assertEqual(new.labels[IMAGE_LABEL], 'sha256:app2')
        self.assertEqual(new.attrs['Image'], 'sha256:app2')
        self.assertIs(self.fake.volumes.items['ccg-7-data'], volume)
        self.assertFalse(volume.removed)
        self.assertEqual((again['api_key'], again['admin_key']), (state['api_key'], state['admin_key']))

    def test_container_without_image_label_uses_inspect_data(self):
        self.m.provision('7')
        app = self.app('7')
        del app.labels[IMAGE_LABEL]  # created by an older controller
        self.m.provision('7')
        self.assertIs(self.app('7'), app)

    def test_bad_new_image_keeps_running_container(self):
        self.m.provision('7')
        app = self.app('7')
        self.new_image()
        self.fake.images.env = ['ANTHROPIC_API_KEY=leak']
        with self.assertRaises(ValueError):
            self.m.provision('7')
        self.assertIs(self.app('7'), app)
        self.assertFalse(app.removed)

    def test_image_change_marks_ready_runtime_pending_then_rebuilds(self):
        self.assertEqual(self.apply(DRAFT_KEY)['status'], 'ready')
        old = self.app(DRAFT_KEY)
        self.assertEqual(self.m.public(DRAFT_KEY)['status'], 'ready')
        self.new_image()
        # The core only PUTs config when status is not ready at its revision.
        self.assertEqual(self.m.public(DRAFT_KEY)['status'], 'pending')
        result = self.apply(DRAFT_KEY)
        self.assertEqual(result['status'], 'ready')
        self.assertTrue(old.removed)
        self.assertEqual(self.app(DRAFT_KEY).attrs['Image'], 'sha256:app2')
        self.assertIn(f'ccg-{DRAFT_KEY}-data', self.fake.volumes.items)

    def test_missing_images_are_pulled_by_digest_and_upgrade_rebuilds(self):
        app1 = 'ghcr.io/sub2api-devs/ccgateway-app@sha256:' + 'b' * 64
        app2 = 'ghcr.io/sub2api-devs/ccgateway-app@sha256:' + 'c' * 64
        egress = 'ghcr.io/sub2api-devs/ccgateway-egress@sha256:' + 'd' * 64
        images = self.fake.images
        images.registry = {app1: 'sha256:id-b', app2: 'sha256:id-c', egress: 'sha256:id-d'}
        self.m.lockfile.close()
        self.m = self.make(app1, egress)
        self.assertEqual(self.apply('8')['status'], 'ready')
        self.assertEqual(sorted(images.pulls), sorted([app1, egress]))
        old = self.app('8')
        self.assertEqual((old.labels[IMAGE_LABEL], old.attrs['Image']), ('sha256:id-b', 'sha256:id-b'))
        self.assertEqual(self.apply('8')['status'], 'ready')
        self.assertEqual(len(images.pulls), 2)  # present images are not pulled again
        self.assertIs(self.app('8'), old)
        # Core upgrade: the controller restarts with a new pinned digest.
        self.m.lockfile.close()
        self.m = self.make(app2, egress)
        self.assertEqual(self.m.public('8')['status'], 'pending')
        self.assertEqual(self.apply('8')['status'], 'ready')
        self.assertEqual(images.pulls[-1], app2)
        self.assertTrue(old.removed)
        self.assertEqual(self.app('8').attrs['Image'], 'sha256:id-c')
        self.assertIn('ccg-8-data', self.fake.volumes.items)

    def test_pull_failure(self):
        self.m.lockfile.close()
        self.m = self.make('ghcr.io/x/app@sha256:' + 'e' * 64, 'egress:test')
        with self.assertRaises(manager.ImagePullFailed):
            self.apply('8')
        self.assertIsNone(self.app('8'))

    def test_delete_draft_removes_everything_and_is_idempotent(self):
        self.apply(DRAFT_KEY)
        self.apply(OTHER_DRAFT)
        names = [f'ccg-{DRAFT_KEY}-{r}' for r in ('app', 'egress')]
        self.assertTrue(all(n in self.fake.containers.items for n in names))
        self.assertEqual(self.m.delete(DRAFT_KEY), {'deleted': True})
        for n in names:
            self.assertNotIn(n, self.fake.containers.items)
        self.assertNotIn(f'ccg-{DRAFT_KEY}-net', self.fake.networks.items)
        self.assertNotIn(f'ccg-{DRAFT_KEY}-data', self.fake.volumes.items)
        self.assertFalse((Path(self.tmp) / DRAFT_KEY).exists())
        self.assertNotIn(DRAFT_KEY, self.m.online)
        self.assertEqual(self.m.public(DRAFT_KEY)['status'], 'pending')
        # Nothing left: still success. Other runtimes untouched.
        self.assertEqual(self.m.delete(DRAFT_KEY), {'deleted': True})
        self.assertEqual(self.m.delete('d' + 'f' * 16), {'deleted': True})
        self.assertIn(f'ccg-{OTHER_DRAFT}-app', self.fake.containers.items)
        self.assertTrue((Path(self.tmp) / OTHER_DRAFT / 'state.json').exists())

    def test_delete_refuses_account_keys(self):
        self.apply('5')
        with self.assertRaises(NotDraft):
            self.m.delete('5')
        self.assertIn('ccg-5-app', self.fake.containers.items)
        self.assertIn('ccg-5-data', self.fake.volumes.items)
        self.assertTrue((Path(self.tmp) / '5' / 'state.json').exists())
        with self.assertRaises(BadRequest):
            self.m.delete('../5')

    def test_delete_refuses_foreign_resources(self):
        self.fake.containers.create('app:test', name=f'ccg-{DRAFT_KEY}-app', labels={LABEL: 'someone-else'})
        with self.assertRaises(ValueError):
            self.m.delete(DRAFT_KEY)
        self.assertIn(f'ccg-{DRAFT_KEY}-app', self.fake.containers.items)

    def test_runtimes_lists_state_directories(self):
        self.apply('3')
        self.m.provision(DRAFT_KEY)
        blocked = self.m.state(DRAFT_KEY)
        blocked['status'] = 'blocked'
        self.m.save(DRAFT_KEY, blocked)
        legacy = Path(self.tmp) / OTHER_DRAFT  # older state without created_at
        legacy.mkdir()
        (legacy / 'state.json').write_text(json.dumps({'status': 'ready', 'revision': REV}))
        os.utime(legacy, (1700000000, 1700000000))
        (Path(self.tmp) / 'not-a-key').mkdir()
        (Path(self.tmp) / '12').write_text('a file, not a runtime')
        result = self.m.runtimes()['runtimes']
        self.assertEqual([r['key'] for r in result], ['3', DRAFT_KEY, OTHER_DRAFT])
        by = {r['key']: r for r in result}
        self.assertEqual(by['3']['status'], 'ready')
        self.assertEqual(by[DRAFT_KEY]['status'], 'blocked')
        # Persisted readiness is never trusted.
        self.assertEqual(by[OTHER_DRAFT]['status'], 'pending')
        self.assertEqual(by[OTHER_DRAFT]['created_at'], '2023-11-14T22:13:20Z')
        for r in result:
            self.assertRegex(r['created_at'], r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$')


class FakeResponse:
    status_code = 200
    headers = {'Content-Type': 'application/json'}

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def iter_content(self, chunk_size):
        yield b'{"session":null}'


class FakeSession:
    calls = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def request(self, method, url, data=None, headers=None, **kwargs):
        FakeSession.calls.append((method, url, dict(headers or {})))
        return FakeResponse()


class HandlerTests(Base):
    def setUp(self):
        super().setUp()
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.server.key, self.server.manager = CONTROLLER_KEY, self.m
        self.server.daemon_threads = True
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        FakeSession.calls = []
        p = patch('manager.requests.Session', FakeSession)
        p.start()
        self.addCleanup(p.stop)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        super().tearDown()

    def call(self, method, path, body=None, key=CONTROLLER_KEY, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_address[1], timeout=10)
        try:
            h = {'Authorization': 'Bearer ' + key, **(headers or {})}
            raw = body.encode() if isinstance(body, str) else body
            conn.request(method, path, body=raw, headers=h)
            res = conn.getresponse()
            return res.status, json.loads(res.read() or b'null')
        finally:
            conn.close()

    def test_errors_are_english_codes(self):
        self.assertEqual(self.call('GET', '/accounts', key='wrong' * 8), (401, {'error': 'unauthorized'}))
        for path in ('/accounts/../1/status', '/accounts/0/status', '/accounts/D0123456789ABCDEF/status',
                     '/accounts/1/admin/auth/other', '/nothing'):
            self.assertEqual(self.call('GET', path), (404, {'error': 'not_found'}), path)
        self.assertEqual(self.call('POST', '/accounts', ''), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(self.call('GET', f'/accounts/{DRAFT_KEY}'), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(self.call('DELETE', f'/accounts/{DRAFT_KEY}/status'), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(self.call('PUT', '/accounts/1/config', 'not json'), (400, {'error': 'invalid_request'}))
        self.assertEqual(self.call('PUT', '/accounts/1/config', '[]'), (400, {'error': 'invalid_request'}))
        self.assertEqual(self.call('PUT', '/accounts/1/config', json.dumps({'revision': 'x', 'proxy': {}})),
                         (400, {'error': 'invalid_request'}))
        self.fake.images.tags.clear()  # not local and not pullable
        self.assertEqual(self.call('PUT', '/accounts/1/config', json.dumps({'revision': REV, 'proxy': {'protocol': 'http'}})),
                         (503, {'error': 'image_pull_failed'}))
        self.fake.images.tags.update({'app:test': 'sha256:app1', 'egress:test': 'sha256:egress1'})

        def broken(*args, **kwargs):
            raise docker.errors.APIError('daemon error')
        self.fake.networks.create = broken
        self.assertEqual(self.call('PUT', '/accounts/1/config', json.dumps({'revision': REV, 'proxy': {'protocol': 'http'}})),
                         (503, {'error': 'runtime_unavailable'}))

    def test_health(self):
        self.assertEqual(self.call('GET', '/health', key='wrong' * 8), (401, {'error': 'unauthorized'}))
        self.assertEqual(self.call('GET', '/health'),
                         (200, {'version': 'dev', 'app_image': 'app:test', 'egress_image': 'egress:test'}))
        self.m.version = 'abc123def456'
        self.assertEqual(self.call('GET', '/health')[1]['version'], 'abc123def456')
        self.assertEqual(self.call('POST', '/health', ''), (405, {'error': 'method_not_allowed'}))

    def test_delete_and_list(self):
        self.apply(DRAFT_KEY)
        self.apply('9')
        status, body = self.call('GET', '/accounts')
        self.assertEqual(status, 200)
        self.assertEqual([r['key'] for r in body['runtimes']], ['9', DRAFT_KEY])
        self.assertEqual(self.call('DELETE', '/accounts/9'), (405, {'error': 'method_not_allowed'}))
        self.assertIn('ccg-9-app', self.fake.containers.items)
        for _ in range(2):
            self.assertEqual(self.call('DELETE', f'/accounts/{DRAFT_KEY}'), (200, {'deleted': True}))
        self.assertEqual([r['key'] for r in self.call('GET', '/accounts')[1]['runtimes']], ['9'])

    def test_session_pass_through(self):
        self.apply(DRAFT_KEY)
        state = self.m.state(DRAFT_KEY)
        path = f'/accounts/{DRAFT_KEY}/admin/auth/session'
        self.assertEqual(self.call('GET', path), (409, {'error': 'not_synchronized'}))
        self.assertEqual(self.call('GET', path, headers={'X-CCG-Revision': REV}), (200, {'session': None}))
        method, url, headers = FakeSession.calls[-1]
        self.assertEqual((method, url), ('GET', f'http://{state["app_ip"]}:8787/admin/auth/session'))
        self.assertEqual(headers['Authorization'], 'Bearer ' + state['admin_key'])
        self.assertEqual(self.call('POST', f'/accounts/{DRAFT_KEY}/admin/auth/cancel', '{}', headers={'X-CCG-Revision': REV})[0], 200)
        self.assertEqual(FakeSession.calls[-1][1], f'http://{state["app_ip"]}:8787/admin/auth/cancel')
        self.assertEqual(self.call('DELETE', path, headers={'X-CCG-Revision': REV}), (405, {'error': 'method_not_allowed'}))

    def test_api_key_accounts_reject_oauth(self):
        self.apply('4', auth={'mode': 'api_key', 'api_key': 'sk-test-key-123'})
        self.assertEqual(self.call('GET', '/accounts/4/admin/auth/session', headers={'X-CCG-Revision': REV}),
                         (409, {'error': 'api_key_account'}))


if __name__ == '__main__':
    unittest.main()
