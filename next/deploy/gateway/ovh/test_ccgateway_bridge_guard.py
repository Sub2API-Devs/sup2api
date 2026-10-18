import copy
import importlib.util
import pathlib
import json
import subprocess
import tempfile
import unittest
from unittest import mock

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

    def test_disappearing_account_does_not_remove_other_accounts(self):
        app = copy.deepcopy(self.app)
        app.update(Name='/ccg-21-app')
        app['State']['Pid'] = 21
        disappearing = copy.deepcopy(app)
        disappearing.update(Name='/ccg-22-app')
        disappearing['State']['Pid'] = 22
        gateway = copy.deepcopy(self.gateway)
        gateway.update(Name='/ccg-shared-egress')
        gateway['State']['Pid'] = 30
        original_iterdir = pathlib.Path.iterdir

        def iterdir(path):
            return iter([]) if str(path).replace('\\', '/') == '/sys/class/net' else original_iterdir(path)

        def command(args, **kwargs):
            if args[:3] == ['docker', 'ps', '-q']:
                return 'a\nb\ng'
            if args[:2] == ['docker', 'inspect']:
                return json.dumps([app, disappearing, gateway])
            if args[:3] == ['docker', 'network', 'inspect']:
                return json.dumps([self.network])
            if args[0] == 'nsenter' and args[2] == '22':
                raise subprocess.CalledProcessError(1, args)
            if 'route' in args:
                return json.dumps([{'gateway': self.state['gateway_ip']}])
            address = self.state['app_ip'] if args[2] == '21' else self.state['gateway_ip']
            return json.dumps([{'link_index': 100, 'addr_info': [{'local': address}]}])

        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            for aid in ['21', '22']:
                (root / aid).mkdir()
                (root / aid / 'state.json').write_text(json.dumps(self.state))
            with mock.patch.object(guard, 'run', side_effect=command), \
                    mock.patch.object(pathlib.Path, 'iterdir', iterdir), \
                    mock.patch.object(guard, 'rules_for_account', return_value=[['healthy-account-rule']]):
                self.assertEqual(guard.discover(root, 'ccg'), [['healthy-account-rule']])


if __name__ == '__main__':
    unittest.main()
