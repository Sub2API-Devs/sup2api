# Per-account CCGateway runtimes

This controller replaces the shared CCGateway endpoint when `account_runtimes`
is enabled. Each account owns one business container, one data volume, an
internal Docker network, and an egress container. Linux Docker is required.
The core reads account/proxy changes on a three-second control-plane loop and
retries failed reconciliation. Model traffic uses authenticated
`/accounts/<key>/connection` discovery followed by a direct HTTP connection to
the account's port 8787: SSH direct-tcpip in SSH mode, or the controller's byte
tunnel (`/accounts/<key>/tunnel`) in control panel mode (CONTRACTS §53). The
legacy forwarding endpoints below remain compatibility surfaces. Stale revisions
are rejected until synchronization succeeds; requests do not reconfigure sing-box.

The existing SSH management integration still lives in the core. This change
does not claim a completed extraction of all CCGateway UI/services into plugin
RPCs. The remote runtime lifecycle is implemented here, outside the core.

## Account data-volume quotas

New account volumes have a hard disk quota of **10 GiB**. Set
`CCG_ACCOUNT_DISK_GIB` in the controller environment to an integer from 1 to
1024 to change the default for newly created volumes. New Workers have a
**1 GiB RAM limit** and a **shared CPU quota of at most 2 cores** (no dedicated
CPU reservation). A changed default does not resize or replace an existing
account container or volume.

The implementation uses Docker's native local-volume `size` option. Docker's
volume storage must support project quotas (normally XFS with `prjquota` /
`pquota`). It does not enable quotas on the host, format disks or relocate
Docker data. On storage without quota support a new volume is created
unbounded and reported as `unbounded`, so accounts stay usable before the
storage is migrated. Set `CCG_ACCOUNT_DISK_QUOTA_REQUIRED=1` to refuse that
instead: unsupported storage then returns `disk_quota_unavailable` (503) with
no unlimited fallback. A volume recorded as `enforced` never falls back to an
unbounded one, whatever this setting.

Before replacing a container, the controller verifies volume ownership,
stored quota options and the bounded `statfs` view using a read-only,
network-disabled helper. It then passes `CCG_ACCOUNT_DISK_QUOTA_BYTES` to the
Worker. The CLI reports the volume's actual available space in whole GiB
only when its filesystem view is bounded by that verified quota.

The quota covers the account's persistent `/work` volume, including
configuration, history, cache and request data. Container writable layers and
Docker's own logs are outside this volume. A hard quota limits maximum usage;
it does not reserve that much space in the shared storage pool.

`GET /health` includes `disk_quota.default_bytes` and `support`
(`unknown`, `available`, `unavailable`). This is backend/configuration
information; `GET /accounts/<key>/status` reports the individual
`disk_quota.limit_bytes` and status (`enforced`, `unbounded` or
`legacy_unbounded`).
Existing unbounded data volumes are preserved and explicitly marked as
legacy. They are never relabeled as enforced or automatically deleted.

**Deployment prerequisite on the currently inspected host:** the Docker
volume directory is on ext4, and a real Docker size-option probe returned
`quota size requested but no quota support`. Until quota-capable storage is
prepared, new accounts there get unbounded volumes (status `unbounded`); they
keep that status after a later storage migration and are not resized. Migrating the
Docker volume directory can affect other services using Docker volumes and
needs a maintenance window and verified backups.

Read-only inspection found two 3.84 TB NVMe disks (`nvme2n1`, `nvme3n1`) with
no mounts or recognized filesystem/partition signatures. The proposed pool is
a mirror (RAID1), providing about 3.84 TB nominal / 3.49 TiB before filesystem
overhead, with XFS project quotas enabled. Disk identities and authorization
to erase both drives must be confirmed before creating this pool. It has not
been created. Moving Docker's volume directory also affects the Core nodes,
Caddy and Redis volumes currently using that directory.

The three inspected account `/work` volumes currently occupy approximately
0.7 MiB, 2.7 MiB and 15.8 MiB. A 10 GiB maximum is ample for this observed
usage; retained request data and runtime versions should still be monitored.
A new volume does not allocate a 10 GiB backing file: physical storage grows
with written data and filesystem metadata, subject to the hard quota and
the pool's available capacity.

For existing accounts, record the original enabled/scheduling state, drain
requests, stop writes, back up the complete account volume and controller
state, and verify recovery before rebuilding a bounded volume and restoring
the data. Recheck the active Worker/CLI pair, authentication, quota and model
request before restoring the original state. Previously disabled accounts
must remain disabled. This migration is separate from saving defaults and
has not been performed by this change.

## CLI telemetry environment

Since `e186f56be`, new account business containers receive the eight fixed
environment values in `manager.py`'s `TELEMETRY_ENV`. They are merged after
`cli_env`, so CLI profile values cannot override them. The Worker also applies
the same values when starting request and authentication CLI processes,
including login, refresh and logout.

Updating the controller does not retrofit an existing container's environment.
Activating the updated Worker and restarting its process applies the subprocess
defaults to subsequent CLI launches without requiring a container rebuild.
The broader `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` is added by
`Runner.baseEnv()`, not by `TELEMETRY_ENV` or the authentication environment
helper. `skipWebFetchPreflight` remains unset.

See the [telemetry environment and activation scope](../../docs/CLAUDE-CODE-2.1.304-HARDWARE-PRIVACY-AUDIT.md#遥测环境变量与生效范围)
for all eight values, parsing rules, regression coverage and deployment limits.

## Networking

The business container has only an internal interface. A short-lived Docker
helper installs its default route and firewall inside that container's network
namespace. It has no `NET_ADMIN`, `NET_RAW`, Docker socket, host filesystem,
proxy variables, or proxy credentials. The helper exits before readiness.

The egress container has separate internal and external interfaces. Its own
nftables/TProxy rules deliver TCP traffic to sing-box. The forward chain drops
all packets; only sing-box can originate a connection to the pinned proxy IP
and port. DNS uses DoH through the same outbound. IPv6 and other UDP are blocked.
Private/metadata destinations and Docker's embedded DNS are blocked in the
business namespace. Host default routes and global firewall policies are not
rewritten (Docker still manages its normal bridge rules).

Each proxy update validates a new sing-box configuration and restarts only
that account's egress container. **Existing connections may be interrupted.**
No per-request reconfiguration or serialization is required: concurrent calls
share the account's currently applied egress. The business container and data
volume survive proxy changes. Missing/disabled proxies block the account;
there is no direct fallback. Controller restart clears readiness until actual
container state, network rules, and a proxied HTTP connectivity probe pass.

## Runtime keys and drafts

A runtime is one app container, one egress container, one internal network and
one data volume, named `<prefix>-<key>-<role>` and labelled with the key. The
key is either an account id (`^[1-9][0-9]{0,17}$`) or a draft key
(`^d[0-9a-f]{16}$`). The account editor creates a draft runtime before a
Claude Code account exists, authorizes it, and the saved account adopts the
draft key for the rest of its life (containers are not renamed; the OAuth login
lives in the data volume). Every key is validated against
`^(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})$` before it is used in a path, container,
network or volume name. Drafts that fail, are cancelled or abandoned are
removed by the core's periodic sweep through `DELETE /accounts/<key>`.

## Controller API

Bearer controller key on every request; loopback only (in control panel mode a
Caddy container on the same host terminates HTTPS and proxies to it).

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `{"version","app_image","egress_image","controller_image","network_policy_version","features","disk_quota"}`; `version` is `CCG_CONTROLLER_VERSION` (default `dev`), `controller_image` is `CCG_CONTROLLER_IMAGE` |
| GET | `/accounts` | `{"runtimes":[{"key","status","created_at"}]}` for every state directory |
| DELETE | `/accounts/<key>` | draft keys only: removes both containers, the network, the data volume and the state directory; `200 {"deleted":true}` also when nothing existed; account ids → 405 |
| PUT | `/accounts/<key>/config` | reconcile (proxy, enabled, revision, auth) |
| GET | `/accounts/<key>/status` | `{"account_id","container","status","revision","auth_mode"}` |
| GET | `/accounts/<key>/connection` | `{"app_ip","port","api_key","revision"}` for the current `X-CCG-Revision` |
| GET | `/accounts/<key>/tunnel` | `Upgrade: ccg-tunnel` → `101`, then raw bytes to `<app_ip>:8787` (same revision check) |
| POST | `/accounts/<key>/worker` | `{"image"}` → in-place worker update: `{"status":"updated"\|"unchanged"\|"busy"\|"not_running"\|"rolled_back",…}` (below) |
| POST | `/images/uploads` | `{"size","sha256"?}` → `{"upload_id","offset","size"}` |
| PUT/GET/DELETE | `/images/uploads/<id>` | append a chunk at `X-CCG-Offset` (≤ 64 MiB) / progress / discard |
| POST | `/images/uploads/<id>/load` | verify and `docker load` → `{"sha256","images":[{"id","tags"}]}` |
| GET/PUT | `/runtime/images` | target `{"app","egress","controller"}` / set app or egress (kept in `<root>/runtime.json`) |
| POST | `/runtime/controller` | `{"image"}` → `202`; a helper container from that image runs `upgrade.py` |
| GET/POST | `/accounts/<key>/v1/messages`, `/accounts/<key>/admin/status`, `/accounts/<key>/admin/auth/{session,start,complete,cancel,logout}` | passed through to the app container; requires `X-CCG-Revision` |

Details and error codes of the tunnel, upload, target image and self-upgrade
endpoints: CONTRACTS §53.5. The self-upgrade replaces only the container named
`CCG_CONTROLLER_NAME` (default `ccg-controller`; previous one kept as
`<name>-prev` until the new one reports its image on `/health`, helper
`<name>-upgrade`), rewrites `CCG_CONTROLLER_IMAGE` in `CCG_RUNTIME_ENV_FILE`
(default `/opt/ccgateway-runtime.env`; its directory is mounted into the helper)
and keeps `CCG_RUNTIME_ROOT`, the key and the port from that file.

`created_at` (RFC 3339, UTC) is recorded at the first provision; older state
directories report their modification time. `status` is `ready`, `pending` or
`blocked`; persisted readiness is never trusted after a controller restart.

Controller errors are `{"error":"<code>"}`: `unauthorized` (401), `not_found`
(404), `method_not_allowed` (405), `invalid_request` (400: framing, JSON,
revision, authentication or proxy settings), `not_synchronized` (409),
`api_key_account` (409: OAuth action on an API key account),
`image_pull_failed`, `disk_quota_unavailable` and `runtime_unavailable` (503); the §53.5 endpoints
add `offset_mismatch`, `too_many_uploads`, `incomplete`, `upgrade_in_progress`
(409), `checksum_mismatch`, `load_failed`, `invalid_image` (400); the worker
update adds `unsupported_container` (409) and `container_changed` (503). Answers of the app
container are passed through unchanged; its management errors are
`{"type":"error","error":{"type":"<code>","message":"..."}}` with the codes
listed in `../README.md`.

## Images and upgrades

`CCG_APP_IMAGE` and `CCG_EGRESS_IMAGE` are normally digest references
(`ghcr.io/<owner>/ccgateway-app@sha256:…`) published by
`.github/workflows/ccgateway-images.yml`. A missing image is pulled during
reconciliation; a failed pull answers `image_pull_failed`. Status polling never
pulls.

The app container carries the image id next to the credential fingerprint.
Changing the configured image is informational for existing containers. Status
reports `current_image`, `target_image`, `image_update_available` and
`target_image_available` without changing readiness. New containers use the
configured image. Reconciliation and controller restart retain existing app and
egress images; an unchanged revision also retains the egress container.

Manual replacement prepares a separate authorization draft. Operators choose
fresh authorization or migration of `/work/config` through the authenticated
`POST /accounts/<draft>/migrate-auth` endpoint; the core derives the source from
the account binding, never from a client-supplied runtime key. Migration mounts
the source volume read-only and stops only the candidate during copying. Failed
copies cannot become ready. Worker `/work/data` is not copied. The console waits
for login validation and an explicit switch click. Retired containers have a
70-minute grace period; their data volumes and private controller state under
`backups/<key>.json` are retained for manual recovery, not automatically purged.

### In-place worker update (CONTRACTS §53.7)

`POST /accounts/<key>/worker {"image": ref}` replaces the worker program inside
the existing account container and restarts only that container. The container
is never provisioned, created, removed or recreated: its id, image, labels,
mounts, data volume and authorization stay as they are.

1. The program is taken from `/usr/local/bin/worker` of `ref` through a
   temporary container that is created (never started) and removed again; it
   must be the only, regular file of the archive (≤ 256 MiB), else
   `invalid_image`. A missing image is pulled (`image_pull_failed`).
2. Under the account lock: no app container of this key → `not_found`; not
   running → `{"status":"not_running"}`.
3. The target is the first entry of the container's `Path` + `Args` whose
   basename is `worker` or `ccgateway`; only the bare name or
   `/usr/local/bin/<name>` is accepted (`unsupported_container` otherwise, also
   when the file cannot be read). Same SHA-256 → `{"status":"unchanged","sha256"}`.
4. Idle: `top -eo pid,comm` shows only `docker-init` and the program itself
   (anything else is a running CLI request). Rechecked every 2 s for up to
   120 s, then `{"status":"busy"}` without any change.
5. The old program is backed up to `<root>/<key>/worker-backups/<UTC>-<sha12>`
   (0600, newest 5 kept), staged as `<target>.next-<random>` (root, 0755,
   hash verified), idleness is checked once more (busy → staged file removed),
   then `mv -f` as root and `restart(timeout=30)` of this container only.
6. `/health` inside the container must answer 200 within 30 s, and the
   container must really have restarted. Otherwise the backup is put back
   (temporary file + `mv`; written directly while the container is stopped,
   e.g. when the new program exited at once) and the container restarted:
   `{"status":"rolled_back","reason":"unhealthy"|"rollback_unhealthy","online"}`.
7. The restart rebuilt the account network namespace (no firewall or default
   route — the business container cannot reach anything meanwhile). If the
   account was online, the same steps as reconciliation run again (business
   firewall and route, egress readiness, proxied probe) and readiness returns
   at the same revision; a failure only clears readiness and the core's next
   reconciliation repairs it.
8. `{"status":"updated","previous_sha256","sha256","path","online"}`. Container
   `Id`, `Image`, `Config.Image`, `Config.User`, labels, `Mounts`, `Path` and
   `Args` are compared with their initial values throughout; a difference stops
   the update with `container_changed`.

### Paired Worker + CLI activation

Controllers declaring `runtime-pair-update-v1` also accept
`POST /accounts/<key>/worker` with
`{"image":"trusted:release","components":["worker","cli"],"cli_version":"2.1.304"}`.
The original image-only operation remains Worker-only. Arbitrary filesystem
paths and partial component lists are not accepted.

The selected image must contain the Worker and a hash-bound CLI release
manifest under `/opt/ccgateway/cli/manifest.json`. The controller validates
the staged CLI's actual `--ccgateway-info` identity and content capabilities,
then switches both programs without recreating the account container.
The existing Worker must support authenticated `/admin/runtime`
pause/validate/resume leases. An older Worker must first receive the
Worker-only upgrade; an unavailable pause API never falls back to container
replacement or killing active requests.
For a pinned legacy container with `CCG_REQUEST_MODE=native`, the new
Worker starts in management-only bootstrap mode: health and maintenance are
available, model requests return 409 until the packaged pair is activated.
The legacy CLI must still pass its existing version/hash/patch checks and
reside under the trusted CLI root. For older images without a manifest,
the controller records the sealed binary's observed identity in a rollback
manifest without changing that binary.
This rollback snapshot requires the old CLI to actually declare both
`request_direct` and `request_build`; a version string or native agent-loop
support is not enough. An official/unpatched or native-only CLI is not
automatically eligible for this bootstrap path. A rollback after native
bootstrap returns to the old CLI with the bootstrap Worker in management-only
mode, not to the retired native agent path; restore the separately backed-up
original Worker if returning to that original service is required.

For an existing 302 account, upgrade the controller to a build that packages
`runtime_updates.py` and reports `runtime-pair-update-v1` first. The core must
understand the paired update operation before using its UI/API for this step.
Temporarily remove the account from new request routing and drain active calls
before the initial Worker-only bootstrap: an old Worker without maintenance
leases cannot atomically close admission during its replacement. Then activate
the packaged 304 pair, update the core's effective CLI selection to 304, and
check identity/capabilities and a request before restoring traffic. Changing
only the core profile before activation is rejected; leaving its explicit
302 request policy after activation causes version-mismatch rejection.
Controller defaults now select 304 for newly created runtimes. Existing
containers and explicit historical CLI selections remain unchanged.

The root-owned `active-runtime.json` selects a manifest relative to the trusted
CLI root and a version. New Worker startup validates all ancestor ownership,
write permissions, regular-file types, mode support and SHA before accepting
that selection. Without a pointer, the existing pinned environment remains
the fallback. A short maintenance lease can accompany the selection to keep
model admission paused across restart until health, patch, SHA and capabilities
have been checked. Failure restores the previous pointer (or its equivalent
pinned selection) together with the previous Worker.
Lease expiry never reopens model admission. If the controller is interrupted,
an administrator can authenticate to `GET /admin/runtime` to inspect/recover
the pause token and explicitly resume after checking the installed pair.
Both recovery requests use `Authorization: Bearer <account-admin-key>`.
The status response includes `paused`, `lease`, `active_requests` and `expired`;
after confirming no controller transaction is still switching files and the
installed Worker/CLI identity is healthy, send
`POST /admin/runtime {"action":"resume","lease":"<returned-token>"}`.
If the active pointer still carries a lease, first complete or roll back its
artifact selection and atomically remove the persisted lease after verifying
the pair; otherwise a later restart will correctly re-enter the paused state.
An expired token can resume explicitly, but cannot validate/continue a stale
deployment transaction. A failed partial rollback must first restore and
verify a complete pair; the status endpoint does not repair artifact files.
Rollback also carries the pause through restart; an incomplete or unhealthy
rollback remains paused. After resume may have succeeded, routing/readiness
failure only leaves `online: false`, and never restarts newly accepted work.

Successful results contain `status: updated`, Worker `sha256`, `cli_version`,
`cli_patch`, `cli_sha256` and `online`. The controller stores `active_runtime`
separately from the original container profile. Merely changing request mode
or selecting the already activated CLI does not recreate the container.
Selecting another CLI requires explicit paired activation.

`test_runtime_updates.py` covers isolated paired-switch, failed verification,
busy, rollback and path-contract cases. Linux permission enforcement and the
actual Worker → patched CLI → local mock path require the separate runtime
acceptance probe; mocked transactions do not establish real Docker rollback.

## Installation

The core installs and upgrades the remote runtime itself: open the CCGateway
settings page, configure the pinned SSH connection to the Docker host and use
the one-click install/upgrade. The core pulls the pinned controller, app and
egress images from GHCR, writes the controller environment and starts the
controller; nothing is built on the Docker host. After installation the core
checks `GET /health` and shows the controller version. Then enable per-account
runtimes, create Claude Code accounts in the Accounts editor (choose a proxy,
start the container, authorize, save) and use the plugin's Settings tab to view
synchronization, retry, and re-authorize saved accounts.

The old shared container is not automatically migrated, overwritten, or deleted.
Do not point the new mode at the old endpoint. To reuse port 8787, first plan
the old container's retirement.

### SSH forwarding for dynamic account runtimes

Model traffic uses a pinned SSH connection directly to the account's private
HTTP endpoint. The controller authenticates endpoint discovery and checks the
current account revision; it does not relay model bodies. Account IP addresses
can change, so do not maintain a per-account SSH `permitopen` list.

For a dedicated core SSH key, the forwarding option is `permitopen="*:8787"`
(for example `restrict,port-forwarding,permitopen="*:8787"` before the public
key in `authorized_keys`). OpenSSH `permitopen` does not support CIDR matching:
this option limits the destination port, not its network. The core separately
rejects endpoints outside the configured RFC1918 account network pool, invalid
ports, stale revisions, redirects and any transport destination change. Keep
the key private to the trusted core; an independently used SSH key is subject
only to the SSH port restriction. Preserve any existing source/command rules.
Controller management remains reachable at `127.0.0.1:8787` through the same
port rule. New accounts require no SSH allowlist edits.

Account deletion/disable or proxy removal stops its containers; persistent data
is retained for recovery. Permanent deletion of an account's data is
deliberately an explicit administrator operation; only draft runtimes can be
deleted through the controller API. Moving an existing account to a different
remote host requires stopping its old runtime and migrating its data first.

### Appendix: manual installation

Only for development or hosts the core cannot manage. Build from the repository
root on the remote Docker host (or pull the published GHCR images instead):

```sh
docker build -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway:accounts next/plugins/ccgateway/companions
docker build -f next/plugins/ccgateway/companions/egress/Dockerfile -t ccg-egress:1.12.14 next/plugins/ccgateway/companions/egress
docker build -f next/plugins/ccgateway/companions/controller/Dockerfile -t ccg-controller:accounts next/plugins/ccgateway/companions/controller
```

Create `/opt/ccgateway-runtime` with mode 0700. Put these variables in a private
environment file (0600), using a freshly generated controller key of at least
32 characters. Never commit the file or pass real secrets on command lines:

```text
CCG_RUNTIME_ROOT=/opt/ccgateway-runtime
CCG_APP_IMAGE=ccgateway:accounts
CCG_EGRESS_IMAGE=ccg-egress:1.12.14
CCG_CONTROLLER_KEY=<generated secret>
CCG_CONTROLLER_PORT=8787
CCG_CONTROLLER_VERSION=<optional version or git sha>
```

Run one controller per state directory. The root path must be mounted at the
same absolute path because Docker resolves bind sources on the host:

```sh
docker run -d --name ccg-controller --restart unless-stopped \
  --network host --env-file /opt/ccgateway-runtime.env \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /opt/ccgateway-runtime:/opt/ccgateway-runtime \
  --log-opt max-size=20m --log-opt max-file=3 ccg-controller:accounts
```

The controller binds **only to 127.0.0.1**. Its host networking is for the local
control connection to isolated business containers; it never installs network
rules in the host namespace. Docker access is administrative. Do not expose its
port or Docker socket to users or business containers. Pin release image digests
in production after validating the images on the target host.

In CCGateway settings, configure pinned SSH access to this host, use the
controller key as the management key, and enable per-account runtimes. The
legacy API key is unused in this mode.

## Verification

`test_network.py` tests generated policy/configuration. `test_manager.py` tests
the controller with an in-memory Docker client (key validation, draft deletion,
listing, manual image updates, isolated authorization migration, digest pulls,
routing and error codes); `test_tunnel.py`, `test_uploads.py`,
`test_runtime.py` and `test_upgrade.py` cover the control panel endpoints and
`upgrade.py`; `test_worker.py` covers the in-place worker update. None needs
Docker. Run on Linux from this directory:

```sh
pip install -r requirements.txt
python -m unittest -v test_network test_headers test_manager test_tunnel test_uploads test_runtime test_upgrade test_worker
```

`integration_test.py`
uses disposable real Docker resources and two local CONNECT proxies; it tests
two independent account exits, concurrent requests, proxy switching, DNS over
the proxy, private/IPv6 blocking, absence of proxy environment variables, and
fail-closed behavior. Only the DNS test contacts a public DoH resolver; no model
requests or Claude authorization occur. It requires images `ccg-app:account-dev`
and `ccg-egress:dev` and cleans up only its own generated resources.

HTTP CONNECT and authenticated SOCKS5 are covered by the real-network tests.
HTTPS proxy certificate handling is configured but still needs a dedicated
real TLS-proxy acceptance test before claiming that protocol verified.

## Account authentication

CCGateway 0.1.1 / core 0.1.18 supports `managed` (OAuth) and `apikey` accounts.
Both use the same image, independent data volume, network policy and account proxy.
Create an API Key account in the ordinary account editor, entering `api_key` and
an optional HTTPS `base_url` (default https://api.anthropic.com). These credentials
are encrypted by the core; only `api_key` is masked on read. OAuth accounts keep
an empty credential object; a new OAuth account is authorized in a draft runtime
while it is being entered and saved only once its container reports
`logged_in` (saved accounts can be re-authorized later).

The core sends credentials to the controller only during reconciliation over the
pinned SSH connection. The controller sets `ANTHROPIC_API_KEY` and
`ANTHROPIC_BASE_URL` in that account's container. **API credentials are visible to
that container and Docker administrators; proxy credentials remain outside it.**
No fake OAuth token is created. API Key accounts reject OAuth management actions.
A credential change recreates only the account's business container, retaining its
data volume. Existing requests can be interrupted. Proxy-only changes retain the
business container. Until the new revision passes readiness, calls fail closed.
API Key accounts are rejected in legacy shared-container mode.

## Shared Xray egress

The optional controller capability `shared-egress-v1` preserves the existing core and Worker contracts. See `next/docs/CONTRACTS.md` section 57 and `next/docs/CCGATEWAY-XRAY-MIGRATION.md` for migration and rollback boundaries.

Build the separate `companions/xray-egress` image as `ccgateway-xray:1` (Linux amd64); optionally pin its immutable image ID in `CCG_XRAY_IMAGE`. Existing runtimes stay on sing-box. The authenticated private `/accounts/<key>/egress` endpoint switches one runtime. `migrate_egress.py` reads the host's private controller env file, migrates explicit keys sequentially, and writes a report. Do not directly downgrade a controller with shared bindings.

`shared_integration.py` requires an isolated `TEST_RUNTIME_ROOT` under `/checks/xray-migration-.../isolated-runtime`, the existing app/egress 0.1.55 images, and a test certificate under its sibling `fixture` directory. The certificate must cover `proxy.fixture.test` and `198.18.0.10`. The fixture directory must permit its isolated container to write events. The suite validates authenticated HTTP/HTTPS/SOCKS5 and DNS, TLS name rejection, source isolation, long-lived streams, restart recovery, rollback and identity retention. It uses test credentials only and does not send model requests. Run under a distinct controller prefix with Docker socket access; never point it at the production runtime root.
