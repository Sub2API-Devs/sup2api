"""Paired, pinned Worker+CLI activation. Never recreate an account container."""
import contextlib
import json
import posixpath
import re
import secrets
import time
from types import SimpleNamespace

import docker

from common import (BadRequest, RuntimeNotFound, SHA256_HEX as SHA, UnsupportedContainer, VERSION, check,
                    container_env, is_elf, valid_image, worker_session)
from dockerfs import (WORKER_MAX_BYTES, WORKER_SOURCE, container_identity, digest, read_single_file, tar_file,
                      worker_idle, worker_target)

ROOT = '/opt/ccgateway/cli'
ACTIVE = ROOT + '/active-runtime.json'
MAX_CLI = 512 << 20
PATCH = re.compile(r'ccgateway-[a-z0-9-]+')
LEASE = re.compile('[a-f0-9]{48}')
REQUIRED = ('request_direct', 'request_build', 'build_attachment_sources_v2',
            'build_billing_sources_v1', 'build_content_preservation_v1')

# The root is fixed by code. No user path, shell or downloaded official CLI.
TRUST_SCRIPT = r"""
const f=require('fs'),p=require('path'),root='/opt/ccgateway/cli';
for(let q=root;;q=p.dirname(q)){let s=f.lstatSync(q);if(s.isSymbolicLink()||!s.isDirectory()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted CLI root');if(q==='/')break;}
const a=root+'/active-runtime.json';if(f.existsSync(a)){let s=f.lstatSync(a);if(s.isSymbolicLink()||!s.isFile()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted active runtime');}
"""
INFO_SCRIPT = r"""
const f=require('fs'),p=require('path'),c=require('crypto'),cp=require('child_process');
const file=process.argv[1],version=process.argv[2],patch=process.argv[3],sha=process.argv[4];
if(!file.startsWith('/opt/ccgateway/cli/'))throw Error('outside CLI root');
for(let q=file;;q=p.dirname(q)){let s=f.lstatSync(q);if(s.isSymbolicLink()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted CLI path');if(q==='/')break;}
if(c.createHash('sha256').update(f.readFileSync(file)).digest('hex')!==sha)throw Error('CLI hash mismatch');
const i=JSON.parse(cp.execFileSync(file,['--ccgateway-info'],{timeout:15000,maxBuffer:8192,env:{...process.env,DISABLE_AUTOUPDATER:'1'}}));
if(i.version!==version||i.patch!==patch)throw Error('CLI identity mismatch');
for(const k of (process.argv[5]==='legacy'?['request_build']:['request_direct','request_build','build_attachment_sources_v2','build_billing_sources_v1','build_content_preservation_v1']))if(!i.capabilities?.includes(k))throw Error('missing capability');
"""
LEGACY_SNAPSHOT_SCRIPT = r"""
const f=require('fs'),p=require('path'),c=require('crypto'),cp=require('child_process'),expected=JSON.parse(process.argv[1]),root='/opt/ccgateway/cli/';
const file=f.realpathSync(expected.path||'/usr/local/bin/claude');
if(!file.startsWith(root))throw Error('legacy CLI is outside trusted root');
for(let q=file;;q=p.dirname(q)){let s=f.lstatSync(q);if(s.isSymbolicLink()||s.uid!==0||(s.mode&18)!==0)throw Error('untrusted legacy CLI');if(q==='/')break;}
let stat=f.statSync(file);if(!stat.isFile()||stat.size>536870912)throw Error('invalid legacy CLI file');
const sha=c.createHash('sha256').update(f.readFileSync(file)).digest('hex');
const i=JSON.parse(cp.execFileSync(file,['--ccgateway-info'],{timeout:15000,maxBuffer:8192,env:{...process.env,DISABLE_AUTOUPDATER:'1'}}));
if(!/^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$/.test(i.version)||!/^ccgateway-[a-z0-9-]+$/.test(i.patch))throw Error('invalid legacy CLI identity');
if(expected.version&&expected.version!==i.version||expected.sha256&&expected.sha256!==sha||expected.patch&&expected.patch!==i.patch)throw Error('legacy CLI pin mismatch');
const modes=['direct','build'].filter(m=>i.capabilities?.includes('request_'+m));if(modes.length!==2)throw Error('legacy CLI lacks request modes');
process.stdout.write(JSON.stringify({version:i.version,path:file.slice(root.length),sha256:sha,patch:i.patch,modes}));
"""
HEALTH_SCRIPT = ("fetch('http://127.0.0.1:8787/health',{signal:AbortSignal.timeout(3000)})"
                 ".then(async r=>{const x=await r.json();if(r.status!==200||x.cli_version!==process.argv[1]"
                 "||x.cli_patch!==process.argv[2]||x.cli_sha256!==process.argv[3])process.exit(1);"
                 "for(const c of ['build_attachment_sources_v2','build_billing_sources_v1','build_content_preservation_v1','request_policy_mode_v1'])"
                 "if(!x.capabilities?.includes(c))process.exit(1);}).catch(()=>process.exit(1))")


def release_entry(manifest, version):
    if not isinstance(manifest, dict) or not VERSION.fullmatch(version or ''):
        raise ValueError('invalid runtime manifest')
    versions = manifest.get('versions')
    item = versions.get(version) if isinstance(versions, dict) else None
    if not isinstance(item, dict):
        raise ValueError('requested CLI is not packaged')
    path, checksum, patch = item.get('path'), item.get('sha256'), item.get('patch')
    modes = item.get('modes')
    if (not isinstance(path, str) or not path or posixpath.isabs(path) or '\\' in path or
            any(part in ('', '.', '..') for part in path.split('/')) or
            not isinstance(checksum, str) or not SHA.fullmatch(checksum) or
            not isinstance(patch, str) or not PATCH.fullmatch(patch) or
            not isinstance(modes, list) or not all(mode in modes for mode in ('direct', 'build'))):
        raise ValueError('invalid packaged runtime identity')
    return dict(item)


def maintenance(state, action, lease=''):
    with worker_session() as session:
        body = {'action': action}
        if lease:
            body['lease'] = lease
        result = session.post('http://' + state['app_ip'] + ':8787/admin/runtime',
                              json=body, headers={'Authorization': 'Bearer ' + state['admin_key']},
                              timeout=(5, 10), allow_redirects=False)
        if result.status_code == 409:
            return None
        if result.status_code != 200 or len(result.content) > 4096:
            raise RuntimeError('Worker lacks paired runtime maintenance; upgrade Worker first')
        value = result.json()
        if not isinstance(value, dict) or value.get('active_requests') != 0:
            raise RuntimeError('invalid runtime maintenance acknowledgement')
        return value


def resume(state, lease):
    """Reopen the Worker's admission; True when it acknowledged. Never raises:
    a lost answer must not undo a verified pair."""
    with contextlib.suppress(Exception):
        return maintenance(state, 'resume', lease) is not None
    return False


def selection_bytes(selection, lease=None):
    """The active-runtime pointer; with a lease it keeps admission paused
    across the restart (the new Worker reads it)."""
    if lease:
        selection = {**selection, 'maintenance_lease': lease, 'maintenance_expires': int(time.time()) + 300}
    return json.dumps(selection).encode()


class RuntimeUpdates:
    def __init__(self, manager):
        self.m = manager

    def package(self, image, version):
        m = self.m
        m.ensure_image(image)
        temp = m.docker.containers.create(image, entrypoint=['true'], network_disabled=True)
        try:
            def read(path, limit):
                chunks, _ = temp.get_archive(path)
                return read_single_file(chunks, limit)
            manifest = json.loads(read(ROOT + '/manifest.json', 65536))
            entry = release_entry(manifest, version)
            cli = read(ROOT + '/' + entry['path'], MAX_CLI)
            if not is_elf(cli) or digest(cli) != entry['sha256']:
                raise ValueError('packaged CLI checksum or binary format mismatch')
            worker = read(WORKER_SOURCE, WORKER_MAX_BYTES)
            if not is_elf(worker):
                raise ValueError('packaged Worker is not a Linux executable')
            return worker, cli, entry
        finally:
            temp.remove(force=True)

    @staticmethod
    def write(container, path, raw):
        if not container.put_archive(posixpath.dirname(path), tar_file(posixpath.basename(path), raw)):
            raise RuntimeError('runtime file copy failed')
        chunks, _ = container.get_archive(path)
        if read_single_file(chunks, max(len(raw), 65536)) != raw:
            raise RuntimeError('runtime file verification failed')

    def prior_selection(self, container):
        """Return exact pointer or an equivalent pinned fallback for rollback,
        including when the new Worker exits before exec can remove a pointer."""
        try:
            chunks, _ = container.get_archive(ACTIVE)
            return read_single_file(chunks, 65536)
        except docker.errors.NotFound:
            return self.legacy_selection(container)

    def legacy_selection(self, container):
        env = container_env(container)
        expected = {'path': env.get('WORKER_CLI_PATH', '/usr/local/bin/claude'),
                    'version': env.get('WORKER_CLI_VERSION', ''), 'sha256': env.get('CCG_CLI_SHA256', ''),
                    'patch': env.get('CCG_CLI_PATCH', '')}
        code, raw = container.exec_run(['node', '-e', LEGACY_SNAPSHOT_SCRIPT, json.dumps(expected)], user='0')
        if code != 0 or len(raw) > 4096:
            raise RuntimeError('previous CLI identity cannot be recovered safely')
        snapshot = json.loads(raw)
        version = snapshot.pop('version')
        entry = release_entry({'versions': {version: snapshot}}, version)
        # Older images packaged the sealed binary without a manifest.
        # Preserve that exact file and record its observed identity as a
        # rollback selection; never download or replace the legacy CLI.
        manifest_name = 'legacy-snapshot-' + entry['sha256'][:12] + '-' + secrets.token_hex(6) + '.json'
        self.write(container, ROOT + '/' + manifest_name, json.dumps({'versions': {version: entry}}).encode())
        native = env.get('CCG_REQUEST_MODE') == 'native'
        return json.dumps({'schema_version': 1, 'manifest': manifest_name, 'version': version,
                           'request_mode': 'build' if native else env.get('CCG_REQUEST_MODE', 'build'),
                           'maintenance_only': native}).encode()

    def healthy(self, aid, identity, entry, version):
        container = self.m._same(aid, identity)
        code, _ = container.exec_run(['node', '-e', HEALTH_SCRIPT, version, entry['patch'], entry['sha256']])
        return code == 0

    # The activation: begin (checks, backup, pause) -> switch (stage, swap,
    # restart, verify) -> commit; after the swap, any failure rolls back.

    def update(self, aid, desired):
        if (not isinstance(desired, dict) or set(desired) != {'image', 'components', 'cli_version'} or
                desired['components'] != ['worker', 'cli'] or not valid_image(desired['image']) or
                not isinstance(desired['cli_version'], str) or not VERSION.fullmatch(desired['cli_version'])):
            raise BadRequest('invalid paired runtime update')
        check(aid)
        version = desired['cli_version']
        worker, cli, entry = self.package(desired['image'], version)
        with self.m.guard(aid):
            pair = self._begin(aid, version, worker, cli, entry)
            if isinstance(pair, dict):
                return pair  # not_running or busy: nothing changed
            return self._run(pair)

    def _run(self, pair):
        try:
            return self._switch(pair)
        except Exception:
            if not pair.switched:
                raise
            if pair.reopened:
                # The pair has been verified and possibly serves new work.
                # Failure to restore routing/readiness is not a reason to
                # restart a live process or revert its installed files.
                return self._updated(pair, online=False)
            return self._roll_back(pair)
        finally:
            if pair.staged:
                self.m._discard(pair.container, pair.staged)
            if not pair.switched or pair.safe:
                resume(pair.state, pair.lease)

    def _begin(self, aid, version, worker, cli, entry):
        """The running container, verified and backed up, its admission
        paused; or the answer when nothing can be done now."""
        m = self.m
        try:
            container = m.owned(aid, 'app')
        except docker.errors.NotFound as exc:
            raise RuntimeNotFound('no account container') from exc
        if container.status != 'running':
            return {'status': 'not_running'}
        identity = container_identity(container)
        target, base = worker_target(container)
        previous = m._sha256(container, target)
        if previous is None:
            raise UnsupportedContainer('worker program not readable')
        code, _ = container.exec_run(['node', '-e', TRUST_SCRIPT], user='0')
        if code != 0:
            raise UnsupportedContainer('CLI root is not trusted; cannot activate in place')
        state = m.state(aid)
        pair = SimpleNamespace(aid=aid, version=version, worker=worker, cli=cli, entry=entry, digest=digest(worker),
                               container=container, identity=identity, target=target, base=base, previous=previous,
                               state=state, previous_state=json.loads(json.dumps(state)),
                               revision=state.get('revision', ''), prior=self.prior_selection(container),
                               staged=None, switched=False, safe=False, reopened=False, lease='')
        pair.old = m._backup_worker(aid, container, target, previous)
        if m._wait_idle(aid, identity, base) is None:
            return {'status': 'busy'}
        paused = maintenance(state, 'pause')
        if paused is None:
            return {'status': 'busy'}
        pair.lease = paused.get('lease')
        if not isinstance(pair.lease, str) or not LEASE.fullmatch(pair.lease):
            raise RuntimeError('invalid maintenance lease')
        pair.was_online = bool(pair.revision) and m.online.get(aid) == pair.revision
        return pair

    def _stage_release(self, pair):
        """A new immutable release directory with the CLI and its manifest;
        an active CLI is never overwritten. Returns the directory name."""
        entry, container = pair.entry, pair.container
        release = entry['patch'] + '-' + entry['sha256'][:12] + '-' + secrets.token_hex(6)
        folder = ROOT + '/' + release
        code, _ = container.exec_run(['mkdir', '-m', '0755', folder], user='0')
        if code != 0:
            raise RuntimeError('cannot stage runtime release')
        self.write(container, folder + '/claude', pair.cli)
        self.write(container, folder + '/manifest.json',
                   json.dumps({'versions': {pair.version: {**entry, 'path': 'claude'}}}).encode())
        code, _ = container.exec_run(['node', '-e', INFO_SCRIPT, folder + '/claude',
                                      pair.version, entry['patch'], entry['sha256']], user='0')
        if code != 0:
            raise RuntimeError('staged CLI identity/capabilities failed verification')
        return release

    def _switch(self, pair):
        m = self.m
        pair.container = m._same(pair.aid, pair.identity)
        release = self._stage_release(pair)
        pair.staged = m._stage(pair.container, pair.target, pair.worker, pair.digest)
        if maintenance(pair.state, 'validate', pair.lease) is None or not worker_idle(pair.container, pair.base):
            return {'status': 'busy'}
        selected = {'schema_version': 1, 'manifest': release + '/manifest.json',
                    'version': pair.version, 'request_mode': 'build'}
        pointer = self._stage_pointer(pair, selection_bytes(selected, pair.lease))
        m._same(pair.aid, pair.identity)
        m.online.pop(pair.aid, None)
        # Both swaps happen while admission is paused; no model calls can
        # observe a mixed Worker/CLI pair.
        pair.switched = True
        m._swap(pair.container, pointer, ACTIVE)
        m._swap(pair.container, pair.staged, pair.target)
        pair.staged = None
        if not m._restart_healthy(pair.aid, pair.identity) or not self.healthy(pair.aid, pair.identity, pair.entry, pair.version):
            raise RuntimeError('new runtime health/identity failed')
        return self._commit(pair, selected)

    def _stage_pointer(self, pair, raw):
        return self.m._stage(pair.container, ACTIVE, raw, digest(raw))

    def _commit(self, pair, selected):
        """Carry the admission pause across the restart; remove the persisted
        lease before releasing it in the new Worker process."""
        m = self.m
        pair.container = m._same(pair.aid, pair.identity)
        m._swap(pair.container, self._stage_pointer(pair, selection_bytes(selected)), ACTIVE)
        pair.state['active_runtime'] = {'version': pair.version, 'patch': pair.entry['patch'],
                                        'sha256': pair.entry['sha256'], 'worker_sha256': pair.digest,
                                        'container_id': pair.container.id, 'container_identity': pair.identity}
        m.save(pair.aid, pair.state)
        pair.safe = True
        # Once admission may have reopened, never roll back/restart: a lost
        # resume response must not kill a newly accepted call.
        pair.reopened = True
        return self._updated(pair, online=self._reopen(pair, pair.state))

    def _reopen(self, pair, state):
        """Resume admission, then readiness if the runtime was online."""
        online = False
        if resume(state, pair.lease) and pair.was_online:
            with contextlib.suppress(Exception):
                online = self.m._reactivate(pair.aid, pair.identity, pair.revision)
        return online

    def _updated(self, pair, online):
        return {'status': 'updated', 'sha256': pair.digest, 'cli_version': pair.version,
                'cli_patch': pair.entry['patch'], 'cli_sha256': pair.entry['sha256'], 'online': online}

    def _roll_back(self, pair):
        """The previous pointer and Worker back, the previous state saved;
        admission reopens only once the old pair is healthy again."""
        m = self.m
        pair.container = m._same(pair.aid, pair.identity)
        self.write(pair.container, ACTIVE, selection_bytes(json.loads(pair.prior), pair.lease))
        m._restore(pair.aid, pair.identity, pair.target, pair.old, pair.previous)
        m.save(pair.aid, pair.previous_state)
        healthy = m._restart_healthy(pair.aid, pair.identity)
        online = False
        if healthy:
            pair.container = m._same(pair.aid, pair.identity)
            m._swap(pair.container, self._stage_pointer(pair, pair.prior), ACTIVE)
            pair.safe = pair.reopened = True
            online = self._reopen(pair, pair.previous_state)
        return {'status': 'rolled_back', 'reason': 'unhealthy' if healthy else 'rollback_unhealthy', 'online': online}
