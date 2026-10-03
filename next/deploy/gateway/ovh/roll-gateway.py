#!/usr/bin/env python3
"""Review or apply an image-only, follower-first gateway replacement on OVH.

Default is a dry run (an optional rollback verifier uses a disposable container).
This changes gateway containers, never core
release plans, volumes or the releases service. Do not concurrently create a
core upgrade while applying. Existing wire/configuration names remain intact.
"""

import argparse
import copy
import datetime
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid


ORDER = ("sup2api-2", "sup2api-3", "sup2api-4", "sup2api-1")
PORTS = {f"sup2api-{i}": 3129 + i for i in range(1, 5)}
ROLLBACK_BINARIES = ("/usr/local/bin/sub2api-shell", "/usr/local/bin/sub2api-release")


class RollError(Exception):
    pass


def run(args, *, env=None, timeout=30):
    """Never expose subprocess output on failure: config may contain secrets."""
    try:
        result = subprocess.run(args, env=env, capture_output=True, text=True,
                                timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RollError(f"{args[0]} execution failed ({type(exc).__name__})") from None
    if result.returncode:
        raise RollError(f"{args[0]} failed with exit {result.returncode}; output suppressed")
    return result.stdout.strip()


def read_json_command(args, **kwargs):
    try:
        return json.loads(run(args, **kwargs))
    except json.JSONDecodeError:
        raise RollError("Command did not return valid JSON; output suppressed") from None


def compose_args(root, compose):
    return ["docker", "compose", "--project-name", "sup2api-managed",
            "--project-directory", str(root), "--env-file", str(root / ".env"),
            "-f", str(compose)]


def config(root, compose, image=None):
    env = os.environ.copy()
    # .env defines the installed selection, not the invoking shell's override.
    env.pop("GATEWAY_IMAGE", None)
    if image is not None:
        env["GATEWAY_IMAGE"] = image
    return read_json_command(compose_args(root, compose) + ["config", "--format", "json"], env=env)


def image_id(image):
    result = run(["docker", "image", "inspect", "--format", "{{.Id}}", image])
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", result):
        raise RollError("Docker image identity is invalid")
    return result


def binary_hashes(command):
    output = run(command)
    hashes = {}
    for line in output.splitlines():
        parts = line.split()
        if len(parts) != 2 or not re.fullmatch(r"[0-9a-f]{64}", parts[0]):
            raise RollError("Rollback binary hash output is invalid")
        if parts[1] in hashes:
            raise RollError("Rollback binary hash output contains duplicate paths")
        hashes[parts[1]] = parts[0]
    if set(hashes) != set(ROLLBACK_BINARIES):
        raise RollError("Rollback binary hash output is incomplete")
    return hashes


def rollback_image(node, running_image, fallback):
    try:
        existing = image_id(running_image)
    except RollError:
        if not fallback:
            raise RollError(f"{node} previous image is unavailable; a verified --rollback-image is required") from None
        replacement = image_id(fallback)
        running_hashes = binary_hashes(["docker", "exec", f"sup2api-managed-{node}-1", "sha256sum", *ROLLBACK_BINARIES])
        fallback_hashes = binary_hashes([
            "docker", "run", "--rm", "--pull", "never", "--network", "none", "--read-only",
            "--entrypoint", "sha256sum", replacement, *ROLLBACK_BINARIES,
        ])
        if running_hashes != fallback_hashes:
            raise RollError(f"{node} rollback image binaries do not match the running gateway")
        return replacement, {"fallback_tag": fallback, "verified_binaries": running_hashes}
    if existing != running_image:
        raise RollError(f"{node} running image identity could not be confirmed")
    return existing, {}


def container_state(node):
    return read_json_command([
        "docker", "inspect", "--format",
        '{"image":{{json .Image}},"running":{{json .State.Running}},"id":{{json .Id}}}',
        f"sup2api-managed-{node}-1",
    ])


def cluster_state():
    # The existing PG container's local authentication avoids copying DB secrets.
    query = """SELECT json_build_object(
      'baseline',c.baseline,'primary',c.primary_node,
      'active',(SELECT count(*) FROM updater.upgrades u WHERE u.cluster_id=c.cluster_id AND u.status IN ('running','paused')),
      'nodes',(SELECT json_agg(json_build_object('id',n.node_id,'boot',n.shell_boot_id,'core_boot',n.core_boot_id,
        'enabled',n.enabled,'ready',n.ready,'mode',n.mode,'release',n.release_digest))
        FROM updater.nodes n WHERE n.cluster_id=c.cluster_id))
      FROM updater.clusters c WHERE c.cluster_id='sup2api'"""
    return read_json_command(["docker", "exec", "sup2api-pg-1", "psql", "-X", "-U", "sup2api",
                              "-d", "sup2api", "-At", "-v", "ON_ERROR_STOP=1", "-c", query])


def validate_cluster(state, baseline=None):
    if state.get("active") != 0:
        raise RollError("A running or paused core upgrade blocks gateway replacement")
    if state.get("primary") != "sup2api-1" or not state.get("baseline"):
        raise RollError("Unexpected primary or missing baseline")
    if baseline and state["baseline"] != baseline:
        raise RollError("Core baseline changed during gateway replacement")
    nodes = {node["id"]: node for node in state.get("nodes") or []}
    if set(nodes) != set(ORDER):
        raise RollError("Expected exactly the four managed nodes")
    return nodes


def node_ready(node, baseline):
    return (node.get("enabled") and node.get("ready") and node.get("mode") == "local"
            and node.get("release") == baseline and bool(node.get("boot")) and bool(node.get("core_boot")))


def entrance_status(node):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORTS[node]}/api/v1/key/prices", timeout=3) as response:
            return response.status
    except urllib.error.HTTPError as exc:
        return exc.code
    except (OSError, urllib.error.URLError):
        return 0


def verify_completed_cluster(baseline, target_id, old):
    """Earlier verified followers may fail while the primary is replaced."""
    nodes = validate_cluster(cluster_state(), baseline)
    for node in ORDER:
        container = container_state(node)
        if (not container["running"] or container["image"] != target_id
                or nodes[node]["boot"] == old[node]["boot"]
                or not node_ready(nodes[node], baseline) or entrance_status(node) != 401):
            raise RollError(f"{node} failed the final whole-cluster health check")


def verify_config(current, pending, image):
    old, new = copy.deepcopy(current), copy.deepcopy(pending)
    # Compose retains extension anchors in JSON as well as resolved services.
    # Permit only the same intended image change in the common node anchor.
    if "x-node" in old and "x-node" in new:
        if not isinstance(old["x-node"], dict) or not isinstance(new["x-node"], dict):
            raise RollError("Unexpected Compose node extension")
        if new["x-node"].get("image") != image:
            raise RollError("Candidate node extension does not select the requested image")
        old["x-node"].pop("image", None)
        new["x-node"].pop("image", None)
    for node in ORDER:
        if node not in old.get("services", {}) or node not in new.get("services", {}):
            raise RollError("Compose is missing a managed service")
        if new["services"][node].get("image") != image:
            raise RollError("Candidate compose does not select the requested image")
        old["services"][node].pop("image", None)
        new["services"][node].pop("image", None)
    if old != new:
        raise RollError("Compose differs beyond gateway images; refusing replacement (values suppressed)")


def atomic_write(path, data, mode=0o600):
    temp = path.with_name(path.name + ".tmp-" + uuid.uuid4().hex)
    try:
        with os.fdopen(os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, mode), "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        if temp.exists():
            temp.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", required=True, help="Unique, already-built local image tag")
    parser.add_argument("--rollback-image", help="Optional local fallback, used only if an old running image is missing; both gateway binaries must match")
    parser.add_argument("--root", type=Path, default=Path.home() / "sup2api-managed")
    parser.add_argument("--compose", type=Path, default=Path(__file__).resolve().with_name("compose.yml"),
                        help="Candidate repository/pending compose file")
    parser.add_argument("--apply", action="store_true", help="Recreate gateways; otherwise read-only")
    parser.add_argument("--timeout", type=int, default=240, help="Readiness deadline per node in seconds")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9._/:-]*:[A-Za-z0-9_][A-Za-z0-9_.-]*", args.image):
        raise RollError("Use an explicit local image name with a unique tag")
    if args.image.rsplit(":", 1)[1] in {"latest", "local"} or args.timeout < 10:
        raise RollError("A unique tag and readiness timeout >= 10 seconds are required")
    root, candidate = args.root.expanduser().resolve(), args.compose.expanduser().resolve()
    installed = root / "compose.yml"
    if not installed.is_file() or not candidate.is_file() or not (root / ".env").is_file():
        raise RollError("Installed compose, candidate compose and .env must exist")
    candidate_bytes = candidate.read_bytes()
    before_config = config(root, installed)
    pending = config(root, candidate, args.image)
    if candidate.read_bytes() != candidate_bytes:
        raise RollError("Candidate compose changed during validation")
    verify_config(before_config, pending, args.image)
    target_id = image_id(args.image)
    state = cluster_state()
    nodes = validate_cluster(state)
    baseline = state["baseline"]
    old = {}
    for node in ORDER:
        container = container_state(node)
        if not container["running"] or not node_ready(nodes[node], baseline) or entrance_status(node) != 401:
            raise RollError(f"{node} is not healthy before replacement")
        rollback_id, verification = rollback_image(node, container["image"], args.rollback_image)
        if container["image"] == target_id:
            raise RollError(f"{node} already runs the target; inspect partial/prior rollout before retrying")
        old[node] = {**container, "actual_running_image": container["image"], "rollback_image": rollback_id,
                     "rollback_verification": verification, "boot": nodes[node]["boot"]}
    print(f"Validated image-only replacement: {args.image} ({target_id})", flush=True)
    print("Order: " + " -> ".join(ORDER), flush=True)
    if not args.apply:
        print("DRY RUN: no managed files or containers changed. Re-run with --apply to execute.")
        return

    os.umask(0o077)
    backup = root / "gateway-rollbacks" / (datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8])
    backup.mkdir(parents=True, mode=0o700)
    shutil.copy2(installed, backup / "compose.yml")
    shutil.copy2(root / ".env", backup / ".env")
    os.chmod(backup / ".env", 0o600)
    atomic_write(backup / "images.json", json.dumps({"target": target_id, "nodes": old}, indent=2).encode())
    atomic_write(backup / "rollback.json", json.dumps({"services": {n: {"image": old[n]["rollback_image"]} for n in ORDER}}).encode())
    override = backup / "target.json"
    atomic_write(override, json.dumps({"services": {n: {"image": args.image} for n in ORDER}}).encode())
    print(f"Rollback data: {backup}", flush=True)
    changed = []
    try:
        for node in ORDER:
            observed = validate_cluster(cluster_state(), baseline)
            if not all(node_ready(observed[n], baseline) for n in ORDER):
                raise RollError("Cluster readiness changed; refusing next replacement")
            if config(root, installed) != before_config or image_id(args.image) != target_id:
                raise RollError("Installed compose or target tag changed during rollout")
            if container_state(node)["id"] != old[node]["id"]:
                raise RollError(f"{node} was changed by another operator")
            if image_id(old[node]["rollback_image"]) != old[node]["rollback_image"]:
                raise RollError(f"{node} rollback image disappeared during rollout")
            print(f"Recreating {node}", flush=True)
            # Record intent before invoking Compose: timeout may mean it executed.
            changed.append(node)
            run(compose_args(root, installed) + ["-f", str(override), "up", "-d", "--no-deps", "--pull", "never",
                                               "--force-recreate", node], timeout=args.timeout + 180)
            deadline = time.monotonic() + args.timeout
            while time.monotonic() < deadline:
                now = validate_cluster(cluster_state(), baseline)
                container = container_state(node)
                if (container["running"] and container["image"] == target_id and now[node]["boot"] != old[node]["boot"]
                        and node_ready(now[node], baseline) and entrance_status(node) == 401):
                    print(f"Verified {node}: new gateway boot, baseline core ready/local, HTTP 401", flush=True)
                    break
                time.sleep(1)
            else:
                raise RollError(f"{node} did not become ready within the deadline")
        verify_completed_cluster(baseline, target_id, old)
        # Persist the choice only after every node passes. Keep unrelated .env
        # entries byte-for-byte; an interrupted two-file update is recoverable
        # using the image override above and both original files in the backup.
        env_path = root / ".env"
        env_lines = env_path.read_text().splitlines(keepends=True)
        env_text = "".join(line for line in env_lines if not re.match(r"\s*(?:export\s+)?GATEWAY_IMAGE\s*=", line))
        if env_text and not env_text.endswith("\n"):
            env_text += "\n"
        env_text += f"GATEWAY_IMAGE={args.image}\n"
        atomic_write(env_path, env_text.encode())
        atomic_write(installed, candidate_bytes, mode=0o644)
        if config(root, installed) != pending:
            raise RollError("Persisted compose does not match the verified candidate")
        atomic_write(backup / "completed.json", json.dumps({"image": args.image, "id": target_id, "nodes": changed}).encode())
        print("Completed. compose.yml and .env GATEWAY_IMAGE now select the verified image.", flush=True)
    except BaseException:
        print("STOPPED. No automatic rollback was attempted.", file=sys.stderr)
        print("Replacement attempted for: " + ", ".join(changed), file=sys.stderr)
        print(f"Review backups at {backup}. To restore an individual attempted node after safety checks:", file=sys.stderr)
        command = compose_args(root, backup / "compose.yml") + ["-f", str(backup / "rollback.json"),
            "up", "-d", "--no-deps", "--pull", "never", "--force-recreate", "NODE"]
        print(shlex.join(command), file=sys.stderr)
        print("Rollback images are pinned by their saved image IDs; preserve all state volumes.", file=sys.stderr)
        raise


if __name__ == "__main__":
    try:
        main()
    except (RollError, OSError) as exc:
        print(f"Gateway rollout refused/stopped: {exc}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("Gateway rollout interrupted; inspect the recorded rollback data.", file=sys.stderr)
        sys.exit(130)
