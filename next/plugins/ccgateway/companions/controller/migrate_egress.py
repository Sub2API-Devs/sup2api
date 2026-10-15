"""Host-side sequential migration client. Reads credentials only from private env file."""
import argparse
import json
from pathlib import Path
import time
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', default='/opt/ccgateway-runtime.env')
    parser.add_argument('--runtime', nargs='+', required=True)
    parser.add_argument('--backend', choices=['shared_xray', 'per_account_singbox'], required=True)
    parser.add_argument('--report', required=True)
    args = parser.parse_args()
    env = {}
    for line in Path(args.env_file).read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            env[key.strip()] = value
    base = 'http://127.0.0.1:' + env.get('CCG_CONTROLLER_PORT', '8787')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def call(path, payload=None):
        request = urllib.request.Request(base + path, data=None if payload is None else json.dumps(payload).encode(),
            headers={'Authorization': 'Bearer ' + env['CCG_CONTROLLER_KEY'], 'Content-Type': 'application/json'})
        with opener.open(request, timeout=240) as response:
            return json.loads(response.read())
    if 'shared-egress-v1' not in call('/health').get('features', []):
        raise RuntimeError('controller lacks shared-egress-v1')
    report = []
    destination = Path(args.report)
    for key in args.runtime:
        if not key.isalnum() or '/' in key:
            raise ValueError('invalid runtime key')
        before = call('/accounts/' + key + '/status')
        for attempt in range(6):
            result = call('/accounts/' + key + '/egress', {'backend': args.backend})
            if result.get('status') != 'busy':
                break
            time.sleep(5)
        item = {'runtime': key, 'before_revision': before.get('revision'), 'result': result, 'timestamp': time.time()}
        report.append(item)
        destination.write_text(json.dumps(report, indent=2) + '\n')
        destination.chmod(0o600)
        print(json.dumps(item), flush=True)
        if result.get('backend') != args.backend or not result.get('ready'):
            raise RuntimeError('migration incomplete; subsequent runtimes not touched')


if __name__ == '__main__':
    main()
