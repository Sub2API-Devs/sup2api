#!/usr/bin/env python3
"""Configure/verify the OVH -> cc-max connection without printing credentials.

Default is verification only; --configure installs the dedicated SSH identity
and sidecar keys into the core's encrypted settings via its authenticated API.
The dedicated key and pinned known_hosts must already exist on OVH.
"""
import argparse
import json
import pathlib
import re
import subprocess
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--configure", action="store_true")
    parser.add_argument("--enable-plugin", action="store_true")
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
    write = auth
    prefix = "/system/ccgateway"
    if args.configure:
        # The shared-container SSH mode was removed (CONTRACTS §53.9); configure
        # the controller endpoint or install it from the console instead.
        raise SystemExit("--configure is obsolete: use Settings → CCGateway → controller endpoint / install")
    api("POST", prefix + "/remote-test", {}, write)
    print("Controller connection: PASS")
    if args.enable_plugin:
        api("POST", "/plugins/ccgateway/enable", {}, write)
        print("CCGateway plugin enable requested")
    for port in range(3130, 3134):
        origin = f"http://127.0.0.1:{port}/api/v1"
        web = f"http://127.0.0.1:{port}"
        with urllib.request.urlopen(web + "/", timeout=10) as response:
            html = response.read().decode()
        entry = re.search(r'<script[^>]+src="(/assets/index-[^\"]+\.js)"', html)
        if not entry:
            raise RuntimeError(f"port {port}: missing frontend entry")
        with urllib.request.urlopen(web + entry[1], timeout=10) as response:
            javascript = response.read().decode()
        chunk = re.search(r'CCGatewayView-[a-zA-Z0-9_-]+\.js', javascript)
        if not chunk:
            detail = re.search(r'PluginDetailView-[a-zA-Z0-9_-]+\.js', javascript)
            if detail:
                with urllib.request.urlopen(web + "/assets/" + detail[0], timeout=10) as response:
                    chunk = re.search(r'CCGatewayView-[a-zA-Z0-9_-]+\.js', response.read().decode())
        if not chunk:
            raise RuntimeError(f"port {port}: missing CCGateway frontend route")
        with urllib.request.urlopen(web + "/assets/" + chunk[0], timeout=10) as response:
            if "ccgateway" not in response.read().decode().lower():
                raise RuntimeError(f"port {port}: invalid CCGateway frontend chunk")
        cfg = api("GET", prefix + "/remote-config", headers=auth, origin=origin)
        if any(k in cfg for k in ("password", "private_key", "passphrase", "admin_key", "api_key")):
            raise RuntimeError("configuration response exposed a secret field")
        status = api("GET", prefix + "/status", headers=auth, origin=origin)
        proxy = api("GET", prefix + "/proxy", headers=auth, origin=origin)
        version = api("GET", "/system/version", headers=auth, origin=origin)
        if cfg.get("mode") != "ssh" or status.get("healthy") is not True:
            raise RuntimeError(f"port {port}: remote gateway is not healthy")
        print(json.dumps({"port": port, "core_version": version.get("version"),
            "core_node_id": version.get("core_node_id"), "mode": cfg.get("mode"), "healthy": status.get("healthy"),
            "logged_in": status.get("logged_in"), "proxy_mode": proxy.get("mode"),
            "proxy_revision": proxy.get("revision"), "frontend_chunk": chunk[0]}, ensure_ascii=False))
    plugin = api("GET", "/plugins/ccgateway", headers=auth)
    print(json.dumps({key: plugin.get(key) for key in ("key", "status", "active_version", "desired_version", "node_summary")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
