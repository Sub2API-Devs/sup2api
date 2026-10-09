"""In-place worker update POST /accounts/<key>/worker (CONTRACTS §53.7).

The account container must never be provisioned, created, removed or
recreated: only its program file is replaced and only it is restarted.

    python -m unittest -v test_worker
"""
import hashlib
import io
import os
from pathlib import Path
import posixpath
import tarfile
import unittest
from unittest.mock import patch

import docker

import manager
from manager import ContainerChanged, InvalidImage, RuntimeNotFound, UnsupportedContainer, ROUTE
from test_manager import FakeContainer, LABEL, REV
from test_uploads import ServerBase

WORKER = '/usr/local/bin/worker'
LEGACY = '/usr/local/bin/ccgateway'
OLD = b'old worker program\x00' * 64
NEW = b'new worker program\x01' * 64
BAD = b'unhealthy worker\x02' * 64
CRASH = b'crashing worker\x03' * 64


def sha(data):
    return hashlib.sha256(data).hexdigest()


def tar_of(entries):
    """entries: [(name, data or None for a directory, symlink target or None)]."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w') as tar:
        for name, data, link in entries:
            info = tarfile.TarInfo(name)
            if link is not None:
                info.type, info.linkname = tarfile.SYMTYPE, link
                tar.addfile(info)
            elif data is None:
                info.type = tarfile.DIRTYPE
                tar.addfile(info)
            else:
                info.size, info.mode = len(data), 0o644  # put_archive sets its own mode
                tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


class WorkerContainer(FakeContainer):
    """FakeContainer with a tiny file system, processes, exec, archives and restart."""

    def __init__(self, client, name, image, labels):
        super().__init__(client, name, image, labels)
        self.attrs.update(Path=WORKER, Args=[], Mounts=[{'Type': 'volume', 'Destination': '/work', 'RW': True}],
                          Config={'Image': image, 'User': '1000:1000', 'Labels': self.labels})
        self.files = {}  # path -> (data, mode, uid)
        program = client.programs.get(self.attrs['Image'])
        if program is not None:
            self.files[WORKER] = (program, 0o755, 0)
        self.procs = ['docker-init', 'worker']
        self.top_hook = self.restart_hook = self.archive_override = None
        self.execs, self.restarts, self.tops = [], 0, 0
        self.running_program = None

    def program(self):
        try:
            return self.files.get(manager.worker_target(self)[0], (None,))[0]
        except UnsupportedContainer:
            return None

    def start(self):
        super().start()
        self.running_program = self.program()
        if self.running_program in self.client.crashing:
            self.status = 'exited'

    def restart(self, timeout=None):
        assert timeout == manager.WORKER_RESTART_TIMEOUT
        self.restarts += 1
        if self.restart_hook:
            self.restart_hook(self)
        self.start()

    def top(self, ps_args=None):
        assert ps_args == '-eo pid,comm'
        if self.status != 'running':
            raise docker.errors.APIError('container is not running')
        self.tops += 1
        if self.top_hook:
            self.top_hook(self)
        return {'Titles': ['PID', 'COMMAND'], 'Processes': [[str(i + 1), c] for i, c in enumerate(self.procs)]}

    def exec_run(self, cmd, user=None, **kwargs):
        if self.status != 'running':
            raise docker.errors.APIError('container is not running')
        self.execs.append((list(cmd), user))
        if cmd == ['node', '-e', manager.WORKER_HEALTH_SCRIPT]:
            return (1 if self.running_program in self.client.unhealthy else 0), b''
        name, args = cmd[0], cmd[1:]
        if name == 'sha256sum':
            f = self.files.get(args[0])
            return (0, f'{sha(f[0])}  {args[0]}\n'.encode()) if f else (1, b'No such file or directory\n')
        if name == 'chmod':
            data, _, uid = self.files[args[1]]
            self.files[args[1]] = (data, int(args[0], 8), uid)
            return 0, b''
        if name == 'stat':
            _, mode, uid = self.files[args[2]]
            return 0, f'{uid}:{uid}:{mode:o}\n'.encode()
        if name == 'mv':
            assert args[0] == '-f' and user == '0'
            self.files[args[2]] = self.files.pop(args[1])
            return 0, b''
        if name == 'rm':
            assert args[0] == '-f' and user == '0'
            self.files.pop(args[1], None)
            return 0, b''
        return 0, b''  # apply's egress readiness and proxy probe

    def put_archive(self, path, data):
        with tarfile.open(fileobj=io.BytesIO(data)) as tar:
            for m in tar.getmembers():
                self.files[posixpath.join(path, m.name)] = (tar.extractfile(m).read(), m.mode, m.uid)
        return True

    def get_archive(self, path):
        if path not in self.files:
            raise docker.errors.NotFound(path)
        raw = self.archive_override or tar_of([(posixpath.basename(path), self.files[path][0], None)])
        return iter([raw[:100], raw[100:]]), {'name': posixpath.basename(path)}

    def staged(self):
        return [p for p in self.files if '.next-' in p]


class WorkerBase(ServerBase):
    def setUp(self):
        super().setUp()
        p = patch('test_manager.FakeContainer', WorkerContainer)
        p.start()
        self.addCleanup(p.stop)
        p = patch.multiple('manager', WORKER_IDLE_WAIT=0, WORKER_IDLE_INTERVAL=0,
                           WORKER_HEALTH_WAIT=0, WORKER_HEALTH_INTERVAL=0)
        p.start()
        self.addCleanup(p.stop)
        f = self.fake
        f.programs = {'sha256:app1': OLD, 'sha256:app2': NEW, 'sha256:bad': BAD, 'sha256:crash': CRASH}
        f.crashing, f.unhealthy = set(), set()
        f.images.tags.update({'app:new': 'sha256:app2', 'app:bad': 'sha256:bad', 'app:crash': 'sha256:crash',
                              'app:empty': 'sha256:empty'})
        self.created = []
        original = f.containers.create

        def create(image, name=None, **kwargs):
            self.created.append((image, name, kwargs))
            # Docker names an unnamed container itself.
            return original(image, name=name or 'unnamed-%d' % f.tick(), **kwargs)
        f.containers.create = create
        self.apply('21')
        self.target = self.app('21')
        self.target_id = self.target.id
        self.target.execs.clear()  # apply's proxy probe
        self.created.clear()

    def update(self, image='app:new', aid='21'):
        # Never provision: the account container must not be recreated.
        with patch.object(self.m, 'provision', side_effect=AssertionError('provision called')):
            return self.m.update_worker(aid, {'image': image})

    def assert_untouched_identity(self):
        app = self.app('21')
        self.assertIs(app, self.target)
        self.assertEqual(app.id, self.target_id)
        self.assertFalse(app.removed)
        # The only container created is the temporary one for the image (no name, never started).
        for image, name, kwargs in self.created:
            self.assertIsNone(name)
            self.assertEqual(kwargs.get('entrypoint'), ['true'])
        self.assertFalse([n for n in self.fake.containers.items if n.startswith('unnamed-')])  # temporary container removed

    def backups(self, aid='21'):
        folder = Path(self.tmp) / aid / 'worker-backups'
        return sorted(p.name for p in folder.iterdir()) if folder.exists() else []


class WorkerUpdateTests(WorkerBase):
    def test_updated_new_image_path(self):
        runs = len(self.fake.containers.runs)
        result = self.update()
        self.assertEqual(result, {'status': 'updated', 'previous_sha256': sha(OLD), 'sha256': sha(NEW),
                                  'path': WORKER, 'online': True})
        app = self.target
        self.assertEqual(app.files[WORKER], (NEW, 0o755, 0))
        self.assertEqual(app.running_program, NEW)
        self.assertEqual(app.restarts, 1)
        self.assertEqual(app.staged(), [])
        self.assert_untouched_identity()
        self.assertEqual(len(self.created), 1)
        # Privileged steps run as root; the health check as the container user.
        users = {tuple(cmd[:1]): user for cmd, user in app.execs}
        self.assertEqual((users[('sha256sum',)], users[('mv',)], users[('chmod',)]), ('0', '0', '0'))
        self.assertIsNone(users[('node',)])
        # Readiness restored at the old revision after firewall/route/probe again.
        self.assertEqual(len(self.fake.containers.runs), runs + 1)  # the nft/route helper
        self.assertEqual(self.m.online['21'], REV)
        self.assertEqual(self.m.public('21')['status'], 'ready')
        self.assertEqual(self.m.connection('21', REV)['revision'], REV)
        names = self.backups()
        self.assertEqual(len(names), 1)
        self.assertRegex(names[0], r'^\d{8}T\d{6}Z-' + sha(OLD)[:12] + '$')
        self.assertEqual((Path(self.tmp) / '21' / 'worker-backups' / names[0]).read_bytes(), OLD)
        if os.name == 'posix':
            self.assertEqual((Path(self.tmp) / '21' / 'worker-backups' / names[0]).stat().st_mode & 0o777, 0o600)

    def test_updated_legacy_ccgateway_path(self):
        app = self.target
        app.attrs.update(Path='docker-entrypoint.sh', Args=['ccgateway'])
        app.files[LEGACY] = app.files.pop(WORKER)
        app.procs = ['docker-init', 'ccgateway']
        result = self.update()
        self.assertEqual((result['status'], result['path'], result['previous_sha256']), ('updated', LEGACY, sha(OLD)))
        self.assertEqual(app.files[LEGACY], (NEW, 0o755, 0))
        self.assertNotIn(WORKER, app.files)
        self.assertEqual(app.restarts, 1)
        self.assert_untouched_identity()

    def test_unchanged(self):
        self.assertEqual(self.update('app:test'), {'status': 'unchanged', 'sha256': sha(OLD)})
        self.assertEqual(self.target.restarts, 0)
        self.assertEqual(self.backups(), [])
        self.assertEqual(self.m.online['21'], REV)
        self.assert_untouched_identity()

    def test_busy_all_along_changes_nothing(self):
        app = self.target
        app.procs = ['docker-init', 'worker', 'claude']
        with patch.object(manager, 'WORKER_IDLE_WAIT', 0.05):
            self.assertEqual(self.update(), {'status': 'busy'})
        self.assertGreater(app.tops, 1)  # rechecked until the deadline
        self.assertEqual(app.files, {WORKER: (OLD, 0o755, 0)})
        self.assertEqual(app.restarts, 0)
        self.assertEqual(self.backups(), [])
        self.assertEqual(self.m.online['21'], REV)
        self.assert_untouched_identity()

    def test_waits_until_idle(self):
        app = self.target
        app.procs = ['docker-init', 'worker', 'node']

        def finish(c):
            if c.tops == 3:
                c.procs = ['docker-init', 'worker']
        app.top_hook = finish
        with patch.object(manager, 'WORKER_IDLE_WAIT', 5):
            self.assertEqual(self.update()['status'], 'updated')
        self.assertEqual(app.files[WORKER][0], NEW)

    def test_busy_on_second_check_discards_staged_file(self):
        app = self.target

        def become_busy(c):
            if c.tops == 2:
                c.procs = ['docker-init', 'worker', 'claude']
        app.top_hook = become_busy
        self.assertEqual(self.update(), {'status': 'busy'})
        self.assertEqual(app.tops, 2)
        self.assertEqual(app.files, {WORKER: (OLD, 0o755, 0)})  # staged file removed
        self.assertIn(['rm', '-f'], [cmd[:2] for cmd, _ in app.execs])
        self.assertEqual(app.restarts, 0)
        self.assertEqual(self.m.online['21'], REV)
        self.assert_untouched_identity()

    def test_not_running(self):
        self.target.stop()
        self.assertEqual(self.update(), {'status': 'not_running'})
        self.assertEqual(self.target.execs, [])
        self.assertEqual(self.target.restarts, 0)
        self.assert_untouched_identity()

    def test_not_found(self):
        with self.assertRaises(RuntimeNotFound):
            self.update(aid='22')
        self.fake.containers.create('app:test', name='ccg-23-app', labels={LABEL: 'someone-else'})
        with self.assertRaises(RuntimeNotFound):
            self.update(aid='23')

    def test_unsupported_container(self):
        app = self.target
        for path, args in (('/bin/sh', ['-c', 'sleep 1']), ('/opt/bin/worker', []),
                           ('docker-entrypoint.sh', ['./ccgateway'])):
            app.attrs.update(Path=path, Args=args)
            with self.assertRaises(UnsupportedContainer, msg=path):
                self.update()
        app.attrs.update(Path=WORKER, Args=[])
        del app.files[WORKER]  # the command names a program that is not there
        with self.assertRaises(UnsupportedContainer):
            self.update()
        self.assertEqual(app.restarts, 0)
        self.assertEqual(app.files, {})
        self.assert_untouched_identity()

    def test_backup_must_be_a_regular_file(self):
        self.fake.containers.items['ccg-21-app'].archive_override = tar_of([('worker', None, '/elsewhere')])
        with self.assertRaises(UnsupportedContainer):
            self.update()
        self.assertEqual(self.target.files, {WORKER: (OLD, 0o755, 0)})
        self.assertEqual(self.target.restarts, 0)

    def test_rolled_back_when_unhealthy(self):
        self.fake.unhealthy = {BAD}
        self.assertEqual(self.update('app:bad'), {'status': 'rolled_back', 'reason': 'unhealthy', 'online': True})
        app = self.target
        self.assertEqual(app.files, {WORKER: (OLD, 0o755, 0)})
        self.assertEqual((app.restarts, app.running_program), (2, OLD))
        self.assertEqual(self.m.public('21')['status'], 'ready')
        self.assert_untouched_identity()

    def test_rollback_unhealthy(self):
        self.fake.unhealthy = {BAD, OLD}
        self.assertEqual(self.update('app:bad'),
                         {'status': 'rolled_back', 'reason': 'rollback_unhealthy', 'online': False})
        self.assertEqual(self.target.files, {WORKER: (OLD, 0o755, 0)})
        self.assertNotIn('21', self.m.online)
        self.assert_untouched_identity()

    def test_rollback_into_exited_container(self):
        # The new program exits at once: exec is impossible, the backup is
        # written straight into the stopped container and it is started again.
        self.fake.crashing = {CRASH}
        self.assertEqual(self.update('app:crash'), {'status': 'rolled_back', 'reason': 'unhealthy', 'online': True})
        app = self.target
        self.assertEqual(app.files, {WORKER: (OLD, 0o755, 0)})
        self.assertEqual((app.status, app.running_program, app.restarts), ('running', OLD, 2))
        self.assert_untouched_identity()

    def test_failed_restart_is_never_reported_healthy(self):
        # The old process would still answer /health: roll back instead.
        def fail_once(c):
            if c.restarts == 1:
                c.restart_hook = None
                raise docker.errors.APIError('restart failed')
        self.target.restart_hook = fail_once
        self.assertEqual(self.update()['status'], 'rolled_back')
        self.assertEqual(self.target.files, {WORKER: (OLD, 0o755, 0)})
        self.assert_untouched_identity()

    def test_container_changed_before_replacement(self):
        app = self.target

        def mount(c):
            c.attrs['Mounts'].append({'Type': 'bind', 'Destination': '/x'})
        app.top_hook = mount
        with self.assertRaises(ContainerChanged):
            self.update()
        self.assertEqual(app.files, {WORKER: (OLD, 0o755, 0)})
        self.assertEqual(app.restarts, 0)
        self.assertEqual(self.m.online['21'], REV)

    def test_container_changed_after_restart(self):
        app = self.target

        def relabel(c):
            c.labels['other'] = 'x'
        app.restart_hook = relabel
        with self.assertRaises(ContainerChanged):
            self.update()
        self.assertEqual(app.restarts, 1)
        self.assertNotIn('21', self.m.online)
        self.assertFalse(app.removed)

    def test_container_replaced_by_name(self):
        def replace(c):
            self.fake.containers.items.pop(c.name)
            self.fake.containers.create('app:test', name=c.name, labels=dict(c.labels))
        self.target.top_hook = replace
        with self.assertRaises(ContainerChanged):
            self.update()
        self.assertEqual(self.target.restarts, 0)

    def test_activation_failure_only_clears_readiness(self):
        with patch.object(self.m, 'helper', side_effect=RuntimeError('nft failed')):
            result = self.update()
        self.assertEqual((result['status'], result['online']), ('updated', False))
        self.assertNotIn('21', self.m.online)
        self.assertEqual(self.m.public('21')['status'], 'pending')
        self.assertEqual(self.m.state('21')['revision'], REV)
        self.assertEqual(self.target.files[WORKER][0], NEW)
        self.assert_untouched_identity()
        self.assertIn('ccg-21-egress', self.fake.containers.items)
        # The core's next reconciliation restores readiness without recreating anything.
        self.created.clear()
        self.assertEqual(self.apply('21')['status'], 'ready')
        self.assertEqual(self.created, [])
        self.assert_untouched_identity()

    def test_offline_account_is_not_activated(self):
        self.m.online.pop('21')
        runs = len(self.fake.containers.runs)
        result = self.update()
        self.assertEqual((result['status'], result['online']), ('updated', False))
        self.assertEqual(len(self.fake.containers.runs), runs)  # no helper
        self.assertNotIn('21', self.m.online)

    def test_backups_keep_newest_five(self):
        folder = Path(self.tmp) / '21' / 'worker-backups'
        folder.mkdir()
        old = [f'2020010{i}T000000Z-{"a" * 12}' for i in range(1, 7)]
        for name in old + ['notes.txt']:
            (folder / name).write_bytes(b'x')
        self.assertEqual(self.update()['status'], 'updated')
        names = self.backups()
        self.assertIn('notes.txt', names)
        names.remove('notes.txt')
        self.assertEqual(len(names), 5)
        self.assertEqual(names[:4], old[2:])
        self.assertTrue(names[4].endswith(sha(OLD)[:12]))
        # A second update backs up NEW and still keeps five.
        self.assertEqual(self.update('app:test')['status'], 'updated')
        self.assertEqual(len([n for n in self.backups() if n != 'notes.txt']), 5)

    def test_image_without_program(self):
        with self.assertRaises(InvalidImage):
            self.update('app:empty')
        self.assertEqual(len(self.created), 1)
        self.assertFalse([n for n in self.fake.containers.items if n.startswith('unnamed-')])  # removed even on failure
        self.assertEqual(self.target.execs, [])

    def test_pull_failure(self):
        with self.assertRaises(manager.ImagePullFailed):
            self.update('ghcr.io/x/missing:1')
        self.assertEqual(self.created, [])


class ProgramArchiveTests(unittest.TestCase):
    def test_read_single_file(self):
        self.assertEqual(manager.read_single_file(iter([tar_of([('worker', NEW, None)])])), NEW)
        for raw in (tar_of([('worker', None, None)]), tar_of([('worker', None, 'x')]),
                    tar_of([('worker', NEW, None), ('other', OLD, None)]), tar_of([]), b'not a tar' * 100):
            with self.assertRaises(ValueError):
                manager.read_single_file(iter([raw]))
        with self.assertRaises(ValueError):
            manager.read_single_file(iter([tar_of([('worker', NEW, None)])]), limit=10)

    def test_tar_file_is_root_0755(self):
        with tarfile.open(fileobj=io.BytesIO(manager.tar_file('worker.next-x', NEW))) as tar:
            [m] = tar.getmembers()
            self.assertEqual((m.name, m.mode, m.uid, m.gid, m.isreg()), ('worker.next-x', 0o755, 0, 0, True))
            self.assertEqual(tar.extractfile(m).read(), NEW)

    def test_worker_idle_truncates_comm(self):
        class C:
            procs = ['docker-init', 'ccgateway-worker'[:15]]

            def top(self, ps_args):
                return {'Titles': ['PID', 'COMMAND'], 'Processes': [['1', p] for p in self.procs]}
        self.assertTrue(manager.worker_idle(C(), 'ccgateway-worker'))
        self.assertFalse(manager.worker_idle(C(), 'worker'))

    def test_route(self):
        self.assertEqual(ROUTE.fullmatch('/accounts/21/worker')[2], 'worker')
        self.assertIsNone(ROUTE.fullmatch('/accounts/21/worker/x'))


class WorkerHandlerTests(WorkerBase):
    def test_http(self):
        path = '/accounts/21/worker'
        self.assertEqual(self.call('GET', path), (405, {'error': 'method_not_allowed'}))
        for body in (b'not json', {}, {'image': 'app:new', 'x': 1}, {'image': 'App:New'}, [], {'image': 7}):
            self.assertEqual(self.call('POST', path, body), (400, {'error': 'invalid_request'}), body)
        self.assertEqual(self.call('POST', path, b'{"image":"' + b'a' * (64 << 10) + b'"}'),
                         (400, {'error': 'invalid_request'}))
        self.assertEqual(self.call('POST', path, {'image': 'app:empty'}), (400, {'error': 'invalid_image'}))
        self.assertEqual(self.call('POST', path, {'image': 'ghcr.io/x/missing:1'}), (503, {'error': 'image_pull_failed'}))
        self.assertEqual(self.call('POST', '/accounts/22/worker', {'image': 'app:new'}), (404, {'error': 'not_found'}))
        self.assertEqual(self.target.restarts, 0)
        status, body = self.call('POST', path, {'image': 'app:new'})
        self.assertEqual((status, body['status'], body['sha256'], body['online']), (200, 'updated', sha(NEW), True))
        self.assertEqual(self.call('POST', path, {'image': 'app:new'}), (200, {'status': 'unchanged', 'sha256': sha(NEW)}))
        self.assert_untouched_identity()

    def test_http_errors(self):
        path = '/accounts/21/worker'
        self.target.attrs['Path'] = '/bin/sh'
        self.assertEqual(self.call('POST', path, {'image': 'app:new'}), (409, {'error': 'unsupported_container'}))
        self.target.attrs['Path'] = WORKER

        def relabel(c):
            c.labels['other'] = 'x'
        self.target.top_hook = relabel
        self.assertEqual(self.call('POST', path, {'image': 'app:new'}), (503, {'error': 'container_changed'}))
        del self.target.labels['other']

        def broken(c):
            raise docker.errors.APIError('daemon error')
        self.target.top_hook = broken
        self.assertEqual(self.call('POST', path, {'image': 'app:new'}), (503, {'error': 'runtime_unavailable'}))
        self.assertEqual(self.target.files, {WORKER: (OLD, 0o755, 0)})
        self.assertEqual(self.target.restarts, 0)


if __name__ == '__main__':
    unittest.main()
