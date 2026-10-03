#!/usr/bin/env python3
"""Configure/verify the OVH -> cc-max connection without printing credentials.

Default is verification only; --configure installs the dedicated SSH identity
and sidecar keys into the core's encrypted settings via its authenticated API.
The dedicated key and pinned known_hosts must already exist on OVH.
"""
import argparse
import json
import pathlib
import subprocess
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--configure", action="store_true")
    args = parser.parse_args()
    root = pathlib.Path.home() / "sup2api-managed"
    env = dict(line.split("=", 1) for line in (root / ".env").read_text().splitlines() if "=" in line)
    base = "http://127.0.0.1:3130/api/v1"

    def api(method, path, body=None, headers=None, origin=base):
        req = urllib.request.Request(origin + path, method=method,
            data=None if body is None else json.dumps(body).encode(),
            headers={"Content-Type": "application/json", **(headers or {})})
        try:
            with urllib.request.urlopen(req, timeout=65) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"{method} {path}: HTTP {error.code}") from None
        if result.get("code") not in (None, 0):
            raise RuntimeError(f"{method} {path}: unsuccessful response")
        return result["data"]

    token = api("POST", "/auth/login", {"email": env["SUB2API_BOOTSTRAP_ADMIN_EMAIL"],
        "password": env["SUB2API_BOOTSTRAP_ADMIN_PASSWORD"]})["access_token"]
    auth = {"Authorization": "Bearer " + token}
    step = api("POST", "/auth/step-up", {"password": env["SUB2API_BOOTSTRAP_ADMIN_PASSWORD"]}, auth)
    write = {**auth, "X-Step-Up-Token": step["step_up_token"]}
    prefix = "/system/ccgateway"
    if args.configure:
        fingerprint = api("POST", prefix + "/remote-fingerprint", {"host": "130.94.122.254", "port": 22}, write)["fingerprint"]
        trusted = {
            "SHA256:fQfdDyptvuTcXYpqnA7OUDSaX0sKNIzIDIBYmCD9QT4",
            "SHA256:AmdZ2g1Wzf+NhCRgTTvUglMtpEbKY/0Yygdim+Ify9w",
            "SHA256:LuOmJcKkhVzpjMYvuqRA+HObRxTeNWgCWk+JZ8nE16k",
        }
        if fingerprint not in trusted:
            raise RuntimeError("cc-max host key changed")
        keydir = root / "ccgateway"
        raw = subprocess.check_output(["ssh", "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
            "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=" + str(keydir / "known_hosts"),
            "-i", str(keydir / "id_ed25519"), "root@130.94.122.254",
            "cat /opt/ccgateway-test/gateway.env"], text=True)
        keys = dict(line.split("=", 1) for line in raw.splitlines() if "=" in line)
        saved = api("PUT", prefix + "/remote-config", {
            "mode": "ssh", "host": "130.94.122.254", "port": 22, "user": "root",
            "auth_mode": "private_key", "private_key": (keydir / "id_ed25519").read_text(),
            "host_key_fingerprint": fingerprint,
            "admin_key": keys["CCG_ADMIN_KEY"], "api_key": keys["CCG_API_KEY"],
        }, write)
        if not saved.get("has_private_key") or not saved.get("has_admin_key") or not saved.get("has_api_key"):
            raise RuntimeError("configuration was not saved")
        print("encrypted SSH configuration saved")
    api("POST", prefix + "/remote-test", {}, write)
    api("POST", prefix + "/remote-action", {"action": "status"}, write)
    print("Docker connection and container status: PASS")
    for port in range(3130, 3134):
        origin = f"http://127.0.0.1:{port}/api/v1"
        cfg = api("GET", prefix + "/remote-config", headers=auth, origin=origin)
        if any(k in cfg for k in ("password", "private_key", "passphrase", "admin_key", "api_key")):
            raise RuntimeError("configuration response exposed a secret field")
        status = api("GET", prefix + "/status", headers=auth, origin=origin)
        proxy = api("GET", prefix + "/proxy", headers=auth, origin=origin)
        print(json.dumps({"port": port, "mode": cfg.get("mode"), "healthy": status.get("healthy"),
            "logged_in": status.get("logged_in"), "proxy_mode": proxy.get("mode"),
            "proxy_revision": proxy.get("revision")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
