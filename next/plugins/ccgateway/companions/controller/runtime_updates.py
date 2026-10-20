"""Paired, pinned Worker+CLI activation. Never recreate an account container."""
import contextlib
import hashlib
import json
import posixpath
import re
import secrets
import time

ROOT = '/opt/ccgateway/cli'
ACTIVE = ROOT + '/active-runtime.json'
MAX_CLI = 512 << 20
VERSION = re.compile(r'[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}')
PATCH = re.compile(r'ccgateway-[a-z0-9-]+')
SHA = re.compile(r'[a-f0-9]{64}')
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
    import requests
    with requests.Session() as session:
        session.trust_env = False
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


class RuntimeUpdates:
    def __init__(self, manager):
        self.m = manager

    def package(self, image, version):
        from manager import read_single_file, WORKER_SOURCE, WORKER_MAX_BYTES
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
            if not cli.startswith(b'\x7fELF') or hashlib.sha256(cli).hexdigest() != entry['sha256']:
                raise ValueError('packaged CLI checksum or binary format mismatch')
            worker = read(WORKER_SOURCE, WORKER_MAX_BYTES)
            if not worker.startswith(b'\x7fELF'):
                raise ValueError('packaged Worker is not a Linux executable')
            return worker, cli, entry
        finally:
            temp.remove(force=True)

    @staticmethod
    def write(container, path, raw):
        from manager import tar_file, read_single_file
        if not container.put_archive(posixpath.dirname(path), tar_file(posixpath.basename(path), raw)):
            raise RuntimeError('runtime file copy failed')
        chunks, _ = container.get_archive(path)
        if read_single_file(chunks, max(len(raw), 65536)) != raw:
            raise RuntimeError('runtime file verification failed')

    def prior_selection(self, container):
        """Return exact pointer or an equivalent pinned fallback for rollback,
        including when the new Worker exits before exec can remove a pointer."""
        import docker
        from manager import read_single_file
        try:
            chunks, _ = container.get_archive(ACTIVE)
            return read_single_file(chunks, 65536)
        except docker.errors.NotFound:
            env = dict(item.split('=', 1) for item in container.attrs['Config'].get('Env', []) if '=' in item)
            expected = {'path':env.get('WORKER_CLI_PATH','/usr/local/bin/claude'),
                        'version':env.get('WORKER_CLI_VERSION',''), 'sha256':env.get('CCG_CLI_SHA256',''),
                        'patch':env.get('CCG_CLI_PATCH','')}
            code, raw = container.exec_run(['node','-e',LEGACY_SNAPSHOT_SCRIPT,json.dumps(expected)],user='0')
            if code != 0 or len(raw) > 4096:
                raise RuntimeError('previous CLI identity cannot be recovered safely')
            snapshot=json.loads(raw)
            version=snapshot.pop('version')
            entry=release_entry({'versions':{version:snapshot}},version)
            # Older images packaged the sealed binary without a manifest.
            # Preserve that exact file and record its observed identity as a
            # rollback selection; never download or replace the legacy CLI.
            manifest_name='legacy-snapshot-'+entry['sha256'][:12]+'-'+secrets.token_hex(6)+'.json'
            self.write(container,ROOT+'/'+manifest_name,json.dumps({'versions':{version:entry}}).encode())
            native = env.get('CCG_REQUEST_MODE') == 'native'
            return json.dumps({'schema_version': 1, 'manifest': manifest_name, 'version': version,
                               'request_mode': 'build' if native else env.get('CCG_REQUEST_MODE', 'build'),
                               'maintenance_only': native}).encode()

    def healthy(self, aid, identity, entry, version):
        container = self.m._same(aid, identity)
        script = ("fetch('http://127.0.0.1:8787/health',{signal:AbortSignal.timeout(3000)})"
                  ".then(async r=>{const x=await r.json();if(r.status!==200||x.cli_version!==process.argv[1]"
                  "||x.cli_patch!==process.argv[2]||x.cli_sha256!==process.argv[3])process.exit(1);"
                  "for(const c of ['build_attachment_sources_v2','build_billing_sources_v1','build_content_preservation_v1','request_policy_mode_v1'])"
                  "if(!x.capabilities?.includes(c))process.exit(1);}).catch(()=>process.exit(1))")
        code, _ = container.exec_run(['node', '-e', script, version, entry['patch'], entry['sha256']])
        return code == 0

    def update(self, aid, desired):
        from manager import (BadRequest, RuntimeNotFound, UnsupportedContainer, check, valid_image,
                             container_identity, worker_target, worker_idle)
        import docker
        if (not isinstance(desired, dict) or set(desired) != {'image', 'components', 'cli_version'} or
                desired['components'] != ['worker', 'cli'] or not valid_image(desired['image']) or
                not isinstance(desired['cli_version'], str) or not VERSION.fullmatch(desired['cli_version'])):
            raise BadRequest('invalid paired runtime update')
        check(aid)
        version, m = desired['cli_version'], self.m
        worker, cli, entry = self.package(desired['image'], version)
        digest = hashlib.sha256(worker).hexdigest()
        with m.guard(aid):
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
            previous_state = json.loads(json.dumps(state))
            revision = state.get('revision', '')
            prior = self.prior_selection(container)
            old = m._backup_worker(aid, container, target, previous)
            if m._wait_idle(aid, identity, base) is None:
                return {'status': 'busy'}
            paused = maintenance(state, 'pause')
            if paused is None:
                return {'status': 'busy'}
            lease = paused.get('lease')
            if not isinstance(lease, str) or not re.fullmatch('[a-f0-9]{48}', lease):
                raise RuntimeError('invalid maintenance lease')
            staged = None
            switched = False
            safe_pair = False
            admission_reopened = False
            was_online = bool(revision) and m.online.get(aid) == revision
            try:
                container = m._same(aid, identity)
                # New immutable release directory; never overwrite an active CLI.
                release = entry['patch'] + '-' + entry['sha256'][:12] + '-' + secrets.token_hex(6)
                folder = ROOT + '/' + release
                code, _ = container.exec_run(['mkdir', '-m', '0755', folder], user='0')
                if code != 0:
                    raise RuntimeError('cannot stage runtime release')
                self.write(container, folder + '/claude', cli)
                manifest = {'versions': {version: {**entry, 'path': 'claude'}}}
                self.write(container, folder + '/manifest.json', json.dumps(manifest).encode())
                code, _ = container.exec_run(['node', '-e', INFO_SCRIPT, folder + '/claude',
                                              version, entry['patch'], entry['sha256']], user='0')
                if code != 0:
                    raise RuntimeError('staged CLI identity/capabilities failed verification')
                staged = m._stage(container, target, worker, digest)
                if maintenance(state, 'validate', lease) is None or not worker_idle(container, base):
                    return {'status': 'busy'}
                selected = {'schema_version': 1, 'manifest': release + '/manifest.json',
                            'version': version, 'request_mode': 'build'}
                selection = json.dumps({**selected, 'maintenance_lease': lease,
                                        'maintenance_expires': int(time.time())+300}).encode()
                pointer = m._stage(container, ACTIVE, selection, hashlib.sha256(selection).hexdigest())
                m._same(aid, identity)
                m.online.pop(aid, None)
                # Both swaps happen while admission is paused; no model calls
                # can observe a mixed Worker/CLI pair.
                switched = True
                m._swap(container, pointer, ACTIVE)
                m._swap(container, staged, target)
                staged = None
                if not m._restart_healthy(aid, identity) or not self.healthy(aid, identity, entry, version):
                    raise RuntimeError('new runtime health/identity failed')
                # Carry admission pause across restart; remove the persisted
                # lease before releasing it in the new Worker process.
                container = m._same(aid, identity)
                final_selection = json.dumps(selected).encode()
                pointer = m._stage(container, ACTIVE, final_selection, hashlib.sha256(final_selection).hexdigest())
                m._swap(container, pointer, ACTIVE)
                state['active_runtime'] = {'version': version, 'patch': entry['patch'], 'sha256': entry['sha256'],
                                           'worker_sha256': digest, 'container_id': container.id, 'container_identity': identity}
                m.save(aid, state)
                safe_pair = True
                # Once admission may have reopened, never roll back/restart:
                # a lost resume response must not kill a newly accepted call.
                resumed = False
                admission_reopened = True
                with contextlib.suppress(Exception):
                    resumed = maintenance(state, 'resume', lease) is not None
                online = False
                if resumed and was_online:
                    with contextlib.suppress(Exception):
                        online = m._reactivate(aid, identity, revision)
                return {'status': 'updated', 'sha256': digest, 'cli_version': version, 'cli_patch': entry['patch'],
                        'cli_sha256': entry['sha256'], 'online': online}
            except Exception:
                if not switched:
                    raise
                if admission_reopened:
                    # The pair has been verified and possibly serves new work.
                    # Failure to restore routing/readiness is not a reason to
                    # restart a live process or revert its installed files.
                    return {'status': 'updated', 'sha256': digest, 'cli_version': version, 'cli_patch': entry['patch'],
                            'cli_sha256': entry['sha256'], 'online': False}
                container = m._same(aid, identity)
                rollback_selection = json.loads(prior)
                rollback_selection.update(maintenance_lease=lease, maintenance_expires=int(time.time())+300)
                self.write(container, ACTIVE, json.dumps(rollback_selection).encode())
                m._restore(aid, identity, target, old, previous)
                m.save(aid, previous_state)
                healthy = m._restart_healthy(aid, identity)
                online = False
                if healthy:
                    container = m._same(aid, identity)
                    pointer = m._stage(container, ACTIVE, prior, hashlib.sha256(prior).hexdigest())
                    m._swap(container, pointer, ACTIVE)
                    safe_pair = True
                    admission_reopened = True
                    resumed = False
                    with contextlib.suppress(Exception):
                        resumed = maintenance(previous_state, 'resume', lease) is not None
                    if resumed and was_online:
                        with contextlib.suppress(Exception):
                            online = m._reactivate(aid, identity, revision)
                return {'status': 'rolled_back', 'reason': 'unhealthy' if healthy else 'rollback_unhealthy',
                        'online': online}
            finally:
                if staged:
                    m._discard(container, staged)
                if not switched or safe_pair:
                    with contextlib.suppress(Exception):
                        maintenance(state, 'resume', lease)
