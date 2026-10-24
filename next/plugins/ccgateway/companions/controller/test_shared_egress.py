import unittest
from pathlib import Path
from unittest.mock import patch

from common import BadRequest
from shared_egress import node, routes, firewall, inbound, SHARED, LEGACY
from test_manager import REV
from test_worker import WorkerBase


class SharedConfigTests(unittest.TestCase):
    def test_full_snapshot_preserves_other_accounts_and_denies_unknown(self):
        a = {'active': True, 'ip': '10.8.1.2', 'port': 20000, 'tag': 'a'}
        b = {'active': True, 'ip': '10.8.2.2', 'port': 20001, 'tag': 'b'}
        rules = routes({'21': a, '22': b})['routing']['rules']
        self.assertEqual([r['outboundTag'] for r in rules], ['a', 'a', 'b', 'b', 'block'])
        a['active'] = False
        rules = routes({'21': a, '22': b})['routing']['rules']
        self.assertEqual([r['outboundTag'] for r in rules], ['b', 'b', 'block'])
        self.assertEqual(routes({})['routing']['rules'][0]['outboundTag'], 'block')

    @patch('network.socket.getaddrinfo', return_value=[(None, None, None, None, ('198.18.0.2', 443))])
    def test_proxy_credentials_tls_and_versioned_identity(self, _):
        proxy = {'protocol': 'https', 'host': 'proxy.test', 'port': 443, 'username': 'u___', 'password': 'secret'}
        a = node(proxy, 'private')
        out = a['outbound']
        self.assertEqual(out['streamSettings']['tlsSettings'], {'serverName': 'proxy.test', 'allowInsecure': False})
        self.assertEqual(out['settings']['servers'][0]['users'][0], {'user': 'u___', 'pass': 'secret'})
        self.assertEqual(node(proxy, 'private'), a)
        self.assertNotEqual(node({**proxy, 'password': 'other'}, 'private')['outbound']['tag'], out['tag'])
        self.assertNotIn('secret', out['tag'])
        self.assertEqual(node({**proxy, 'protocol': 'socks5'}, 'private')['outbound']['protocol'], 'socks')

    def test_firewall_requires_interface_and_source_and_blocks_forwarding(self):
        binding = {'active': True, 'ip': '10.8.1.2', 'gateway': '10.8.1.3', 'interface': 'eth1', 'port': 20000}
        rules = firewall({'21': binding}, {'direct': node(None, 'private')})
        self.assertIn('iifname "eth1" ip saddr 10.8.1.2', rules)
        self.assertIn('hook forward priority filter; policy drop', rules)
        self.assertIn('ip daddr { 0.0.0.0/8', rules)
        self.assertNotIn('tproxy', firewall({}, {}))
        self.assertEqual(inbound(binding)['listen'], '127.0.0.1')
        with self.assertRaises(ValueError):
            firewall({'21': {**binding, 'interface': 'eth1; accept'}}, {})


class MigrateTests(WorkerBase):
    """SharedEgress.migrate: prepared -> stopped -> done, busy, failed with
    rollback, and a retained journal resumed by recover() (audit B2). The
    Xray side (configure) is stubbed; the state machine is real."""
    GATEWAY = '10.250.0.9'

    def setUp(self):
        super().setUp()
        from shared_egress import OWNER
        self.shared = self.m.shared
        self.gateway = self.fake.containers.create('egress:test', name=self.shared.name, labels={OWNER: self.m.prefix})
        self.gateway.start()

        def configure(aid, state, desired):
            # What the real configure leaves behind for healthy(): an active
            # binding of this container at this revision, a known gateway boot.
            self.shared.data['bindings'][aid] = {'ip': state['app_ip'], 'container_id': self.app(aid).id,
                                                 'revision': desired['revision'], 'active': True, 'port': 20000, 'tag': 't'}
            self.shared.boot = (self.gateway.id, self.gateway.attrs['State']['StartedAt'])
            return self.GATEWAY, self.gateway
        p = patch.object(self.shared, 'configure', side_effect=configure)
        self.configure = p.start()
        self.addCleanup(p.stop)
        p = patch.object(self.shared, 'network_idle', return_value=True)
        self.network_idle = p.start()
        self.addCleanup(p.stop)
        p = patch.object(self.shared, 'sync')  # no Xray API in the fake gateway
        p.start()
        self.addCleanup(p.stop)
        self.legacy = self.fake.containers.get('ccg-21-egress')
        self.legacy_gateway = self.m.state('21')['gateway_ip']

    def journal(self):
        return self.m.state('21').get('egress_migration')

    def test_legacy_to_shared_and_back(self):
        result = self.shared.migrate('21', SHARED)
        self.assertEqual((result['backend'], result['migration']), (SHARED, None))
        state = self.m.state('21')
        self.assertEqual((state['gateway_ip'], state['legacy_gateway_ip']), (self.GATEWAY, self.legacy_gateway))
        self.assertEqual(self.legacy.status, 'exited')  # kept for rollback, not running
        self.assertFalse(self.legacy.removed)
        self.assertIn(self.GATEWAY, (Path(self.tmp) / '21' / 'resolv.conf').read_text())
        self.assertEqual(self.target.status, 'running')
        self.assertEqual(self.m.online['21'], REV)
        # Back: the retained per-account egress runs again at the same revision.
        result = self.shared.migrate('21', LEGACY)
        self.assertEqual((result['backend'], result['migration'], result['ready']), (LEGACY, None, True))
        self.assertEqual((self.m.state('21')['gateway_ip'], self.legacy.status), (self.legacy_gateway, 'running'))
        self.assertIs(self.app('21'), self.target)  # never recreated

    def test_busy_at_the_final_check_restores_everything(self):
        self.network_idle.return_value = False
        with patch.object(self.shared, 'remove') as remove:
            self.assertEqual(self.shared.migrate('21', SHARED), {'backend': LEGACY, 'status': 'busy'})
        remove.assert_called_once_with('21', disconnect=True)
        self.assertIsNone(self.journal())
        self.assertEqual(self.m.online['21'], REV)
        self.assertEqual((self.target.status, self.legacy.status), ('running', 'running'))

    def test_failed_activation_rolls_back_to_the_account_egress(self):
        with patch.object(self.shared, 'apply', side_effect=RuntimeError('xray refused')):
            with self.assertRaises(RuntimeError):
                self.shared.migrate('21', SHARED)
        state = self.m.state('21')
        self.assertEqual((state.get('egress_backend'), state['gateway_ip']), (LEGACY, self.legacy_gateway))
        self.assertIsNone(self.journal())
        self.assertEqual(self.m.public('21')['status'], 'ready')
        self.assertIs(self.app('21'), self.target)

    def test_failed_rollback_keeps_the_journal_for_recover(self):
        with patch.object(self.shared, 'apply', side_effect=RuntimeError('xray refused')), \
                patch.object(self.m, 'apply', side_effect=RuntimeError('egress refused')):
            with self.assertRaises(RuntimeError):
                self.shared.migrate('21', SHARED)
        self.assertEqual(self.journal(), {'target': SHARED, 'phase': 'failed', 'from': LEGACY})
        self.assertNotIn('21', self.m.online)
        self.assertEqual(self.target.status, 'exited')
        # The background pass finishes the rollback with the journal's source.
        self.shared.recover()
        self.assertIsNone(self.journal())
        self.assertEqual(self.m.state('21').get('egress_backend'), LEGACY)
        self.assertEqual(self.m.public('21')['status'], 'ready')

    def test_failed_first_preparation_leaves_the_account_online(self):
        self.configure.side_effect = RuntimeError('no xray')
        with patch.object(self.shared, 'remove') as remove:
            with self.assertRaises(RuntimeError):
                self.shared.migrate('21', SHARED)
        remove.assert_called_once_with('21', disconnect=True)
        self.assertIsNone(self.journal())
        self.assertEqual(self.m.online['21'], REV)

    def test_invalid_target_missing_runtime_and_blocked(self):
        with self.assertRaises(BadRequest):
            self.shared.migrate('21', 'other')
        with self.assertRaises(BadRequest):
            self.shared.migrate('22', SHARED)
        self.m.block('21')
        with self.assertRaises(BadRequest):
            self.shared.migrate('21', SHARED)
        self.configure.assert_not_called()


if __name__ == '__main__':
    unittest.main()
