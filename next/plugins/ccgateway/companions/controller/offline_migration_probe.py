"""Real Docker rehearsal of the fixed offline helper; synthetic fixture only."""
import contextlib
import json
import os
from pathlib import Path
import secrets
import tempfile
import time

import docker
from manager import container_identity
from offline_migrate_account import OfflineMigration, ACTIVE, ROOT, WORKER, sha, trusted, tar_entries, atomic_private


def main():
    if os.getenv("CCG_OFFLINE_DISPOSABLE") != "1" or not Path("/.dockerenv").exists():
        raise RuntimeError("Disposable test execution required")
    client = docker.from_env(timeout=180)
    plan = json.loads(Path("/input/offline-21-migration-plan.json").read_text())
    suffix = secrets.token_hex(6)
    key = "d" + secrets.token_hex(8)
    name = "ccg304-offline-probe-" + suffix
    labels = {"io.sup2api.task": "ccg-304-offline-migration", "io.sup2api.offline-probe": suffix}
    controller = app = None
    report = {"phases": [], "scope": "stopped synthetic 0.1.67 container with actual old915 Worker and packaged70 artifacts"}
    try:
        controller = client.containers.create("ccgateway-controller:0.1.70", name=name + "-controller",
            network_disabled=True, entrypoint=["true"], labels=labels)
        app = client.containers.create("ccgateway-app:0.1.67", name=name + "-app",
            network_disabled=True, labels={**labels, "io.sup2api.ccgateway.account": key}, environment={
                "WORKER_ID": "offline-fixture", "CCG_API_KEY": "offline-fixture-api", "CCG_ADMIN_KEY": "offline-fixture-admin",
                "CCG_REQUEST_MODE": "build", "WORKER_CLI_PATH": ROOT + "/2.1.302/claude",
                "CCG_WORKING_DIRECTORY": "/work", "ANTHROPIC_API_KEY": "offline-fixture-model",
                "ANTHROPIC_BASE_URL": "http://127.0.0.1:1", "DISABLE_AUTOUPDATER": "1",
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
            })
        legacy = Path("/input/ccg-worker-302-live-snapshot-linux").read_bytes()
        assert sha(legacy) == plan["old_worker_sha256"]
        assert app.put_archive("/usr/local/bin", tar_entries([("worker", legacy, 0o755)]))

        def health(version):
            script = "fetch('http://127.0.0.1:8787/health').then(async r=>{const x=await r.json();if(r.status!==200||x.cli_version!==process.argv[1])process.exit(1);console.log(JSON.stringify({version:x.cli_version,sha256:x.cli_sha256}))}).catch(()=>process.exit(1))"
            deadline = time.monotonic() + 40
            while True:
                code, raw = app.exec_run(["node", "-e", script, version])
                if code == 0:
                    return json.loads(raw)
                if time.monotonic() >= deadline:
                    raise RuntimeError("Fixture health timed out")
                time.sleep(1)

        app.start()
        health("2.1.302")
        app.stop(timeout=30)
        app.reload()
        before_id, before_started = app.id, app.attrs["State"]["StartedAt"]
        plan.update(key=key, container_id=app.id, container_name=app.name, controller_name=controller.name)
        with tempfile.TemporaryDirectory(prefix="offline-304-state-") as root:
            state_root = Path(root)
            (state_root / key).mkdir(mode=0o700)
            original = {"status": "blocked", "revision": "a" * 64,
                "cli": {"version": "2.1.302", "request_mode": "build", "disable_auto_update": True},
                "test_preserve": {"value": "unchanged"}}
            state_path = state_root / key / "state.json"
            original_raw = json.dumps(original).encode()
            atomic_private(state_path, original_raw)
            failed = OfflineMigration(client, plan, root, state_root / "backups" / "failure")
            try:
                failed.apply(inject_failure=True)
                raise AssertionError("Fault injection did not run")
            except RuntimeError as exc:
                assert "injected offline failure" in str(exc), str(exc)
            app.reload()
            assert app.status == "exited" and app.id == before_id and app.attrs["State"]["StartedAt"] == before_started
            assert sha(trusted(app, WORKER)) == plan["old_worker_sha256"]
            assert json.loads(trusted(app, ACTIVE))["version"] == "2.1.302"
            assert state_path.read_bytes() == original_raw
            report["phases"].append({"name": "stopped-partial-worker-write-rollback", "status": "pass"})

            success = OfflineMigration(client, plan, root, state_root / "backups" / "success")
            result = success.apply()
            app.reload()
            assert result["container_status"] == "exited" and app.id == before_id
            assert app.attrs["State"]["StartedAt"] == before_started
            saved = json.loads(state_path.read_text())
            assert saved["status"] == "blocked" and saved["cli"] == original["cli"]
            assert saved["test_preserve"] == original["test_preserve"]
            assert saved["active_runtime"]["version"] == "2.1.304"
            assert saved["active_runtime"]["container_identity"] == container_identity(app)
            assert sha(trusted(app, WORKER)) == plan["new_worker_sha256"]
            report["phases"].append({"name": "offline-304-staged-without-any-target-start", "status": "pass"})

            # Only this synthetic clone is started, deliberately management-only.
            pointer = json.loads(trusted(app, ACTIVE))
            pointer["maintenance_only"] = True
            success.write(ACTIVE, json.dumps(pointer).encode())
            app.start()
            observed = health("2.1.304")
            assert observed["sha256"] == plan["new_cli_sha256"]
            script = "fetch('http://127.0.0.1:8787/v1/messages',{method:'POST',headers:{'x-api-key':'offline-fixture-api','content-type':'application/json'},body:'{\"model\":\"fixture\",\"messages\":[{\"role\":\"user\",\"content\":\"do not send\"}]}'}).then(r=>{if(r.status!==409)process.exit(1)}).catch(()=>process.exit(1))"
            code, _ = app.exec_run(["node", "-e", script])
            assert code == 0
            report["phases"].append({"name": "clone-only-304-health-and-maintenance-admission", "status": "pass"})
            # A later start invalidates the offline transaction generation.
            app.stop(timeout=30)
            try:
                success.guard()
                raise AssertionError("Changed generation was not rejected")
            except RuntimeError as exc:
                assert "generation changed" in str(exc)
            report["phases"].append({"name": "unexpected-lifecycle-change-rejected", "status": "pass"})
        report.update(status="pass", old_worker_sha256=plan["old_worker_sha256"],
                      new_worker_sha256=plan["new_worker_sha256"], cli_sha256=plan["new_cli_sha256"],
                      image_id=plan["image_id"])
    except Exception as exc:
        report.update(status="fail", error=str(exc))
        raise
    finally:
        for c in [app, controller]:
            if c is not None:
                with contextlib.suppress(docker.errors.NotFound):
                    c.reload()
                    assert c.labels.get("io.sup2api.offline-probe") == suffix
                    c.remove(force=True)
        report["cleanup"] = "synthetic probe containers removed"
        print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
