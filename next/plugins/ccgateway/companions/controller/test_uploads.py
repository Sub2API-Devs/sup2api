"""Chunked image uploads /images/uploads (CONTRACTS §53.5).

    python -m unittest -v test_uploads
"""
import hashlib
import http.client
import io
import json
import os
from pathlib import Path
import socket
import tarfile
import threading
import time
import unittest
from http.server import ThreadingHTTPServer

import docker

import images
from manager import Handler
from test_manager import Base, CONTROLLER_KEY


class ServerBase(Base):
    def setUp(self):
        super().setUp()
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.server.key, self.server.manager = CONTROLLER_KEY, self.m
        self.server.daemon_threads = True
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        super().tearDown()

    def connect(self):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_address[1], timeout=10)
        self.addCleanup(conn.close)
        return conn

    def call(self, method, path, body=None, headers=None, conn=None, key=CONTROLLER_KEY):
        own = conn is None
        conn = conn or http.client.HTTPConnection('127.0.0.1', self.server.server_address[1], timeout=10)
        try:
            raw = json.dumps(body).encode() if isinstance(body, (dict, list)) else body
            conn.request(method, path, body=raw, headers={'Authorization': 'Bearer ' + key, **(headers or {})})
            res = conn.getresponse()
            return res.status, json.loads(res.read() or b'null')
        finally:
            if own:
                conn.close()

    def raw(self, head):
        """Send request headers only; return the status line's code."""
        with socket.create_connection(self.server.server_address, timeout=10) as sock:
            sock.sendall(head.encode())
            return int(sock.makefile('rb').readline().split()[1])


class LoadedImage:
    def __init__(self, image_id, tags):
        self.id, self.tags = image_id, tags


class UploadTests(ServerBase):
    def setUp(self):
        super().setUp()
        self.loaded = []

        def load(f):
            self.loaded.append(f.read())
            return [LoadedImage('sha256:' + 'f' * 64, ['ccg/app:local'])]
        self.fake.images.load = load
        self.dir = Path(self.tmp) / 'uploads'

    def create(self, size, sha256=None):
        body = {'size': size} if sha256 is None else {'size': size, 'sha256': sha256}
        status, result = self.call('POST', '/images/uploads', body)
        self.assertEqual(status, 200, result)
        return result['upload_id']

    def put(self, upload_id, offset, data, conn=None):
        return self.call('PUT', f'/images/uploads/{upload_id}', data, {'X-CCG-Offset': str(offset)}, conn=conn)

    def test_resumable_upload_and_load(self):
        data = os.urandom(300_000)
        digest = hashlib.sha256(data).hexdigest()
        status, created = self.call('POST', '/images/uploads', {'size': len(data), 'sha256': digest})
        self.assertEqual(status, 200)
        upload_id = created['upload_id']
        self.assertRegex(upload_id, r'^[A-Za-z0-9_-]{22}$')
        self.assertEqual(created, {'upload_id': upload_id, 'offset': 0, 'size': len(data)})
        self.assertEqual(self.call('POST', f'/images/uploads/{upload_id}/load'), (409, {'error': 'incomplete'}))
        # Several chunks on one keep-alive connection: each PUT body is read exactly.
        conn = self.connect()
        self.assertEqual(self.put(upload_id, 0, data[:100_000], conn), (200, {'offset': 100_000, 'size': len(data)}))
        sock = conn.sock
        self.assertEqual(self.put(upload_id, 100_000, data[100_000:200_000], conn)[0], 200)
        self.assertIs(conn.sock, sock)
        # An error leaves the body unread: the controller says so and closes.
        self.assertEqual(self.put(upload_id, 0, data[:10], conn), (409, {'error': 'offset_mismatch', 'offset': 200_000}))
        self.assertIsNone(conn.sock)
        self.assertEqual(self.call('GET', f'/images/uploads/{upload_id}'), (200, {'offset': 200_000, 'size': len(data)}))
        self.assertEqual(self.put(upload_id, 200_000, data[200_000:] + b'x'), (400, {'error': 'invalid_request'}))
        self.assertEqual(self.put(upload_id, 200_000, data[200_000:])[0], 200)
        status, result = self.call('POST', f'/images/uploads/{upload_id}/load')
        self.assertEqual(status, 200, result)
        self.assertEqual(result, {'sha256': digest, 'images': [{'id': 'sha256:' + 'f' * 64, 'tags': ['ccg/app:local']}]})
        self.assertEqual(self.loaded, [data])
        self.assertEqual(list(self.dir.iterdir()), [])
        self.assertEqual(self.call('GET', f'/images/uploads/{upload_id}'), (404, {'error': 'not_found'}))

    def test_tags_come_from_the_archive_manifest(self):
        # The daemon reports every tag of the id on this host (here an older
        # name first); the answer names only what the archive carried.
        image_id = 'ab' * 32
        for config, compress in ((image_id + '.json', False), ('blobs/sha256/' + image_id, True)):
            manifest = json.dumps([{'Config': config, 'RepoTags': ['ccg/controller:new'], 'Layers': []}]).encode()
            raw = io.BytesIO()
            with tarfile.open(fileobj=raw, mode='w:gz' if compress else 'w') as archive:
                info = tarfile.TarInfo('manifest.json')
                info.size = len(manifest)
                archive.addfile(info, io.BytesIO(manifest))
            data = raw.getvalue()
            self.fake.images.load = lambda f: [LoadedImage('sha256:' + image_id, ['ccg/controller:old', 'ccg/controller:new'])]
            upload_id = self.create(len(data))
            self.assertEqual(self.put(upload_id, 0, data)[0], 200)
            status, result = self.call('POST', f'/images/uploads/{upload_id}/load')
            self.assertEqual(status, 200, result)
            self.assertEqual(result['images'], [{'id': 'sha256:' + image_id, 'tags': ['ccg/controller:new']}], config)
        # containerd image store (Docker 29): the id is the index digest; the
        # index names the image fully qualified, manifest.json in short form.
        index_id, config_id = 'cd' * 32, 'ef' * 32
        files = {
            'manifest.json': [{'Config': 'blobs/sha256/' + config_id, 'RepoTags': ['ccgt-fakeapp:e2e'], 'Layers': []}],
            'index.json': {'schemaVersion': 2, 'manifests': [{'digest': 'sha256:' + index_id,
                           'annotations': {'io.containerd.image.name': 'docker.io/library/ccgt-fakeapp:e2e'}}]}}
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode='w:gz') as archive:
            for name, doc in files.items():
                blob = json.dumps(doc).encode()
                info = tarfile.TarInfo(name)
                info.size = len(blob)
                archive.addfile(info, io.BytesIO(blob))
        self.fake.images.load = lambda f: [LoadedImage('sha256:' + index_id, ['ccgt-fakeapp:old', 'ccgt-fakeapp:e2e'])]
        upload_id = self.create(len(raw.getvalue()))
        self.put(upload_id, 0, raw.getvalue())
        status, result = self.call('POST', f'/images/uploads/{upload_id}/load')
        self.assertEqual(result['images'], [{'id': 'sha256:' + index_id, 'tags': ['ccgt-fakeapp:e2e']}])
        self.assertEqual(images._qualified('ghcr.io/org/app:1'), 'ghcr.io/org/app:1')
        self.assertEqual(images._qualified('org/app:1'), 'docker.io/org/app:1')
        self.assertEqual(images._qualified('localhost/app:1'), 'localhost/app:1')
        # An untagged archive names nothing, even when the id has tags here.
        manifest = json.dumps([{'Config': image_id + '.json', 'RepoTags': None, 'Layers': []}]).encode()
        raw = io.BytesIO()
        with tarfile.open(fileobj=raw, mode='w') as archive:
            info = tarfile.TarInfo('manifest.json')
            info.size = len(manifest)
            archive.addfile(info, io.BytesIO(manifest))
        upload_id = self.create(len(raw.getvalue()))
        self.put(upload_id, 0, raw.getvalue())
        self.assertEqual(self.call('POST', f'/images/uploads/{upload_id}/load')[1]['images'][0]['tags'], [])

    def test_checksum_mismatch_and_load_failure_delete_the_upload(self):
        upload_id = self.create(4, 'a' * 64)
        self.assertEqual(self.put(upload_id, 0, b'abcd')[0], 200)
        self.assertEqual(self.call('POST', f'/images/uploads/{upload_id}/load'), (400, {'error': 'checksum_mismatch'}))
        self.assertEqual(self.call('GET', f'/images/uploads/{upload_id}'), (404, {'error': 'not_found'}))
        self.assertEqual(self.loaded, [])

        def broken(f):
            raise docker.errors.ImageLoadError('not an image archive')
        self.fake.images.load = broken
        upload_id = self.create(4)
        self.put(upload_id, 0, b'abcd')
        self.assertEqual(self.call('POST', f'/images/uploads/{upload_id}/load'), (400, {'error': 'load_failed'}))
        self.assertEqual(list(self.dir.iterdir()), [])
        self.fake.images.load = lambda f: []
        upload_id = self.create(4)
        self.put(upload_id, 0, b'abcd')
        self.assertEqual(self.call('POST', f'/images/uploads/{upload_id}/load'), (400, {'error': 'load_failed'}))

    def test_create_validation(self):
        for body in ({'size': 0}, {'size': (4 << 30) + 1}, {'size': True}, {'size': '5'}, {},
                     {'size': 5, 'sha256': 'A' * 64}, {'size': 5, 'sha256': 'a' * 63}, {'size': 5, 'other': 1}, [5]):
            self.assertEqual(self.call('POST', '/images/uploads', body), (400, {'error': 'invalid_request'}), body)
        self.assertEqual(self.call('POST', '/images/uploads', b'not json'), (400, {'error': 'invalid_request'}))
        self.assertEqual(self.call('POST', '/images/uploads', {'size': 4 << 30})[0], 200)
        self.assertEqual(self.call('GET', '/images/uploads'), (405, {'error': 'method_not_allowed'}))
        self.assertEqual(self.call('POST', '/images/uploads', {'size': 1}, key='x' * 32), (401, {'error': 'unauthorized'}))

    def test_chunk_header_validation(self):
        upload_id = self.create(10)
        path = f'/images/uploads/{upload_id}'
        auth = f'Authorization: Bearer {CONTROLLER_KEY}\r\nHost: x\r\n'
        too_big = (64 << 20) + 1
        self.assertEqual(self.raw(f'PUT {path} HTTP/1.1\r\n{auth}X-CCG-Offset: 0\r\nContent-Length: {too_big}\r\n\r\n'), 400)
        self.assertEqual(self.raw(f'PUT {path} HTTP/1.1\r\n{auth}X-CCG-Offset: 0\r\nTransfer-Encoding: chunked\r\n\r\n'), 400)
        self.assertEqual(self.raw(f'PUT {path} HTTP/1.1\r\n{auth}X-CCG-Offset: 0\r\nContent-Length: 0\r\n\r\n'), 400)
        for offset in ('', '-1', '+0', '1_0', '0x0'):
            self.assertEqual(self.call('PUT', path, b'ab', {'X-CCG-Offset': offset}), (400, {'error': 'invalid_request'}), offset)
        self.assertEqual(self.call('PUT', '/images/uploads/' + 'A' * 22, b'ab', {'X-CCG-Offset': '0'}), (404, {'error': 'not_found'}))
        self.assertEqual(self.call('GET', f'/images/uploads/{upload_id}'), (200, {'offset': 0, 'size': 10}))

    def test_interrupted_chunk_is_discarded(self):
        upload_id = self.create(10)
        with socket.create_connection(self.server.server_address, timeout=10) as sock:
            sock.sendall((f'PUT /images/uploads/{upload_id} HTTP/1.1\r\nHost: x\r\nAuthorization: Bearer {CONTROLLER_KEY}\r\n'
                          'X-CCG-Offset: 0\r\nContent-Length: 8\r\n\r\nabc').encode())
        for _ in range(100):
            lock = self.m.uploads.busy.get(upload_id)
            if lock is not None and not lock.locked():
                break  # the interrupted PUT has finished
            time.sleep(.05)
        self.assertEqual(self.call('GET', f'/images/uploads/{upload_id}'), (200, {'offset': 0, 'size': 10}))
        self.assertEqual(self.put(upload_id, 0, b'0123456789'), (200, {'offset': 10, 'size': 10}))

    def test_pending_limit_stale_cleanup_and_delete(self):
        ids = [self.create(5) for _ in range(images.MAX_PENDING)]
        self.assertEqual(self.call('POST', '/images/uploads', {'size': 5}), (409, {'error': 'too_many_uploads'}))
        self.assertEqual(self.call('DELETE', f'/images/uploads/{ids[0]}'), (200, {'deleted': True}))
        self.assertEqual(self.call('DELETE', f'/images/uploads/{ids[0]}'), (404, {'error': 'not_found'}))
        self.create(5)
        old = time.time() - images.STALE_SECONDS - 10
        for suffix in ('.json', '.part'):
            os.utime(self.dir / (ids[1] + suffix), (old, old))
        self.create(5)  # the stale upload made room
        self.assertEqual(self.call('GET', f'/images/uploads/{ids[1]}'), (404, {'error': 'not_found'}))
        self.assertEqual(self.call('GET', f'/images/uploads/{ids[2]}'), (200, {'offset': 0, 'size': 5}))
        self.assertEqual(self.call('POST', '/images/uploads', {'size': 5}), (409, {'error': 'too_many_uploads'}))

    def test_old_endpoints_are_gone(self):
        for path in ('/images/upload', '/images/load/' + 'a' * 22, '/images'):
            self.assertEqual(self.call('POST', path, b''), (404, {'error': 'not_found'}), path)


if __name__ == '__main__':
    unittest.main()
