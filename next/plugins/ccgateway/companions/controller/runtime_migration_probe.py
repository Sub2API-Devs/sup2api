"""Disposable Docker migration probe. Never accepts production account names."""
import contextlib
import copy
import hashlib
import io
import json
import os
import pathlib
import secrets
import tarfile
import tempfile
import time
import types
import unittest.mock

import docker
import manager
import runtime_updates

TASK = "ccg-304-v12"
LABEL = "io.sup2api.task"
CLI_SHA = "138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd"
WORKER_SHA = "98f2746fed500a3b6fb4a6574431d2ebe74bd1ea8e269f6b07895149eced79db"
ROOT = "/opt/ccgateway/cli"


def archive(entries):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode="w") as tar:
        for name, data in entries:
            info = tarfile.TarInfo(name)
            info.uid = info.gid = 0
            info.mode = 0o755
            if data is None:
                info.type = tarfile.DIRTYPE
                tar.addfile(info)
            else:
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
    return out.getvalue()


def digest(data):
    return hashlib.sha256(data).hexdigest()


class ProbeManager(manager.Manager):
    def __init__(self, client, container, image, root, key, state):
        self.docker, self.container, self.image, self.root, self.key = client, container, image, pathlib.Path(root), key
        self.state_value, self.online = state, {}

    def owned(self, aid, role):
        assert aid == self.key and role == "app"
        self.container.reload()
        assert self.container.labels.get(LABEL) == TASK and self.container.name.startswith("ccg304-migration-probe-")
        return self.container

    def ensure_image(self, ref):
        assert ref == self.image
        return self.docker.images.get(ref)

    def guard(self, aid):
        assert aid == self.key
        return contextlib.nullcontext()

    def state(self, aid):
        assert aid == self.key
        return copy.deepcopy(self.state_value)

    def save(self, aid, state):
        assert aid == self.key
        self.state_value = copy.deepcopy(state)

    def dir(self, aid):
        assert aid == self.key
        return self.root

    def public(self, aid):
        self.owned(aid, "app")
        return {"revision": ""}

    def _reactivate(self, *_):
        raise AssertionError("No real routing or egress is allowed in this probe")


def main():
    if os.getenv("CCG_MIGRATION_DISPOSABLE") != "1" or not pathlib.Path("/.dockerenv").exists():
        raise RuntimeError("Run in the explicit disposable probe container")
    client = docker.from_env(timeout=120)
    suffix = secrets.token_hex(5)
    source_tag = "ccgateway-migration-probe:" + suffix
    source = app = committed = None
    created = []
    report = {"scope": "real Docker files/process restart/maintenance; no Core or external network", "phases": []}
    worker = pathlib.Path("/input/ccg-worker-304-assembly-fix-linux").read_bytes()
    cli = pathlib.Path("/input/claude-linux-assembly-fix").read_bytes()
    assert digest(worker) == WORKER_SHA and digest(cli) == CLI_SHA
    labels = {LABEL: TASK, "io.sup2api.probe": suffix}
    try:
        source = client.containers.create("ccgateway-app:0.1.67", name="ccg304-migration-probe-source-" + suffix,
                                          entrypoint=["true"], network_disabled=True, labels=labels)
        created.append(source)
        assert source.put_archive("/usr/local/bin", archive([("worker", worker)]))
        # Extract CLI identity through a separate short-lived process below.
        manifest = {"versions": {"2.1.304": {"path": "2.1.304/claude", "sha256": CLI_SHA,
                    "patch": "ccgateway-v12-feature-policy", "modes": ["direct", "build"]}}}
        # The exact patch is recorded by the already verified release metadata.
        release = json.loads(pathlib.Path("/input/assembly-migration-cli-info.json").read_text())
        assert release["version"] == "2.1.304"
        manifest["versions"]["2.1.304"]["patch"] = release["patch"]
        assert source.put_archive(ROOT, archive([("2.1.304", None), ("2.1.304/claude", cli),
                                                ("manifest.json", json.dumps(manifest).encode())]))
        committed = source.commit(repository="ccgateway-migration-probe", tag=suffix)
        report.update(cli_sha256=CLI_SHA, worker_sha256=WORKER_SHA, source_image_id=committed.id)
        synthetic_admin = "migration-fixture-admin-" + suffix
        app = client.containers.create("ccgateway-app:0.1.67", name="ccg304-migration-probe-app-" + suffix,
            network_disabled=True, labels=labels, environment={
                "WORKER_ID": "migration-fixture", "CCG_REQUEST_MODE": "build",
                "CCG_API_KEY": "migration-fixture-gateway", "CCG_ADMIN_KEY": synthetic_admin,
                "WORKER_CLI_PATH": ROOT + "/2.1.302/claude", "CCG_DATA_DIR": "/work/data",
                "CCG_WORKING_DIRECTORY": "/work", "ANTHROPIC_API_KEY": "migration-fixture-model",
                "ANTHROPIC_BASE_URL": "http://127.0.0.1:1", "DISABLE_AUTOUPDATER": "1",
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
            })
        created.append(app)
        app.start()
        key = "d" + secrets.token_hex(8)
        with tempfile.TemporaryDirectory(prefix="ccg304-controller-state-") as state_root:
            m = ProbeManager(client, app, source_tag, state_root, key, {"app_ip": "127.0.0.1", "admin_key": synthetic_admin})
            original_create = client.containers.create
            def labelled_create(*args, **kwargs):
                assert args[0] == source_tag
                kwargs["labels"] = labels
                c = original_create(*args, **kwargs)
                created.append(c)
                return c
            m.docker = types.SimpleNamespace(images=client.images, containers=types.SimpleNamespace(create=labelled_create))
            identity = manager.container_identity(m.owned(key, "app"))
            assert m._worker_healthy(key, identity), "old Worker must boot"
            old_worker = manager.read_single_file(app.get_archive("/usr/local/bin/worker")[0])
            old_worker_sha = digest(old_worker)
            code, info = app.exec_run(["/usr/local/bin/claude", "--ccgateway-info"])
            old_info = json.loads(info)
            assert code == 0 and old_info["version"] == "2.1.302"
            report["original"] = {"container_id": app.id, "worker_sha256": old_worker_sha, "cli": old_info}

            def http(path, body=None):
                script = """const p=JSON.parse(process.argv[1]);fetch('http://127.0.0.1:8787'+p.path,{method:p.body?'POST':'GET',headers:{Authorization:'Bearer '+process.env.CCG_ADMIN_KEY,'Content-Type':'application/json'},body:p.body?JSON.stringify(p.body):undefined}).then(async r=>{let x={};try{x=await r.json()}catch{};process.stdout.write(JSON.stringify({status:r.status,body:x}))}).catch(()=>process.exit(1));"""
                code, data = app.exec_run(["node", "-e", script, json.dumps({"path": path, "body": body})])
                assert code == 0
                return json.loads(data)

            assert http("/admin/runtime")["status"] == 404
            initial = m.update_worker(key, {"image": source_tag})
            assert initial["status"] == "updated" and m._sha256(app, "/usr/local/bin/worker") == WORKER_SHA
            assert http("/admin/runtime")["status"] == 200
            report["phases"].append({"name": "old-302-worker-bootstrap", "status": "pass"})

            # Execute the real Worker maintenance API through container-local
            # HTTP because --network none deliberately forbids a controller IP.
            def local_maintenance(state, action, lease=""):
                assert state["admin_key"] == synthetic_admin
                reply = http("/admin/runtime", {"action": action, **({"lease": lease} if lease else {})})
                if reply["status"] == 409:
                    return None
                assert reply["status"] == 200 and reply["body"]["active_requests"] == 0
                return reply["body"]

            update = runtime_updates.RuntimeUpdates(m)
            desired = {"image": source_tag, "components": ["worker", "cli"], "cli_version": "2.1.304"}
            with unittest.mock.patch("runtime_updates.maintenance", side_effect=local_maintenance):
                # Fail only the post-restart identity health gate: all file
                # staging, swaps, maintenance, restarts and rollback are real.
                with unittest.mock.patch.object(update, "healthy", return_value=False):
                    failure = update.update(key, desired)
                assert failure["status"] == "rolled_back"
                assert http("/health")["body"]["cli_version"] == "2.1.302"
                assert http("/admin/runtime")["body"]["paused"] is False
                assert m._sha256(app, "/usr/local/bin/worker") == WORKER_SHA
                rollback_pointer = manager.read_single_file(app.get_archive(runtime_updates.ACTIVE)[0])
                report["phases"].append({"name": "failed-304-health-restores-bootstrap-302", "status": "pass"})
                success = update.update(key, desired)
                assert success["status"] == "updated"
                health = http("/health")["body"]
                assert health["cli_version"] == "2.1.304" and health["cli_sha256"] == CLI_SHA
                assert http("/admin/runtime")["body"]["paused"] is False
                assert manager.container_identity(m.owned(key, "app")) == identity
                report["phases"].append({"name": "paired-304-same-container", "status": "pass"})
                # Exact original Worker rollback while the account remains
                # unrouted; old Worker ignores the active-runtime pointer.
                pause = local_maintenance(m.state(key), "pause")
                assert pause and pause["paused"]
                runtime_updates.RuntimeUpdates.write(app, runtime_updates.ACTIVE, rollback_pointer)
                m._restore(key, identity, "/usr/local/bin/worker", old_worker, old_worker_sha)
                assert m._restart_healthy(key, identity)
                assert m._sha256(app, "/usr/local/bin/worker") == old_worker_sha
                assert http("/health")["body"]["cli_version"] == "2.1.302"
                assert http("/admin/runtime")["status"] == 404
                report["phases"].append({"name": "explicit-original-worker-rollback", "status": "pass"})
        report["status"] = "pass"
    except Exception as exc:
        report.update(status="fail", error=str(exc))
        raise
    finally:
        for container in reversed(created):
            with contextlib.suppress(docker.errors.NotFound):
                container.reload()
                assert container.labels.get(LABEL) == TASK and container.labels.get("io.sup2api.probe") == suffix
                container.remove(force=True)
        if committed:
            client.images.remove(source_tag)
        report["cleanup"] = "task-labelled probe containers and source image removed"
        print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
