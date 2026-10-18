import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

from test_manager import Base, LABEL, DRAFT_KEY, OTHER_DRAFT
from manager import BadRequest


class CleanupTests(Base):
    def setUp(self):
        super().setUp()
        self.fake.containers.list = lambda **kwargs: list(self.fake.containers.items.values())
        self.fake.volumes.list = lambda **kwargs: list(self.fake.volumes.items.values())

    def inventory(self):
        return self.m.cleanup_inventory()['runtimes']

    def cleanup(self, keep, candidates=None):
        return self.m.cleanup_runtimes({'keep_keys': keep, 'candidates': self.inventory() if candidates is None else candidates})

    def test_account_purge_removes_containers_networks_volume_and_state(self):
        self.apply('21')
        backup = self.m.root / 'backups'
        backup.mkdir()
        (backup / '21.json').write_text('{}')
        self.m.delete('21', account=True, purge=True)
        for role in ['app', 'egress']:
            self.assertNotIn('ccg-21-' + role, self.fake.containers.items)
        for role in ['net', 'uplink']:
            self.assertNotIn('ccg-21-' + role, self.fake.networks.items)
        self.assertNotIn('ccg-21-data', self.fake.volumes.items)
        self.assertFalse(self.m.dir('21').exists())
        self.assertFalse((backup / '21.json').exists())
        self.assertEqual(self.m.delete('21', account=True, purge=True), {'deleted': True})

    def test_disabled_account_and_authorization_preparation_are_kept(self):
        for key in ['21', '22', DRAFT_KEY, OTHER_DRAFT]:
            self.apply(key)
        self.m.block('22')
        result = self.cleanup(['21', '22', DRAFT_KEY])
        self.assertEqual(result['deleted'], 1)
        self.assertEqual(result['failed'], 0)
        self.assertIn('ccg-22-data', self.fake.volumes.items)
        self.assertIn('ccg-' + DRAFT_KEY + '-app', self.fake.containers.items)
        self.assertNotIn('ccg-' + OTHER_DRAFT + '-data', self.fake.volumes.items)

    def test_missing_state_still_finds_owned_resources(self):
        self.fake.volumes.create('ccg-21-data', labels={LABEL: '21'})
        self.fake.volumes.create('unrelated-data', labels={LABEL: '22'})
        self.assertEqual(self.cleanup([])['deleted'], 1)
        self.assertIn('unrelated-data', self.fake.volumes.items)
        self.assertNotIn('ccg-21-data', self.fake.volumes.items)

    def test_changed_runtime_and_new_runtime_are_not_deleted(self):
        self.apply('21')
        snapshot = self.inventory()
        self.app('21').start()  # StartedAt changes after inventory.
        self.apply('22')
        result = self.cleanup([], snapshot)
        self.assertEqual(result['results'][0]['status'], 'changed')
        self.assertEqual(result['deleted'], 0)
        self.assertIn('ccg-21-app', self.fake.containers.items)
        self.assertIn('ccg-22-app', self.fake.containers.items)

    def test_foreign_resource_is_checked_before_any_deletion(self):
        self.apply('21')
        snapshot = self.inventory()
        self.fake.volumes.items['ccg-21-data'].attrs['Labels'][LABEL] = '22'
        result = self.cleanup([], snapshot)
        self.assertEqual(result['failed'], 1)
        self.assertIn('ccg-21-app', self.fake.containers.items)
        self.assertIn('ccg-21-egress', self.fake.containers.items)
        self.assertIn('ccg-21-net', self.fake.networks.items)

    def test_invalid_or_incomplete_request_does_not_delete(self):
        self.apply('21')
        for body in [{}, {'keep_keys': []}, {'keep_keys': None, 'candidates': []},
                     {'keep_keys': ['../21'], 'candidates': []},
                     {'keep_keys': [], 'candidates': [{'key': '21', 'identity': 'invalid'}]}]:
            with self.assertRaises(BadRequest):
                self.m.cleanup_runtimes(body)
        self.assertIn('ccg-21-app', self.fake.containers.items)

    def test_shared_gateway_binding_detached_without_removing_gateway(self):
        self.apply('21')
        state = self.m.state('21')
        state['egress_backend'] = 'shared_xray'
        self.m.save('21', state)
        self.m._shared = SimpleNamespace(data={'bindings': {'21': {}}}, remove=Mock())
        gateway = self.fake.containers.create('egress:test', name='ccg-shared-egress', labels={})
        self.assertEqual(self.cleanup([])['deleted'], 1)
        self.m._shared.remove.assert_called_once_with('21', disconnect=True)
        self.assertFalse(gateway.removed)

    def test_failure_is_reported_and_retry_completes_remaining_resources(self):
        self.apply('21')
        network = self.fake.networks.items['ccg-21-net']
        original = network.remove
        network.remove = Mock(side_effect=RuntimeError('busy network'))
        self.assertEqual(self.cleanup([])['failed'], 1)
        self.assertIn('ccg-21-data', self.fake.volumes.items)
        network.remove = original
        self.assertEqual(self.cleanup([])['deleted'], 1)
        self.assertNotIn('ccg-21-data', self.fake.volumes.items)

    def test_backup_only_runtime_is_found_and_purged(self):
        backup = self.m.root / 'backups'
        backup.mkdir()
        (backup / '21.json').write_text('{}')
        self.assertEqual(self.cleanup([])['deleted'], 1)
        self.assertFalse((backup / '21.json').exists())

    def test_state_missing_directory_with_logs_is_purged(self):
        self.m.dir('21').mkdir()
        (self.m.dir('21') / 'history.log').write_text('fixture')
        self.assertEqual(self.cleanup([])['deleted'], 1)
        self.assertFalse(self.m.dir('21').exists())

    def test_shared_binding_without_account_state_is_removed_in_place(self):
        from shared_egress import OWNER
        shared = self.m.shared
        shared.data['bindings']['21'] = {'active': True}
        shared.save()
        gateway = self.fake.containers.create('egress:test', name=shared.name, labels={OWNER: self.m.prefix})
        gateway.start()
        # No account directory, dedicated network or container remains.
        with patch.object(shared, 'ensure', return_value=gateway) as ensure, patch.object(shared, 'sync'):
            self.assertEqual(self.cleanup([])['deleted'], 1)
            ensure.assert_called_once_with(None, existing_only=True)
        self.assertNotIn('21', shared.data['bindings'])
        self.assertFalse(gateway.removed)

    def test_shared_cleanup_does_not_start_stopped_gateway(self):
        from shared_egress import OWNER
        shared = self.m.shared
        shared.data['bindings']['21'] = {'active': True}
        shared.save()
        gateway = self.fake.containers.create('egress:test', name=shared.name, labels={OWNER: self.m.prefix})
        with patch.object(shared, 'ensure') as ensure:
            self.assertEqual(self.cleanup([])['deleted'], 1)
            ensure.assert_not_called()
        self.assertEqual(gateway.status, 'created')
        self.assertFalse(gateway.removed)
