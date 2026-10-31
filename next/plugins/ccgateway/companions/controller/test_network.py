import unittest
import ipaddress
from unittest.mock import patch
from network import proxy_outbound, business_rules, network_policy, allocate_subnet, allocate_addresses


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
    def test_proxy_pinned_to_its_resolved_address(self, _):
        self.assertEqual(proxy_outbound({'protocol': 'https', 'host': 'proxy.example', 'port': 443,
                                         'username': 'alice', 'password': 'test-secret'}),
                         {'server': '198.51.100.2', 'server_port': 443, 'username': 'alice', 'password': 'test-secret'})
        self.assertEqual(proxy_outbound({'protocol': 'socks5', 'host': 'proxy.example', 'port': '1080'}),
                         {'server': '198.51.100.2', 'server_port': 1080, 'username': '', 'password': ''})

    def test_rejects_untrusted_network_operands(self):
        with self.assertRaises(ValueError):
            business_rules('172.20.0.2; reboot')
        for proxy in ({'protocol': 'direct', 'host': 'proxy.example', 'port': 1},
                      {'protocol': 'http', 'host': '', 'port': 80},
                      {'protocol': 'http', 'host': 'proxy.example', 'port': 70000}):
            with self.assertRaises(ValueError, msg=proxy):
                proxy_outbound(proxy)
        with patch('network.socket.getaddrinfo', return_value=[(None, None, None, None, ('::1', 80))]):
            with self.assertRaises(ValueError):
                proxy_outbound({'protocol': 'http', 'host': 'proxy.example', 'port': 80})

    def test_business_has_no_ipv6_or_udp_bypass(self):
        rules = business_rules('172.20.0.2')
        self.assertIn('meta nfproto ipv4 meta l4proto tcp accept', rules)
        self.assertIn('127.0.0.0/8', rules)
        self.assertEqual(rules.count('udp'), 1)  # only controlled DNS


if __name__ == '__main__':
    unittest.main()
