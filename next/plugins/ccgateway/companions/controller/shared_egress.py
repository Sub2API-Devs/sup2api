"""Controller-owned shared Xray backend. No core or Worker protocol changes.

Lock order: account guard -> shared lock. Recovery takes the same order.
All routing changes use a complete current snapshot, never per-account replacement.
"""
import contextlib
import copy
import hashlib
import ipaddress
import json
import logging
import os
from pathlib import Path
import secrets
import threading
import time

import docker
from network import PRIVATE_DESTINATIONS, proxy_outbound, business_rules

log = logging.getLogger('ccgateway.controller.shared_egress')

SHARED = 'shared_xray'
LEGACY = 'per_account_singbox'
OWNER = 'io.sup2api.ccgateway.shared'
SCHEMA = 'io.sup2api.ccgateway.shared-egress'
BASE = {'log': {'loglevel': 'warning'},
        'api': {'tag': 'api', 'listen': '127.0.0.1:10085', 'services': ['HandlerService', 'RoutingService']},
        'inbounds': [{'tag': 'transparent', 'listen': '0.0.0.0', 'port': 15001,
                      'protocol': 'dokodemo-door', 'settings': {'network': 'tcp', 'followRedirect': True},
                      'streamSettings': {'sockopt': {'tproxy': 'tproxy'}}}],
        'outbounds': [{'tag': 'block', 'protocol': 'blackhole'}],
        'routing': {'rules': [{'type': 'field', 'ruleTag': 'deny', 'network': 'tcp,udp', 'outboundTag': 'block'}]}}


def store(path, value):
    from manager import write_private
    write_private(path, json.dumps(value))


def node(proxy, salt):
    if proxy is None:
        out = {'protocol': 'freedom', 'settings': {'domainStrategy': 'UseIPv4'}}
        endpoint = None
    else:
        pinned = proxy_outbound(proxy)
        server = {'address': pinned['server'], 'port': pinned['server_port']}
        if pinned.get('username') or pinned.get('password'):
            server['users'] = [{'user': pinned.get('username', ''), 'pass': pinned.get('password', '')}]
        out = {'protocol': 'socks' if proxy['protocol'] == 'socks5' else 'http',
               'settings': {'servers': [server]}}
        if proxy['protocol'] == 'https':
            out['streamSettings'] = {'security': 'tls', 'tlsSettings': {'serverName': proxy['host'], 'allowInsecure': False}}
        endpoint = [pinned['server'], pinned['server_port']]
    digest = hashlib.sha256((salt + json.dumps(out, sort_keys=True)).encode()).hexdigest()[:24]
    out['tag'] = 'proxy-' + digest
    return {'outbound': out, 'endpoint': endpoint}


def inbound(binding):
    return {'tag': 'dns-' + str(binding['port']), 'listen': '127.0.0.1', 'port': binding['port'],
            'protocol': 'socks', 'settings': {'auth': 'noauth', 'udp': False}}


def routes(bindings):
    rules = []
    for key, b in sorted(bindings.items()):
        if b.get('active'):
            rules.extend([
                {'type': 'field', 'ruleTag': 'dns-' + key, 'inboundTag': [inbound(b)['tag']], 'outboundTag': b['tag']},
                {'type': 'field', 'ruleTag': 'app-' + key, 'inboundTag': ['transparent'],
                 'source': [b['ip'] + '/32'], 'outboundTag': b['tag']}])
    rules.append({'type': 'field', 'ruleTag': 'deny', 'network': 'tcp,udp', 'outboundTag': 'block'})
    return {'routing': {'domainStrategy': 'AsIs', 'rules': rules}}


def firewall(bindings, nodes):
    intercept, inputs = [], []
    for b in bindings.values():
        # Interface names are discovered in the gateway netns, not guessed from Docker order.
        interface = b['interface']
        if not interface.replace('_', '').replace('-', '').isalnum():
            raise ValueError('invalid interface')
        ip, gw = str(ipaddress.IPv4Address(b['ip'])), str(ipaddress.IPv4Address(b['gateway']))
        identity = f'iifname "{interface}" ip saddr {ip}'
        if b.get('active'):
            for transport in ('tcp', 'udp'):
                rule = f'{identity} ip daddr {gw} {transport} dport 53 accept'
                intercept.append(rule)
                inputs.append(rule)
        intercept.append(f'{identity} ip daddr {{ {PRIVATE_DESTINATIONS} }} drop')
        intercept.append(f'{identity} meta l4proto tcp meta mark set 1 tproxy ip to :15001 accept')
        # Existing transparent TCP still needs TPROXY for every packet while fenced.
        # INPUT's established rule preserves it; only active bindings admit NEW flows.
        if b.get('active'):
            inputs.append(f'{identity} meta mark 1 accept')
    outputs = set()
    for n in nodes.values():
        if n['endpoint']:
            ip, port = n['endpoint']
            outputs.add(f'ip daddr {ip} tcp dport {int(port)} accept')
        else:
            outputs.add(f'ip daddr {{ {PRIVATE_DESTINATIONS} }} drop\n meta nfproto ipv4 meta l4proto tcp accept')
    # Pinned proxy endpoints precede direct's private-destination deny.
    out = sorted(outputs, key=lambda s: ' drop' in s)
    return ('table inet ccg_shared {\n chain intercept { type filter hook prerouting priority mangle; policy accept;\n'
            + '\n'.join(intercept) + '\n }\n chain forward { type filter hook forward priority filter; policy drop; }\n'
            + 'chain input { type filter hook input priority filter; policy drop;\n iifname "lo" accept\n'
            + 'ct state established,related accept\n' + '\n'.join(inputs) + '\n }\n'
            + 'chain output { type filter hook output priority filter; policy drop;\n'
            + 'oifname "lo" accept\n ct state established,related accept\n' + '\n'.join(out) + '\n }\n}\n')


class SharedEgress:
    def __init__(self, manager):
        self.m = manager
        self.lock = threading.RLock()
        self.root = manager.root / 'shared-egress'
        self.root.mkdir(mode=0o700, exist_ok=True)
        self.path = self.root / 'state.json'
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {
            'schema': 1, 'salt': secrets.token_hex(32), 'bindings': {}, 'nodes': {}}
        if self.data.get('schema') != 1:
            raise RuntimeError('unsupported shared egress schema')
        self.boot = None
        self.loaded_nodes, self.loaded_ports = set(), set()
        self.name = manager.prefix + '-shared-egress'
        self.image = os.getenv('CCG_XRAY_IMAGE', 'ccgateway-xray:1')

    def save(self):
        store(self.path, self.data)

    def container(self):
        c = self.m.docker.containers.get(self.name)
        if c.labels.get(OWNER) != self.m.prefix:
            raise RuntimeError('shared container ownership mismatch')
        return c

    def exec(self, c, command):
        code, output = c.exec_run(command)
        if code:
            # Do not propagate config, credentials or CLI output to public errors.
            raise RuntimeError('shared egress command failed: ' + command[0])
        return output

    def api(self, c, action, obj=None, tag=None):
        cmd = ['xray', 'api', action, '--server=127.0.0.1:10085']
        if obj is not None:
            store(self.root / 'operation.json', obj)
            cmd.append('/config/operation.json')
        if tag:
            cmd.append(tag)
        return self.exec(c, cmd)

    def ensure(self, policy, existing_only=False):
        from manager import write_private
        try:
            c = self.container()
        except docker.errors.NotFound:
            if existing_only:
                raise
            image = self.m.ensure_image(self.image)
            if image.attrs.get('Config', {}).get('Labels', {}).get(SCHEMA) != '1':
                raise RuntimeError('invalid shared egress image')
            # Reuse the existing allocator under its host-wide allocation lock.
            net = self.m.ensure_network('d0000000000000000', 'xray-uplink', policy, False)
            store(self.root / 'boot.json', BASE)
            write_private(self.root / 'boot.nft', firewall({}, {}))
            store(self.root / 'dns.json', {})
            c = self.m.docker.containers.create(self.image, name=self.name, network=net.name,
                labels={OWNER: self.m.prefix}, detach=True, init=True,
                cap_drop=['ALL'], cap_add=['NET_ADMIN', 'NET_BIND_SERVICE'],
                security_opt=['no-new-privileges:true'],
                sysctls={'net.ipv4.ip_forward': '0', 'net.ipv6.conf.all.disable_ipv6': '1'},
                volumes={str(self.root): {'bind': '/config', 'mode': 'ro'}},
                mem_limit='384m', pids_limit=256, nano_cpus=2000000000,
                environment={'GOMAXPROCS': '2'}, restart_policy={'Name': 'unless-stopped'},
                log_config=docker.types.LogConfig(type='json-file', config={'max-size': '10m', 'max-file': '3'}))
        if c.status != 'running':
            if existing_only:
                raise RuntimeError('shared gateway stopped during cleanup')
            c.start()
        c.reload()
        boot = (c.id, c.attrs['State']['StartedAt'])
        if boot != self.boot:
            for _ in range(40):
                code, _ = c.exec_run(['xray', 'api', 'lso', '--server=127.0.0.1:10085'])
                if not code:
                    break
                time.sleep(.25)
            else:
                raise RuntimeError('Xray unavailable')
            # A controller restart can encounter an already populated process.
            # Read tag inventory to make add operations idempotent.
            result = json.loads(self.api(c, 'lso'))
            self.loaded_nodes = {item['tag'] for item in result.get('outbounds', [])}
            result = json.loads(self.api(c, 'lsi'))
            self.loaded_ports = {item['tag'] for item in result.get('inbounds', [])}
            self.boot = boot
        return c

    def attach(self, aid, state, c):
        net = self.m.docker.networks.get(self.m.name(aid, 'net'))
        net.reload()
        c.reload()
        entry = c.attrs['NetworkSettings']['Networks'].get(net.name)
        if entry:
            gateway = entry['IPAddress']
        else:
            subnet = ipaddress.ip_network(net.attrs['IPAM']['Config'][0]['Subnet'])
            used = {v['IPv4Address'].split('/')[0] for v in net.attrs.get('Containers', {}).values()}
            used.update([str(subnet[1]), state['app_ip'], state['gateway_ip']])
            gateway = next(str(ip) for ip in subnet.hosts() if str(ip) not in used)
            net.connect(c, ipv4_address=gateway)
        app = self.m.owned(aid, 'app')
        app.reload()
        actual = app.attrs['NetworkSettings']['Networks'].get(net.name, {})
        if actual.get('IPAddress') != state['app_ip']:
            raise RuntimeError('account network identity changed')
        addresses = json.loads(self.exec(c, ['ip', '-j', '-4', 'addr']))
        interface = next(x['ifname'] for x in addresses if any(a.get('local') == gateway for a in x['addr_info']))
        return gateway, net.id, app.id, interface

    def sync(self, c):
        from manager import write_private
        for aid, b in self.data['bindings'].items():
            if not b.get('active'):
                continue
            try:
                app = self.m.owned(aid, 'app')
                net = self.m.docker.networks.get(self.m.name(aid, 'net'))
                actual = app.attrs['NetworkSettings']['Networks'].get(net.name, {})
                if (app.id != b['container_id'] or net.id != b['network_id']
                        or actual.get('IPAddress') != b['ip'] or app.status != 'running'):
                    b['active'] = False
            except docker.errors.NotFound:
                b['active'] = False
        self.save()
        for tag, n in self.data['nodes'].items():
            if tag not in self.loaded_nodes:
                self.api(c, 'ado', {'outbounds': [n['outbound']]})
                self.loaded_nodes.add(tag)
        for b in self.data['bindings'].values():
            inc = inbound(b)
            if inc['tag'] not in self.loaded_ports:
                self.api(c, 'adi', {'inbounds': [inc]})
                self.loaded_ports.add(inc['tag'])
        self.api(c, 'adrules', routes(self.data['bindings']))
        store(self.root / 'dns.json', {b['ip']: {'port': b['port']} for b in self.data['bindings'].values() if b.get('active')})
        write_private(self.root / 'active.nft', firewall(self.data['bindings'], self.data['nodes']))
        self.exec(c, ['sh', '-ec',
            '{ if nft list table inet ccg_shared >/dev/null 2>&1; then echo "delete table inet ccg_shared"; fi; '
            'cat /config/active.nft; } | nft -f -'])

    def fence(self, aid, c):
        b = self.data['bindings'].get(aid)
        if b:
            b['active'] = False
            self.save()
            self.sync(c)

    def configure(self, aid, state, desired):
        """Caller holds account guard. Called before app activation/migration."""
        with self.lock:
            c = self.ensure(state['network'])
            self.fence(aid, c)
            gateway, netid, appid, interface = self.attach(aid, state, c)
            n = node(None if desired.get('direct') and not desired.get('proxy') else desired['proxy'], self.data['salt'])
            tag = n['outbound']['tag']
            if len(self.data['nodes']) >= 256 and tag not in self.data['nodes']:
                raise RuntimeError('retained outbound limit; maintenance collection required')
            self.data['nodes'][tag] = n
            previous = self.data['bindings'].get(aid, {})
            ports = {b['port'] for b in self.data['bindings'].values()}
            port = previous.get('port') or next(p for p in range(20000, 30000) if p not in ports)
            self.data['bindings'][aid] = {'ip': state['app_ip'], 'gateway': gateway, 'network_id': netid,
                'container_id': appid, 'interface': interface, 'port': port, 'tag': tag,
                'revision': desired['revision'], 'active': True}
            self.save()
            try:
                self.sync(c)
            except Exception:
                self.data['bindings'][aid]['active'] = False
                self.save()
                # Best effort close the source even if the API has failed.
                with contextlib.suppress(Exception):
                    self.sync(c)
                raise
            return gateway, c

    def healthy(self, aid, state):
        with self.lock:
            b = self.data['bindings'].get(aid, {})
            c = self.container()
            app = self.m.owned(aid, 'app')
            return (c.status == 'running' and self.boot == (c.id, c.attrs['State']['StartedAt'])
                    and b.get('active') and b.get('revision') == state.get('revision')
                    and b.get('container_id') == app.id and b.get('ip') == state.get('app_ip'))

    def apply(self, aid, state, desired):
        self.m.online.pop(aid, None)
        state['status'] = 'syncing'
        self.m.save(aid, state)
        try:
            app = self.m.owned(aid, 'app')
            if app.status != 'running':
                app.start()
            gateway, c = self.configure(aid, state, desired)
            state.update(gateway_ip=gateway, egress_backend=SHARED)
            self.m.save(aid, state)
            self.resolv(aid, gateway)
            self.m._activate(aid, state, app, c, desired['revision'])
        except Exception:
            state['status'] = 'egress_error'
            self.m.save(aid, state)
            with self.lock, contextlib.suppress(Exception):
                self.fence(aid, self.container())
            raise
        return self.m.public(aid)

    def resolv(self, aid, gateway):
        # Keep inode: this file can already be bind-mounted into a running app.
        path = self.m.dir(aid) / 'resolv.conf'
        with path.open('w') as f:
            f.write(f'nameserver {gateway}\noptions timeout:2 attempts:2\n')
            f.flush()
            os.fsync(f.fileno())
        path.chmod(0o644)

    def remove(self, aid, disconnect=False):
        with self.lock:
            if aid not in self.data['bindings']:
                return
            self.data['bindings'][aid]['active'] = False
            self.save()
            try:
                c = self.container()
            except docker.errors.NotFound:
                c = None
            if c is not None and c.status == 'running':
                c = self.ensure((self.m.state(aid) or {}).get('network'), existing_only=True)
                self.sync(c)
            if disconnect:
                if c is not None:
                    with contextlib.suppress(docker.errors.NotFound):
                        net = self.m.docker.networks.get(self.m.name(aid, 'net'))
                        c.reload()
                        if net.name in c.attrs.get('NetworkSettings', {}).get('Networks', {}):
                            net.disconnect(c, force=True)
                del self.data['bindings'][aid]
                self.save()

    def desired(self, aid):
        path = self.m.dir(aid) / 'egress-desired.json'
        if not path.exists():
            raise RuntimeError('core configuration must be synchronized before migration')
        return json.loads(path.read_text())

    def status(self, aid):
        state = self.m.state(aid) or {}
        return {'backend': state.get('egress_backend', LEGACY),
                'migration': state.get('egress_migration'), 'ready': self.m.public(aid)['status'] == 'ready'}

    def collect(self):
        # Conservative drain accounting: only reclaim unused objects when the
        # entire gateway has no established TCP connection (including DNS).
        with self.lock:
            c = self.container()
            if c.status != 'running' or self.exec(c, ['ss', '-Hnt', 'state', 'established']).strip():
                return
            tags = {b['tag'] for b in self.data['bindings'].values()}
            ports = {inbound(b)['tag'] for b in self.data['bindings'].values()}
            changed = False
            for tag in list(self.data['nodes']):
                if tag not in tags:
                    if tag in self.loaded_nodes:
                        self.api(c, 'rmo', tag=tag)
                        self.loaded_nodes.discard(tag)
                    del self.data['nodes'][tag]
                    changed = True
            for tag in list(self.loaded_ports):
                if tag.startswith('dns-') and tag not in ports:
                    self.api(c, 'rmi', tag=tag)
                    self.loaded_ports.discard(tag)
            if changed:
                self.save()
                self.sync(c)

    def network_idle(self, app):
        output = self.m.oneshot(self.m.egress_image, entrypoint=['ss'],
            command=['-Hnt', 'state', 'established'], network_mode='container:' + app.id,
            cap_drop=['ALL'], security_opt=['no-new-privileges:true'])
        for line in output.decode().splitlines():
            fields = line.split()
            if len(fields) < 4 or not fields[-2].endswith(':8787'):
                return False
        return True

    def migrate(self, aid, target):
        from manager import BadRequest, worker_target, worker_idle, container_identity
        if target not in (SHARED, LEGACY):
            raise BadRequest('invalid backend')
        with self.m.guard(aid):
            state = self.m.state(aid)
            if not state:
                raise BadRequest('runtime missing')
            current = state.get('egress_backend', LEGACY)
            if current == target and not state.get('egress_migration'):
                return self.status(aid)
            app = self.m.owned(aid, 'app')
            if target == LEGACY and current == SHARED and (app.status != 'running' or state.get('status') == 'blocked'):
                self.m.online.pop(aid, None)
                self.remove(aid, disconnect=True)
                state.update(egress_backend=LEGACY, gateway_ip=state['legacy_gateway_ip'], revision='')
                state.pop('egress_migration', None)
                self.resolv(aid, state['gateway_ip'])
                self.m.save(aid, state)
                return self.status(aid)
            recovering = bool(state.get('egress_migration'))
            if (app.status != 'running' and not recovering) or state.get('status') == 'blocked':
                raise BadRequest('only running enabled runtimes can migrate')
            _, base = worker_target(app)
            if app.status == 'running' and self.m._wait_idle(aid, container_identity(app), base) is None:
                return {'backend': current, 'status': 'busy'}
            desired = self.desired(aid)
            if not desired.get('enabled', True):
                raise BadRequest('runtime disabled')
            was_online = self.m.online.pop(aid, None)
            if target == SHARED:
                if 'legacy_gateway_ip' not in state:
                    state['legacy_gateway_ip'] = state['gateway_ip']
                # Prepare while old gateway still owns business traffic.
                try:
                    gateway, c = self.configure(aid, state, desired)
                except Exception:
                    if current == LEGACY:
                        with contextlib.suppress(Exception):
                            self.remove(aid, disconnect=True)
                        if was_online:
                            self.m.online[aid] = was_online
                    raise
            else:
                gateway = state.get('legacy_gateway_ip')
                if not gateway:
                    raise RuntimeError('no rollback gateway')
                c = self.m.owned(aid, 'egress')
            state['egress_migration'] = {'target': target, 'phase': 'prepared', 'from': current}
            self.m.save(aid, state)
            try:
                # Final check narrows (but does not eliminate) the documented maintenance race.
                if app.status == 'running' and (not worker_idle(app, base) or not self.network_idle(app)):
                    state.pop('egress_migration', None)
                    self.m.save(aid, state)
                    if current == LEGACY and target == SHARED:
                        self.remove(aid, disconnect=True)
                    if was_online:
                        self.m.online[aid] = was_online
                    return {'backend': current, 'status': 'busy'}
                if app.status == 'running':
                    app.stop(timeout=30)
                state['egress_migration']['phase'] = 'stopped'
                self.m.save(aid, state)
                state.update(gateway_ip=gateway, egress_backend=target)
                self.resolv(aid, gateway)
                self.m.save(aid, state)
                if target == SHARED:
                    app.start()
                    self.apply(aid, state, desired)
                else:
                    self.remove(aid, disconnect=True)
                    # Force legacy config revalidation (retained proxy may be old).
                    state['revision'] = ''
                    self.m.save(aid, state)
                    self.m.apply(aid, self.with_auth(app, desired))
                state = self.m.state(aid)
                state.pop('egress_migration', None)
                self.m.save(aid, state)
                if target == SHARED:
                    # Retain rollback container/config without retaining its running process.
                    with contextlib.suppress(docker.errors.DockerException):
                        self.m.owned(aid, 'egress').stop(timeout=10)
                return self.status(aid)
            except Exception:
                self.m.online.pop(aid, None)
                state['egress_migration']['phase'] = 'failed'
                self.m.save(aid, state)
                if current == LEGACY and target == SHARED:
                    # Restore the original account after a failed first migration.
                    # A failed rollback deliberately retains its journal for recovery.
                    try:
                        app.stop(timeout=30)
                        self.remove(aid, disconnect=True)
                        state.update(egress_backend=LEGACY, gateway_ip=state['legacy_gateway_ip'], revision='')
                        self.resolv(aid, state['gateway_ip'])
                        self.m.save(aid, state)
                        self.m.apply(aid, self.with_auth(app, desired))
                        state = self.m.state(aid)
                        state.pop('egress_migration', None)
                        self.m.save(aid, state)
                    except Exception:
                        self.m.online.pop(aid, None)
                raise

    def with_auth(self, app, desired):
        # Core auth material already belongs to this exact container. Do not invent OAuth
        # defaults during rollback and accidentally recreate an API-key account.
        env = dict(v.split('=', 1) for v in app.attrs['Config'].get('Env', []) if '=' in v)
        auth = {'mode': 'oauth'}
        if env.get('ANTHROPIC_API_KEY'):
            auth = {'mode': 'api_key', 'api_key': env['ANTHROPIC_API_KEY'], 'base_url': env['ANTHROPIC_BASE_URL']}
        state = self.m.state(app.labels['io.sup2api.ccgateway.account'])
        auth.update(state.get('environment', {}))
        return {**desired, 'auth': auth}

    def recover(self):
        """No account creation or automatic resurrection of stopped accounts."""
        from manager import KEY
        keys = set(self.data['bindings']) | {p.name for p in self.m.root.iterdir() if KEY.fullmatch(p.name) and p.is_dir()}
        for key in sorted(keys):
            with self.m.guard(key):
                state = self.m.state(key)
                if not state or state.get('status') == 'blocked':
                    continue
                try:
                    if state.get('egress_migration'):
                        self.migrate(key, state['egress_migration']['from'])
                        continue
                    if state.get('egress_backend') != SHARED:
                        continue
                    if state.get('status') != 'ready':
                        continue  # failed new configurations follow the core's retry policy
                    app = self.m.owned(key, 'app')
                    if app.status != 'running' or state.get('status') == 'blocked':
                        continue
                    if self.m.public(key)['status'] != 'ready' or not self.healthy(key, state):
                        self.apply(key, state, self.desired(key))
                except Exception as e:
                    log.warning('shared egress recover key=%s: %s: %s', key, type(e).__name__, str(e)[:300])
                    self.m.online.pop(key, None)

    def run(self):
        while True:
            time.sleep(10)
            try:
                self.recover()
                self.collect()
            except Exception as e:
                log.warning('shared egress pass failed: %s: %s', type(e).__name__, str(e)[:300])
