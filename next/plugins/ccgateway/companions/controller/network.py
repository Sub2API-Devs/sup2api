"""Pure configuration generation. No credentials enter business containers."""
import ipaddress
import socket
import secrets
from pathlib import Path

PRIVATE_POOLS = tuple(ipaddress.ip_network(c) for c in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'))


def network_policy(raw=None):
    raw = {} if raw is None else raw
    if not isinstance(raw, dict) or set(raw) - {'pool', 'allocation'}:
        raise ValueError('invalid network policy')
    pool = ipaddress.ip_network(raw.get('pool') or '10.0.0.0/8', strict=False)
    allocation = raw.get('allocation') or 'random'
    if pool.version != 4 or pool.prefixlen > 24 or not any(pool.subnet_of(p) for p in PRIVATE_POOLS):
        raise ValueError('network pool must be an RFC1918 IPv4 CIDR with prefix at most /24')
    if allocation not in ('random', 'sequential'):
        raise ValueError('invalid IP allocation mode')
    return {'pool': str(pool), 'allocation': allocation}


def host_routes():
    # Controller uses the host network namespace. Ignore default routes.
    routes = []
    for line in Path('/proc/net/route').read_text().splitlines()[1:]:
        fields = line.split()
        if len(fields) >= 8 and int(fields[7], 16):
            address = ipaddress.IPv4Address(int.from_bytes(bytes.fromhex(fields[1]), 'little'))
            mask = ipaddress.IPv4Address(int.from_bytes(bytes.fromhex(fields[7]), 'little'))
            routes.append(ipaddress.ip_network(f'{address}/{mask}', strict=False))
    return routes


def allocate_subnet(policy, occupied):
    pool = ipaddress.ip_network(policy['pool'])
    prefix = max(24, pool.prefixlen + 1)
    size = 1 << (32 - prefix)
    count = pool.num_addresses // size
    blocked = set()
    for n in occupied:
        if n.overlaps(pool):
            first = max(0, (int(n.network_address) - int(pool.network_address)) // size)
            last = min(count - 1, (int(n.broadcast_address) - int(pool.network_address)) // size)
            blocked.update(range(first, last + 1))
    free = [i for i in range(count) if i not in blocked]
    if not free:
        raise ValueError('network pool exhausted or overlaps host routes')
    index = secrets.choice(free) if policy['allocation'] == 'random' else free[0]
    return ipaddress.ip_network((int(pool.network_address) + index * size, prefix))


def allocate_addresses(subnet, allocation, count=2):
    # Network address, Docker bridge gateway .1, and broadcast are reserved.
    offsets = list(range(2, subnet.num_addresses - 1))
    out = []
    for _ in range(count):
        offset = secrets.choice(offsets) if allocation == 'random' else offsets[0]
        offsets.remove(offset)
        out.append(str(subnet.network_address + offset))
    return out


def proxy_outbound(proxy):
    protocol = proxy.get('protocol')
    if protocol not in ('http', 'https', 'socks5'):
        raise ValueError('unsupported proxy protocol')
    host, port = proxy['host'], int(proxy['port'])
    if not host or len(host) > 253 or not 1 <= port <= 65535:
        raise ValueError('invalid proxy address')
    # Resolve control-plane endpoints outside the business network. Pin the
    # resulting address in both the dialer and the fail-closed firewall.
    ip = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)[0][4][0]
    ipaddress.IPv4Address(ip)
    out = {'type': 'socks' if protocol == 'socks5' else 'http', 'tag': 'account-proxy',
           'server': ip, 'server_port': port,
           'username': proxy.get('username', ''), 'password': proxy.get('password', '')}
    if protocol == 'socks5':
        out['version'] = '5'
    if protocol == 'https':
        out['tls'] = {'enabled': True, 'server_name': host}
    return out


def configuration(proxy, app_ip, gateway_ip):
    app_ip = str(ipaddress.IPv4Address(app_ip))
    gateway_ip = str(ipaddress.IPv4Address(gateway_ip))
    out = proxy_outbound(proxy)
    config = {
        'log': {'level': 'warn'},
        'dns': {'servers': [{'type': 'https', 'tag': 'remote-dns', 'server': '1.1.1.1',
                             'path': '/dns-query', 'detour': 'account-proxy',
                             'tls': {'enabled': True, 'server_name': 'cloudflare-dns.com'}}],
                'final': 'remote-dns', 'strategy': 'ipv4_only'},
        'inbounds': [
            {'type': 'tproxy', 'tag': 'traffic', 'listen': '0.0.0.0', 'listen_port': 15001, 'network': 'tcp'},
            {'type': 'direct', 'tag': 'dns', 'listen': gateway_ip, 'listen_port': 53}],
        'outbounds': [out],
        'route': {'rules': [{'inbound': 'dns', 'action': 'hijack-dns'}], 'final': 'account-proxy'}
    }
    firewall = f'''table inet ccg {{
 chain intercept {{ type filter hook prerouting priority mangle; policy accept;
  ip saddr {app_ip} ip daddr {gateway_ip} udp dport 53 accept
  ip saddr {app_ip} ip daddr {gateway_ip} tcp dport 53 accept
  ip saddr {app_ip} meta l4proto tcp meta mark set 1 tproxy ip to :15001 accept
 }}
 chain forward {{ type filter hook forward priority filter; policy drop; }}
 chain input {{ type filter hook input priority filter; policy drop;
  iifname "lo" accept
  ct state established,related accept
  ip saddr {app_ip} meta mark 1 accept
  ip saddr {app_ip} ip daddr {gateway_ip} udp dport 53 accept
  ip saddr {app_ip} ip daddr {gateway_ip} tcp dport 53 accept
 }}
 chain output {{ type filter hook output priority filter; policy drop;
  oifname "lo" accept
  ct state established,related accept
  ip daddr {out['server']} tcp dport {out['server_port']} accept
 }}
}}
'''
    return config, firewall


def business_rules(gateway_ip):
    gateway_ip = str(ipaddress.IPv4Address(gateway_ip))
    return f'''table inet ccg_app {{
 chain output {{ type filter hook output priority filter; policy drop;
  ct state established,related accept
  ip daddr {gateway_ip} udp dport 53 accept
  ip daddr {gateway_ip} tcp dport 53 accept
  ip daddr 127.0.0.1 tcp dport 8787 accept
  ip daddr {{ 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.168.0.0/16, 224.0.0.0/4, 240.0.0.0/4 }} drop
  meta nfproto ipv4 meta l4proto tcp accept
 }}
}}
'''
