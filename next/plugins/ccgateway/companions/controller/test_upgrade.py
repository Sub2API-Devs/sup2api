"""Controller self-upgrade helper upgrade.py (CONTRACTS §53.5), with a fake Docker client.

    python -m unittest -v test_upgrade
"""
import json
import os
import shutil
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import docker

import upgrade

OLD, NEW = 'ghcr.io/x/ccgateway-controller:v1', 'ghcr.io/x/ccgateway-controller:v2'
ENV = ('CCG_RUNTIME_ROOT=/srv/ccg-e2e\nCCG_APP_IMAGE=app:1\nCCG_EGRESS_IMAGE=egress:1\n'
       'CCG_CONTROLLER_KEY=' + 'k' * 64 + '\nCCG_CONTROLLER_PORT=9797\nCCG_CONTROLLER_IMAGE=' + OLD + '\n'
       '# comment\nHOST_ONLY\n')


class Ctl:
    def __init__(self, client, name, image, status='running'):
        self.client, self.name, self.image, self.status = client, name, image, status
        self.kwargs = {}

    def rename(self, name):
        if name in self.client.items:
            raise docker.errors.APIError('Conflict: ' + name)
        self.client.log.append(('rename', self.name, name))
        del self.client.items[self.name]
        self.name = name
        self.client.items[name] = self

    def stop(self):
        self.client.log.append(('stop', self.name))
        self.status = 'exited'

    def start(self):
        self.client.log.append(('start', self.name))
        self.status = 'running'

    def remove(self, force=False):
        self.client.log.append(('remove', self.name))
        self.client.items.pop(self.name, None)


class FakeClient:
    """Both the DockerClient and its .containers collection."""

    def __init__(self):
        self.items, self.log = {}, []
        self.containers = self
        self.fail_run = False

    def add(self, name, image=OLD, status='running'):
        self.items[name] = Ctl(self, name, image, status)
        return self.items[name]

    def get(self, name):
        if name not in self.items:
            raise docker.errors.NotFound(name)
        return self.items[name]

    def run(self, image, **kwargs):
        name = kwargs['name']
        if name in self.items:
            raise docker.errors.APIError('Conflict: ' + name)
        c = self.add(name, image)
        c.kwargs = kwargs
        self.log.append(('run', name, image))
        if self.fail_run:
            raise docker.errors.APIError('start failed')
        return c


class UpgradeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.env_file = os.path.join(self.tmp, 'runtime.env')
        with open(self.env_file, 'w', encoding='utf-8') as f:
            f.write(ENV)
        self.client = FakeClient()
        self.health_calls = []
        self.now = 0.0

    def health(self, reports, after=1):
        def check(port, key):
            self.health_calls.append((port, key))
            return reports if len(self.health_calls) > after else OLD
        return check

    def sleep(self, seconds):
        self.now += seconds

    def run_upgrade(self, health, name='ccg-e2e', image=NEW):
        return upgrade.upgrade(self.client, image, self.env_file, name, '8787', health=health,
                               sleep=self.sleep, clock=lambda: self.now)

    def env_text(self):
        with open(self.env_file, encoding='utf-8') as f:
            return f.read()

    def test_success_replaces_controller_and_drops_prev(self):
        old = self.client.add('ccg-e2e')
        prod = self.client.add('ccg-controller')  # production controller on the same host
        self.client.add('ccg-controller-prev', status='exited')
        self.assertEqual(self.run_upgrade(self.health(NEW)), ('done', ''))
        new = self.client.items['ccg-e2e']
        self.assertIsNot(new, old)
        self.assertEqual(new.image, NEW)
        self.assertEqual(old.status, 'exited')
        self.assertNotIn('ccg-e2e-prev', self.client.items)
        # Only this instance's containers were touched.
        self.assertIs(self.client.items['ccg-controller'], prod)
        self.assertEqual(prod.status, 'running')
        self.assertIn('ccg-controller-prev', self.client.items)
        self.assertEqual(self.client.log[:3], [('rename', 'ccg-e2e', 'ccg-e2e-prev'), ('stop', 'ccg-e2e-prev'),
                                               ('run', 'ccg-e2e', NEW)])
        kwargs = new.kwargs
        self.assertEqual(kwargs['restart_policy'], {'Name': 'unless-stopped'})
        self.assertEqual(kwargs['network_mode'], 'host')
        self.assertTrue(kwargs['detach'])
        # The state root mount comes from the environment file, not a constant.
        self.assertEqual(kwargs['volumes'], {'/var/run/docker.sock': {'bind': '/var/run/docker.sock', 'mode': 'rw'},
                                             '/srv/ccg-e2e': {'bind': '/srv/ccg-e2e', 'mode': 'rw'}})
        self.assertEqual(kwargs['environment'], {
            'CCG_RUNTIME_ROOT': '/srv/ccg-e2e', 'CCG_APP_IMAGE': 'app:1', 'CCG_EGRESS_IMAGE': 'egress:1',
            'CCG_CONTROLLER_KEY': 'k' * 64, 'CCG_CONTROLLER_PORT': '9797', 'CCG_CONTROLLER_IMAGE': NEW,
            'CCG_CONTROLLER_NAME': 'ccg-e2e', 'CCG_RUNTIME_ENV_FILE': self.env_file})
        self.assertEqual(kwargs['log_config']['Config'], {'max-size': '20m', 'max-file': '3'})
        self.assertEqual(set(self.health_calls), {('9797', 'k' * 64)})
        text = self.env_text()
        self.assertEqual(text.count('CCG_CONTROLLER_IMAGE='), 1)
        self.assertIn('CCG_CONTROLLER_IMAGE=' + NEW + '\n', text)
        self.assertIn('# comment\nHOST_ONLY\n', text)
        self.assertFalse(os.path.exists(self.env_file + '.tmp'))

    def test_residual_prev_is_removed_first(self):
        self.client.add('ccg-e2e')
        stale = self.client.add('ccg-e2e-prev', status='exited')
        self.assertEqual(self.run_upgrade(self.health(NEW)), ('done', ''))
        self.assertEqual(self.client.log[0], ('remove', 'ccg-e2e-prev'))
        self.assertIsNot(self.client.items.get('ccg-e2e-prev'), stale)

    def test_interrupted_upgrade_left_only_prev(self):
        prev = self.client.add('ccg-e2e-prev', status='exited')
        self.assertEqual(self.run_upgrade(self.health(NEW)), ('done', ''))
        self.assertEqual(self.client.log[:3], [('rename', 'ccg-e2e-prev', 'ccg-e2e'), ('rename', 'ccg-e2e', 'ccg-e2e-prev'),
                                               ('stop', 'ccg-e2e-prev')])
        self.assertIsNot(self.client.items['ccg-e2e'], prev)

    def test_unhealthy_new_controller_is_rolled_back(self):
        old = self.client.add('ccg-e2e')
        self.assertEqual(self.run_upgrade(self.health(NEW, after=10 ** 6)), ('controller_unhealthy', 'restored'))
        self.assertIs(self.client.items['ccg-e2e'], old)
        self.assertEqual(old.status, 'running')
        self.assertNotIn('ccg-e2e-prev', self.client.items)
        self.assertEqual(self.env_text(), ENV)
        self.assertGreaterEqual(self.now, upgrade.HEALTH_WAIT)
        self.assertLess(self.now, upgrade.HEALTH_WAIT + 2 * upgrade.HEALTH_INTERVAL)

    def test_failed_start_is_rolled_back(self):
        old = self.client.add('ccg-e2e')
        self.client.fail_run = True
        self.assertEqual(self.run_upgrade(self.health(NEW)), ('controller_unhealthy', 'restored'))
        self.assertIs(self.client.items['ccg-e2e'], old)
        self.assertEqual(old.status, 'running')
        self.assertEqual(self.env_text(), ENV)

    def test_rollback_without_previous_controller(self):
        self.client.fail_run = True
        self.assertEqual(self.run_upgrade(self.health(NEW)), ('controller_unhealthy', 'removed'))
        self.assertEqual(self.client.items, {})
        self.assertEqual(self.env_text(), ENV)

    def test_invalid_input_touches_nothing(self):
        old = self.client.add('ccg-e2e')
        self.assertEqual(self.run_upgrade(self.health(NEW), image='Bad Image'), ('invalid_request', ''))
        self.assertEqual(self.run_upgrade(self.health(NEW), name='Bad_Name'), ('invalid_request', ''))
        with open(self.env_file, 'w', encoding='utf-8') as f:
            f.write(ENV.replace('CCG_RUNTIME_ROOT=/srv/ccg-e2e\n', ''))
        self.assertEqual(self.run_upgrade(self.health(NEW)), ('install_failed', ''))
        os.remove(self.env_file)
        self.assertEqual(self.run_upgrade(self.health(NEW)), ('install_failed', ''))
        self.assertEqual(self.client.log, [])
        self.assertIs(self.client.items['ccg-e2e'], old)

    def test_name_and_port_reach_the_new_controller_without_env_lines(self):
        with open(self.env_file, 'w', encoding='utf-8') as f:
            f.write(ENV.replace('CCG_CONTROLLER_PORT=9797\n', ''))
        self.client.add('ccg-e2e')
        result = upgrade.upgrade(self.client, NEW, self.env_file, 'ccg-e2e', '9898', health=self.health(NEW),
                                 sleep=self.sleep, clock=lambda: self.now)
        self.assertEqual(result, ('done', ''))
        env = self.client.items['ccg-e2e'].kwargs['environment']
        self.assertEqual((env['CCG_CONTROLLER_NAME'], env['CCG_CONTROLLER_PORT'], env['CCG_RUNTIME_ENV_FILE']),
                         ('ccg-e2e', '9898', self.env_file))
        self.assertEqual(set(self.health_calls), {('9898', 'k' * 64)})

    def test_parse_env_matches_env_file_rules(self):
        self.assertEqual(upgrade.parse_env('A=1\n  B=x=y \n#C=3\n\nD\nE F=1\n'), {'A': '1', 'B': 'x=y '})
        self.assertEqual(upgrade.with_image('A=1\nCCG_CONTROLLER_IMAGE=old\n', NEW), 'A=1\nCCG_CONTROLLER_IMAGE=' + NEW + '\n')
        self.assertEqual(upgrade.with_image('A=1', NEW), 'A=1\nCCG_CONTROLLER_IMAGE=' + NEW + '\n')


class HealthHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        ok = self.path == '/health' and self.headers.get('Authorization') == 'Bearer secret'
        raw = json.dumps({'controller_image': NEW} if ok else {'error': 'unauthorized'}).encode()
        self.send_response(200 if ok else 401)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


class HealthImageTests(unittest.TestCase):
    def test_reads_controller_image_with_key(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), HealthHandler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        port = str(server.server_address[1])
        self.assertEqual(upgrade.health_image(port, 'secret'), NEW)
        self.assertIsNone(upgrade.health_image(port, 'wrong'))
        server.shutdown()
        server.server_close()
        self.assertIsNone(upgrade.health_image(port, 'secret'))


if __name__ == '__main__':
    unittest.main()
