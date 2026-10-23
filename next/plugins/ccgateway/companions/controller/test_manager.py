"""Controller unit tests with an in-memory Docker client (no Docker needed).

Run on Linux (manager.py uses fcntl) from this directory, as CI does:
    pip install -r requirements.txt
    python -m unittest discover -v -p 'test_*.py'
"""
import http.client
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch
from http.server import ThreadingHTTPServer

import docker

import manager
from manager import Manager, Handler, LABEL, AUTH_LABEL, IMAGE_LABEL, ROUTE, NotDraft, BadRequest, check

DRAFT_KEY = 'd0123456789abcdef'
OTHER_DRAFT = 'dfedcba9876543210'
REV = 'a' * 64
CONTROLLER_KEY = 'k' * 32
# Every variable the controller reads from its environment.
ENVIRONMENT = ('CCG_CONTROLLER_VERSION', 'CCG_DEFAULT_CLI_VERSION', 'CCG_ACCOUNT_DISK_GIB', 'CCG_ACCOUNT_DISK_QUOTA_REQUIRED',
               'CCG_CONTROLLER_NAME', 'CCG_CONTROLLER_PORT', 'CCG_CONTROLLER_IMAGE', 'CCG_RUNTIME_ENV_FILE', 'CCG_XRAY_IMAGE')


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
        for network in self.client.networks.items.values():
            network.endpoints.pop(self.id, None)
        self.removed = True

    def reload(self):
        pass

    def exec_run(self, cmd):
        return 0, b''


def label_filter_matches(labels, wanted):
    key, _, value = wanted.partition('=')
    return key in labels and (not value or labels[key] == value)


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
        c.kwargs = kwargs
        self.items[name] = c
        if kwargs.get('network') in self.client.networks.items:
            endpoint = (kwargs.get('networking_config') or {}).get(kwargs['network']) or {}
            self.client.networks.items[kwargs['network']].connect(c, endpoint.get('ipv4_address'))
        return c

    def list(self, all=False, filters=None, **kwargs):
        """The label and volume filters of the Docker API (volume: by name)."""
        out = []
        for c in self.items.values():
            if not all and c.status != 'running':
                continue
            if 'label' in (filters or {}) and not label_filter_matches(c.labels, filters['label']):
                continue
            if 'volume' in (filters or {}) and filters['volume'] not in (getattr(c, 'kwargs', {}).get('volumes') or {}):
                continue
            out.append(c)
        return out

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
        self.endpoints = {}  # container id -> endpoint, as Docker's inspect "Containers"
        self.id = 'nid-' + name
        self.reload()

    def reload(self):
        self.attrs['Containers'] = {cid: dict(endpoint) for cid, endpoint in self.endpoints.items()}

    def connect(self, container, ipv4_address=None):
        self.connected.append((container.name, ipv4_address))
        self.endpoints[container.id] = {'Name': container.name, 'IPv4Address': f'{ipv4_address}/24' if ipv4_address else ''}
        self.reload()

    def disconnect(self, container, force=False):
        self.endpoints.pop(getattr(container, 'id', container), None)
        self.reload()

    def remove(self):
        if self.endpoints:
            raise docker.errors.APIError('network has active endpoints')
        self.networks.items.pop(self.name, None)
        self.removed = True


class FakeNetworks:
    def __init__(self):
        self.items, self.count = {}, 0

    def get(self, name):
        if name not in self.items:
            raise not_found(name)
        self.items[name].reload()  # Docker answers a fresh inspect
        return self.items[name]

    def create(self, name, labels=None, **kwargs):
        self.count += 1
        n = FakeNetwork(self, name, labels, kwargs['ipam']['Config'][0]['Subnet'])
        self.items[name] = n
        return n

    def list(self, **kwargs):
        return list(self.items.values())


class FakeVolume:
    def __init__(self, volumes, name, labels, driver='local', driver_opts=None):
        self.volumes, self.name, self.attrs, self.removed = volumes, name, {'Labels': dict(labels or {})}, False
        self.attrs.update(Driver=driver, Options=dict(driver_opts or {}))

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

    def create(self, name, labels=None, driver='local', driver_opts=None):
        # Docker returns the existing volume for an existing name.
        return self.items.setdefault(name, FakeVolume(self, name, labels, driver, driver_opts))

    def list(self, **kwargs):
        return list(self.items.values())


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
        # The controller image sets some of these (CCG_DEFAULT_CLI_VERSION);
        # a test host must not change what the tests see (audit B10).
        for name in ENVIRONMENT:
            os.environ.pop(name, None)
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


class DiskQuotaTests(Base):
    def test_invalid_disk_defaults_are_rejected_before_state_is_opened(self):
        for value in ('0', '-1', '1.5', '010', '1025', '10g', ''):
            with patch.dict(os.environ, {'CCG_ACCOUNT_DISK_GIB': value}):
                with self.assertRaisesRegex(ValueError, 'CCG_ACCOUNT_DISK_GIB'):
                    self.make('app:test', 'egress:test')

    def test_new_account_uses_a_hard_volume_quota_and_passes_the_verified_limit(self):
        state = self.m.provision('7')
        volume = self.fake.volumes.get('ccg-7-data')
        limit = 10 << 30
        self.assertEqual(volume.attrs['Options'], {'size': str(limit)})
        self.assertEqual(volume.attrs['Labels'][manager.DISK_QUOTA_LABEL], str(limit))
        self.assertEqual(state['disk_quota'], {'limit_bytes': limit, 'status': 'enforced'})
        self.assertEqual(self.app('7').kwargs['environment']['CCG_ACCOUNT_DISK_QUOTA_BYTES'], str(limit))
        self.assertEqual(self.app('7').kwargs['mem_limit'], '1g')
        self.assertEqual(self.app('7').kwargs['nano_cpus'], 2000000000)

    def test_new_account_container_carries_the_telemetry_switches(self):
        self.m.provision('7')
        environment = self.app('7').kwargs['environment']
        for name, value in manager.TELEMETRY_ENV.items():
            self.assertEqual(environment[name], value, name)
        for name in ('CLAUDE_CODE_DISABLE_WEB_FETCH', 'CLAUDE_CODE_DISABLE_ARTIFACT',
                     'ENABLE_CLAUDEAI_MCP_SERVERS', 'CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL'):
            self.assertNotIn(name, environment)

    def no_quota_support(self):
        """Storage without project quotas refuses only the size option."""
        create = self.fake.volumes.create

        def refuse_size(name, **kwargs):
            if kwargs.get('driver_opts', {}).get('size'):
                raise docker.errors.APIError('quota size requested but no quota support')
            return create(name, **kwargs)
        return patch.object(self.fake.volumes, 'create', side_effect=refuse_size)

    def test_unsupported_storage_creates_an_unbounded_volume_and_reports_it(self):
        with self.no_quota_support():
            state = self.m.provision('7')
        volume = self.fake.volumes.get('ccg-7-data')
        self.assertNotIn('size', volume.attrs.get('Options') or {})
        self.assertNotIn(manager.DISK_QUOTA_LABEL, volume.attrs['Labels'])
        self.assertEqual(state['disk_quota'], {'limit_bytes': 0, 'status': 'unbounded'})
        self.assertNotIn('CCG_ACCOUNT_DISK_QUOTA_BYTES', self.app('7').kwargs['environment'])
        self.assertEqual(self.m.health()['disk_quota']['support'], 'unavailable')
        # The unbounded volume is kept as it is on the next configuration.
        state = self.m.provision('7', {'mode': 'api_key', 'api_key': 'fixture-key', 'base_url': 'https://api.example.test'})
        self.assertIs(self.fake.volumes.get('ccg-7-data'), volume)
        self.assertEqual(state['disk_quota']['status'], 'unbounded')

    def test_required_quota_never_creates_an_unlimited_fallback(self):
        self.m.lockfile.close()
        with patch.dict(os.environ, {'CCG_ACCOUNT_DISK_QUOTA_REQUIRED': '1'}):
            self.m = self.make('app:test', 'egress:test')
        with self.no_quota_support():
            with self.assertRaises(manager.DiskQuotaUnavailable):
                self.m.provision('7')
        self.assertIsNone(self.app('7'))
        self.assertEqual(self.fake.volumes.items, {})
        self.assertEqual(self.fake.networks.items, {})
        self.assertEqual(self.m.health()['disk_quota']['support'], 'unavailable')

    def test_invalid_quota_requirement_is_rejected(self):
        for value in ('2', 'yes', 'true', ''):
            with patch.dict(os.environ, {'CCG_ACCOUNT_DISK_QUOTA_REQUIRED': value}):
                with self.assertRaisesRegex(ValueError, 'CCG_ACCOUNT_DISK_QUOTA_REQUIRED'):
                    self.make('app:test', 'egress:test')

    def test_failed_mount_verification_keeps_the_working_runtime(self):
        self.m.provision('7')
        old = self.app('7')
        volume = self.fake.volumes.get('ccg-7-data')
        state = self.m.state('7')
        with patch.object(self.m, 'oneshot', side_effect=docker.errors.APIError('quota verification failed')):
            with self.assertRaises(manager.DiskQuotaUnavailable):
                self.m.provision('7', {'mode': 'api_key', 'api_key': 'fixture-key', 'base_url': 'https://api.example.test'})
        self.assertIs(self.app('7'), old)
        self.assertFalse(old.removed)
        self.assertIs(self.fake.volumes.get('ccg-7-data'), volume)
        self.assertEqual(self.m.state('7'), state)

    def test_default_changes_do_not_resize_existing_data(self):
        self.m.provision('7')
        self.m.account_disk_bytes = 20 << 30
        self.m.provision('8')
        self.assertEqual(self.m.account_volume('7')[1], 10 << 30)
        self.assertEqual(self.m.account_volume('8')[1], 20 << 30)

    def test_legacy_data_is_preserved_and_not_claimed_to_have_a_quota(self):
        self.m.provision('7')
        volume = self.fake.volumes.get('ccg-7-data')
        volume.attrs['Options'] = {}
        del volume.attrs['Labels'][manager.DISK_QUOTA_LABEL]
        state = self.m.state('7')
        del state['disk_quota']
        self.m.save('7', state)
        state = self.m.provision('7', {'mode': 'api_key', 'api_key': 'fixture-key', 'base_url': 'https://api.example.test'})
        self.assertIs(self.fake.volumes.get('ccg-7-data'), volume)
        self.assertEqual(state['disk_quota']['status'], 'legacy_unbounded')
        self.assertNotIn('CCG_ACCOUNT_DISK_QUOTA_BYTES', self.app('7').kwargs['environment'])

    def test_unowned_or_inconsistent_volumes_cannot_be_adopted(self):
        volume = self.fake.volumes.create('ccg-7-data', labels={LABEL: 'other'})
        with self.assertRaisesRegex(ValueError, 'ownership'):
            self.m.account_volume('7', allow_unbounded=True)
        volume.attrs['Labels'] = {LABEL: '7', manager.DISK_QUOTA_LABEL: str(10 << 30)}
        volume.attrs['Options'] = {'size': str(20 << 30)}
        with self.assertRaises(manager.DiskQuotaUnavailable):
            self.m.account_volume('7', allow_unbounded=True)
        self.assertFalse(volume.removed)

    def test_a_previously_enforced_volume_cannot_silently_become_legacy(self):
        self.m.provision('7')
        old = self.app('7')
        volume = self.fake.volumes.get('ccg-7-data')
        volume.attrs['Options'] = {}
        del volume.attrs['Labels'][manager.DISK_QUOTA_LABEL]
        with self.assertRaises(manager.DiskQuotaUnavailable):
            self.m.provision('7', {'mode': 'api_key', 'api_key': 'fixture-key', 'base_url': 'https://api.example.test'})
        self.assertIs(self.app('7'), old)
        self.assertFalse(old.removed)

    def test_an_enforced_account_never_falls_back_to_an_unbounded_volume(self):
        self.m.provision('7')
        old = self.app('7')
        del self.fake.volumes.items['ccg-7-data']
        with self.no_quota_support():
            with self.assertRaises(manager.DiskQuotaUnavailable):
                self.m.provision('7', {'mode': 'api_key', 'api_key': 'fixture-key', 'base_url': 'https://api.example.test'})
        self.assertIs(self.app('7'), old)
        self.assertNotIn('ccg-7-data', self.fake.volumes.items)


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
        # Retired: the model relay, the credential copy and the CLI catalog.
        for path in ('/accounts/', '/accounts/1/', '/accounts/1/admin/auth/other', '/accounts/1/status?x=1',
                     '/accounts/1/../2/status', '/accounts/1/admin/auth/session/x', '/accounts/1/admin/usage/x',
                     '/accounts/1/admin/auth/usage', '/accounts/1/v1/messages', '/accounts/1/v1/messages/count_tokens',
                     f'/accounts/{DRAFT_KEY}/migrate-auth', '/accounts/1/admin/cli/catalog'):
            self.assertIsNone(ROUTE.fullmatch(path), path)


class ManagerTests(Base):
    def test_direct_runtime_without_proxy(self):
        with patch('manager.configuration', return_value=({'outbounds': []}, 'table inet x {}\n')) as conf:
            out = self.m.apply('5', {'revision': REV, 'proxy': None, 'direct': True})
        self.assertEqual(out['status'], 'ready')
        self.assertIsNone(conf.call_args.args[0])
        # Without the core's direct flag a missing proxy still blocks.
        self.assertEqual(self.m.apply('5', {'revision': REV, 'proxy': None})['status'], 'blocked')
        self.assertEqual(self.m.apply('5', {'revision': REV, 'direct': 'yes'})['status'], 'blocked')
        self.assertEqual(self.m.apply('5', {'revision': REV, 'direct': True, 'enabled': False})['status'], 'blocked')

    def test_oneshot_removes_a_container_that_could_not_start(self):
        # docker-py's run(remove=True) leaves a container that fails to start
        # behind in "Created"; every failed reconcile used to add one.
        def run(image, name=None, **kwargs):
            self.assertTrue(kwargs.pop('remove'))
            self.fake.containers.create(image, name=name)
            raise docker.errors.APIError('cannot join network of a non running container')
        with patch.object(self.fake.containers, 'run', side_effect=run):
            with self.assertRaises(docker.errors.APIError):
                self.m.oneshot('egress:test', entrypoint=['true'])
        self.assertEqual([n for n in self.fake.containers.items if '-oneshot-' in n and not self.fake.containers.items[n].removed], [])

    def test_failed_migration_draft_left_by_an_older_controller_is_only_discarded(self):
        self.apply('7')
        self.apply(DRAFT_KEY)
        state = self.m.state(DRAFT_KEY)
        state['migration_failed'] = True
        self.m.save(DRAFT_KEY, state)
        with self.assertRaises(BadRequest):
            self.apply(DRAFT_KEY)
        self.m.delete(DRAFT_KEY)
        self.assertIn('ccg-7-data', self.fake.volumes.items)

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

    def test_environment_changes_preserve_existing_runtime(self):
        self.apply('7')
        app = self.app('7')
        egress = self.fake.containers.get('ccg-7-egress')
        volume = self.fake.volumes.items['ccg-7-data']
        # An older Worker has no /admin/environment: the change stays pending.
        with patch('manager.requests.Session', EnvironmentSession.respond(404)):
            self.apply('7', revision='b' * 64, auth={'mode': 'oauth', 'locale': 'ja_JP.UTF-8', 'timezone': 'Asia/Tokyo'})
        self.assertEqual(len(EnvironmentSession.calls), 1)
        self.assertIs(self.app('7'), app)
        self.assertIs(self.fake.containers.get('ccg-7-egress'), egress)
        self.assertIs(self.fake.volumes.items['ccg-7-data'], volume)
        self.assertFalse(app.removed or egress.removed or volume.removed)
        self.assertTrue(self.m.public('7')['environment_pending'])
        self.assertEqual(self.m.state('7')['environment'], {'locale': '', 'timezone': ''})

    def test_environment_change_applied_in_place_by_worker(self):
        self.apply('7')
        app, boot = self.app('7'), self.app('7').attrs['State']['StartedAt']
        state = self.m.state('7')
        environment = {'locale': 'ja_JP.UTF-8', 'timezone': 'Asia/Tokyo'}
        with patch('manager.requests.Session', EnvironmentSession.respond(200)):
            self.apply('7', revision='b' * 64, auth={'mode': 'oauth', **environment})
        self.assertEqual(len(EnvironmentSession.calls), 1)
        method, url, body, headers = EnvironmentSession.calls[0]
        self.assertEqual((method, url), ('PUT', f'http://{state["app_ip"]}:{manager.ACCOUNT_PORT}/admin/environment'))
        self.assertEqual(body, environment)
        self.assertEqual(headers['Authorization'], 'Bearer ' + state['admin_key'])
        self.assertIs(self.app('7'), app)
        self.assertFalse(app.removed)
        self.assertEqual(app.attrs['State']['StartedAt'], boot)  # not even restarted
        self.assertFalse(self.m.public('7')['environment_pending'])
        saved = self.m.state('7')
        self.assertEqual(saved['environment'], environment)
        self.assertNotIn('environment_desired', saved)
        # Nothing changed: no further Worker call.
        with patch('manager.requests.Session', EnvironmentSession.respond(200)):
            self.apply('7', revision='b' * 64, auth={'mode': 'oauth', **environment})
        self.assertEqual(EnvironmentSession.calls, [])
        self.assertFalse(self.m.public('7')['environment_pending'])

    def test_environment_retried_after_worker_failure(self):
        self.apply('7')
        auth = {'mode': 'oauth', 'locale': 'de_DE.UTF-8', 'timezone': 'Europe/Berlin'}
        for failure in (EnvironmentSession.respond(405), EnvironmentSession.respond(500),
                        EnvironmentSession.respond(200, {'locale': 'other', 'timezone': 'Europe/Berlin'}),
                        EnvironmentSession.unreachable()):
            with patch('manager.requests.Session', failure):
                self.assertEqual(self.apply('7', revision='b' * 64, auth=auth)['status'], 'ready')
            self.assertTrue(self.m.public('7')['environment_pending'])
        # The Worker updated in place later: the next reconciliation applies it.
        with patch('manager.requests.Session', EnvironmentSession.respond(200)):
            self.apply('7', revision='b' * 64, auth=auth)
        self.assertFalse(self.m.public('7')['environment_pending'])

    def test_environment_set_at_creation_cannot_be_cleared_in_place(self):
        self.apply('7', auth={'mode': 'oauth', 'timezone': 'Asia/Tokyo'})
        self.assertFalse(self.m.public('7')['environment_pending'])
        # Empty means "the container's own value", which is Asia/Tokyo here.
        with patch('manager.requests.Session', EnvironmentSession.respond(200)):
            self.apply('7', revision='b' * 64, auth={'mode': 'oauth'})
        self.assertEqual(EnvironmentSession.calls, [])
        self.assertTrue(self.m.public('7')['environment_pending'])
        # Another timezone can still be applied in place.
        with patch('manager.requests.Session', EnvironmentSession.respond(200)):
            self.apply('7', revision='b' * 64, auth={'mode': 'oauth', 'timezone': 'Europe/Paris'})
        self.assertEqual(len(EnvironmentSession.calls), 1)
        self.assertFalse(self.m.public('7')['environment_pending'])

    def test_new_container_discards_in_place_environment(self):
        with patch.object(self.fake.containers, 'run') as run:
            self.apply('7')
        commands = [c.kwargs['command'][0] for c in run.call_args_list if 'command' in c.kwargs]
        self.assertTrue(any('rm -f /work/data/environment.json' in c and 'mkdir -p /work/config /work/data' in c for c in commands), commands)

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
        self.assertEqual(self.m.delete(DRAFT_KEY), {'deleted': True, 'removed': {
            'containers': sorted(names), 'networks': [f'ccg-{DRAFT_KEY}-net', f'ccg-{DRAFT_KEY}-uplink'], 'volume': True}})
        for n in names:
            self.assertNotIn(n, self.fake.containers.items)
        self.assertNotIn(f'ccg-{DRAFT_KEY}-net', self.fake.networks.items)
        self.assertNotIn(f'ccg-{DRAFT_KEY}-data', self.fake.volumes.items)
        self.assertFalse((Path(self.tmp) / DRAFT_KEY).exists())
        self.assertNotIn(DRAFT_KEY, self.m.online)
        self.assertEqual(self.m.public(DRAFT_KEY)['status'], 'pending')
        # Nothing left: still success. Other runtimes untouched.
        nothing = {'deleted': True, 'removed': {'containers': [], 'networks': [], 'volume': False}}
        self.assertEqual(self.m.delete(DRAFT_KEY), nothing)
        self.assertEqual(self.m.delete('d' + 'f' * 16), nothing)
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
        self.assertTrue(self.m.delete('5', account=True)['deleted'])
        self.assertNotIn('ccg-5-app', self.fake.containers.items)
        self.assertIn('ccg-5-data', self.fake.volumes.items)
        self.assertTrue((Path(self.tmp) / 'backups' / '5.json').exists())
        self.assertFalse((Path(self.tmp) / '5').exists())
        self.assertTrue(self.m.delete('5', account=True)['deleted'])

    def test_delete_refuses_foreign_resources(self):
        self.fake.containers.create('app:test', name=f'ccg-{DRAFT_KEY}-app', labels={LABEL: 'someone-else'})
        with self.assertRaises(ValueError):
            self.m.delete(DRAFT_KEY)
        self.assertIn(f'ccg-{DRAFT_KEY}-app', self.fake.containers.items)

    def rollback_copy(self, aid, prefix='ccg', tag='rollback-cli16x'):
        """What migrate-cli-16x.py leaves: the stopped original app container,
        renamed, with its label and the data volume still mounted."""
        app = self.fake.containers.create('app:test', name=f'{prefix}-{aid}-app-{tag}', labels={LABEL: aid},
                                          volumes={f'{prefix}-{aid}-data': {'bind': '/work', 'mode': 'rw'}})
        app.status = 'exited'
        return app

    def test_delete_purge_removes_suffixed_rollback_containers(self):
        self.apply('21')
        rollback = self.rollback_copy('21')
        result = self.m.delete('21', account=True, purge=True)
        self.assertEqual(result['removed'], {'containers': ['ccg-21-app', 'ccg-21-app-rollback-cli16x', 'ccg-21-egress'],
                                             'networks': ['ccg-21-net', 'ccg-21-uplink'], 'volume': True})
        self.assertTrue(rollback.removed)
        self.assertNotIn('ccg-21-data', self.fake.volumes.items)
        self.assertFalse((Path(self.tmp) / '21').exists())
        # Only the rollback copy and the volume left (the 30 incident): still completed.
        self.fake.volumes.create('ccg-30-data', labels={LABEL: '30'})
        self.rollback_copy('30')
        self.assertEqual(self.m.delete('30', account=True, purge=True)['removed'],
                         {'containers': ['ccg-30-app-rollback-cli16x'], 'networks': [], 'volume': True})
        self.assertNotIn('ccg-30-data', self.fake.volumes.items)

    def test_delete_refuses_foreign_container_on_the_volume_and_removes_nothing(self):
        self.apply('21')
        backup = Path(self.tmp) / 'backups'
        backup.mkdir()
        (backup / '21.json').write_text('{}')
        foreign = self.fake.containers.create('busybox', name='debug-shell',
                                              volumes={'ccg-21-data': {'bind': '/data', 'mode': 'ro'}})
        with self.assertRaises(manager.ResourceInUse) as raised:
            self.m.delete('21', account=True, purge=True)
        self.assertEqual(raised.exception.names, ['debug-shell'])
        for name in ('ccg-21-app', 'ccg-21-egress', 'debug-shell'):
            self.assertIn(name, self.fake.containers.items)
        self.assertIn('ccg-21-net', self.fake.networks.items)
        self.assertIn('ccg-21-data', self.fake.volumes.items)
        self.assertTrue((Path(self.tmp) / '21' / 'state.json').exists())
        self.assertTrue((backup / '21.json').exists())
        # A foreign endpoint on the account network blocks it as well.
        foreign.remove()
        self.fake.networks.get('ccg-21-uplink').connect(FakeContainer(self.fake, 'sidecar', 'busybox', {}))
        with self.assertRaises(manager.ResourceInUse):
            self.m.delete('21', account=True, purge=True)
        self.assertIn('ccg-21-app', self.fake.containers.items)

    def test_delete_removes_stale_helpers_but_not_a_running_one(self):
        self.apply('21')
        volumes = {'ccg-21-data': {'bind': '/work', 'mode': 'rw'}}
        running = self.fake.containers.create('app:test', name='ccg-oneshot-0123456789abcdef', volumes=volumes)
        running.start()
        with self.assertRaises(manager.ResourceInUse):
            self.m.delete('21', account=True, purge=True)
        running.status = 'created'  # what docker-py leaves behind when it cannot start
        removed = self.m.delete('21', account=True, purge=True)['removed']
        self.assertIn('ccg-oneshot-0123456789abcdef', removed['containers'])
        self.assertTrue(removed['volume'])

    def test_delete_never_touches_another_prefix_with_the_same_key(self):
        self.apply('21')
        other = self.rollback_copy('21', prefix='ccg-clean-x1')
        other_app = self.fake.containers.create('app:test', name='ccg-clean-x1-21-app', labels={LABEL: '21'})
        self.m.delete('21', account=True, purge=True)
        self.assertIn(other.name, self.fake.containers.items)
        self.assertIn(other_app.name, self.fake.containers.items)
        self.assertNotIn('ccg-21-app', self.fake.containers.items)

    def test_delete_without_purge_keeps_volume_and_backup(self):
        self.apply('21')
        rollback = self.rollback_copy('21')
        result = self.m.delete('21', account=True)
        self.assertTrue(rollback.removed)
        self.assertFalse(result['removed']['volume'])
        self.assertIn('ccg-21-data', self.fake.volumes.items)
        self.assertTrue((Path(self.tmp) / 'backups' / '21.json').exists())
        # Repeated: nothing left to remove, the backup and the volume stay.
        self.assertEqual(self.m.delete('21', account=True)['removed'], {'containers': [], 'networks': [], 'volume': False})
        self.assertIn('ccg-21-data', self.fake.volumes.items)
        self.assertTrue((Path(self.tmp) / 'backups' / '21.json').exists())

    def test_delete_failure_propagates_and_retry_completes(self):
        self.apply('21')
        rollback = self.rollback_copy('21')
        with patch.object(rollback, 'remove', side_effect=docker.errors.APIError('device busy')):
            with self.assertRaises(docker.errors.APIError):
                self.m.delete('21', account=True, purge=True)
        self.assertIn('ccg-21-data', self.fake.volumes.items)  # not reached
        self.assertTrue(self.m.delete('21', account=True, purge=True)['removed']['volume'])
        self.assertNotIn(rollback.name, self.fake.containers.items)

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


class EnvironmentSession:
    """requests.Session stand-in for the Worker's PUT /admin/environment."""
    calls = []

    @classmethod
    def respond(cls, status, view=None):
        cls.calls = []

        class Session(cls):
            def request(self, method, url, json=None, headers=None, **kwargs):
                cls.calls.append((method, url, json, dict(headers or {})))
                response = Mock(status_code=status)
                response.json.return_value = view if view is not None else dict(json or {}, effective={})
                return response
        return Session

    @classmethod
    def unreachable(cls):
        cls.calls = []

        class Session(cls):
            def request(self, method, url, **kwargs):
                cls.calls.append((method, url, kwargs.get('json'), kwargs.get('headers')))
                raise manager.requests.exceptions.ConnectTimeout('no route')
        return Session

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


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
        # Every failed request leaves one line on stderr naming the method,
        # key, path, exception and outcome (audit B1); never the body.
        with self.assertLogs('ccgateway.controller', level='WARNING') as logs:
            self.assertEqual(self.call('PUT', '/accounts/1/config', json.dumps({'revision': REV, 'proxy': {'protocol': 'http'}})),
                             (503, {'error': 'runtime_unavailable'}))
        self.assertEqual(len(logs.records), 1)
        line = logs.output[0]
        for part in ('PUT', 'key=1', 'path=config', '503 runtime_unavailable', 'APIError', 'daemon error'):
            self.assertIn(part, line)
        self.assertNotIn(REV, line, 'the body never reaches the log')
        self.assertIsNotNone(logs.records[0].exc_info, 'an unnamed failure keeps its traceback')
        self.fake.networks.create = type(self.fake.networks).create.__get__(self.fake.networks)
        # A failed proxy probe is named for the core (not runtime_unavailable).
        original = FakeContainer.exec_run
        FakeContainer.exec_run = lambda self, cmd: (1, b'') if cmd[0] == 'node' else (0, b'')
        try:
            with self.assertLogs('ccgateway.controller', level='WARNING') as logs:
                self.assertEqual(self.call('PUT', '/accounts/1/config', json.dumps({'revision': REV, 'proxy': {'protocol': 'http'}})),
                                 (503, {'error': 'proxy_check_failed'}))
            self.assertIn('503 proxy_check_failed: ActivationFailed: account proxy connectivity check failed', logs.output[0])
        finally:
            FakeContainer.exec_run = original

    def test_health(self):
        self.assertEqual(self.call('GET', '/health', key='wrong' * 8), (401, {'error': 'unauthorized'}))
        self.assertEqual(self.call('GET', '/health'),
                         (200, {'version': 'dev', 'app_image': 'app:test', 'egress_image': 'egress:test',
                                'controller_image': '', 'network_policy_version': 1,
                            'features': ['tunnel', 'uploads', 'runtime-images', 'self-upgrade', 'worker-update', 'runtime-pair-update-v1', 'shared-egress-v1', 'cli-profile-v1', 'runtime-cleanup-v1', 'account-disk-quota-v1', 'runtime-purge-v2'],
                            'disk_quota': {'default_bytes': 10 << 30, 'support': 'unknown'}}))

    def test_unsupported_disk_quota_has_a_specific_error(self):
        self.m.require_disk_quota = True
        with patch.object(self.fake.volumes, 'create', side_effect=docker.errors.APIError('quota size requested but no quota support')):
            self.assertEqual(self.call('PUT', '/accounts/1/config', json.dumps({'revision': REV, 'proxy': {'protocol': 'http'}})),
                             (503, {'error': 'disk_quota_unavailable'}))
        self.assertIsNone(self.app('1'))

    def test_explicit_account_delete_purges_data(self):
        self.apply('21')
        self.assertEqual(self.call('DELETE', '/accounts/21', headers={'X-CCG-Delete-Data': '1'})[0], 400)
        self.assertIn('ccg-21-data', self.fake.volumes.items)
        status, body = self.call('DELETE', '/accounts/21', headers={'X-CCG-Delete-Account': '21', 'X-CCG-Delete-Data': '1'})
        self.assertEqual((status, body['deleted'], body['removed']['volume']), (200, True, True))
        self.assertNotIn('ccg-21-data', self.fake.volumes.items)

    def test_delete_with_a_foreign_volume_user_is_a_conflict(self):
        self.apply('21')
        self.fake.containers.create('busybox', name='debug-shell', volumes={'ccg-21-data': {'bind': '/d', 'mode': 'ro'}})
        with self.assertLogs('ccgateway.controller', level='WARNING') as logs:
            self.assertEqual(self.call('DELETE', '/accounts/21', headers={'X-CCG-Delete-Account': '21', 'X-CCG-Delete-Data': '1'}),
                             (409, {'error': 'resource_in_use'}))
        self.assertIn('409 resource_in_use', logs.output[0])
        self.assertIn('debug-shell', logs.output[0])
        self.assertIn('ccg-21-app', self.fake.containers.items)
        self.assertIn('ccg-21-data', self.fake.volumes.items)

    def test_cleanup_http_requires_auth_and_complete_snapshot(self):
        self.apply('21')
        self.apply('22')
        self.assertEqual(self.call('GET', '/runtime/cleanup', key='wrong')[0], 401)
        code, inventory = self.call('GET', '/runtime/cleanup')
        self.assertEqual(code, 200)
        self.assertEqual(self.call('POST', '/runtime/cleanup', '{}')[0], 400)
        code, result = self.call('POST', '/runtime/cleanup', json.dumps({'keep_keys': ['21'], 'candidates': inventory['runtimes']}))
        self.assertEqual((code, result['deleted'], result['failed']), (200, 1, 0))
        self.assertIn('ccg-21-data', self.fake.volumes.items)
        self.assertNotIn('ccg-22-data', self.fake.volumes.items)

    def test_cleanup_accepts_inventory_larger_than_normal_management_body(self):
        candidates = [{'key': str(i), 'identity': 'a' * 64} for i in range(1000, 1800)]
        body = json.dumps({'keep_keys': [], 'candidates': candidates})
        self.assertGreater(len(body), 64 << 10)
        code, result = self.call('POST', '/runtime/cleanup', body)
        self.assertEqual((code, result['deleted'], result['failed']), (200, 0, 0))
        self.assertEqual(len(result['results']), 800)
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
            status, body = self.call('DELETE', f'/accounts/{DRAFT_KEY}')
            self.assertEqual((status, body['deleted']), (200, True))
        self.assertEqual([r['key'] for r in self.call('GET', '/accounts')[1]['runtimes']], ['9'])
        # An account runtime is deleted only when the header names it.
        self.assertEqual(self.call('DELETE', '/accounts/9', headers={'X-CCG-Delete-Account': '8'}), (405, {'error': 'method_not_allowed'}))
        status, body = self.call('DELETE', '/accounts/9', headers={'X-CCG-Delete-Account': '9'})
        self.assertEqual((status, body['deleted']), (200, True))
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
        self.assertEqual(self.call('POST', f'/accounts/{DRAFT_KEY}/admin/auth/refresh', '', headers={'X-CCG-Revision': REV})[0], 200)
        self.assertEqual(FakeSession.calls[-1][:2], ('POST', f'http://{state["app_ip"]}:8787/admin/auth/refresh'))
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
        # Reading the logs: POST only, the query in the body.
        for action in ('query', 'detail', 'read'):
            self.assertEqual(self.call('POST', f'{path}/{action}', '{}', headers={'X-CCG-Revision': REV})[0], 200)
            self.assertEqual(FakeSession.calls[-1][:2], ('POST', f'http://{state["app_ip"]}:8787/admin/request-logs/{action}'))
            calls = len(FakeSession.calls)
            for method in ('GET', 'PUT', 'DELETE'):
                self.assertEqual(self.call(method, f'{path}/{action}', '{}', headers={'X-CCG-Revision': REV})[0], 405)
            self.assertEqual(len(FakeSession.calls), calls)
        for other in (f'{path}/query?limit=1', f'{path}/files', f'{path}/read/x'):
            self.assertEqual(self.call('POST', other, '{}', headers={'X-CCG-Revision': REV})[0], 404, other)

    def test_request_log_read_reports_its_range(self):
        self.apply('7', auth={'mode': 'api_key', 'api_key': 'sk-test-key-123'})

        class Chunk(FakeResponse):
            headers = {'Content-Type': 'application/octet-stream', 'X-Log-File-Size': '9', 'X-Log-Offset': '2', 'X-Log-Length': '3',
                       'X-Content-Type-Options': 'nosniff', 'X-Other': 'dropped'}

            def iter_content(self, chunk_size):
                yield b'abc'

        class Session(FakeSession):
            def request(self, method, url, data=None, headers=None, **kwargs):
                FakeSession.calls.append((method, url, dict(headers or {})))
                return Chunk()

        with patch.object(manager.requests, 'Session', Session):
            conn = http.client.HTTPConnection('127.0.0.1', self.server.server_address[1], timeout=10)
            try:
                conn.request('POST', '/accounts/7/admin/request-logs/read', body=b'{}',
                             headers={'Authorization': 'Bearer ' + CONTROLLER_KEY, 'X-CCG-Revision': REV})
                res = conn.getresponse()
                self.assertEqual((res.status, res.read()), (200, b'abc'))
                self.assertEqual([res.getheader(h) for h in ('X-Log-File-Size', 'X-Log-Offset', 'X-Log-Length', 'X-Content-Type-Options', 'X-Other')],
                                 ['9', '2', '3', 'nosniff', None])
                self.assertEqual(res.getheader('Content-Type'), 'application/octet-stream')
            finally:
                conn.close()

    def test_features_read_only_pass_through(self):
        self.apply('7', auth={'mode': 'api_key', 'api_key': 'sk-test-key-123'})
        state = self.m.state('7')
        path = '/accounts/7/admin/features'
        self.assertEqual(self.call('GET', path)[0], 409)
        self.assertEqual(self.call('GET', path, headers={'X-CCG-Revision': REV})[0], 200)
        actual, url, headers = FakeSession.calls[-1]
        self.assertEqual((actual, url), ('GET', f'http://{state["app_ip"]}:8787/admin/features'))
        self.assertEqual(headers['Authorization'], 'Bearer ' + state['admin_key'])
        calls = len(FakeSession.calls)
        for method in ('POST', 'PUT', 'DELETE'):
            self.assertEqual(self.call(method, path, '{}', headers={'X-CCG-Revision': REV})[0], 405)
        self.assertEqual(len(FakeSession.calls), calls)

    def test_cli_management_is_a_plain_pass_through(self):
        # The controller no longer installs an official CLI: every /admin/cli
        # call, an old core's {"action":"update"} included, is the Worker's.
        self.apply('7', auth={'mode': 'api_key', 'api_key': 'sk-test-key-123'})
        state = self.m.state('7')
        path = '/accounts/7/admin/cli'
        self.assertEqual(self.call('GET', path)[0], 409)
        for method, body in (('GET', None), ('POST', '{"action":"check"}'), ('POST', '{"action":"sync"}'),
                             ('POST', '{"action":"update"}'), ('PUT', '{"auto_update":false}')):
            self.assertEqual(self.call(method, path, body, headers={'X-CCG-Revision': REV})[0], 200)
            actual, url, headers = FakeSession.calls[-1]
            self.assertEqual((actual, url), (method, f'http://{state["app_ip"]}:8787/admin/cli'))
            self.assertEqual(headers, {'Authorization': 'Bearer ' + state['admin_key'], 'Content-Type': 'application/json'})
        calls = len(FakeSession.calls)
        self.assertEqual(self.call('DELETE', path, headers={'X-CCG-Revision': REV})[0], 405)
        self.assertEqual(self.call('GET', path + '/catalog', headers={'X-CCG-Revision': REV}), (404, {'error': 'not_found'}))
        self.assertEqual(len(FakeSession.calls), calls)
        self.assertFalse(hasattr(self.m, 'cli_updates'))

    def test_pass_through_never_forwards_caller_headers(self):
        self.apply('7')
        state = self.m.state('7')
        self.call('GET', '/accounts/7/admin/status', headers={
            'X-CCG-Revision': REV, 'Anthropic-Beta': 'a', 'X-CCGateway-Request-Policy': '{}', 'X-Api-Key': 'caller'})
        self.assertEqual(FakeSession.calls[-1][2], {'Authorization': 'Bearer ' + state['admin_key'], 'Content-Type': 'application/json'})

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
    def test_request_path_never_waits_unbounded_for_the_account_lock(self):
        self.apply('21')
        held, release = threading.Event(), threading.Event()

        def hold():
            with self.m.guard('21'):
                held.set()
                release.wait(5)
        threading.Thread(target=hold, daemon=True).start()
        held.wait(5)
        try:
            with patch.object(manager, 'REQUEST_LOCK_WAIT', 0.05):
                with self.assertRaises(manager.RuntimeBusy):
                    self.m.connection('21', REV)
        finally:
            release.set()
        self.assertEqual(self.m.connection('21', REV)['revision'], REV)

    def test_connection_reads_readiness_without_image_lookups(self):
        self.apply('21')
        with patch.object(self.m, 'app_image_id', side_effect=AssertionError('image lookup on the request path')):
            self.assertEqual(self.m.connection('21', REV)['revision'], REV)


class ProxyRecheckTests(Base):
    def resolve(self, *addresses):
        return patch('manager.socket.getaddrinfo', return_value=[(2, 1, 6, '', (a, 3128)) for a in addresses])

    def ready_with_host(self):
        with patch('manager.configuration', return_value=({'outbounds': [{'server': '198.51.100.7'}]}, 'table inet x {}\n')):
            self.m.apply('21', {'revision': REV, 'proxy': {'protocol': 'http', 'host': 'proxy.example.test', 'port': 3128}})
        self.assertEqual(self.m.public('21')['status'], 'ready')

    def test_moved_proxy_host_makes_the_runtime_pending(self):
        self.ready_with_host()
        with self.resolve('198.51.100.7', '198.51.100.8'):
            self.m.recheck_proxies()  # round-robin that still includes the pinned address
        self.assertEqual(self.m.public('21')['status'], 'ready')
        with patch('manager.socket.getaddrinfo', side_effect=OSError('no DNS')):
            self.m.recheck_proxies()  # a failed lookup is no evidence
        self.assertEqual(self.m.public('21')['status'], 'ready')
        with self.resolve('198.51.100.9'), self.assertLogs('ccgateway.controller', level='WARNING'):
            self.m.recheck_proxies()
        self.assertEqual(self.m.public('21')['status'], 'pending')

    def test_new_resolution_rebuilds_the_egress_at_the_same_revision(self):
        self.ready_with_host()
        egress = self.fake.containers.get('ccg-21-egress')
        self.m.drop_readiness('21')
        with patch('manager.configuration', return_value=({'outbounds': [{'server': '198.51.100.9'}]}, 'table inet x {}\n')):
            self.m.apply('21', {'revision': REV, 'proxy': {'protocol': 'http', 'host': 'proxy.example.test', 'port': 3128}})
        self.assertTrue(egress.removed)
        self.assertIsNot(self.fake.containers.get('ccg-21-egress'), egress)
        self.assertEqual(self.m.public('21')['status'], 'ready')

    def test_address_literal_and_direct_are_never_rechecked(self):
        self.m.apply('21', {'revision': REV, 'proxy': {'protocol': 'http', 'host': '198.51.100.7', 'port': 3128}})
        self.m.apply('22', {'revision': REV, 'proxy': None, 'direct': True})
        with patch('manager.socket.getaddrinfo', side_effect=AssertionError('resolved')):
            self.m.recheck_proxies()
        self.assertEqual(self.m.public('21')['status'], 'ready')


class EnvironmentValidationTests(unittest.TestCase):
    def test_locale_and_timezone_shapes(self):
        for locale in ('ja_JP.UTF-8', 'en_US.UTF-8', 'zh_CN', 'C', 'C.UTF-8', 'POSIX', 'sr_RS.UTF-8@latin', ''):
            self.assertEqual(manager.authentication({'mode': 'oauth', 'locale': locale}).get('locale', ''), locale)
        for timezone in ('Asia/Tokyo', 'UTC', 'Etc/GMT+5', 'America/Argentina/Buenos_Aires', ''):
            self.assertEqual(manager.authentication({'mode': 'oauth', 'timezone': timezone}).get('timezone', ''), timezone)
        for bad in ({'locale': 'en_US.UTF-8; rm -rf /'}, {'locale': 'x' * 65}, {'locale': 7}, {'locale': '../x'},
                    {'timezone': '../../etc/passwd'}, {'timezone': 'Asia/Tokyo\n'}, {'timezone': 'Local'},
                    {'timezone': '/Asia/Tokyo'}, {'timezone': None}):
            for mode in ({'mode': 'oauth'}, {'mode': 'api_key', 'api_key': 'sk-test-key-123'}):
                with self.assertRaises(BadRequest, msg=(bad, mode)):
                    manager.authentication({**mode, **bad})


class ConnectionStateTests(Base):
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
