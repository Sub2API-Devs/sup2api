"""Stopped-account migration helper; no container start/stop/commit operations.

The authoritative Controller must be stopped throughout. Docker put_archive is
not an atomic multi-file transaction: a private journal and verified equivalent
302 rollback selection make partial writes recoverable before any later start.
"""
import argparse
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import posixpath
import secrets
import tarfile

import docker
from dockerfs import container_identity
from runtime_updates import release_entry

ROOT = "/opt/ccgateway/cli"
ACTIVE = ROOT + "/active-runtime.json"
WORKER = "/usr/local/bin/worker"
OLD_PATCH = "ccgateway-v11-native-build-parameters"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


class StreamReader(io.RawIOBase):
    def __init__(self, chunks):
        self.chunks = iter(chunks)
        self.pending = b""

    def readable(self):
        return True

    def readinto(self, buffer):
        if not self.pending:
            try:
                self.pending = next(self.chunks)
            except StopIteration:
                return 0
        n = min(len(buffer), len(self.pending))
        buffer[:n], self.pending = self.pending[:n], self.pending[n:]
        return n


def archive_read(container, path, content=False, limit=512 << 20):
    """Check ownership/type in the archive itself, not only Docker stat."""
    chunks, stat = container.get_archive(path, chunk_size=65536)
    try:
        if stat.get("linkTarget"):
            raise RuntimeError("Symlink rejected: " + path)
        with tarfile.open(fileobj=io.BufferedReader(StreamReader(chunks)), mode="r|*") as archive:
            info = archive.next()
            if info is None or info.uid != 0 or info.mode & 0o022 or info.issym() or info.islnk():
                raise RuntimeError("Untrusted archive entry: " + path)
            if not content:
                if not info.isdir():
                    raise RuntimeError("Trusted ancestor is not a directory: " + path)
                return None
            if not info.isfile() or info.size > limit:
                raise RuntimeError("Invalid file: " + path)
            raw = archive.extractfile(info).read(limit + 1)
            if len(raw) != info.size or archive.next() is not None:
                raise RuntimeError("Invalid single-file archive: " + path)
            return raw
    finally:
        close = getattr(chunks, "close", None)
        if close:
            close()


def trusted(container, file):
    parent = posixpath.dirname(file)
    while True:
        archive_read(container, parent)
        if parent == "/":
            break
        parent = posixpath.dirname(parent)
    return archive_read(container, file, content=True)


def tar_entries(entries):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode="w") as archive:
        for name, raw, mode in entries:
            info = tarfile.TarInfo(name)
            info.uid = info.gid = 0
            info.mode = mode
            if raw is None:
                info.type = tarfile.DIRTYPE
                archive.addfile(info)
            else:
                info.size = len(raw)
                archive.addfile(info, io.BytesIO(raw))
    return out.getvalue()


def atomic_private(path, raw):
    temporary = path.with_name(path.name + ".next-" + secrets.token_hex(6))
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    directory = os.open(path.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)


class OfflineMigration:
    def __init__(self, client, plan, runtime_root, backup):
        self.client, self.plan = client, plan
        self.root, self.backup = Path(runtime_root).resolve(), Path(backup).resolve()
        if self.root not in self.backup.parents:
            raise RuntimeError("Backup must be inside the private runtime root")
        self.state_path = self.root / plan["key"] / "state.json"
        info = self.state_path.lstat()
        if self.state_path.is_symlink() or info.st_uid != 0 or info.st_mode & 0o022:
            raise RuntimeError("Controller state file is not trusted")
        self.target = client.containers.get(plan["container_id"])
        self.identity = None
        self.times = None

    def guard(self):
        controller = self.client.containers.get(self.plan["controller_name"])
        controller.reload()
        if controller.status not in ("exited", "created"):
            raise RuntimeError("Authoritative Controller must remain stopped")
        c = self.target
        c.reload()
        if (c.id != self.plan["container_id"] or c.name != self.plan["container_name"] or
                c.status not in ("exited", "created") or c.attrs["State"].get("Running") or
                c.attrs["State"].get("Restarting") or c.attrs["State"].get("Paused")):
            raise RuntimeError("Target identity or stopped state changed")
        if c.labels.get("io.sup2api.ccgateway.account") != self.plan["key"]:
            raise RuntimeError("Target account label differs")
        for mount in c.attrs.get("Mounts", []):
            destination = mount["Destination"].rstrip("/") or "/"
            if any(path == destination or path.startswith(destination.rstrip("/") + "/")
                   for path in (ROOT, WORKER)):
                raise RuntimeError("Runtime executable path must be in the container writable layer")
        identity = container_identity(c)
        times = [c.attrs["State"].get("StartedAt"), c.attrs["State"].get("FinishedAt")]
        if self.identity is not None and (identity != self.identity or times != self.times):
            raise RuntimeError("Container generation changed")
        self.identity, self.times = identity, times
        return c

    def write(self, path, raw, mode=0o644):
        c = self.guard()
        if not c.put_archive(posixpath.dirname(path), tar_entries([(posixpath.basename(path), raw, mode)])):
            raise RuntimeError("Archive write failed")
        if trusted(c, path) != raw:
            raise RuntimeError("Archive write verification failed")
        self.guard()

    def package(self):
        image = self.client.images.get(self.plan["image_id"])
        if image.id != self.plan["image_id"]:
            raise RuntimeError("Source image identity differs")
        source = self.client.containers.create(image.id, entrypoint=["true"], network_disabled=True,
            labels={"io.sup2api.task": "ccg-304-offline-migration", "io.sup2api.offline-source": self.plan["key"]})
        try:
            manifest = json.loads(trusted(source, ROOT + "/manifest.json"))
            entry = release_entry(manifest, "2.1.304")
            cli = trusted(source, ROOT + "/" + entry["path"])
            worker = trusted(source, WORKER)
            if (not cli.startswith(b"\x7fELF") or not worker.startswith(b"\x7fELF") or
                    sha(cli) != entry["sha256"] or sha(cli) != self.plan["new_cli_sha256"] or
                    sha(worker) != self.plan["new_worker_sha256"]):
                raise RuntimeError("Packaged ELF/hash mismatch")
            return cli, worker, entry
        finally:
            source.remove(force=True)

    def journal(self, stage, **extra):
        value = json.loads((self.backup / "journal.json").read_text())
        value.update(stage=stage, **extra)
        atomic_private(self.backup / "journal.json", json.dumps(value).encode())

    def apply(self, inject_failure=False):
        c = self.guard()
        cli, worker, entry = self.package()
        old_worker = trusted(c, WORKER)
        old_cli = trusted(c, ROOT + "/2.1.302/claude")
        if sha(old_worker) != self.plan["old_worker_sha256"] or sha(old_cli) != self.plan["old_cli_sha256"]:
            raise RuntimeError("Existing Worker/302 CLI differs from reviewed snapshot")
        state_raw = self.state_path.read_bytes()
        state = json.loads(state_raw)
        if state.get("status") != "blocked":
            raise RuntimeError("Account runtime must remain blocked")
        try:
            prior = trusted(c, ACTIVE)
        except docker.errors.NotFound:
            prior = None
        self.guard()
        self.backup.mkdir(parents=True, mode=0o700, exist_ok=False)
        atomic_private(self.backup / "worker", old_worker)
        atomic_private(self.backup / "state.json", state_raw)
        if prior is not None:
            atomic_private(self.backup / "active-runtime.json", prior)
        atomic_private(self.backup / "journal.json", json.dumps({
            "plan": self.plan, "identity": self.identity, "times": self.times,
            "prior_active": prior is not None, "state_sha256": sha(state_raw), "stage": "backed_up",
        }).encode())
        release = "offline-304-" + entry["sha256"][:12] + "-" + secrets.token_hex(6)
        folder = ROOT + "/" + release
        manifest = json.dumps({"versions": {"2.1.304": {**entry, "path": "claude"}}}).encode()
        try:
            self.guard()
            if not c.put_archive(ROOT, tar_entries([(release, None, 0o755),
                    (release + "/claude", cli, 0o755), (release + "/manifest.json", manifest, 0o644)])):
                raise RuntimeError("Release archive failed")
            if trusted(c, folder + "/claude") != cli or trusted(c, folder + "/manifest.json") != manifest:
                raise RuntimeError("Staged immutable release differs")
            self.journal("release_verified", release=release)
            selected = {"schema_version": 1, "manifest": release + "/manifest.json",
                        "version": "2.1.304", "request_mode": "build"}
            # Guard any accidental later start during an interrupted copy.
            self.write(ACTIVE, json.dumps({**selected, "maintenance_only": True}).encode())
            self.journal("guard_pointer_written")
            self.write(WORKER, worker, 0o755)
            self.journal("worker_verified")
            if inject_failure:
                raise RuntimeError("injected offline failure after Worker replacement")
            self.write(ACTIVE, json.dumps(selected).encode())
            self.guard()
            if sha(self.state_path.read_bytes()) != sha(state_raw):
                raise RuntimeError("Controller state changed")
            updated = copy.deepcopy(state)
            updated["active_runtime"] = {"version": "2.1.304", "patch": entry["patch"],
                "sha256": entry["sha256"], "worker_sha256": sha(worker),
                "container_id": c.id, "container_identity": self.identity, "verified_offline": True}
            encoded = json.dumps(updated).encode()
            self.journal("state_commit_pending", new_state_sha256=sha(encoded))
            atomic_private(self.state_path, encoded)
            self.guard()
            assert trusted(c, WORKER) == worker
            assert json.loads(trusted(c, ACTIVE)) == selected
            self.journal("complete")
            return {"status": "offline_staged", "key": self.plan["key"], "container_id": c.id,
                    "container_status": c.status, "cli_version": "2.1.304", "cli_sha256": sha(cli),
                    "worker_sha256": sha(worker), "runtime_status": updated["status"],
                    "live_health_verified": False, "backup": str(self.backup)}
        except Exception:
            # Never restore into a concurrently started/replaced container.
            self.guard()
            self.rollback()
            raise

    def rollback(self):
        journal = json.loads((self.backup / "journal.json").read_text())
        if journal["plan"] != self.plan:
            raise RuntimeError("Rollback plan differs")
        self.identity, self.times = journal["identity"], journal["times"]
        self.guard()
        worker = (self.backup / "worker").read_bytes()
        state = (self.backup / "state.json").read_bytes()
        if sha(worker) != self.plan["old_worker_sha256"] or sha(state) != journal["state_sha256"]:
            raise RuntimeError("Rollback backup differs")
        if sha(self.state_path.read_bytes()) not in {journal["state_sha256"], journal.get("new_state_sha256")}:
            raise RuntimeError("Do not overwrite independently changed Controller state")
        self.write(WORKER, worker, 0o755)
        if journal["prior_active"]:
            pointer = (self.backup / "active-runtime.json").read_bytes()
        else:
            # Stopped Docker has no unlink/rename API. Restore an equivalent
            # verified 302 selection rather than pretending absence is atomic.
            name = "offline-rollback-302-" + self.plan["old_cli_sha256"][:12] + "-" + secrets.token_hex(6) + ".json"
            manifest = {"versions": {"2.1.302": {"path": "2.1.302/claude",
                "sha256": self.plan["old_cli_sha256"], "patch": OLD_PATCH, "modes": ["direct", "build"]}}}
            self.write(ROOT + "/" + name, json.dumps(manifest).encode())
            pointer = json.dumps({"schema_version": 1, "manifest": name,
                "version": "2.1.302", "request_mode": "build"}).encode()
        self.write(ACTIVE, pointer)
        atomic_private(self.state_path, state)
        self.guard()
        self.journal("rolled_back")
        return {"status": "offline_rolled_back", "key": self.plan["key"], "container_status": self.target.status}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["apply", "rollback"])
    parser.add_argument("--plan", required=True)
    parser.add_argument("--runtime-root", required=True)
    parser.add_argument("--backup", required=True)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if not args.execute:
        raise SystemExit("No writes performed; review plan and use --execute explicitly")
    plan = json.loads(Path(args.plan).read_text())
    expected_id = "40655dee7df13b857587d945d071944dcbac7d6dad677802d41688dd275fd752"
    if plan["key"] != "21" or plan["container_id"] != expected_id or plan["container_name"] != "ccg-21-app" or plan["controller_name"] != "ccg-controller":
        raise SystemExit("Production helper is bound to the reviewed stopped account 21")
    pins = {
        "image_id": "sha256:e9b9bf9907935aea8fd897d86323031050b224a357d60af8fa66ba7e298282d4",
        "old_worker_sha256": "915ade391b1b511a975161388868aa9a39c373870723242070510a32213a32d2",
        "old_cli_sha256": "14da5daf8e6ea2dc8aa7e39a0f2da38427543fa3bfb4ce66274c5e806ee4007e",
        "new_worker_sha256": "5ece090925153f055d36c84894d134aa24f0346eec34b3c2a598809fc618360a",
        "new_cli_sha256": "138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd",
    }
    if any(plan.get(key) != value for key, value in pins.items()):
        raise SystemExit("Production artifact pins differ")
    migration = OfflineMigration(docker.from_env(timeout=180), plan, args.runtime_root, args.backup)
    print(json.dumps(getattr(migration, args.action)(), indent=2))


if __name__ == "__main__":
    main()
