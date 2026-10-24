"""Files inside account containers: reading and writing single files through
the Docker archive API, and the staged replace used by the in-place Worker
update (CONTRACTS §53.7) and the paired Worker+CLI activation. None of this
needs controller state; it works on a container object."""
import contextlib
import hashlib
import io
import json
import posixpath
import secrets
import tarfile
import time

import docker
import requests

from common import IMAGE_LABEL, SHA256_HEX, UnsupportedContainer

WORKER_SOURCE = '/usr/local/bin/worker'  # the program inside a worker image
WORKER_DIR = '/usr/local/bin'
WORKER_NAMES = ('worker', 'ccgateway')  # new images / older `docker-entrypoint.sh ccgateway`
WORKER_MAX_BYTES = 256 << 20


def image_of(container):
    # Docker's inspect data names the image actually running (also for
    # containers created before IMAGE_LABEL existed); the label is a fallback.
    return container.attrs.get('Image') or container.labels.get(IMAGE_LABEL, '')


def read_single_file(chunks, limit=WORKER_MAX_BYTES):
    """Content of the only entry of a get_archive tar stream; it must be a regular file."""
    buf, size = io.BytesIO(), 0
    for chunk in chunks:
        size += len(chunk)
        if size > limit + (1 << 20):  # headers and padding of one entry
            raise ValueError('archive too large')
        buf.write(chunk)
    buf.seek(0)
    try:
        with tarfile.open(fileobj=buf, mode='r:') as tar:
            members = tar.getmembers()
            if len(members) != 1 or not members[0].isreg() or members[0].size > limit:
                raise ValueError('not a single regular file')
            data = tar.extractfile(members[0]).read()
    except tarfile.TarError as e:
        raise ValueError('invalid archive') from e
    if len(data) != members[0].size:
        raise ValueError('truncated archive')
    return data


def tar_file(name, data):
    """One root-owned 0755 regular file, for put_archive."""
    info = tarfile.TarInfo(name)
    info.size, info.mode, info.uid, info.gid = len(data), 0o755, 0, 0
    info.uname = info.gname = 'root'
    info.mtime = int(time.time())
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w') as tar:
        tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def worker_target(container):
    """(path, basename) of the worker program the container runs (§53.7 step 3).

    The first entry of Path + Args whose basename is a worker name. Only the
    bare name (resolved through PATH) or /usr/local/bin/<name> are accepted:
    anything else would make the replaced file differ from the program run.
    """
    attrs = container.attrs
    for entry in [attrs.get('Path')] + list(attrs.get('Args') or []):
        if not isinstance(entry, str):
            continue
        base = posixpath.basename(entry)
        if base in WORKER_NAMES:
            if entry not in (base, posixpath.join(WORKER_DIR, base)):
                raise UnsupportedContainer('worker program outside ' + WORKER_DIR)
            return posixpath.join(WORKER_DIR, base), base
    raise UnsupportedContainer('container command runs no worker program')


def worker_idle(container, base):
    """No process besides docker-init and the worker itself (no running CLI request)."""
    top = container.top(ps_args='-eo pid,comm')
    titles = top.get('Titles') or []
    if 'COMMAND' not in titles:
        raise RuntimeError('unexpected process list')
    column = titles.index('COMMAND')
    allowed = {'docker-init', base[:15]}  # Linux truncates comm to 15 characters
    return all(len(p) > column and p[column] in allowed for p in top.get('Processes') or [])


def container_identity(container):
    """What must not change while the worker is replaced (§53.7 step 10)."""
    attrs, config = container.attrs, container.attrs.get('Config') or {}
    return json.dumps({'id': container.id, 'image': attrs.get('Image'), 'config_image': config.get('Image'),
                       'user': config.get('User'), 'labels': container.labels,
                       'mounts': sorted(json.dumps(m, sort_keys=True) for m in attrs.get('Mounts') or []),
                       'path': attrs.get('Path'), 'args': attrs.get('Args')}, sort_keys=True)


def sha256_in(container, path):
    """SHA-256 of a file in a running container, None when unreadable."""
    code, out = container.exec_run(['sha256sum', path], user='0')
    digest = (out or b'').decode(errors='replace').split(' ', 1)[0]
    return digest if code == 0 and SHA256_HEX.fullmatch(digest) else None


def discard(container, path):
    with contextlib.suppress(Exception):
        container.exec_run(['rm', '-f', path], user='0')


def stage(container, target, data, digest):
    """Put data next to target as <target>.next-<random> (root, 0755) and verify it."""
    tmp = f'{target}.next-{secrets.token_hex(6)}'
    try:
        if not container.put_archive(posixpath.dirname(target), tar_file(posixpath.basename(tmp), data)):
            raise RuntimeError('copy into container failed')
        code, _ = container.exec_run(['chmod', '0755', tmp], user='0')
        if code != 0:
            raise RuntimeError('chmod failed')
        code, out = container.exec_run(['stat', '-c', '%u:%g:%a', tmp], user='0')
        if code != 0 or (out or b'').strip() != b'0:0:755':
            raise RuntimeError('unexpected owner or mode')
        if sha256_in(container, tmp) != digest:
            raise RuntimeError('copied program differs')
    except BaseException:
        discard(container, tmp)
        raise
    return tmp


def swap(container, tmp, target):
    code, _ = container.exec_run(['mv', '-f', tmp, target], user='0')
    if code != 0:
        discard(container, tmp)
        raise RuntimeError('replace failed')


def read_file(container, path, limit=WORKER_MAX_BYTES):
    """The content of regular file path in the container (docker.errors.NotFound when absent)."""
    chunks, _ = container.get_archive(path)
    return read_single_file(chunks, limit)


def write_file(container, path, raw):
    """Write raw to path in the container (root, 0755) and read it back."""
    if not container.put_archive(posixpath.dirname(path), tar_file(posixpath.basename(path), raw)):
        raise RuntimeError('runtime file copy failed')
    if read_file(container, path, max(len(raw), 65536)) != raw:
        raise RuntimeError('runtime file verification failed')


@contextlib.contextmanager
def image_container(client, ref):
    """A never-started, network-less container of image ref to read files
    from; removed afterwards (a failed removal never hides the real error)."""
    temp = client.containers.create(ref, entrypoint=['true'], network_disabled=True)
    try:
        yield temp
    finally:
        with contextlib.suppress(docker.errors.DockerException, requests.exceptions.RequestException):
            temp.remove(force=True)


def digest(data):
    return hashlib.sha256(data).hexdigest()
