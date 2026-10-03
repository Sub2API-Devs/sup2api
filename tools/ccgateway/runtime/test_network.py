import unittest
from unittest.mock import patch
from network import configuration, business_rules


class NetworkTests(unittest.TestCase):
    @patch('network.socket.getaddrinfo', return_value=[(None, None, None, None, ('198.51.100.2', 443))])
    def test_credentials_only_in_proxy_config(self, _):
        config, rules = configuration({'protocol': 'https', 'host': 'proxy.example', 'port': 443,
            'username': 'alice', 'password': 'test-secret'}, '172.20.0.3', '172.20.0.2')
        self.assertEqual(config['outbounds'][0]['password'], 'test-secret')
        self.assertNotIn('test-secret', rules)
        self.assertNotIn('proxy.example', rules)
        self.assertIn('policy drop', rules)
        self.assertEqual(config['route']['final'], 'account-proxy')
        self.assertEqual(config['dns']['servers'][0]['detour'], 'account-proxy')

    def test_rejects_untrusted_network_operands(self):
        with self.assertRaises(ValueError):
            business_rules('172.20.0.2; reboot')
        with self.assertRaises(ValueError):
            configuration({'protocol': 'direct'}, '172.20.0.3', '172.20.0.2')

    def test_business_has_no_ipv6_or_udp_bypass(self):
        rules = business_rules('172.20.0.2')
        self.assertIn('meta nfproto ipv4 meta l4proto tcp accept', rules)
        self.assertIn('127.0.0.0/8', rules)
        self.assertEqual(rules.count('udp'), 1)  # only controlled DNS


if __name__ == '__main__':
    unittest.main()
