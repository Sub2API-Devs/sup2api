"""Cross-language reference vectors for the Go controller (CI only: this file
is not copied into the controller image).

It calls this Python controller's own functions and writes their exact
outputs to controller-go/testdata/pyref/*.json, so the Go port is checked
byte for byte (docs/ccgateway-guard/05-test-plan.md §6): json.dumps, the
credential fingerprint, container_identity, the outbound tag, the network
policy label, the scripts run in containers, and state files written by the
real Manager code paths.

Linux only (manager.py imports fcntl); needs requirements.txt installed.

    python reference_vectors.py OUT_DIR [--inspect FILE]   # write the vectors
    python reference_vectors.py --check-go DIR             # read state files the Go port wrote

FILE is a JSON list of real container inspects (docker-py attrs) whose
environment values were replaced by placeholders.
"""
import argparse
import hashlib
import ipaddress
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

from docker.models.containers import Container

import cli_profiles
import manager
import network
import runtime_updates
import shared_egress
import worker_update
from common import BadRequest, read_json, resolv_conf
from dockerfs import container_identity
from manager import auth_fingerprint, authentication

GENERATOR = 'companions/controller/reference_vectors.py'


def dump(out, name, cases, **extra):
    path = Path(out) / name
    doc = {'generator': GENERATOR, 'python': sys.version.split()[0], **extra, 'cases': cases}
    path.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{path}: {len(cases)} cases')


def error_name(e):
    return type(e).__name__


# ---------------------------------------------------------------------------
# json.dumps

STRINGS = [
    '', 'plain ascii', ''.join(chr(c) for c in range(0x80)), '"quote" and \\backslash\\ and /slash',
    '\b\f\n\r\t', '<script>&amp;</script>', "it's", '  ', '中文汉字', 'émoji 😀 🇨🇳 𝄞',
    '\u0000\u001f\u007f\u0080ÿĀ߿ࠀ�￿', '\U0001f600\U0010ffff', 'é', 'tab\tnew\nline',
    'u___', 'p@ss:w/rd?#%', '​ zero width', 'ÿ', '\x1c\x1d\x1e\x1f \x85\xa0',
]
NUMBERS = ['0', '-0', '1', '-1', '42', '9007199254740993', '123456789012345678901234567890', '-98765432109876543210',
           '0.0', '-0.0', '1.0', '1.5', '0.1', '0.2', '0.30000000000000004', '100.0', '1e5', '1E5', '1e16', '1e15',
           '9999999999999998.0', '1.7976931348623157e308', '5e-324', '2.5e-5', '1e-4', '0.001', '0.0001', '0.00001',
           '123456789.123456789', '1e22', '1e21', '12345678901234567.0', '-2.5', '3.14159', '1e400', '-1e400',
           '6.02214076e23', '1.0e-10', '255.0', '8080.0']
TEXTS = [
    '{}', '[]', 'null', 'true', 'false', '{"b": 1, "a": 2}', '{"b":1,"a":2,"b":3}', '{"z": {"y": [3, {"x": null}]}, "a": []}',
    '{"中": 1, "a": 2, "😀": 3, "Z": 4, "_": 5, "é": 6}', '[1, "two", 3.0, null, true, {"k": [false]}]',
    '{"mode": "api_key", "api_key": "sk-<x>&y", "base_url": "https://api.anthropic.com"}',
    '{"Type":"bind","Source":"/opt/ccgateway-runtime/21/resolv.conf","Destination":"/etc/resolv.conf","Mode":"ro","RW":false,"Propagation":"rprivate"}',
    '[["container", "app", "abc", null, "2026-11-01T00:00:00.123456789Z", "2026-11-01T00:00:01Z"], ["directory", 1234567, 1761955200123456789]]',
    '{"a":{"b":{"c":{"d":{"e":{"f":[[[[[]]]]]}}}}}}', '"\\u00e9\\ud83d\\ude00\\u0000"', '{"": ""}',
]


def json_cases():
    texts = [json.dumps(s, ensure_ascii=False) for s in STRINGS] + NUMBERS + TEXTS
    texts.append(json.dumps({s: i for i, s in enumerate(STRINGS)}, ensure_ascii=False))
    texts.append(json.dumps([float(n) for n in ('0.1', '1e16', '1e-5')]))
    cases = []
    for i, text in enumerate(texts):
        value = json.loads(text)
        cases.append({'name': f'json-{i:03d}', 'input': text, 'dumps': json.dumps(value),
                      'dumps_sorted': json.dumps(value, sort_keys=True),
                      'sha256_sorted': hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()})
    return cases


# ---------------------------------------------------------------------------
# authentication() and auth_fingerprint() (PV3, V5, V6)

SALTS = ['salt', 'x' * 43, 'AbC-dEf_0123456789abcdefghijklmnopqrstuvwxy', '盐😀', '']
AUTHS = [
    None, {'mode': 'oauth'}, {'mode': 'oauth', 'locale': 'ja_JP.UTF-8', 'timezone': 'Asia/Tokyo'},
    {'mode': 'oauth', 'locale': '', 'timezone': ''}, {'mode': 'oauth', 'locale': 'zh_CN'}, {'mode': 'oauth', 'timezone': 'Etc/GMT+5'},
    {'mode': 'api_key', 'api_key': 'sk-ant-1234567890'},
    {'mode': 'api_key', 'api_key': 'k<e>y&"\'\\!~', 'base_url': 'https://api.example.com/v1/'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://Proxy.Example.COM:8443/anthropic/', 'locale': 'C'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://h.test/v1/v1'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://h.test/%zz'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': ''},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://[::1]:8443/x'},
    # refused
    {'mode': 'oauth', 'extra': 1}, {'mode': 'api_key', 'api_key': 'short'}, {'mode': 'api_key', 'api_key': 'has space1'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'http://h.test'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://user@h.test'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://h.test/?q'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://h.test/ '},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://h.test/\x1c'},
    {'mode': 'api_key', 'api_key': '12345678', 'base_url': 'https://'},
    {'mode': 'api_key', 'api_key': 'café12345'}, {'mode': 'oauth', 'locale': 'Local'}, {'mode': 'oauth', 'timezone': 5},
    {'mode': 'oauth', 'locale': 'en_US.UTF-8@euro'}, {'mode': 'oauth', 'locale': 'xx_' + 'Y' * 9}, {'mode': 'other'}, [], 'oauth',
]


def fingerprint_cases():
    cases = []
    for i, raw in enumerate(AUTHS):
        case = {'name': f'auth-{i:03d}', 'raw': json.dumps(raw, ensure_ascii=False)}
        try:
            auth = authentication(raw)
        except BadRequest as e:
            case['error'] = error_name(e)
            cases.append(case)
            continue
        case['normalized'] = json.dumps(auth)
        case['fingerprints'] = [{'salt': s, 'fingerprint': auth_fingerprint(s, auth)} for s in SALTS]
        cases.append(case)
    return cases


# ---------------------------------------------------------------------------
# container_identity (W12, RB4)

MOUNTS = [
    {'Type': 'volume', 'Name': 'ccg-21-data', 'Source': '/var/lib/docker/volumes/ccg-21-data/_data', 'Destination': '/work',
     'Driver': 'local', 'Mode': 'rw', 'RW': True, 'Propagation': ''},
    {'Type': 'bind', 'Source': '/opt/ccgateway-runtime/21/resolv.conf', 'Destination': '/etc/resolv.conf', 'Mode': 'ro',
     'RW': False, 'Propagation': 'rprivate'},
]
LABELS = {'io.sup2api.ccgateway.account': '21', 'io.sup2api.ccgateway.auth': 'a' * 64,
          'io.sup2api.ccgateway.image': 'sha256:' + 'b' * 64}


def synthetic_inspects():
    base = {'Id': 'c' * 64, 'Created': '2026-11-01T00:00:00.1Z', 'Path': '/usr/local/bin/docker-entrypoint.sh',
            'Args': ['worker'], 'State': {'Status': 'running', 'StartedAt': '2026-11-01T00:00:01.123456789Z', 'Pid': 42},
            'Image': 'sha256:' + 'b' * 64, 'Name': '/ccg-21-app',
            'Config': {'User': '1000:1000', 'Env': ['A=<redacted>'], 'Image': 'ccgateway-app:0.1.118', 'Labels': LABELS},
            'Mounts': MOUNTS, 'NetworkSettings': {'Networks': {'ccg-21-net': {'IPAddress': '10.1.2.3'}}}}
    variants = {
        'full': base,
        'args-null': {**base, 'Args': None},
        'args-empty': {**base, 'Args': []},
        'args-missing': {k: v for k, v in base.items() if k != 'Args'},
        'labels-null': {**base, 'Config': {**base['Config'], 'Labels': None}},
        'labels-unicode': {**base, 'Config': {**base['Config'], 'Labels': {**LABELS, 'note': '中<>&"😀', 'z': '', 'A': 'x'}}},
        'mounts-null': {**base, 'Mounts': None},
        'mounts-reordered': {**base, 'Mounts': list(reversed(MOUNTS))},
        'mounts-extra-fields': {**base, 'Mounts': [{**MOUNTS[0], 'Extra': [1, 2.5, None], 'Size': 10}, MOUNTS[1]]},
        'user-empty': {**base, 'Config': {**base['Config'], 'User': ''}},
        'config-without-user': {**base, 'Config': {k: v for k, v in base['Config'].items() if k != 'User'}},
        'legacy-path': {**base, 'Path': 'docker-entrypoint.sh', 'Args': ['ccgateway', '--flag=1']},
        'image-null': {**base, 'Image': None},
    }
    return variants


def identity_cases(real):
    cases = []
    for name, attrs in synthetic_inspects().items():
        cases.append({'name': 'synthetic-' + name, 'inspect': json.dumps(attrs, ensure_ascii=False),
                      'identity': container_identity(Container(attrs=attrs))})
    for i, attrs in enumerate(real):
        cases.append({'name': 'real-' + attrs.get('Name', str(i)).lstrip('/'), 'inspect': json.dumps(attrs, ensure_ascii=False),
                      'identity': container_identity(Container(attrs=attrs))})
    return cases


# ---------------------------------------------------------------------------
# Outbound tags (G5)

PROXIES = [
    (None, None),
    ({'protocol': 'http', 'host': 'proxy.test', 'port': 8080}, '198.18.0.2'),
    ({'protocol': 'https', 'host': 'proxy.test', 'port': 443, 'username': 'u___', 'password': 'secret'}, '198.18.0.3'),
    ({'protocol': 'socks5', 'host': 'socks.test', 'port': '1080', 'username': 'user'}, '198.18.0.4'),
    ({'protocol': 'socks5', 'host': 'socks.test', 'port': 1080, 'password': 'only-pass'}, '198.18.0.4'),
    ({'protocol': 'http', 'host': 'p.test', 'port': 8080.0, 'username': '', 'password': ''}, '203.0.113.7'),
    ({'protocol': 'https', 'host': 'Proxy.Example.COM', 'port': 65535, 'username': '用户', 'password': '密码😀<>&"'}, '203.0.113.8'),
    ({'protocol': 'http', 'host': '203.0.113.9', 'port': 3128, 'username': None, 'password': 'p'}, '203.0.113.9'),
    ({'protocol': 'http', 'host': 'h.test', 'port': ' 81 ', 'extra': {'ignored': True}}, '192.0.2.1'),
]
TAG_SALTS = ['private', 'f' * 64, '0123456789abcdef' * 4]


def tag_cases():
    cases = []
    for i, (proxy, ip) in enumerate(PROXIES):
        for salt in TAG_SALTS:
            answer = [(None, None, None, None, (ip, 0))] if ip else []
            with patch('network.socket.getaddrinfo', return_value=answer):
                n = shared_egress.node(proxy, salt)
            cases.append({'name': f'proxy-{i:02d}-{salt[:8]}', 'salt': salt,
                          'proxy': json.dumps(proxy, ensure_ascii=False), 'resolved': ip,
                          'node': json.dumps(n), 'tag': n['outbound']['tag']})
    return cases


# ---------------------------------------------------------------------------
# Network policy (N1-N3), Python semantics helpers

POLICIES = [None, {}, {'pool': '192.168.50.7/24'}, {'pool': '10.20.0.0/16', 'allocation': 'sequential'},
            {'pool': '', 'allocation': ''}, {'pool': '172.16.0.0/12'}, {'allocation': 'random'},
            {'pool': '10.0.0.0/255.255.0.0'}, {'pool': '10.1.0.0/0.0.255.255'}, {'pool': '10.0.0.0/08'},
            {'pool': '8.8.8.0/24'}, {'pool': '10.0.0.0/25'}, {'pool': '010.0.0.0/8'}, {'x': 1}, [], 'pool',
            {'pool': 5}, {'pool': None, 'allocation': None}, {'allocation': 'Random'}, {'pool': '10.0.0.0/8', 'allocation': 0},
            {'pool': 'fd00::/8'}, {'pool': '192.168.0.0/16 '}, {'pool': '172.15.0.0/16'}]


def policy_cases():
    cases = []
    for i, raw in enumerate(POLICIES):
        case = {'name': f'policy-{i:02d}', 'raw': json.dumps(raw)}
        try:
            policy = network.network_policy(raw)
            case['policy'] = json.dumps(policy)
            case['label'] = json.dumps(policy, sort_keys=True)
        except (ValueError, TypeError) as e:
            case['error'] = error_name(e)
        cases.append(case)
    allocations = []
    occupied_sets = [[], ['10.0.0.0/24'], ['10.0.0.0/23', '10.0.3.0/24'], ['10.0.0.0/16']]
    for pool in ('10.0.0.0/22', '10.0.0.0/24', '192.168.0.0/16'):
        for occupied in occupied_sets:
            policy = {'pool': pool, 'allocation': 'sequential'}
            case = {'policy': json.dumps(policy), 'occupied': occupied}
            try:
                subnet = network.allocate_subnet(policy, [ipaddress.ip_network(o) for o in occupied])
                case['subnet'] = str(subnet)
                case['addresses'] = network.allocate_addresses(subnet, 'sequential')
            except ValueError as e:
                case['error'] = error_name(e)
            allocations.append(case)
    return cases, allocations


INT_INPUTS = ['"1080"', '" 1080 "', '"+5"', '"-5"', '"1_000"', '"1__0"', '"_1"', '"1_"', '"\\uff11\\uff12"',
              '"\\u0661\\u0662"', '8080.9', '-1.5', 'true', 'false', 'null', '"0x10"', '"\\u000b42\\u001f"',
              '"\\u00a042\\u3000"', '""', '" "', '"1e3"', '"1.0"', '7', '-0', '9223372036854775807', '[]', '{}', '"٣"']
TRUTHY_INPUTS = ['null', 'false', 'true', '0', '0.0', '-0.0', '1', '0.5', '""', '" "', '"0"', '[]', '[0]', '{}',
                 '{"a": null}', '"false"']
URLS = ['https://api.anthropic.com', 'https://H.Example:8443/p?q#f', 'https://user:pw@h/x', 'https://@h', 'https://[::1]:8/x',
        'https://[v1.x]/', 'HTTPS://h', ' \t https://h/a\tb\nc', 'https:h', '//h/p', 'https://h:abc/', 'https://[::1/',
        'https://a]b/', 'https://h%2fx/', 'https://', 'mailto:x@y', '1https://h', 'https://h#frag?x', 'https://xn--fiq/a',
        'https://[192.168.0.1]/']
ADDRESSES = ['10.0.0.1', '010.0.0.1', '10.0.0', '10.0.0.256', '1.2.3.4 ', '0.0.0.0', '255.255.255.255', '1.2.3.04',
             '१.2.3.4', '']
NETWORKS = ['10.0.0.0/8', '10.1.2.3/24', '10.0.0.0/255.255.255.0', '10.0.0.0/0.0.0.255', '10.0.0.0/33',
            '10.0.0.0/ 8', '10.0.0.0/+8', '10.0.0.0', '10.0.0.0/255.0.255.0', '10.0.0.0/032', '10.0.0.0/']


def python_cases():
    ints = []
    for text in INT_INPUTS:
        case = {'input': text}
        try:
            case['int'] = int(json.loads(text))
        except (ValueError, TypeError, OverflowError) as e:
            case['error'] = error_name(e)
        ints.append(case)
    truthy = [{'input': t, 'bool': bool(json.loads(t))} for t in TRUTHY_INPUTS]
    spaces = [c for c in range(0x110000) if chr(c).isspace()]
    urls = []
    for u in URLS:
        case = {'input': u}
        try:
            s = urlsplit(u)
            case.update(scheme=s.scheme, netloc=s.netloc, path=s.path, query=s.query, fragment=s.fragment,
                        hostname=s.hostname, has_userinfo=s.username is not None)
        except ValueError as e:
            case['error'] = error_name(e)
        urls.append(case)
    addrs = []
    for a in ADDRESSES:
        try:
            addrs.append({'input': a, 'address': str(ipaddress.IPv4Address(a))})
        except ValueError as e:
            addrs.append({'input': a, 'error': error_name(e)})
    nets = []
    for n in NETWORKS:
        case = {'input': n}
        for strict in (False, True):
            key = 'strict' if strict else 'loose'
            try:
                case[key] = str(ipaddress.IPv4Network(n, strict=strict))
            except ValueError as e:
                case[key] = 'error:' + error_name(e)
        nets.append(case)
    return {'int': ints, 'truthy': truthy, 'isspace': spaces, 'urlsplit': urls, 'ipv4': addrs, 'networks': nets}


# ---------------------------------------------------------------------------
# Scripts and generated texts

def disk_quota_script():
    captured = {}

    class M:
        def oneshot(self, image, **kwargs):
            captured.update(kwargs)

    class V:
        name = 'ccg-21-data'
    manager.Manager.verify_disk_quota(M(), 'app:test', V(), 10737418240)
    return captured['command'][1]


def text_cases():
    binding = {'ip': '10.8.1.2', 'gateway': '10.8.1.3', 'network_id': 'n1', 'container_id': 'c1', 'interface': 'eth1',
               'port': 20000, 'tag': 'proxy-aaa', 'revision': 'a' * 64, 'active': True}
    fenced = {**binding, 'ip': '10.8.2.2', 'gateway': '10.8.2.3', 'interface': 'eth_2-b', 'port': 20001, 'active': False}
    with patch('network.socket.getaddrinfo', return_value=[(None, None, None, None, ('198.18.0.2', 0))]):
        pinned = shared_egress.node({'protocol': 'http', 'host': 'p.test', 'port': 8080}, 'salt')
    direct = shared_egress.node(None, 'salt')
    texts = {
        'cli_profiles.PROBE': cli_profiles.PROBE,
        'manager.PREPARE_VOLUME': manager.PREPARE_VOLUME,
        'manager.NFT_REPLACE': manager.NFT_REPLACE,
        'manager.PROBE_SCRIPT': manager.PROBE_SCRIPT,
        'manager.verify_disk_quota(10737418240)': disk_quota_script(),
        'runtime_updates.TRUST_SCRIPT': runtime_updates.TRUST_SCRIPT,
        'runtime_updates.INFO_SCRIPT': runtime_updates.INFO_SCRIPT,
        'runtime_updates.LEGACY_SNAPSHOT_SCRIPT': runtime_updates.LEGACY_SNAPSHOT_SCRIPT,
        'runtime_updates.HEALTH_SCRIPT': runtime_updates.HEALTH_SCRIPT,
        'worker_update.WORKER_HEALTH_SCRIPT': worker_update.WORKER_HEALTH_SCRIPT,
        'json(manager.TELEMETRY_ENV)': json.dumps(manager.TELEMETRY_ENV),
        'json(runtime_updates.REQUIRED)': json.dumps(runtime_updates.REQUIRED),
        'json(runtime_updates.HEALTH_REQUIRED)': json.dumps(runtime_updates.HEALTH_REQUIRED),
        'network.business_rules(10.1.2.3)': network.business_rules('10.1.2.3'),
        'network.business_rules(010.1.2.3)': 'error',
        'common.resolv_conf(10.1.2.4)': resolv_conf('10.1.2.4'),
        'json(shared_egress.BASE)': json.dumps(shared_egress.BASE),
        'shared_egress.firewall({},{})': shared_egress.firewall({}, {}),
        'shared_egress.firewall(active+fenced, pinned)': shared_egress.firewall({'21': binding, '22': fenced},
                                                                                {pinned['outbound']['tag']: pinned}),
        'shared_egress.firewall(active, direct)': shared_egress.firewall({'21': binding}, {direct['outbound']['tag']: direct}),
        'json(shared_egress.routes(active+fenced))': json.dumps(shared_egress.routes({'22': fenced, '21': binding,
                                                                                    '3': {**binding, 'port': 20002}})),
        'json(shared_egress.inbound(20001))': json.dumps(shared_egress.inbound(fenced)),
    }
    try:
        network.business_rules('010.1.2.3')
    except ValueError:
        pass
    else:
        raise SystemExit('business_rules accepted a leading zero')
    return [{'name': k, 'text': v} for k, v in texts.items()]


# ---------------------------------------------------------------------------
# State files written by the real Manager code paths

PROFILE = {'version': '2.1.312', 'request_mode': 'build', 'disable_auto_update': True}
PROXY = {'protocol': 'http', 'host': 'proxy.test', 'port': 8080, 'username': 'u', 'password': 'p'}


def state_cases():
    import test_shared_egress
    case = test_shared_egress.SharedApplyTests('test_new_account_is_bound_to_the_shared_gateway')
    case.setUp()
    try:
        return _state_cases(case)
    finally:
        case.doCleanups()
        case.tearDown()


def _state_cases(t):
    m, root = t.m, Path(t.tmp)
    rev, rev2 = 'a' * 64, 'b' * 64
    out = []

    def capture(name, rel, note):
        out.append({'name': name, 'file': rel, 'note': note, 'bytes': (root / rel).read_text(encoding='utf-8')})

    with patch('manager.resolve_profile', return_value={'WORKER_CLI_PATH': '/opt/ccgateway/cli/x/claude'}):
        m.apply('21', {'revision': rev, 'proxy': PROXY, 'cli': PROFILE, 'network': {'pool': '10.20.0.0/16'},
                       'auth': {'mode': 'oauth', 'locale': 'ja_JP.UTF-8', 'timezone': 'Asia/Tokyo'}, 'enabled': True})
        capture('ready-oauth', '21/state.json', 'apply through the shared gateway: ready')
        capture('desired-first', '21/egress-desired.json', 'egress-desired.json written after the first provision')
        draft = 'd0123456789abcdef'
        m.apply(draft, {'revision': rev, 'direct': True, 'proxy': None, 'cli': {'request_mode': 'direct', 'version': '2.1.312',
                       'disable_auto_update': True}, 'network': {'allocation': 'sequential', 'pool': '192.168.64.0/18'},
                        'auth': {'mode': 'api_key', 'api_key': 'sk-test-0123456789', 'base_url': 'https://gw.test/v1/'},
                        'future_core_key': {'kept': ['in', 'desired']}})
        capture('ready-api-key-direct', draft + '/state.json', 'api_key account, direct egress, cli keys in core order')
        capture('desired-direct', draft + '/egress-desired.json', 'auth removed, unknown core keys kept')
        m.apply('22', {'revision': rev, 'proxy': PROXY})
        m.apply('22', {'revision': rev2, 'proxy': None})
        capture('blocked', '22/state.json', 'blocked after a configuration without proxy')
        capture('desired-blocked', '22/egress-desired.json', 'egress-desired.json of the blocking configuration')
        t.configure.side_effect = RuntimeError('no xray')
        try:
            m.apply('23', {'revision': rev, 'proxy': PROXY})
        except RuntimeError:
            pass
        t.configure.side_effect = t.bind
        capture('egress-error', '23/state.json', 'shared gateway configuration failed')
        m.provision('24')
        capture('pending', '24/state.json', 'provisioned only (no egress_backend yet)')
        state = m.state('21')
        app = t.app('21')
        app.attrs.update(Config={'Image': 'app:test', 'User': '1000:1000', 'Labels': dict(app.labels)},
                         Mounts=[{'Type': 'volume', 'Name': 'ccg-21-data', 'Destination': '/work', 'RW': True}],
                         Path='/usr/local/bin/docker-entrypoint.sh', Args=['worker'])
        state['active_runtime'] = {'version': '2.1.312', 'patch': 'ccgateway-abc', 'sha256': 'c' * 64,
                                   'worker_sha256': 'd' * 64, 'container_id': app.id,
                                   'container_identity': container_identity(app)}
        state['environment_desired'] = {'locale': 'en_US.UTF-8', 'timezone': 'UTC'}
        state['environment_pending'] = True
        state['future_field'] = {'x': [1, 2.5, 'é', None], 'nested': {'b': 1, 'a': 2}}
        state['uplink_ip'] = '10.0.0.9'
        state['migration_failed'] = False
        m.save('21', state)
        capture('ready-active-runtime-unknown-keys', '21/state.json',
                'paired activation result plus an unknown key and a legacy sing-box key')
        m.set_runtime_images({'app': 'app:test', 'egress': 'egress:test'})
        capture('runtime-json', 'runtime.json', 'PUT /runtime/images')
        m.delete('21', account=True)
        capture('backup', 'backups/21.json', 'DELETE with X-CCG-Delete-Account keeps the state')
    shared = m._shared
    with patch('network.socket.getaddrinfo', return_value=[(None, None, None, None, ('198.18.0.2', 0))]):
        nodes = [shared_egress.node(PROXY, shared.data['salt']), shared_egress.node(None, shared.data['salt']),
                 shared_egress.node({'protocol': 'https', 'host': 'tls.test', 'port': 443, 'password': '密码'}, shared.data['salt'])]
    for n in nodes:
        shared.data['nodes'][n['outbound']['tag']] = n
    shared.data['bindings'] = {
        '30': {'ip': '10.20.1.2', 'gateway': '10.20.1.3', 'network_id': 'n' * 64, 'container_id': 'c' * 64,
               'interface': 'eth1', 'port': 20000, 'tag': nodes[0]['outbound']['tag'], 'revision': rev, 'active': True},
        '4': {'ip': '10.20.2.2', 'gateway': '10.20.2.3', 'network_id': 'm' * 64, 'container_id': 'e' * 64,
              'interface': 'eth2', 'port': 20001, 'tag': nodes[1]['outbound']['tag'], 'revision': rev2, 'active': False,
              'future_binding_key': 1},
    }
    shared.data['future_top_key'] = 'kept'
    shared.save()
    capture('shared-state', 'shared-egress/state.json', 'shared gateway state, schema 1, salt, bindings, nodes')
    return out


# ---------------------------------------------------------------------------

def generate(out, inspect_file):
    Path(out).mkdir(parents=True, exist_ok=True)
    real = json.loads(Path(inspect_file).read_text()) if inspect_file else []
    dump(out, 'json_dumps.json', json_cases())
    dump(out, 'fingerprint.json', fingerprint_cases())
    dump(out, 'container_identity.json', identity_cases(real), real_inspects=len(real))
    dump(out, 'outbound_tag.json', tag_cases())
    policies, allocations = policy_cases()
    dump(out, 'network_policy.json', policies, allocations=allocations)
    dump(out, 'python_semantics.json', [python_cases()])
    dump(out, 'texts.json', text_cases())
    dump(out, 'state_samples.json', state_cases())


def check_go(directory):
    """Each <name>.go.json written by the Go port must read back (common.read_json,
    the shared state's schema check) and equal <name>.expect.json."""
    failures, count = 0, 0
    for go in sorted(Path(directory).glob('*.go.json')):
        count += 1
        name = go.name[:-len('.go.json')]
        value = read_json(go)
        expect = json.loads((go.parent / (name + '.expect.json')).read_text())
        ok = value == expect and isinstance(value, dict)
        if name.startswith('shared'):
            ok = ok and value.get('schema') == 1
        print(('ok   ' if ok else 'FAIL ') + name)
        failures += not ok
    if not count:
        raise SystemExit('no Go output found')
    if failures:
        raise SystemExit(f'{failures} of {count} files differ')
    print(f'{count} Go-written files read back by Python')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('out', nargs='?')
    parser.add_argument('--inspect')
    parser.add_argument('--check-go')
    args = parser.parse_args()
    os.environ.pop('CCG_DEFAULT_CLI_VERSION', None)
    if args.check_go:
        check_go(args.check_go)
    elif args.out:
        generate(args.out, args.inspect)
    else:
        parser.error('OUT_DIR or --check-go required')


if __name__ == '__main__':
    main()
