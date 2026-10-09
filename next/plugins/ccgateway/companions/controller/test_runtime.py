"""Target images /runtime/images and self-upgrade POST /runtime/controller (CONTRACTS §53.5).

    python -m unittest -v test_runtime
"""
import json
import os
from pathlib import Path
import unittest
from unittest.mock import MagicMock, patch

from test_manager import FakeContainer
from test_uploads import ServerBase

APP2 = 'ghcr.io/sub2api-devs/ccgateway-app@sha256:' + 'b' * 64
CTL2 = 'ghcr.io/sub2api-devs/ccgateway-controller:v2'


class RuntimeImageTests(ServerBase):
    def test_get_and_put_persist_across_restart(self):
        self.assertEqual(self.call('GET', '/runtime/images'),
                         (200, {'app': 'app:test', 'egress': 'egress:test', 'controller': ''}))
        self.fake.images.registry = {APP2: 'sha256:id-b'}
        self.m.app_image_id()
        self.assertEqual(self.m.image_seen[1], 'sha256:app1')
        status, health = self.call('PUT', '/runtime/images', {'app': APP2})
        self.assertEqual(status, 200, health)
        self.assertEqual((health['app_image'], health['egress_image']), (APP2, 'egress:test'))
        self.assertIn('runtime-images', health['features'])
        self.assertEqual(self.fake.images.pulls, [APP2])
        self.assertEqual(self.m.image_seen, (0.0, ''))  # target id cache dropped
        saved = Path(self.tmp) / 'runtime.json'
        self.assertEqual(json.loads(saved.read_text()), {'app': APP2, 'egress': 'egress:test',
                                                         'env': {'app': 'app:test', 'egress': 'egress:test'}})
        # A restarted controller with the same environment keeps the selected targets.
        self.restart('app:test', 'egress:test')
        self.assertEqual((self.m.app_image, self.m.egress_image), (APP2, 'egress:test'))
        self.assertTrue(saved.exists())
        # New runtimes use the new target.
        self.apply('9')
        self.assertEqual(self.app('9').attrs['Image'], 'sha256:id-b')

    def restart(self, app, egress):
        self.m.lockfile.close()
        self.m = self.make(app, egress)
        self.server.manager = self.m

    def test_changed_environment_discards_override(self):
        self.fake.images.registry = {APP2: 'sha256:id-b'}
        self.assertEqual(self.call('PUT', '/runtime/images', {'app': APP2})[0], 200)
        saved = Path(self.tmp) / 'runtime.json'
        # An SSH (re)install rewrote the environment file: it wins, the stale file goes.
        for app, egress in (('app:new', 'egress:test'), ('app:test', 'egress:new')):
            self.assertEqual(self.call('PUT', '/runtime/images', {'app': APP2})[0], 200)
            self.restart(app, egress)
            self.assertEqual((self.m.app_image, self.m.egress_image), (app, egress))
            self.assertFalse(saved.exists())
            # Idempotent: a further restart changes nothing.
            self.restart(app, egress)
            self.assertEqual((self.m.app_image, self.m.egress_image), (app, egress))
            self.restart('app:test', 'egress:test')

    def test_empty_put_writes_nothing(self):
        status, health = self.call('PUT', '/runtime/images', {})
        self.assertEqual(status, 200)
        self.assertEqual((health['app_image'], health['egress_image']), ('app:test', 'egress:test'))
        self.assertFalse((Path(self.tmp) / 'runtime.json').exists())
        self.assertEqual(self.fake.images.pulls, [])

    def test_put_both_and_local_image_id(self):
        image_id = 'sha256:' + 'c' * 64
        self.fake.images.tags['local/egress:dev'] = image_id
        status, health = self.call('PUT', '/runtime/images', {'app': 'app:test', 'egress': image_id})
        self.assertEqual(status, 200, health)
        self.assertEqual((health['app_image'], health['egress_image']), ('app:test', image_id))
        self.assertEqual(self.fake.images.pulls, [])

    def test_rejections_leave_targets_unchanged(self):
        for body in ({'app': 'App:Bad'}, {'app': ''}, {'app': 'x y'}, {'controller': CTL2}, {'app': 5}, [], 'x'):
            self.assertEqual(self.call('PUT', '/runtime/images', body), (400, {'error': 'invalid_request'}), body)
        self.fake.images.env = ['HTTPS_PROXY=http://proxy']
        self.assertEqual(self.call('PUT', '/runtime/images', {'app': 'app:test'}), (400, {'error': 'invalid_image'}))
        self.fake.images.env = []
        self.assertEqual(self.call('PUT', '/runtime/images', {'egress': 'missing:tag'}), (503, {'error': 'image_pull_failed'}))
        self.assertEqual(self.call('PUT', '/runtime/images', {'app': APP2, 'egress': 'egress:test'}),
                         (503, {'error': 'image_pull_failed'}))
        self.assertEqual((self.m.app_image, self.m.egress_image), ('app:test', 'egress:test'))
        self.assertFalse((Path(self.tmp) / 'runtime.json').exists())
        self.assertEqual(self.call('POST', '/runtime/images', {}), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(self.call('GET', '/runtime/images', key='x' * 32), (401, {'error': 'unauthorized'}))

    def test_old_format_or_invalid_files_are_discarded(self):
        saved = Path(self.tmp) / 'runtime.json'
        env = {'app': 'app:test', 'egress': 'egress:test'}
        for content in (json.dumps({'app': APP2, 'egress': 'egress:new'}),  # before env was recorded
                        json.dumps({'app': 'Bad Ref', 'egress': 'egress:new', 'env': env}),
                        json.dumps({'app': APP2, 'env': env}),
                        json.dumps([1]), 'not json'):
            saved.write_text(content)
            self.m.lockfile.close()
            self.m = self.make('app:test', 'egress:test')
            self.assertEqual((self.m.app_image, self.m.egress_image), ('app:test', 'egress:test'), content)
            self.assertFalse(saved.exists(), content)


class ControllerUpgradeTests(ServerBase):
    def setUp(self):
        super().setUp()
        self.fake.images.tags[CTL2] = 'sha256:ctl2'
        self.run = MagicMock()
        self.fake.containers.run = self.run

    def test_starts_helper_from_new_image_and_returns_202(self):
        self.assertEqual(self.call('POST', '/runtime/controller', {'image': CTL2}), (202, {'accepted': True}))
        self.run.assert_called_once()
        args, kwargs = self.run.call_args
        self.assertEqual(args, (CTL2, ['python', 'upgrade.py', CTL2]))
        self.assertEqual(kwargs['name'], 'ccg-controller-upgrade')
        self.assertTrue(kwargs['remove'] and kwargs['detach'])
        self.assertEqual(kwargs['network_mode'], 'host')
        self.assertEqual(kwargs['environment'], {'CCG_RUNTIME_ENV_FILE': '/opt/ccgateway-runtime.env',
                                                 'CCG_CONTROLLER_NAME': 'ccg-controller', 'CCG_CONTROLLER_PORT': '8787'})
        self.assertEqual(kwargs['volumes'], {'/var/run/docker.sock': {'bind': '/var/run/docker.sock', 'mode': 'rw'},
                                             '/opt': {'bind': '/opt', 'mode': 'rw'}})

    def test_custom_name_port_and_env_file(self):
        os.environ.update(CCG_CONTROLLER_NAME='ccg-e2e', CCG_CONTROLLER_PORT='9797',
                          CCG_RUNTIME_ENV_FILE='/srv/ccg-e2e/runtime.env')
        self.m.lockfile.close()
        self.m = self.make('app:test', 'egress:test')
        self.server.manager = self.m
        # The production controller's helper does not block a test instance.
        self.fake.containers.items['ccg-controller-upgrade'] = FakeContainer(self.fake, 'ccg-controller-upgrade', CTL2, {})
        self.fake.containers.items['ccg-controller-upgrade'].start()
        self.assertEqual(self.call('POST', '/runtime/controller', {'image': CTL2}), (202, {'accepted': True}))
        kwargs = self.run.call_args.kwargs
        self.assertEqual(kwargs['name'], 'ccg-e2e-upgrade')
        self.assertEqual(kwargs['environment'], {'CCG_RUNTIME_ENV_FILE': '/srv/ccg-e2e/runtime.env',
                                                 'CCG_CONTROLLER_NAME': 'ccg-e2e', 'CCG_CONTROLLER_PORT': '9797'})
        # The env file's directory is mounted at its host path, so the path the
        # helper writes (and hands on to the new controller) is valid on the host.
        self.assertEqual(kwargs['volumes']['/srv/ccg-e2e'], {'bind': '/srv/ccg-e2e', 'mode': 'rw'})
        self.assertTrue(kwargs['environment']['CCG_RUNTIME_ENV_FILE'].startswith(
            kwargs['volumes']['/srv/ccg-e2e']['bind'] + '/'))
        self.assertEqual(self.fake.containers.items['ccg-controller-upgrade'].status, 'running')

    def test_invalid_controller_name_refuses_to_start(self):
        for name in ('CCG', '1ccg', 'ccg_ctl', 'c' * 42):
            os.environ['CCG_CONTROLLER_NAME'] = name
            with self.assertRaises(ValueError, msg=name):
                self.make('app:test', 'egress:test')

    def test_running_helper_conflicts_and_finished_one_is_replaced(self):
        helper = FakeContainer(self.fake, 'ccg-controller-upgrade', CTL2, {})
        self.fake.containers.items[helper.name] = helper
        helper.start()
        self.assertEqual(self.call('POST', '/runtime/controller', {'image': CTL2}), (409, {'error': 'upgrade_in_progress'}))
        self.run.assert_not_called()
        helper.stop()
        self.assertEqual(self.call('POST', '/runtime/controller', {'image': CTL2})[0], 202)
        self.assertTrue(helper.removed)

    def test_rejections(self):
        for body in ({'image': 'Bad'}, {'image': CTL2, 'x': 1}, {}, {'image': None}):
            self.assertEqual(self.call('POST', '/runtime/controller', body), (400, {'error': 'invalid_request'}), body)
        self.assertEqual(self.call('POST', '/runtime/controller', {'image': 'missing:tag'}), (503, {'error': 'image_pull_failed'}))
        self.assertEqual(self.call('GET', '/runtime/controller'), (405, {'error': 'method_not_allowed'}))
        self.run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
