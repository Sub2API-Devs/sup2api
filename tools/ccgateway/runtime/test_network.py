import unittest
import ipaddress
from unittest.mock import patch
from network import configuration, business_rules, network_policy, allocate_subnet, allocate_addresses


class NetworkTests(unittest.TestCase):
    def test_private_pool_and_modes(self):
        self.assertEqual(network_policy(), {'pool': '10.0.0.0/8', 'allocation': 'random'})
        self.assertEqual(network_policy({'pool': '192.168.50.7/24'})['pool'], '192.168.50.0/24')
        for raw in ({'pool': '8.8.8.0/24'}, {'pool': '10.0.0.0/7'}, {'pool': '10.0.0.0/25'},
                    {'pool': '::/0'}, {'allocation': 'unknown'}):
            with self.assertRaises(ValueError):
                network_policy(raw)

    def test_sequential_skips_host_and_docker_routes(self):
        policy = network_policy({'pool': '10.80.0.0/16', 'allocation': 'sequential'})
        occupied = [ipaddress.ip_network('10.80.0.0/20'), ipaddress.ip_network('10.80.16.0/24')]
        subnet = allocate_subnet(policy, occupied)
        self.assertEqual(str(subnet), '10.80.17.0/24')
        self.assertEqual(allocate_addresses(subnet, 'sequential'), ['10.80.17.2', '10.80.17.3'])

    @patch('network.secrets.choice', side_effect=lambda choices: choices[-1])
    def test_random_subnet_and_unique_hosts(self, _):
        policy = network_policy({'pool': '10.80.0.0/16'})
        subnet = allocate_subnet(policy, [])
        self.assertEqual(str(subnet), '10.80.255.0/24')
        self.assertEqual(allocate_addresses(subnet, 'random'), ['10.80.255.254', '10.80.255.253'])

    def test_small_custom_pool_and_exhaustion(self):
        policy = network_policy({'pool': '192.168.50.0/24', 'allocation': 'sequential'})
        first = allocate_subnet(policy, [])
        second = allocate_subnet(policy, [first])
        self.assertEqual((str(first), str(second)), ('192.168.50.0/25', '192.168.50.128/25'))
        self.assertEqual(allocate_addresses(first, 'sequential'), ['192.168.50.2', '192.168.50.3'])
        with self.assertRaises(ValueError):
            allocate_subnet(policy, [first, second])

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
