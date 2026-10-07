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
        if ref in self.tags.values():
            return FakeImage(ref, list(self.env))
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
        n = FakeNetwork(self, name, labels, kwargs['ipam']['Config'][0]['Subnet'])
        self.items[name] = n
        return n

    def list(self):
        return list(self.items.values())


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
            self.assertEqual(ROUTE.fullmatch(f'/accounts/{key}/admin/usage')[2], 'admin/usage')
            m = ROUTE.fullmatch(f'/accounts/{key}')
            self.assertEqual((m[1], m[2]), (key, None))
        for key in self.INVALID:
            if isinstance(key, str):
                self.assertIsNone(ROUTE.fullmatch(f'/accounts/{key}/status'), repr(key))
        m = ROUTE.fullmatch('/accounts')
        self.assertEqual((m[1], m[2]), (None, None))
        for path in ('/accounts/', '/accounts/1/', '/accounts/1/admin/auth/other', '/accounts/1/status?x=1',
                     '/accounts/1/../2/status', '/accounts/1/admin/auth/session/x', '/accounts/1/admin/usage/x',
                     '/accounts/1/admin/auth/usage'):
            self.assertIsNone(ROUTE.fullmatch(path), path)


class ManagerTests(Base):
    def test_auth_migration_isolated_idempotent_and_source_readonly(self):
        self.apply('7')
        self.apply(DRAFT_KEY)
        source, target = self.app('7'), self.app(DRAFT_KEY)
        source_boot = source.attrs['State']['StartedAt']
        with patch.object(self.fake.containers, 'run') as run:
            self.assertEqual(self.m.migrate_auth(DRAFT_KEY, '7'), {'migrated': True})
            self.m.migrate_auth(DRAFT_KEY, '7')
            self.assertEqual(run.call_count, 1)
            opts = run.call_args.kwargs
            self.assertEqual(opts['volumes']['ccg-7-data']['mode'], 'ro')
            self.assertEqual(opts['network_mode'], 'none')
            self.assertEqual(opts['user'], '1000:1000')
        self.assertEqual(source.attrs['State']['StartedAt'], source_boot)
        self.assertEqual(self.m.public('7')['status'], 'ready')
        self.assertIs(self.app(DRAFT_KEY), target)
        self.assertNotEqual(self.m.state('7')['admin_key'], self.m.state(DRAFT_KEY)['admin_key'])
        self.apply(DRAFT_KEY)
        self.assertEqual(self.m.public(DRAFT_KEY)['status'], 'ready')

    def test_failed_migration_never_changes_source_or_promotes_partial_copy(self):
        self.apply('7')
        self.apply(DRAFT_KEY)
        source = self.app('7')
        with patch.object(self.fake.containers, 'run', side_effect=RuntimeError('copy failed')):
            with self.assertRaises(RuntimeError):
                self.m.migrate_auth(DRAFT_KEY, '7')
        self.assertIs(self.app('7'), source)
        self.assertEqual(self.m.public('7')['status'], 'ready')
        self.assertEqual(self.app(DRAFT_KEY).status, 'exited')
        with self.assertRaises(BadRequest):
            self.apply(DRAFT_KEY)
        self.m.delete(DRAFT_KEY)
        self.assertIn('ccg-7-data', self.fake.volumes.items)

    def test_migration_rejects_non_draft_same_runtime_and_foreign_volume(self):
        self.apply('7')
        self.apply(DRAFT_KEY)
        for dest, source in [('7', DRAFT_KEY), (DRAFT_KEY, DRAFT_KEY), (DRAFT_KEY, '../7')]:
            with self.assertRaises(BadRequest):
                self.m.migrate_auth(dest, source)
        self.fake.volumes.get('ccg-7-data').attrs['Labels'][LABEL] = 'foreign'
        with self.assertRaises(BadRequest):
            self.m.migrate_auth(DRAFT_KEY, '7')

    def test_missing_default_image_does_not_break_existing_connection(self):
        self.apply('7')
        app = self.app('7')
        self.m.app_image = 'missing:tag'
        self.m.image_seen = (0.0, '')
        self.assertEqual(self.m.connection('7', REV)['revision'], REV)
        self.assertFalse(self.m.public('7')['target_image_available'])
        self.apply('7')
        self.assertIs(self.app('7'), app)
        self.assertFalse(self.fake.images.pulls)

    def test_network_change_recreates_containers_keeps_volume_and_keys(self):
        self.apply('7')
        old_state = self.m.state('7')
        old_app = self.app('7')
        old_egress = self.fake.containers.get('ccg-7-egress')
        old_network = self.fake.networks.get('ccg-7-net')
        volume = self.fake.volumes.get('ccg-7-data')
        policy = {'pool': '10.80.0.0/16', 'allocation': 'sequential'}
        self.apply('7', network=policy)
        state = self.m.state('7')
        self.assertTrue(old_app.removed and old_egress.removed and old_network.removed)
        self.assertIs(self.fake.volumes.get('ccg-7-data'), volume)
        self.assertFalse(volume.removed)
        self.assertEqual((state['api_key'], state['admin_key']), (old_state['api_key'], old_state['admin_key']))
        self.assertEqual((state['gateway_ip'], state['app_ip'], state['uplink_ip']),
                         ('10.80.0.2', '10.80.0.3', '10.80.1.2'))
        app = self.app('7')
        self.apply('7', network=policy)
        self.assertIs(self.app('7'), app)

    def test_invalid_network_does_not_interrupt_existing_runtime(self):
        self.apply('7')
        app = self.app('7')
        with self.assertRaises(BadRequest):
            self.apply('7', network={'pool': '8.8.8.0/24'})
        self.assertIs(self.app('7'), app)
        self.assertEqual(app.status, 'running')

    def test_exhausted_pool_does_not_interrupt_existing_runtime(self):
        self.apply('7')
        self.fake.networks.items['external'] = FakeNetwork(self.fake.networks, 'external', {}, '192.168.50.0/24')
        app = self.app('7')
        with self.assertRaises(ValueError):
            self.apply('7', network={'pool': '192.168.50.0/24'})
        self.assertIs(self.app('7'), app)
        self.assertEqual(app.status, 'running')

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

    def test_image_change_keeps_app_and_volume(self):
        state = self.m.provision('7')
        old = self.app('7')
        volume = self.fake.volumes.items['ccg-7-data']
        self.new_image()
        again = self.m.provision('7')
        new = self.app('7')
        self.assertFalse(old.removed)
        self.assertIs(new, old)
        self.assertEqual(new.labels[IMAGE_LABEL], 'sha256:app1')
        self.assertEqual(new.attrs['Image'], 'sha256:app1')
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
        self.m.provision('7')
        self.assertIs(self.app('7'), app)
        self.assertFalse(app.removed)

    def test_image_change_only_reports_available_update(self):
        self.assertEqual(self.apply(DRAFT_KEY)['status'], 'ready')
        old = self.app(DRAFT_KEY)
        self.assertEqual(self.m.public(DRAFT_KEY)['status'], 'ready')
        self.new_image()
        # The core only PUTs config when status is not ready at its revision.
        self.assertEqual(self.m.public(DRAFT_KEY)['status'], 'ready')
        self.assertTrue(self.m.public(DRAFT_KEY)['image_update_available'])
        result = self.apply(DRAFT_KEY)
        self.assertEqual(result['status'], 'ready')
        self.assertFalse(old.removed)
        self.assertIs(self.app(DRAFT_KEY), old)
        self.assertIn(f'ccg-{DRAFT_KEY}-data', self.fake.volumes.items)

    def test_controller_restart_keeps_old_image_and_new_accounts_use_new_default(self):
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
        self.assertNotIn(app2, images.pulls)
        self.assertFalse(old.removed)
        self.assertEqual(self.app('8').attrs['Image'], 'sha256:id-b')
        self.assertIn('ccg-8-data', self.fake.volumes.items)
        self.apply('9')
        self.assertEqual(self.app('9').attrs['Image'], 'sha256:id-c')
        self.assertIn(app2, images.pulls)

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

    def test_delete_account_runtime_when_named_explicitly(self):
        self.apply('5')
        self.assertEqual(self.m.delete('5', account=True), {'deleted': True})
        self.assertNotIn('ccg-5-app', self.fake.containers.items)
        self.assertIn('ccg-5-data', self.fake.volumes.items)
        self.assertTrue((Path(self.tmp) / 'backups' / '5.json').exists())
        self.assertFalse((Path(self.tmp) / '5').exists())
        self.assertEqual(self.m.delete('5', account=True), {'deleted': True})

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
                         (200, {'version': 'dev', 'app_image': 'app:test', 'egress_image': 'egress:test', 'network_policy_version': 1}))
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
        # An account runtime is deleted only when the header names it.
        self.assertEqual(self.call('DELETE', '/accounts/9', headers={'X-CCG-Delete-Account': '8'}), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(self.call('DELETE', '/accounts/9', headers={'X-CCG-Delete-Account': '9'}), (200, {'deleted': True}))
        self.assertEqual(self.call('GET', '/accounts')[1]['runtimes'], [])

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

    def test_request_logs_pass_through(self):
        self.apply('7', auth={'mode': 'api_key', 'api_key': 'sk-test-key-123'})
        state = self.m.state('7')
        path = '/accounts/7/admin/request-logs'
        self.assertEqual(self.call('GET', path)[0], 409)
        for method in ('GET', 'PUT'):
            self.assertEqual(self.call(method, path, '{"enabled":false}', headers={'X-CCG-Revision': REV})[0], 200)
            actual, url, headers = FakeSession.calls[-1]
            self.assertEqual((actual, url), (method, f'http://{state["app_ip"]}:8787/admin/request-logs'))
            self.assertEqual(headers['Authorization'], 'Bearer ' + state['admin_key'])
        calls = len(FakeSession.calls)
        self.assertEqual(self.call('POST', path, '{}', headers={'X-CCG-Revision': REV})[0], 405)
        self.assertEqual(len(FakeSession.calls), calls)
        # PUT remains forbidden on all other pass-through endpoints.
        self.assertEqual(self.call('PUT', '/accounts/7/admin/status', '{}', headers={'X-CCG-Revision': REV})[0], 405)

    def test_usage_pass_through(self):
        self.apply('7')
        state = self.m.state('7')
        path = '/accounts/7/admin/usage'
        self.assertEqual(self.call('GET', path), (409, {'error': 'not_synchronized'}))
        self.assertEqual(self.call('GET', path, headers={'X-CCG-Revision': REV})[0], 200)
        method, url, headers = FakeSession.calls[-1]
        self.assertEqual((method, url), ('GET', f'http://{state["app_ip"]}:8787/admin/usage'))
        self.assertEqual(headers['Authorization'], 'Bearer ' + state['admin_key'])
        calls = len(FakeSession.calls)
        # Read-only: any other method is refused before reaching the container.
        self.assertEqual(self.call('POST', path, '{}', headers={'X-CCG-Revision': REV}), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(len(FakeSession.calls), calls)

    def test_api_key_accounts_reject_oauth(self):
        self.apply('4', auth={'mode': 'api_key', 'api_key': 'sk-test-key-123'})
        self.assertEqual(self.call('GET', '/accounts/4/admin/auth/session', headers={'X-CCG-Revision': REV}),
                         (409, {'error': 'api_key_account'}))
        self.assertEqual(self.call('GET', '/accounts/4/admin/usage', headers={'X-CCG-Revision': REV}),
                         (409, {'error': 'api_key_account'}))


if __name__ == '__main__':
    unittest.main()

class ConnectionTests(Base):
    def test_connection_requires_current_ready_revision_and_keeps_key_private(self):
        self.apply('21')
        state = self.m.state('21')
        self.assertIsNone(self.m.connection('21', ''))
        self.assertIsNone(self.m.connection('21', 'b' * 64))
        connection = self.m.connection('21', REV)
        self.assertEqual(connection['app_ip'], state['app_ip'])
        self.assertEqual(connection['api_key'], state['api_key'])
        self.assertEqual(connection['port'], 8787)
        self.assertNotIn('api_key', self.m.public('21'))
        self.app('21').stop()
        self.assertIsNone(self.m.connection('21', REV))
