# Per-account CCGateway runtimes

This controller replaces the shared CCGateway endpoint when `account_runtimes`
is enabled. Each account owns one business container, one data volume, an
internal Docker network, and an egress container. Linux Docker is required.
The core reads account/proxy changes on a three-second control-plane loop and
retries failed reconciliation. Ordinary model calls only read the authoritative
proxy revision and forward to `/accounts/<id>/v1/messages`; they never configure
sing-box. Stale revisions are rejected until synchronization succeeds.

The existing SSH management integration still lives in the core. This change
does not claim a completed extraction of all CCGateway UI/services into plugin
RPCs. The remote runtime lifecycle is implemented here, outside the core.

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

Bearer controller key on every request; loopback only.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `{"version","app_image","egress_image"}`; `version` is `CCG_CONTROLLER_VERSION` (default `dev`) |
| GET | `/accounts` | `{"runtimes":[{"key","status","created_at"}]}` for every state directory |
| DELETE | `/accounts/<key>` | draft keys only: removes both containers, the network, the data volume and the state directory; `200 {"deleted":true}` also when nothing existed; account ids → 405 |
| PUT | `/accounts/<key>/config` | reconcile (proxy, enabled, revision, auth) |
| GET | `/accounts/<key>/status` | `{"account_id","container","status","revision","auth_mode"}` |
| GET/POST | `/accounts/<key>/v1/messages`, `/accounts/<key>/admin/status`, `/accounts/<key>/admin/auth/{session,start,complete,cancel,logout}` | passed through to the app container; requires `X-CCG-Revision` |

`created_at` (RFC 3339, UTC) is recorded at the first provision; older state
directories report their modification time. `status` is `ready`, `pending` or
`blocked`; persisted readiness is never trusted after a controller restart.

Controller errors are `{"error":"<code>"}`: `unauthorized` (401), `not_found`
(404), `method_not_allowed` (405), `invalid_request` (400: framing, JSON,
revision, authentication or proxy settings), `not_synchronized` (409),
`api_key_account` (409: OAuth action on an API key account),
`image_pull_failed` (503) and `runtime_unavailable` (503). Answers of the app
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
routing and error codes); it needs
no Docker. Run on Linux from this directory:

```sh
pip install -r requirements.txt
python -m unittest -v test_network test_headers test_manager
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
