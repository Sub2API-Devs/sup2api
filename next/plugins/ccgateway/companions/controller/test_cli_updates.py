import contextlib
import hashlib
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

from cli_updates import CLIUpdates, fetch_release, newer
from test_worker import tar_of


class Response:
    def __init__(self, body, status=200):
        self.content, self.status_code = body, status
    def json(self):
        return json.loads(self.content)
    def iter_content(self, size):
        yield self.content
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass


class CLIUpdateTests(unittest.TestCase):
    def test_versions_never_downgrade(self):
        self.assertTrue(newer('2.1.300', '2.1.99'))
        for value in ('2.1.99', '2.1.292', '../bin', 'latest'):
            self.assertFalse(newer(value, '2.1.296'))

    def test_official_artifact_checksum_and_size(self):
        data = b'\x7fELFfixture'
        checksum = hashlib.sha256(data).hexdigest()
        for body in (data, data + b'x', b'\x7fELFchanged'):
            session = Mock()
            session.__enter__ = Mock(return_value=session)
            session.__exit__ = Mock(return_value=None)
            session.get.side_effect = [Response(json.dumps({'version': '2.1.296', 'platforms': {'linux-x64': {'checksum': checksum, 'size': len(data)}}}).encode()), Response(body)]
            with patch('cli_updates.requests.Session', return_value=session):
                if body == data:
                    self.assertEqual(fetch_release('2.1.296', 'linux-x64'), (data, checksum))
                else:
                    with self.assertRaises(ValueError):
                        fetch_release('2.1.296', 'linux-x64')
            for call in session.get.call_args_list:
                self.assertTrue(call.args[0].startswith('https://downloads.claude.ai/claude-code-releases/2.1.296/'))
                self.assertFalse(call.kwargs['allow_redirects'])

    def test_install_preserves_container_and_rolls_back_verification_failure(self):
        for failed in (False, True):
            with self.subTest(failed=failed), tempfile.TemporaryDirectory() as root:
                target = '/usr/local/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe'
                old, new = b'\x7fELFold', b'\x7fELFnew'
                container = Mock(id='same-container', attrs={'Config': {'Env': []}, 'Image': 'image'})
                container.exec_run.return_value = (0, json.dumps({'path': target}).encode())
                container.get_archive.return_value = ([tar_of([('claude.exe', old, None)])], {})
                manager = Mock()
                manager.guard.return_value = threading.RLock()
                manager.owned.return_value = container
                manager.state.return_value = {'revision': 'revision'}
                manager.docker.images.get.return_value.attrs = {'Architecture': 'amd64'}
                manager.dir.return_value = Path(root)
                manager._stage.side_effect = lambda c, path, data, sha: data
                manager._sha256.return_value = hashlib.sha256(new).hexdigest()
                updater = CLIUpdates(manager)
                def request(state, body=None):
                    if body and body['action'] == 'finish-install' and body['installed'] and failed:
                        raise RuntimeError('verification failed')
                    return {}
                updater.request = Mock(side_effect=request)
                lease = {'cli_path': '/usr/local/bin/claude', 'target_version': '2.1.296', 'lease': 'fixture'}
                with patch('cli_updates.fetch_release', return_value=(new, hashlib.sha256(new).hexdigest())):
                    updater.install_locked('22', {'revision': 'revision'}, 'same-container', lease)
                swaps = manager._swap.call_args_list
                self.assertEqual(swaps[0].args, (container, new, target))
                self.assertEqual(len(swaps), 2 if failed else 1)
                if failed:
                    self.assertEqual(swaps[-1].args, (container, old, target))
                self.assertEqual(next(p for p in (Path(root) / 'cli-backups').iterdir() if p.suffix != '.json').read_bytes(), old)
                container.restart.assert_not_called()
                container.remove.assert_not_called()
                container.start.assert_not_called()
                if not failed:
                    updater.request.assert_called_with({'revision': 'revision'}, {'action': 'finish-install', 'lease': 'fixture', 'installed': True})

    def test_unknown_configured_path_never_downloads_or_replaces(self):
        manager = Mock()
        manager.guard.return_value = threading.RLock()
        manager.owned.return_value = Mock(id='same', attrs={'Config': {'Env': []}, 'Image': 'image'})
        manager.state.return_value = {'revision': 'rev'}
        updates = CLIUpdates(manager)
        updates.request = Mock(return_value={})
        with patch('cli_updates.fetch_release') as download:
            updates.install_locked('22', {'revision': 'rev'}, 'same', {'cli_path': '/tmp/untrusted', 'lease': 'fixture'})
        download.assert_not_called()
        manager._swap.assert_not_called()
