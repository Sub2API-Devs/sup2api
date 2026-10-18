#!/usr/bin/env python3
"""Allow an account's TCP frames to its proxy peer through Docker's internal bridge.

DOCKER-INTERNAL checks the original IP destination even for frames bridged to
the account proxy. Scope the exception to both physical veth endpoints and the
account address. The proxy namespace still owns interception and fail-closed
forwarding. No host route, Docker isolation chain, or global sysctl is changed.
Run as root on the Docker host; controller state is never logged.
"""
import argparse
import ipaddress
import json
import pathlib
import re
import subprocess
import time

LABEL = 'io.sup2api.ccgateway.account'
CHAIN = 'CCG-PROXY-BRIDGE'
COMMENT = 'ccgateway-managed-proxy-bridge'
KEY = re.compile(r'(?:[1-9][0-9]*|d[0-9a-f]{16})')
VETH = re.compile(r'veth[0-9a-f]+')


def run(args, **kwargs):
    return subprocess.check_output(args, text=True, timeout=15, **kwargs).strip()


def rules_for_account(aid, state, app, gateway, network, app_veth, gateway_veth):
    """Pure validation: no exception for an unrelated, stopped or public network."""
    if not KEY.fullmatch(aid) or state.get('status') == 'blocked':
        return []
    if not VETH.fullmatch(app_veth) or not VETH.fullmatch(gateway_veth) or app_veth == gateway_veth:
        return []
    if app['State']['Status'] != 'running' or gateway['State']['Status'] != 'running':
        return []
    if app['Config'].get('Labels', {}).get(LABEL) != aid:
        return []
    if not network.get('Internal') or network.get('Labels', {}).get(LABEL) != aid:
        return []
    if state.get('egress_backend') != 'shared_xray' and gateway['Config'].get('Labels', {}).get(LABEL) != aid:
        return []
    name, identity = network['Name'], network['Id']
    app_nets = app['NetworkSettings']['Networks']
    if set(app_nets) != {name}:
        return []
    app_net = app_nets[name]
    gateway_net = gateway['NetworkSettings']['Networks'].get(name, {})
    if app_net.get('NetworkID') != identity or gateway_net.get('NetworkID') != identity:
        return []
    address = str(ipaddress.IPv4Address(state['app_ip']))
    proxy = str(ipaddress.IPv4Address(state['gateway_ip']))
    if app_net.get('IPAddress') != address or gateway_net.get('IPAddress') != proxy:
        return []
    common = ['-m', 'physdev', '--physdev-is-bridged']
    return [
        common + ['--physdev-in', app_veth, '--physdev-out', gateway_veth,
                  '-s', address + '/32', '-p', 'tcp', '-m', 'comment',
                  '--comment', 'ccgateway-' + aid + '-proxy-out', '-j', 'ACCEPT'],
        common + ['--physdev-in', gateway_veth, '--physdev-out', app_veth,
                  '-d', address + '/32', '-m', 'conntrack', '--ctstate', 'ESTABLISHED,RELATED',
                  '-m', 'comment', '--comment', 'ccgateway-' + aid + '-proxy-return', '-j', 'ACCEPT'],
    ]


def discover(root, prefix):
    ids = run(['docker', 'ps', '-q']).split()
    if not ids:
        return []
    containers = {x['Name'].lstrip('/'): x for x in json.loads(run(['docker', 'inspect', *ids]))}
    host_links = {int((p / 'ifindex').read_text()): p.name for p in pathlib.Path('/sys/class/net').iterdir()}
    address_cache = {}

    def host_peer(container, address):
        pid = container['State']['Pid']
        if pid not in address_cache:
            address_cache[pid] = json.loads(run(['nsenter', '-t', str(pid), '-n', 'ip', '-j', 'address']))
        matches = [x for x in address_cache[pid] if any(a.get('local') == address for a in x.get('addr_info', []))]
        if len(matches) != 1:
            raise ValueError('ambiguous container address')
        return host_links.get(matches[0].get('link_index'), '')

    result = []
    for directory in sorted(root.iterdir()):
        aid = directory.name
        if not KEY.fullmatch(aid) or directory.is_symlink() or not directory.is_dir():
            continue
        path = directory / 'state.json'
        app = containers.get(prefix + '-' + aid + '-app')
        if app is None or not path.is_file() or path.is_symlink():
            continue
        state = json.loads(path.read_text())
        gateway_name = prefix + '-shared-egress' if state.get('egress_backend') == 'shared_xray' else prefix + '-' + aid + '-egress'
        gateway = containers.get(gateway_name)
        if gateway is None or state.get('status') == 'blocked':
            continue
        network = json.loads(run(['docker', 'network', 'inspect', prefix + '-' + aid + '-net']))[0]
        routes = json.loads(run(['nsenter', '-t', str(app['State']['Pid']), '-n', 'ip', '-j', 'route', 'show', 'default']))
        if len(routes) != 1 or routes[0].get('gateway') != state.get('gateway_ip'):
            continue
        result.extend(rules_for_account(aid, state, app, gateway, network,
                                       host_peer(app, state['app_ip']), host_peer(gateway, state['gateway_ip'])))
    return result


def apply(rules):
    # --noflush and this explicitly named chain leave all Docker/user rules intact.
    script = '*filter\n:' + CHAIN + ' - [0:0]\n-F ' + CHAIN + '\n'
    script += ''.join('-A ' + CHAIN + ' ' + ' '.join(rule) + '\n' for rule in rules)
    script += 'COMMIT\n'
    subprocess.run(['iptables-restore', '--wait', '5', '--noflush'], input=script, text=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=15, check=True)
    jump = ['-m', 'comment', '--comment', COMMENT, '-j', CHAIN]
    exists = subprocess.run(['iptables', '-w', '5', '-C', 'DOCKER-USER', *jump],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
    if exists.returncode:
        run(['iptables', '-w', '5', '-I', 'DOCKER-USER', '1', *jump])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=pathlib.Path, default=pathlib.Path('/opt/ccgateway-runtime'))
    parser.add_argument('--prefix', default='ccg')
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,32}', args.prefix):
        parser.error('invalid prefix')
    previous = None
    while True:
        try:
            rules = discover(args.root, args.prefix)
            apply(rules)
            if rules != previous:
                print(json.dumps({'event': 'bridge_rules_applied', 'accounts': len(rules) // 2}), flush=True)
            previous = rules
        except Exception as error:
            # Discovery uncertainty removes exceptions rather than widening access.
            try:
                apply([])
            except Exception:
                pass
            print(json.dumps({'event': 'bridge_guard_error', 'type': type(error).__name__}), flush=True)
            previous = None
            if args.once:
                raise
        if args.once:
            return
        time.sleep(3)


if __name__ == '__main__':
    main()
