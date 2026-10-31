import unittest
from pathlib import Path
from unittest.mock import patch

from shared_egress import OWNER, SHARED, SharedEgress, firewall, inbound, node, routes
from common import LABEL
from test_manager import REV, Base


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


class SharedApplyTests(Base):
    """Every runtime goes through the shared gateway. The Xray side
    (configure, sync) is stubbed; the apply, readiness and recovery wiring
    around it is real."""
    GATEWAY = '10.250.0.9'

    def setUp(self):
        super().setUp()
        self.shared = self.m._shared = SharedEgress(self.m)
        self.gateway = self.fake.containers.create('egress:test', name=self.shared.name, labels={OWNER: self.m.prefix})
        self.gateway.start()
        p = patch.object(self.shared, 'configure', side_effect=self.bind)
        self.configure = p.start()
        self.addCleanup(p.stop)
        p = patch.object(self.shared, 'sync')  # no Xray API in the fake gateway
        p.start()
        self.addCleanup(p.stop)

    def bind(self, aid, state, desired):
        # What the real configure leaves behind for healthy(): an active
        # binding of this container at this revision, a known gateway boot.
        self.shared.data['bindings'][aid] = {'ip': state['app_ip'], 'container_id': self.app(aid).id,
                                             'revision': desired['revision'], 'active': True, 'port': 20000, 'tag': 't'}
        self.shared.boot = (self.gateway.id, self.gateway.attrs['State']['StartedAt'])
        return self.GATEWAY, self.gateway

    def test_new_account_is_bound_to_the_shared_gateway(self):
        self.assertEqual(self.apply('21')['status'], 'ready')
        state = self.m.state('21')
        self.assertEqual(state['gateway_ip'], self.GATEWAY)
        self.assertIn(self.GATEWAY, (Path(self.tmp) / '21' / 'resolv.conf').read_text())
        self.assertNotIn('ccg-21-egress', self.fake.containers.items)
        self.assertEqual(self.shared.status('21'), {'backend': SHARED, 'ready': True})
        self.assertEqual(state['egress_backend'], SHARED)
        self.assertEqual(self.m.online['21'], REV)
        self.configure.assert_called_once()

    def test_failed_gateway_configuration_leaves_the_runtime_offline(self):
        self.configure.side_effect = RuntimeError('no xray')
        with self.assertRaises(RuntimeError):
            self.apply('21')
        self.assertEqual(self.m.state('21')['status'], 'egress_error')
        self.assertNotIn('21', self.m.online)
        # The core's next configuration tries again.
        self.configure.side_effect = self.bind
        self.assertEqual(self.apply('21')['status'], 'ready')

    def test_gateway_restart_is_recovered_in_the_background(self):
        self.apply('21')
        self.gateway.start()  # a new boot: the bindings are not loaded any more
        self.assertFalse(self.shared.healthy('21', self.m.state('21')))
        self.assertEqual(self.m.public('21')['status'], 'pending')
        self.shared.recover()
        self.assertEqual(self.configure.call_count, 2)
        self.assertEqual(self.m.public('21')['status'], 'ready')

    def test_blocked_runtime_releases_its_binding(self):
        self.apply('21')
        self.m.apply('21', {'revision': REV, 'proxy': None})
        self.assertFalse(self.shared.data['bindings']['21']['active'])
        self.assertEqual(self.app('21').status, 'exited')
        self.shared.recover()  # a blocked runtime is never resurrected
        self.assertEqual(self.configure.call_count, 1)

    def test_gateway_image_is_the_egress_image_unless_pinned(self):
        self.assertEqual(self.shared.image, 'egress:test')
        with patch.dict('os.environ', {'CCG_XRAY_IMAGE': 'ccgateway-xray:1'}):
            self.assertEqual(SharedEgress(self.m).image, 'ccgateway-xray:1')

    def own_egress_leftovers(self, aid):
        egress = self.fake.containers.create('egress:test', name=f'ccg-{aid}-egress', labels={LABEL: aid})
        egress.status = 'exited'
        uplink = self.fake.networks.create(f'ccg-{aid}-uplink', labels={LABEL: aid},
                                           ipam={'Config': [{'Subnet': '10.99.0.0/24'}]})
        d = self.m.dir(aid)
        (d / 'sing-box.json').write_text('{}')
        (d / 'firewall.nft').write_text('table inet x {}\n')
        state = self.m.state(aid)
        state.update(uplink_ip='10.99.0.2', legacy_gateway_ip='10.1.0.2',
                     egress_migration={'target': SHARED, 'phase': 'failed'})
        self.m.save(aid, state)
        return egress, uplink

    def test_recovery_drops_own_egress_leftovers_once(self):
        self.apply('21')
        self.apply('22')
        self.m.apply('22', {'revision': REV, 'proxy': None})  # blocked ones are cleaned too
        gateway_net = self.fake.networks.create('ccg-d0000000000000000-xray-uplink', labels={},
                                                ipam={'Config': [{'Subnet': '10.98.0.0/24'}]})
        leftovers = [self.own_egress_leftovers(aid) for aid in ('21', '22')]
        self.shared.recover()
        for aid, (egress, uplink) in zip(('21', '22'), leftovers):
            self.assertTrue(egress.removed and uplink.removed, aid)
            self.assertFalse((self.m.dir(aid) / 'sing-box.json').exists())
            self.assertFalse((self.m.dir(aid) / 'firewall.nft').exists())
            state = self.m.state(aid)
            for field in ('uplink_ip', 'legacy_gateway_ip', 'egress_migration'):
                self.assertNotIn(field, state)
            # Read by a rolled-back 0.1.117 controller: it keeps the account on the gateway.
            self.assertEqual(state['egress_backend'], SHARED)
        self.assertFalse(gateway_net.removed)
        self.assertIn(self.shared.name, self.fake.containers.items)
        self.assertEqual(self.m.public('21')['status'], 'ready')
        # Once per process: a later pass does not look again.
        with patch.object(self.m, 'drop_own_egress') as drop:
            self.shared.recover()
        drop.assert_not_called()

    def test_failed_cleanup_is_retried_and_keeps_the_account_online(self):
        self.apply('21')
        with patch.object(self.m, 'drop_own_egress', side_effect=RuntimeError('docker busy')):
            self.shared.recover()
        self.assertEqual(self.m.public('21')['status'], 'ready')
        with patch.object(self.m, 'drop_own_egress') as drop:
            self.shared.recover()
        drop.assert_called_once_with('21')


if __name__ == '__main__':
    unittest.main()
