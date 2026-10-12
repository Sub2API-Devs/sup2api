import contextlib
import hashlib
import json
import os
import posixpath
import re
import threading
import time
from datetime import datetime, timezone

import requests

RELEASES = 'https://downloads.claude.ai/claude-code-releases/'
VERSION = re.compile(r'[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}')
MAX_BINARY = 512 << 20
TARGET_SCRIPT = '''const f=require('fs'),p=require('path');let v=f.realpathSync(process.argv[1]);const s=f.statSync(v);if(!s.isFile()||s.size>536870912)process.exit(1);for(let q=v;;q=p.dirname(q)){const s=f.statSync(q);if(s.uid!==0||(s.mode&18)!==0)process.exit(1);if(q==='/')break;}process.stdout.write(JSON.stringify({path:v}));'''


def newer(candidate, installed):
    return bool(VERSION.fullmatch(candidate or '') and VERSION.fullmatch(installed or '') and
                tuple(map(int, candidate.split('.'))) > tuple(map(int, installed.split('.'))))


def fetch_release(version, platform):
    if not VERSION.fullmatch(version) or platform not in ('linux-x64', 'linux-arm64'):
        raise ValueError('unsupported CLI release')
    with requests.Session() as session:
        session.trust_env = False
        response = session.get(RELEASES + version + '/manifest.json', timeout=(10, 30), allow_redirects=False)
        if response.status_code != 200 or len(response.content) > 65536:
            raise ValueError('invalid CLI manifest')
        manifest = response.json()
        if manifest.get('version') != version:
            raise ValueError('CLI manifest version mismatch')
        item = manifest.get('platforms', {}).get(platform, {})
        checksum, size = item.get('checksum'), item.get('size')
        if not isinstance(checksum, str) or not re.fullmatch(r'[a-f0-9]{64}', checksum) or type(size) is not int or not 0 < size <= MAX_BINARY:
            raise ValueError('invalid CLI manifest entry')
        data = bytearray()
        started = time.monotonic()
        with session.get(RELEASES + version + '/' + platform + '/claude', timeout=(10, 30), stream=True, allow_redirects=False) as response:
            if response.status_code != 200:
                raise ValueError('CLI download unavailable')
            for chunk in response.iter_content(1 << 20):
                data.extend(chunk)
                if len(data) > size or time.monotonic() - started > 150:
                    raise ValueError('CLI download exceeds limit')
        if len(data) != size or not data.startswith(b'\x7fELF') or hashlib.sha256(data).hexdigest() != checksum:
            raise ValueError('CLI download checksum mismatch')
        return bytes(data), checksum


class CLIUpdates:
    def __init__(self, manager):
        self.manager = manager
        self.lock = threading.Lock()
        self.running = set()
        self.mu = threading.Lock()

    def active(self, aid):
        with self.mu:
            return aid in self.running

    def request(self, state, body=None):
        with requests.Session() as session:
            session.trust_env = False
            response = session.request('GET' if body is None else 'POST',
                'http://' + state['app_ip'] + ':8787/admin/cli', json=body,
                headers={'Authorization': 'Bearer ' + state['admin_key']}, timeout=(5, 150), allow_redirects=False)
            if response.status_code != 200 or len(response.content) > 16384:
                raise RuntimeError('CLI management unavailable')
            return response.json()

    def start(self, aid, revision, automatic=False):
        if not self.lock.acquire(blocking=False):
            raise RuntimeError('CLI installation is busy')
        manager = self.manager
        begun = False
        lease = None
        try:
            with manager.guard(aid):
                state = manager.state(aid)
                if not state or not revision or state.get('revision') != revision:
                    raise RuntimeError('account revision changed')
                container = manager.owned(aid, 'app')
                if container.status != 'running':
                    raise RuntimeError('account is not running')
                view = self.request(state)
                if automatic and (not view.get('auto_update') or not newer(view.get('latest_version'), view.get('catalog', {}).get('installed_version'))):
                    return view
                lease = self.request(state, {'action': 'begin-install'})
                if not lease.get('needed'):
                    return self.request(state)
                with self.mu:
                    self.running.add(aid)
                threading.Thread(target=self.install, args=(aid, state, container.id, lease), daemon=True).start()
                begun = True
                view.update(updating=True, update_state='running', update_error='')
                return view
        finally:
            if not begun:
                if lease and lease.get('needed'):
                    with self.mu:
                        self.running.discard(aid)
                    with contextlib.suppress(Exception):
                        self.request(state, {'action': 'finish-install', 'lease': lease['lease'], 'installed': False})
                self.lock.release()

    def install(self, aid, state, identity, lease):
        try:
            with self.manager.guard(aid):
                self.install_locked(aid, state, identity, lease)
        finally:
            with self.mu:
                self.running.discard(aid)
            self.lock.release()

    def install_locked(self, aid, state, identity, lease):
        manager = self.manager
        installed = False
        old = target = old_digest = staged = None
        try:
            with manager.guard(aid):
                container = manager.owned(aid, 'app')
                if container.id != identity or manager.state(aid).get('revision') != state['revision']:
                    raise RuntimeError('account changed')
                env = dict(item.split('=', 1) for item in container.attrs['Config'].get('Env', []) if '=' in item)
                cli = env.get('WORKER_CLI_PATH', '/usr/local/bin/claude')
                if lease.get('cli_path') != cli or not posixpath.isabs(cli):
                    raise RuntimeError('CLI path does not match configured installation')
                code, out = container.exec_run(['node', '-e', TARGET_SCRIPT, cli], user='0')
                if code != 0:
                    raise RuntimeError('unsupported CLI installation ownership')
                target = json.loads(out)['path']
                if not target.startswith('/usr/local/'):
                    raise RuntimeError('unsupported CLI installation path')
                architecture = manager.docker.images.get(container.attrs['Image']).attrs.get('Architecture')
                platform = {'amd64': 'linux-x64', 'arm64': 'linux-arm64'}.get(architecture)
                data, checksum = fetch_release(lease['target_version'], platform)
                from manager import read_single_file
                chunks, _ = container.get_archive(target)
                old = read_single_file(chunks, MAX_BINARY)
                old_digest = hashlib.sha256(old).hexdigest()
                folder = manager.dir(aid) / 'cli-backups'
                folder.mkdir(mode=0o700, exist_ok=True)
                backup = folder / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '-' + old_digest[:12])
                with backup.open('xb') as stream:
                    os.chmod(backup, 0o600)
                    stream.write(old)
                    stream.flush()
                    os.fsync(stream.fileno())
                with backup.with_suffix('.json').open('x') as stream:
                    os.chmod(backup.with_suffix('.json'), 0o600)
                    json.dump({'container_id': identity, 'path': target, 'sha256': old_digest, 'previous_version': lease.get('previous_version'), 'target_version': lease['target_version']}, stream)
                    stream.flush()
                    os.fsync(stream.fileno())
                staged = manager._stage(container, target, data, checksum)
                self.request(state, {'action': 'validate-install', 'lease': lease['lease']})
                if manager.owned(aid, 'app').id != identity:
                    raise RuntimeError('account changed before CLI replacement')
                manager._swap(container, staged, target)
                installed = True
                self.request(state, {'action': 'finish-install', 'lease': lease['lease'], 'installed': True})
        except Exception:
            if installed and old is not None:
                with contextlib.suppress(Exception):
                    self.request(state, {'action': 'validate-install', 'lease': lease['lease']})
                    container = manager.owned(aid, 'app')
                    if container.id == identity and manager._sha256(container, target) == checksum:
                        manager._swap(container, manager._stage(container, target, old, old_digest), target)
            with contextlib.suppress(Exception):
                self.request(state, {'action': 'finish-install', 'lease': lease['lease'], 'installed': False})
        finally:
            if staged and not installed:
                manager._discard(container, staged)

    def run(self):
        while True:
            time.sleep(600)
            for folder in self.manager.root.iterdir():
                if not re.fullmatch(r'(?:[1-9][0-9]*|d[0-9a-f]{16})', folder.name):
                    continue
                with contextlib.suppress(Exception):
                    state = self.manager.state(folder.name)
                    if state and self.manager.online.get(folder.name) == state.get('revision'):
                        self.start(folder.name, state.get('revision'), automatic=True)
