"""In-place Worker update (CONTRACTS §53.7) as a Manager mixin.

The account container is never provisioned, created, removed or recreated:
its program file is replaced and only it is restarted. The paired Worker+CLI
activation (runtime_updates.RuntimeUpdates) reuses these steps.
"""
from datetime import datetime, timezone
import contextlib
import logging
import os
import posixpath
import re
import time

import docker
import requests

from common import (BadRequest, ContainerChanged, InvalidImage, RuntimeNotFound, UnsupportedContainer, check,
                    valid_image, write_private_bytes)
import dockerfs
from dockerfs import WORKER_DIR, WORKER_SOURCE, container_identity, read_single_file, tar_file, worker_idle, worker_target
from runtime_updates import RuntimeUpdates

log = logging.getLogger('ccgateway.controller')

WORKER_BACKUPS = 5
WORKER_BACKUP_NAME = re.compile(r'[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}')
WORKER_IDLE_WAIT, WORKER_IDLE_INTERVAL = 120, 2
WORKER_HEALTH_WAIT, WORKER_HEALTH_INTERVAL = 30, 1
WORKER_RESTART_TIMEOUT = 30
WORKER_HEALTH_SCRIPT = ("fetch('http://127.0.0.1:8787/health',{signal:AbortSignal.timeout(3000)})"
                        ".then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))")


class WorkerUpdates:
    # Container file steps; static so runtime_updates and tests can use them.
    _sha256 = staticmethod(dockerfs.sha256_in)
    _discard = staticmethod(dockerfs.discard)
    _stage = staticmethod(dockerfs.stage)
    _swap = staticmethod(dockerfs.swap)

    def worker_program(self, ref):
        """Step 1: the program of image ref (from a never-started temporary container) and its SHA-256."""
        self.ensure_image(ref)
        temp = self.docker.containers.create(ref, entrypoint=['true'], network_disabled=True)
        try:
            try:
                chunks, _ = temp.get_archive(WORKER_SOURCE)
                data = read_single_file(chunks)
            except (docker.errors.NotFound, ValueError) as e:
                raise InvalidImage('image has no worker program') from e
        finally:
            with contextlib.suppress(docker.errors.DockerException, requests.exceptions.RequestException):
                temp.remove(force=True)
        return data, dockerfs.digest(data)

    def _same(self, aid, identity):
        """The account's app container, provided it is still the one the update started on."""
        try:
            container = self.owned(aid, 'app')
        except (docker.errors.NotFound, ValueError) as e:
            raise ContainerChanged('account container changed') from e
        if container_identity(container) != identity:
            raise ContainerChanged('account container changed')
        return container

    def _wait_idle(self, aid, identity, base):
        deadline = time.monotonic() + WORKER_IDLE_WAIT
        while True:
            container = self._same(aid, identity)
            if worker_idle(container, base):
                return container
            if time.monotonic() >= deadline:
                return None
            time.sleep(WORKER_IDLE_INTERVAL)

    def _backup_worker(self, aid, container, target, digest):
        """Step 6: <root>/<key>/worker-backups/<UTC time>-<sha[:12]>, 0600, newest 5 kept."""
        chunks, _ = container.get_archive(target)
        try:
            data = read_single_file(chunks)
        except ValueError as e:
            raise UnsupportedContainer('worker program is not a regular file') from e
        if dockerfs.digest(data) != digest:
            raise RuntimeError('backup differs from the installed program')
        folder = self.dir(aid) / 'worker-backups'
        folder.mkdir(mode=0o700, exist_ok=True)
        os.chmod(folder, 0o700)
        name = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + digest[:12]
        write_private_bytes(folder / name, data)
        backups = sorted(p for p in folder.iterdir()
                         if WORKER_BACKUP_NAME.fullmatch(p.name) and p.is_file() and not p.is_symlink())
        for old in backups[:-WORKER_BACKUPS]:
            old.unlink()
        return data

    def _worker_healthy(self, aid, identity):
        deadline = time.monotonic() + WORKER_HEALTH_WAIT
        while True:
            container = self._same(aid, identity)
            if container.status != 'running':
                return False  # exited: no restart policy brings it back
            with contextlib.suppress(docker.errors.APIError):
                code, _ = container.exec_run(['node', '-e', WORKER_HEALTH_SCRIPT])
                if code == 0:
                    return True
            if time.monotonic() >= deadline:
                return False
            time.sleep(WORKER_HEALTH_INTERVAL)

    def _restart_healthy(self, aid, identity):
        """Restart only this container; healthy only if it really restarted and answers /health."""
        container = self._same(aid, identity)
        before = container.attrs['State'].get('StartedAt')
        with contextlib.suppress(docker.errors.APIError, requests.exceptions.RequestException):
            container.restart(timeout=WORKER_RESTART_TIMEOUT)
        container = self._same(aid, identity)
        if container.attrs['State'].get('StartedAt') == before:
            return False  # the old process may still be serving /health
        self._refence(aid, container)
        return self._worker_healthy(aid, identity)

    def _refence(self, aid, container):
        """Put the business rules back right after a restart instead of only
        after the health wait (audit B4: the new namespace has no rules).
        Best effort; _reactivate installs them again and decides readiness."""
        gateway = (self.state(aid) or {}).get('gateway_ip')
        if not gateway or container.status != 'running':
            return
        try:
            self.business_firewall(aid, container, gateway)
        except Exception as e:
            log.warning('refence key=%s failed: %s: %s', aid, type(e).__name__, str(e)[:300])

    def _restore(self, aid, identity, target, data, digest):
        """Put the backup back: temporary file + mv while running; written
        directly into a stopped container (exec is impossible there and
        nothing executes the file)."""
        container = self._same(aid, identity)
        if container.status == 'running':
            self._swap(container, self._stage(container, target, data, digest), target)
            return
        if not container.put_archive(WORKER_DIR, tar_file(posixpath.basename(target), data)):
            raise RuntimeError('restore failed')
        chunks, _ = container.get_archive(target)
        if dockerfs.digest(read_single_file(chunks)) != digest:
            raise RuntimeError('restored program differs')

    def _reactivate(self, aid, identity, revision):
        """Step 9: firewall, route and probe again; readiness at the old revision or none."""
        app = self._same(aid, identity)
        try:
            state = self.state(aid)
            if not state or state.get('revision') != revision:
                raise RuntimeError('revision changed')
            if state.get('egress_backend') == 'shared_xray':
                self.shared.apply(aid, state, self.shared.desired(aid))
            else:
                self._activate(aid, state, app, self.owned(aid, 'egress'), revision)
            return True
        except Exception as e:
            # The core's next reconciliation applies the configuration again;
            # nothing is recreated here.
            log.warning('reactivate key=%s failed: %s: %s', aid, type(e).__name__, str(e)[:300])
            self.online.pop(aid, None)
            return False

    def update_worker(self, aid, desired):
        """POST /accounts/<key>/worker {"image": ref} (CONTRACTS §53.7)."""
        if isinstance(desired, dict) and 'components' in desired:
            return RuntimeUpdates(self).update(aid, desired)
        check(aid)
        ref = desired.get('image') if isinstance(desired, dict) and set(desired) == {'image'} else None
        if not valid_image(ref):
            raise BadRequest('invalid image reference')
        data, digest = self.worker_program(ref)
        with self.guard(aid):
            return self._update_worker_locked(aid, data, digest)

    def _update_worker_locked(self, aid, data, digest):
        try:
            container = self.owned(aid, 'app')
        except (docker.errors.NotFound, ValueError) as e:
            raise RuntimeNotFound('no account container') from e
        if container.status != 'running':
            return {'status': 'not_running'}
        identity = container_identity(container)
        target, base = worker_target(container)
        previous = self._sha256(container, target)
        if previous is None:
            raise UnsupportedContainer('worker program not readable')
        if previous == digest:
            return {'status': 'unchanged', 'sha256': digest}
        container = self._wait_idle(aid, identity, base)
        if container is None:
            return {'status': 'busy'}
        old = self._backup_worker(aid, container, target, previous)
        tmp = self._stage(container, target, data, digest)
        container = self._still_idle(aid, identity, base, container, tmp)
        if container is None:
            return {'status': 'busy'}
        self.public(aid)  # drops readiness that no longer matches the containers
        revision = (self.state(aid) or {}).get('revision', '')
        was_online = bool(revision) and self.online.get(aid) == revision
        self.online.pop(aid, None)
        self._swap(container, tmp, target)
        if self._restart_healthy(aid, identity):
            result = {'status': 'updated', 'previous_sha256': previous, 'sha256': digest, 'path': target}
        else:
            self._restore(aid, identity, target, old, previous)
            if not self._restart_healthy(aid, identity):
                return {'status': 'rolled_back', 'reason': 'rollback_unhealthy', 'online': False}
            result = {'status': 'rolled_back', 'reason': 'unhealthy'}
        result['online'] = was_online and self._reactivate(aid, identity, revision)
        return result

    def _still_idle(self, aid, identity, base, container, tmp):
        """The same, still idle container right before the swap; None (and
        the staged file discarded) when a request started meanwhile."""
        try:
            container = self._same(aid, identity)
            idle = worker_idle(container, base)
        except BaseException:
            self._discard(container, tmp)
            raise
        if not idle:
            self._discard(container, tmp)
            return None
        return container
