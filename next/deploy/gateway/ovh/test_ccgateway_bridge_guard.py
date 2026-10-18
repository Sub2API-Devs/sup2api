import copy
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('guard', pathlib.Path(__file__).with_name('ccgateway-bridge-guard.py'))
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class BridgeRules(unittest.TestCase):
    def setUp(self):
        self.state = {'status': 'syncing', 'egress_backend': 'shared_xray', 'app_ip': '10.1.0.3', 'gateway_ip': '10.1.0.2'}
        self.network = {'Name': 'ccg-21-net', 'Id': 'netid', 'Internal': True, 'Labels': {guard.LABEL: '21'}}
        self.app = {'State': {'Status': 'running'}, 'Config': {'Labels': {guard.LABEL: '21'}},
                    'NetworkSettings': {'Networks': {'ccg-21-net': {'NetworkID': 'netid', 'IPAddress': '10.1.0.3'}}}}
        self.gateway = copy.deepcopy(self.app)
        self.gateway['NetworkSettings']['Networks']['ccg-21-net']['IPAddress'] = '10.1.0.2'

    def rules(self):
        return guard.rules_for_account('21', self.state, self.app, self.gateway, self.network, 'vethabc', 'vethdef')

    def test_syncing_account_targets_only_its_proxy_peer(self):
        out, back = self.rules()
        self.assertEqual(out[out.index('--physdev-out') + 1], 'vethdef')
        self.assertIn('10.1.0.3/32', out)
        self.assertIn('tcp', out)
        self.assertIn('ESTABLISHED,RELATED', back)

    def test_stopped_or_blocked_account_has_no_exception(self):
        self.app['State']['Status'] = 'exited'
        self.assertEqual(self.rules(), [])
        self.app['State']['Status'] = 'running'
        self.state['status'] = 'blocked'
        self.assertEqual(self.rules(), [])

    def test_public_or_wrong_owner_network_is_rejected(self):
        self.network['Internal'] = False
        self.assertEqual(self.rules(), [])
        self.network['Internal'] = True
        self.network['Labels'][guard.LABEL] = '22'
        self.assertEqual(self.rules(), [])

    def test_changed_endpoint_or_additional_network_is_rejected(self):
        self.gateway['NetworkSettings']['Networks']['ccg-21-net']['IPAddress'] = '10.1.0.9'
        self.assertEqual(self.rules(), [])
        self.gateway['NetworkSettings']['Networks']['ccg-21-net']['IPAddress'] = '10.1.0.2'
        self.app['NetworkSettings']['Networks']['public'] = {}
        self.assertEqual(self.rules(), [])

    def test_legacy_proxy_requires_same_owner(self):
        self.state['egress_backend'] = 'legacy'
        self.gateway['Config']['Labels'][guard.LABEL] = '22'
        self.assertEqual(self.rules(), [])
        self.gateway['Config']['Labels'][guard.LABEL] = '21'
        self.assertEqual(len(self.rules()), 2)


if __name__ == '__main__':
    unittest.main()
