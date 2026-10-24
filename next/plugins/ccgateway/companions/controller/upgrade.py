"""One-shot controller self-upgrade (CONTRACTS §53.5).

POST /runtime/controller starts this in a helper container made from the NEW
controller image (`<name>-upgrade`, host network, Docker socket, the
environment file's directory mounted read-write):

    python upgrade.py <image>

Environment: CCG_RUNTIME_ENV_FILE, CCG_CONTROLLER_NAME, CCG_CONTROLLER_PORT
(passed by the running controller). Equivalent to the core's installScript /
finishScript / rollbackScript (§49.16): the environment file gets
CCG_CONTROLLER_IMAGE=<image>; the old controller becomes `<name>-prev` and is
stopped; a new one is created with the install parameters; it must report the
new image on /health within 60 s, otherwise everything is put back.
"""
import contextlib
import json
import os
import sys
import time
import urllib.request

import docker

from common import CONTROLLER_NAME, DOCKER_SOCKET, container, valid_image

HEALTH_WAIT = 60
HEALTH_INTERVAL = 2


def parse_env(text):
    """Variables as `docker run --env-file` reads them (KEY=VALUE lines only)."""
    env = {}
    for line in text.splitlines():
        line = line.lstrip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        if key and not any(c.isspace() for c in key):
            env[key] = value
    return env


def with_image(text, image):
    # The image carries its own CCG_CONTROLLER_VERSION; one pinned in the file
    # would keep reporting the replaced controller's version.
    lines = [l for l in text.splitlines() if not l.lstrip().startswith(('CCG_CONTROLLER_IMAGE=', 'CCG_CONTROLLER_VERSION='))]
    lines.append('CCG_CONTROLLER_IMAGE=' + image)
    return '\n'.join(lines) + '\n'


def write_atomic(path, text):
    tmp = path + '.tmp'
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    except BaseException:
        with contextlib.suppress(OSError):
            os.unlink(tmp)
        raise


def health_image(port, key):
    """controller_image reported by the local controller, or None."""
    request = urllib.request.Request(f'http://127.0.0.1:{port}/health',
                                     headers={'Authorization': 'Bearer ' + key})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(request, timeout=3) as response:
            return json.loads(response.read()).get('controller_image')
    except (OSError, ValueError, AttributeError):
        return None


def remove(client, name):
    c = container(client, name)
    if c is not None:
        c.remove(force=True)


def restore(client, name, prev):
    """rollbackScript: drop the new controller, restart the previous one."""
    with contextlib.suppress(docker.errors.DockerException):
        remove(client, name)
    old = container(client, prev)
    if old is None:
        return 'removed'
    try:
        old.rename(name)
        old.start()
        return 'restored'
    except docker.errors.DockerException:
        return 'restore_failed'


def prepare_environment(env_file, image, name, port):
    """(original text, text to write, environment of the new controller, root,
    port) or None when the file cannot be read or does not name a state root
    and key."""
    try:
        with open(env_file, encoding='utf-8') as f:
            original = f.read()
    except OSError:
        return None
    updated = with_image(original, image)
    env = parse_env(updated)
    # The new controller keeps the old one's state root, key and port.
    root, key = env.get('CCG_RUNTIME_ROOT', ''), env.get('CCG_CONTROLLER_KEY', '')
    port = env.get('CCG_CONTROLLER_PORT') or port
    if not root.startswith('/') or root == '/' or not key:
        return None
    # Its own name, port and environment file, even when the file does not
    # carry them: a renamed instance must never later upgrade (or read the
    # environment of) the default controller. The helper mounts the file's
    # directory at the same path, so env_file is the host path.
    env.update(CCG_CONTROLLER_NAME=name, CCG_CONTROLLER_PORT=port, CCG_RUNTIME_ENV_FILE=env_file)
    return original, updated, env, root, port


def swap_controller(client, name, prev):
    """The current <name> becomes <prev>, nothing is stopped. An upgrade
    interrupted after the rename left only the previous controller: finish
    its rename first."""
    if container(client, name) is None and container(client, prev) is not None:
        container(client, prev).rename(name)
    remove(client, prev)
    current = container(client, name)
    if current is not None:
        current.rename(prev)


def start_controller(client, image, prev, name, env, root):
    """The previous controller stopped, the new image run with the install
    parameters (= docker run -d --name <name> --restart unless-stopped
    --network host --env-file <env> -v /var/run/docker.sock:/var/run/docker.sock
    -v <root>:<root> --log-opt max-size=20m --log-opt max-file=3 <image>).

    A missing previous controller is a valid interrupted-upgrade state: the
    interruption came after the rename to <prev> and before its removal, so
    there is nothing left to stop; the new controller is run either way."""
    old = container(client, prev)
    if old is not None:
        old.stop()
    client.containers.run(image, name=name, detach=True, restart_policy={'Name': 'unless-stopped'},
        network_mode='host', environment=env,
        volumes={DOCKER_SOCKET: {'bind': DOCKER_SOCKET, 'mode': 'rw'}, root: {'bind': root, 'mode': 'rw'}},
        # Empty type = the daemon's default driver, like --log-opt alone.
        log_config=docker.types.LogConfig(type='', config={'max-size': '20m', 'max-file': '3'}))


def wait_controller_healthy(health, port, key, image, wait=HEALTH_WAIT,
                            interval=HEALTH_INTERVAL, sleep=time.sleep, clock=time.monotonic):
    """Wait until the local controller reports the new image; TimeoutError."""
    deadline = clock() + wait
    while health(port, key) != image:
        if clock() >= deadline:
            raise TimeoutError('controller did not report the new image')
        sleep(interval)


def upgrade(client, image, env_file, name='ccg-controller', port='8787', health=health_image,
            wait=HEALTH_WAIT, interval=HEALTH_INTERVAL, sleep=time.sleep, clock=time.monotonic):
    """Returns (result, rollback): ('done', '') or the failure code and, once
    the old controller was stopped, restored / removed / restore_failed."""
    if not valid_image(image) or not CONTROLLER_NAME.fullmatch(name or ''):
        return 'invalid_request', ''
    prev = name + '-prev'
    prepared = prepare_environment(env_file, image, name, port)
    if prepared is None:
        return 'install_failed', ''
    original, updated, env, root, port = prepared
    try:
        write_atomic(env_file, updated)
    except OSError:
        return 'install_failed', ''
    try:
        swap_controller(client, name, prev)
    except docker.errors.DockerException:
        with contextlib.suppress(OSError):
            write_atomic(env_file, original)  # the running controller was not touched
        return 'install_failed', ''
    try:
        start_controller(client, image, prev, name, env, root)
        wait_controller_healthy(health, port, env['CCG_CONTROLLER_KEY'], image, wait, interval, sleep, clock)
    except (docker.errors.DockerException, TimeoutError):
        rollback = restore(client, name, prev)
        with contextlib.suppress(OSError):
            write_atomic(env_file, original)
        return 'controller_unhealthy', rollback
    # finishScript
    with contextlib.suppress(docker.errors.DockerException):
        remove(client, prev)
    return 'done', ''


def main(argv):
    if len(argv) != 2:
        print('usage: upgrade.py <image>', file=sys.stderr)
        return 2
    # Let the running controller finish its 202 response before it is stopped.
    time.sleep(1)
    result, rollback = upgrade(docker.from_env(timeout=120), argv[1],
                               os.getenv('CCG_RUNTIME_ENV_FILE') or '/opt/ccgateway-runtime.env',
                               os.getenv('CCG_CONTROLLER_NAME') or 'ccg-controller',
                               os.getenv('CCG_CONTROLLER_PORT') or '8787')
    print('CCG_RESULT=' + result + (' CCG_ROLLBACK=' + rollback if rollback else ''))
    return 0 if result == 'done' else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
