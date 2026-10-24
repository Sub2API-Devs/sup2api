"""Isolated transaction tests; no Docker, model calls or host services."""
import contextlib
import hashlib
import json
import types
import unittest
from unittest.mock import patch

import runtime_updates as ru

PRIOR = json.dumps({'schema_version':1,'manifest':'manifest.json','version':'2.1.302','request_mode':'build'}).encode()


def digest(data):
    return hashlib.sha256(data).hexdigest()


class Container:
    status = 'running'
    id = 'unchanged-account-container'

    def __init__(self):
        self.files = {'/usr/local/bin/worker': b'old worker', ru.ACTIVE: PRIOR}
        self.restart_count = 0
        self.info_ok = True
        self.execs = []

    def exec_run(self, args, **_):
        self.execs.append(list(args))
        if args[:3] == ['node', '-e', ru.INFO_SCRIPT] and not self.info_ok:
            return 1, b'unsupported CLI'
        return 0, b''


class Manager:
    def __init__(self):
        self.container = Container()
        self.online = {'21': 'revision'}
        self.state_value = {'revision': 'revision', 'app_ip': '127.0.0.1', 'admin_key': 'secret'}
        self.health = [True]
        self.idle = True
        self.backups = []

    def guard(self, aid):
        return contextlib.nullcontext()

    def running_worker(self, aid):
        c = self.container
        return types.SimpleNamespace(container=c, identity=c.id, target='/usr/local/bin/worker', base='worker',
                                     previous=digest(c.files['/usr/local/bin/worker']))

    def same_container(self, aid, identity):
        if identity != self.container.id:
            raise RuntimeError('container changed')
        return self.container

    def state(self, aid):
        return json.loads(json.dumps(self.state_value))

    def save(self, aid, state):
        self.state_value = json.loads(json.dumps(state))

    def go_offline(self, aid):
        return self.online.pop(aid, None)

    def online_at(self, aid, revision):
        return bool(revision) and self.online.get(aid) == revision

    def backup_worker(self, aid, c, path, _):
        self.backups.append(c.files[path])
        return c.files[path]

    def wait_idle(self, *_):
        return self.container if self.idle else None

    def restore_worker(self, aid, identity, target, data, sha):
        assert digest(data) == sha
        self.same_container(aid, identity).files[target] = data

    def restart_healthy(self, aid, identity):
        self.same_container(aid, identity).restart_count += 1
        return self.health.pop(0)

    def reactivate(self, aid, identity, revision):
        self.same_container(aid, identity)
        self.online[aid] = revision
        return True


class RuntimePairTests(unittest.TestCase):
    def setUp(self):
        self.m = Manager()
        self.update = ru.RuntimeUpdates(self.m)
        self.entry = {'path': '2.1.304/claude', 'sha256': digest(b'\x7fELFcli'),
                      'patch': 'ccgateway-v12-feature-policy', 'modes': ['direct', 'build']}
        self.args = {'image': 'trusted:release', 'components': ['worker', 'cli'], 'cli_version': '2.1.304'}
        self.swaps = []
        # runtime_updates imports these from common/dockerfs; the fake
        # container keeps plain files.
        docker = types.SimpleNamespace(errors=types.SimpleNamespace(NotFound=KeyError))

        def stage(c, target, data, sha):
            assert digest(data) == sha
            c.files[target + '.next'] = data
            return target + '.next'

        def swap(c, staged, target):
            self.swaps.append(target)
            c.files[target] = c.files.pop(staged)

        def write_file(c, path, raw):
            c.files[path] = raw
        self.patches = [
            patch.multiple('runtime_updates', check=lambda x: None,
                           valid_image=lambda x: isinstance(x, str) and ':' in x, worker_idle=lambda *_: True,
                           read_file=lambda c, path, *_: c.files[path], write_file=write_file,
                           stage=stage, swap=swap, discard=lambda c, path: c.files.pop(path, None), docker=docker),
            patch.object(self.update, 'package', return_value=(b'new worker', b'\x7fELFcli', self.entry)),
            patch.object(self.update, 'healthy', return_value=True),
            patch('runtime_updates.maintenance', return_value={'lease': 'a' * 48, 'active_requests': 0, 'paused': True}),
        ]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def test_pair_switch_retains_container_and_old_cli(self):
        original = self.m.container
        result = self.update.update('21', self.args)
        self.assertEqual(result['status'], 'updated')
        self.assertIs(self.m.container, original)
        self.assertEqual(original.restart_count, 1)
        self.assertEqual(original.files['/usr/local/bin/worker'], b'new worker')
        pointer = json.loads(original.files[ru.ACTIVE])
        self.assertEqual(pointer['version'], '2.1.304')
        self.assertEqual(self.m.state_value['active_runtime']['container_id'], original.id)
        self.assertEqual(self.swaps, [ru.ACTIVE, '/usr/local/bin/worker', ru.ACTIVE])
        self.assertNotIn('maintenance_lease', pointer)
        self.assertEqual(self.m.backups, [b'old worker'])

    def test_unhealthy_pair_rolls_back_both_files_and_state(self):
        self.m.health = [False, True]
        result = self.update.update('21', self.args)
        self.assertEqual(result['status'], 'rolled_back')
        self.assertEqual(self.m.container.files[ru.ACTIVE], PRIOR)
        self.assertEqual(self.m.container.files['/usr/local/bin/worker'], b'old worker')
        self.assertNotIn('active_runtime', self.m.state_value)
        self.assertEqual(self.m.container.restart_count, 2)
        self.assertTrue(result['online'])

    def test_failed_identity_health_rolls_back_pair(self):
        self.m.health = [True, True]
        self.update.healthy.return_value = False
        result = self.update.update('21', self.args)
        self.assertEqual(result['status'], 'rolled_back')
        self.assertEqual(self.m.container.files[ru.ACTIVE], PRIOR)

    def test_busy_does_not_swap_or_restart(self):
        self.m.idle = False
        result = self.update.update('21', self.args)
        self.assertEqual(result, {'status': 'busy'})
        self.assertEqual(self.swaps, [])
        self.assertEqual(self.m.container.restart_count, 0)
        # Retried busy answers must not rotate older program backups out (P15).
        self.assertEqual(self.m.backups, [])

    def test_staged_cli_is_checked_for_the_required_capabilities(self):
        self.update.update('21', self.args)
        [info] = [args for args in self.m.container.execs if args[:3] == ['node', '-e', ru.INFO_SCRIPT]]
        self.assertEqual(json.loads(info[-1]), list(ru.REQUIRED))

    def test_cli_verification_failure_leaves_current_pair(self):
        self.m.container.info_ok = False
        with self.assertRaisesRegex(RuntimeError, 'staged CLI'):
            self.update.update('21', self.args)
        self.assertEqual(self.m.container.files[ru.ACTIVE], PRIOR)
        self.assertEqual(self.m.container.files['/usr/local/bin/worker'], b'old worker')
        self.assertEqual(self.m.container.restart_count, 0)

    def test_input_cannot_choose_paths_or_partial_components(self):
        for value in ({**self.args, 'path': '/tmp/worker'},
                      {**self.args, 'components': ['cli']},
                      {**self.args, 'cli_version': 304}):
            with self.assertRaises(ValueError):
                self.update.update('21', value)
        self.update.package.assert_not_called()

    def test_reactivation_failure_after_resume_never_rolls_back_or_restarts(self):
        with patch.object(self.m,'reactivate',side_effect=RuntimeError('container changed after resume')):
            result=self.update.update('21',self.args)
        self.assertEqual(result['status'],'updated')
        self.assertFalse(result['online'])
        self.assertEqual(self.m.container.restart_count,1)
        self.assertEqual(self.m.container.files['/usr/local/bin/worker'],b'new worker')
        self.assertEqual(json.loads(self.m.container.files[ru.ACTIVE])['version'],'2.1.304')

    def test_incomplete_rollback_does_not_resume_mixed_pair(self):
        self.m.health=[False]
        with patch.object(self.m,'restore_worker',side_effect=RuntimeError('disk unavailable')):
            with self.assertRaisesRegex(RuntimeError,'disk unavailable'):
                self.update.update('21',self.args)
        self.assertFalse(any(call.args[1]=='resume' for call in ru.maintenance.call_args_list))
        self.assertNotIn('21',self.m.online)
        self.assertIn('maintenance_lease',json.loads(self.m.container.files[ru.ACTIVE]))

    def test_rollback_stays_paused_across_restart_until_health_is_confirmed(self):
        self.m.health=[False,True]
        original=self.m.restart_healthy
        def restart(*args):
            self.assertIn('maintenance_lease',json.loads(self.m.container.files[ru.ACTIVE]))
            self.assertFalse(any(call.args[1]=='resume' for call in ru.maintenance.call_args_list))
            return original(*args)
        with patch.object(self.m,'restart_healthy',side_effect=restart):
            result=self.update.update('21',self.args)
        self.assertEqual(result['status'],'rolled_back')
        self.assertEqual(self.m.container.files[ru.ACTIVE],PRIOR)

    def test_unhealthy_rollback_stays_paused(self):
        self.m.health=[False,False]
        result=self.update.update('21',self.args)
        self.assertEqual(result['reason'],'rollback_unhealthy')
        self.assertFalse(result['online'])
        self.assertFalse(any(call.args[1]=='resume' for call in ru.maintenance.call_args_list))
        self.assertIn('maintenance_lease',json.loads(self.m.container.files[ru.ACTIVE]))

    def test_native_legacy_without_manifest_gets_sealed_rollback_snapshot(self):
        c=self.m.container
        c.files.pop(ru.ACTIVE)
        c.attrs={'Config':{'Env':['CCG_REQUEST_MODE=native']}}
        legacy={'version':'2.1.302','path':'2.1.302/claude','sha256':'b'*64,
                'patch':'ccgateway-v11-native-build-parameters','modes':['direct','build']}
        with patch.object(c,'exec_run',return_value=(0,json.dumps(legacy).encode())):
            prior=json.loads(self.update.prior_selection(c))
        self.assertEqual(prior['version'],'2.1.302')
        self.assertEqual(prior['request_mode'],'build')
        self.assertTrue(prior['maintenance_only'])
        snapshot=json.loads(c.files[ru.ROOT+'/'+prior['manifest']])
        self.assertEqual(snapshot['versions']['2.1.302']['sha256'],'b'*64)
        self.assertNotIn(ru.ACTIVE,c.files)
        self.assertEqual(c.files['/usr/local/bin/worker'],b'old worker')

    def test_legacy_without_observed_request_modes_is_not_assumed_migratable(self):
        c=self.m.container
        c.files.pop(ru.ACTIVE)
        c.attrs={'Config':{'Env':['CCG_REQUEST_MODE=native']}}
        legacy={'version':'2.1.302','path':'2.1.302/claude','sha256':'b'*64,
                'patch':'ccgateway-native-only','modes':[]}
        with patch.object(c,'exec_run',return_value=(0,json.dumps(legacy).encode())):
            with self.assertRaisesRegex(ValueError,'runtime identity'):
                self.update.prior_selection(c)
        self.assertNotIn(ru.ACTIVE,c.files)
        self.assertEqual(c.files['/usr/local/bin/worker'],b'old worker')


class ReleaseIdentityTests(unittest.TestCase):
    def test_rejects_escape_or_unverified_entry(self):
        base = {'path': '2.1.304/claude', 'patch': 'ccgateway-v12-feature-policy',
                'sha256': 'a' * 64, 'modes': ['direct', 'build']}
        self.assertEqual(ru.release_entry({'versions': {'2.1.304': base}}, '2.1.304'), base)
        for field, value in [('path', '../claude'), ('path', '/tmp/claude'), ('path', 'x\\claude'),
                             ('patch', 'official'), ('sha256', 'a' * 63), ('modes', ['build'])]:
            with self.assertRaises(ValueError):
                ru.release_entry({'versions': {'2.1.304': {**base, field: value}}}, '2.1.304')


if __name__ == '__main__':
    unittest.main()
