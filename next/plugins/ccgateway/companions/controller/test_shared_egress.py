import unittest
from unittest.mock import patch

from shared_egress import node, routes, firewall, inbound


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


if __name__ == '__main__':
    unittest.main()
