"""In-place Worker update (CONTRACTS §53.7) as a Manager mixin.

The account container is never provisioned, created, removed or recreated:
its program file is replaced and only it is restarted. The paired Worker+CLI
activation (runtime_updates.RuntimeUpdates) reuses the public steps below
(running_worker, same_container, wait_idle, backup_worker, restore_worker,
restart_healthy, reactivate); container files go through dockerfs.
"""
from datetime import datetime, timezone
import contextlib
import logging
import os
import re
import time
from types import SimpleNamespace

import docker
import requests

from common import (ACCOUNT_PORT, ContainerChanged, InvalidImage, RuntimeNotFound, UnsupportedContainer,
                    check, failure_text, single_image, write_private_bytes)
import dockerfs
from dockerfs import WORKER_SOURCE, container_identity, image_container, read_file, worker_idle, worker_target

log = logging.getLogger('ccgateway.controller')

WORKER_BACKUPS = 5
WORKER_BACKUP_NAME = re.compile(r'[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}')
WORKER_IDLE_WAIT, WORKER_IDLE_INTERVAL = 120, 2
WORKER_HEALTH_WAIT, WORKER_HEALTH_INTERVAL = 30, 1
WORKER_RESTART_TIMEOUT = 30
WORKER_HEALTH_SCRIPT = (f"fetch('http://127.0.0.1:{ACCOUNT_PORT}/health',{{signal:AbortSignal.timeout(3000)}})"
                        ".then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))")


class WorkerUpdates:
    def worker_program(self, ref):
        """Step 1: the program of image ref (from a never-started temporary container) and its SHA-256."""
        self.ensure_image(ref)
        with image_container(self.docker, ref) as temp:
            try:
                data = read_file(temp, WORKER_SOURCE)
            except (docker.errors.NotFound, ValueError) as e:
                raise InvalidImage('image has no worker program') from e
        return data, dockerfs.digest(data)

    def running_worker(self, aid):
        """What an in-place update starts from: the running app container,
        its identity, the worker program's path and name and its SHA-256.
        None when the container is not running; RuntimeNotFound when the
        runtime has no app container of its own."""
        try:
            container = self.owned(aid, 'app')
        except (docker.errors.NotFound, ValueError) as e:
            raise RuntimeNotFound('no account container') from e
        if container.status != 'running':
            return None
        target, base = worker_target(container)
        previous = dockerfs.sha256_in(container, target)
        if previous is None:
            raise UnsupportedContainer('worker program not readable')
        return SimpleNamespace(container=container, identity=container_identity(container), target=target,
                               base=base, previous=previous)

    def same_container(self, aid, identity):
        """The account's app container, provided it is still the one the update started on."""
        try:
            container = self.owned(aid, 'app')
        except (docker.errors.NotFound, ValueError) as e:
            raise ContainerChanged('account container changed') from e
        if container_identity(container) != identity:
            raise ContainerChanged('account container changed')
        return container

    def wait_idle(self, aid, identity, base):
        """The same container once no CLI request runs in it; None when it stayed busy."""
        deadline = time.monotonic() + WORKER_IDLE_WAIT
        while True:
            container = self.same_container(aid, identity)
            if worker_idle(container, base):
                return container
            if time.monotonic() >= deadline:
                return None
            time.sleep(WORKER_IDLE_INTERVAL)

    def backup_worker(self, aid, container, target, sha256):
        """Step 6: <root>/<key>/worker-backups/<UTC time>-<sha[:12]>, 0600, newest 5 kept."""
        try:
            data = read_file(container, target)
        except ValueError as e:
            raise UnsupportedContainer('worker program is not a regular file') from e
        if dockerfs.digest(data) != sha256:
            raise RuntimeError('backup differs from the installed program')
        folder = self.dir(aid) / 'worker-backups'
        folder.mkdir(mode=0o700, exist_ok=True)
        os.chmod(folder, 0o700)
        name = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + sha256[:12]
        write_private_bytes(folder / name, data)
        backups = sorted(p for p in folder.iterdir()
                         if WORKER_BACKUP_NAME.fullmatch(p.name) and p.is_file() and not p.is_symlink())
        for old in backups[:-WORKER_BACKUPS]:
            old.unlink()
        return data

    def _worker_healthy(self, aid, identity):
        deadline = time.monotonic() + WORKER_HEALTH_WAIT
        while True:
            container = self.same_container(aid, identity)
            if container.status != 'running':
                return False  # exited: no restart policy brings it back
            with contextlib.suppress(docker.errors.APIError):
                code, _ = container.exec_run(['node', '-e', WORKER_HEALTH_SCRIPT])
                if code == 0:
                    return True
            if time.monotonic() >= deadline:
                return False
            time.sleep(WORKER_HEALTH_INTERVAL)

    def restart_healthy(self, aid, identity):
        """Restart only this container; healthy only if it really restarted and answers /health."""
        container = self.same_container(aid, identity)
        before = container.attrs['State'].get('StartedAt')
        with contextlib.suppress(docker.errors.APIError, requests.exceptions.RequestException):
            container.restart(timeout=WORKER_RESTART_TIMEOUT)
        container = self.same_container(aid, identity)
        if container.attrs['State'].get('StartedAt') == before:
            return False  # the old process may still be serving /health
        self._refence(aid, container)
        return self._worker_healthy(aid, identity)

    def _refence(self, aid, container):
        """Put the business rules back right after a restart instead of only
        after the health wait (audit B4: the new namespace has no rules).
        Best effort; reactivate installs them again and decides readiness."""
        gateway = (self.state(aid) or {}).get('gateway_ip')
        if not gateway or container.status != 'running':
            return
        try:
            self.business_firewall(aid, container, gateway)
        except Exception as e:
            log.warning('refence key=%s failed: %s', aid, failure_text(e))

    def restore_worker(self, aid, identity, target, data, sha256):
        """Put the backup back: temporary file + mv while running; written
        directly into a stopped container (exec is impossible there and
        nothing executes the file)."""
        container = self.same_container(aid, identity)
        if container.status == 'running':
            dockerfs.swap(container, dockerfs.stage(container, target, data, sha256), target)
            return
        dockerfs.write_file(container, target, data)

    def reactivate(self, aid, identity, revision):
        """Step 9: firewall, route and probe again; readiness at the old revision or none."""
        app = self.same_container(aid, identity)
        try:
            state = self.state(aid)
            if not state or state.get('revision') != revision:
                raise RuntimeError('revision changed')
            if state.get('egress_backend') == 'shared_xray':
                self.shared.apply(aid, state, self.shared.desired(aid))
            else:
                self.activate(aid, state, app, self.owned(aid, 'egress'), revision)
            return True
        except Exception as e:
            # The core's next reconciliation applies the configuration again;
            # nothing is recreated here.
            log.warning('reactivate key=%s failed: %s', aid, failure_text(e))
            self.go_offline(aid)
            return False

    def update_worker(self, aid, desired):
        """POST /accounts/<key>/worker {"image": ref} (CONTRACTS §53.7)."""
        check(aid)
        ref = single_image(desired)
        data, sha256 = self.worker_program(ref)
        with self.guard(aid):
            return self._update_worker_locked(aid, data, sha256)

    def _update_worker_locked(self, aid, data, sha256):
        worker = self.running_worker(aid)
        if worker is None:
            return {'status': 'not_running'}
        if worker.previous == sha256:
            return {'status': 'unchanged', 'sha256': sha256}
        container = self.wait_idle(aid, worker.identity, worker.base)
        if container is None:
            return {'status': 'busy'}
        old = self.backup_worker(aid, container, worker.target, worker.previous)
        tmp = dockerfs.stage(container, worker.target, data, sha256)
        container = self._still_idle(aid, worker, container, tmp)
        if container is None:
            return {'status': 'busy'}
        state = self.state(aid) or {}
        revision = state.get('revision', '')
        was_online = bool(revision) and self.readiness(aid, state) == revision
        self.go_offline(aid)
        dockerfs.swap(container, tmp, worker.target)
        if self.restart_healthy(aid, worker.identity):
            result = {'status': 'updated', 'previous_sha256': worker.previous, 'sha256': sha256,
                      'path': worker.target}
        else:
            self.restore_worker(aid, worker.identity, worker.target, old, worker.previous)
            if not self.restart_healthy(aid, worker.identity):
                return {'status': 'rolled_back', 'reason': 'rollback_unhealthy', 'online': False}
            result = {'status': 'rolled_back', 'reason': 'unhealthy'}
        result['online'] = was_online and self.reactivate(aid, worker.identity, revision)
        return result

    def _still_idle(self, aid, worker, container, tmp):
        """The same, still idle container right before the swap; None (and
        the staged file discarded) when a request started meanwhile."""
        try:
            container = self.same_container(aid, worker.identity)
            idle = worker_idle(container, worker.base)
        except BaseException:
            dockerfs.discard(container, tmp)
            raise
        if not idle:
            dockerfs.discard(container, tmp)
            return None
        return container
