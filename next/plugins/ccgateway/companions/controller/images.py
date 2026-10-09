"""Resumable chunked image uploads (CONTRACTS §53.5).

Each upload is `<id>.part` (bytes received so far) plus `<id>.json`
({"size", "sha256"}) in a root-private directory. The offset is the size of
the part file; a chunk is written completely or not at all.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import tarfile
import threading
import time

import docker
import requests

MAX_SIZE = 4 << 30
MAX_CHUNK = 64 << 20
MAX_PENDING = 4
STALE_SECONDS = 3600
UPLOAD_ID = re.compile(r'[A-Za-z0-9_-]{22}')
SHA256 = re.compile(r'[0-9a-f]{64}')


class UploadError(Exception):
    """Answered as `status` with {"error": code, **extra}."""

    def __init__(self, status, code, **extra):
        super().__init__(code)
        self.status, self.code, self.extra = status, code, extra

    def body(self):
        return {'error': self.code, **self.extra}


def _not_found():
    return UploadError(404, 'not_found')


def _qualified(tag):
    """docker.io/library/x:t for x:t (containerd names images that way)."""
    first = tag.split('/', 1)[0]
    if '/' in tag and ('.' in first or ':' in first or first == 'localhost'):
        return tag
    return 'docker.io/' + ('' if '/' in tag else 'library/') + tag


def archive_tags(path):
    """Image id (hex) -> RepoTags named by the archive (`docker save`).

    The daemon reports every tag an image id has on this host, so a loaded
    image that is also tagged otherwise here would be reported under an old
    name; the archive says which names were uploaded. The id is the config
    digest (manifest.json Config) with the classic image store and the
    index digest (index.json) with the containerd store. {} when the archive
    has no readable manifest (the daemon's tags are used then).
    """
    try:
        with tarfile.open(path, 'r:*') as archive:
            def document(name):
                try:
                    member = archive.getmember(name)
                except KeyError:
                    return None
                if not member.isfile() or member.size > (1 << 20):
                    return None
                return json.load(archive.extractfile(member))
            entries, index = document('manifest.json'), document('index.json')
    except (OSError, ValueError, tarfile.TarError, EOFError):
        return {}
    out, repo_tags = {}, []
    for entry in entries if isinstance(entries, list) else []:
        config = entry.get('Config') if isinstance(entry, dict) else None
        found = re.search(r'[0-9a-f]{64}', config) if isinstance(config, str) else None
        tags = [t for t in (entry.get('RepoTags') or []) if isinstance(t, str)] if isinstance(entry, dict) else []
        repo_tags.extend(tags)
        if found:
            out.setdefault(found.group(0), []).extend(tags)
    manifests = index.get('manifests') if isinstance(index, dict) else None
    for entry in manifests if isinstance(manifests, list) else []:
        digest = entry.get('digest') if isinstance(entry, dict) else None
        name = ((entry.get('annotations') or {}).get('io.containerd.image.name') if isinstance(entry, dict) else None)
        if not isinstance(digest, str) or not re.fullmatch(r'sha256:[0-9a-f]{64}', digest) or not isinstance(name, str):
            continue
        short = [t for t in repo_tags if _qualified(t) == name]
        out.setdefault(digest.removeprefix('sha256:'), []).extend(short or [name])
    return out


class Uploads:
    def __init__(self, docker_client, directory):
        self.docker = docker_client
        self.dir = Path(directory)
        self.dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(self.dir, 0o700)
        self.lock = threading.Lock()  # guards self.busy and create/cleanup
        self.busy = {}  # upload id -> per-upload lock (long I/O)

    def _paths(self, upload_id):
        if not isinstance(upload_id, str) or not UPLOAD_ID.fullmatch(upload_id):
            raise _not_found()
        return self.dir / (upload_id + '.part'), self.dir / (upload_id + '.json')

    def _meta(self, upload_id):
        part, meta = self._paths(upload_id)
        try:
            data = json.loads(meta.read_text())
            return part, meta, data, part.stat().st_size
        except (OSError, ValueError) as e:
            raise _not_found() from e

    def _guard(self, upload_id):
        _, meta = self._paths(upload_id)
        with self.lock:
            if not meta.exists():
                raise _not_found()
            return self.busy.setdefault(upload_id, threading.Lock())

    def _remove(self, upload_id):
        part, meta = self._paths(upload_id)
        part.unlink(missing_ok=True)
        meta.unlink(missing_ok=True)
        with self.lock:
            self.busy.pop(upload_id, None)

    def _cleanup(self, now):
        # Caller holds self.lock. Uploads being written or loaded are skipped.
        for meta in self.dir.glob('*.json'):
            upload_id = meta.stem
            if not UPLOAD_ID.fullmatch(upload_id):
                continue
            part = meta.with_suffix('.part')
            try:
                changed = max(meta.stat().st_mtime, part.stat().st_mtime if part.exists() else 0)
            except OSError:
                continue
            if now - changed <= STALE_SECONDS:
                continue
            lock = self.busy.get(upload_id)
            if lock is not None and not lock.acquire(blocking=False):
                continue
            try:
                part.unlink(missing_ok=True)
                meta.unlink(missing_ok=True)
                self.busy.pop(upload_id, None)
            finally:
                if lock is not None:
                    lock.release()

    def create(self, size, sha256=None):
        if isinstance(size, bool) or not isinstance(size, int) or not 1 <= size <= MAX_SIZE:
            raise UploadError(400, 'invalid_request')
        if sha256 is not None and (not isinstance(sha256, str) or not SHA256.fullmatch(sha256)):
            raise UploadError(400, 'invalid_request')
        with self.lock:
            self._cleanup(time.time())
            if sum(1 for m in self.dir.glob('*.json') if UPLOAD_ID.fullmatch(m.stem)) >= MAX_PENDING:
                raise UploadError(409, 'too_many_uploads')
            upload_id = secrets.token_urlsafe(16)
            part, meta = self._paths(upload_id)
            fd = os.open(part, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            os.close(fd)
            tmp = meta.with_suffix('.tmp')
            fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, 'w', encoding='utf-8') as f:
                json.dump({'size': size, 'sha256': sha256}, f)
            tmp.replace(meta)
        return {'upload_id': upload_id, 'offset': 0, 'size': size}

    def status(self, upload_id):
        _, _, data, offset = self._meta(upload_id)
        return {'offset': offset, 'size': data['size']}

    def delete(self, upload_id):
        with self._guard(upload_id):
            self._meta(upload_id)
            self._remove(upload_id)
        return {'deleted': True}

    def write(self, upload_id, offset, length, reader):
        """Append exactly `length` bytes read from `reader` at `offset`."""
        with self._guard(upload_id):
            part, _, data, current = self._meta(upload_id)
            if offset != current:
                raise UploadError(409, 'offset_mismatch', offset=current)
            if current + length > data['size']:
                raise UploadError(400, 'invalid_request')
            with open(part, 'r+b') as f:
                f.seek(current)
                remaining = length
                try:
                    while remaining:
                        chunk = reader.read(min(remaining, 1 << 20))
                        if not chunk:
                            raise UploadError(400, 'invalid_request')  # body ended early
                        f.write(chunk)
                        remaining -= len(chunk)
                except BaseException:
                    f.truncate(current)
                    raise
            return {'offset': current + length, 'size': data['size']}

    def load(self, upload_id):
        with self._guard(upload_id):
            part, _, data, current = self._meta(upload_id)
            if current != data['size']:
                raise UploadError(409, 'incomplete')
            try:
                digest = hashlib.sha256()
                with open(part, 'rb') as f:
                    while chunk := f.read(1 << 20):
                        digest.update(chunk)
                digest = digest.hexdigest()
                if data.get('sha256') and data['sha256'] != digest:
                    raise UploadError(400, 'checksum_mismatch')
                try:
                    with open(part, 'rb') as f:
                        # The daemon accepts plain and gzip-compressed tars.
                        images = self.docker.images.load(f)
                except (docker.errors.DockerException, requests.exceptions.RequestException) as e:
                    raise UploadError(400, 'load_failed') from e
                if not images:
                    raise UploadError(400, 'load_failed')
                tags = archive_tags(part)

                def names(image):
                    if tags:
                        return tags.get(image.id.removeprefix('sha256:'), [])
                    return list(image.tags or [])
                return {'sha256': digest, 'images': [{'id': image.id, 'tags': names(image)} for image in images]}
            finally:
                self._remove(upload_id)
