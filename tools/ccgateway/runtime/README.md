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

## Installation

Build from the repository root on the remote Docker host:

```sh
docker build -t ccgateway:accounts tools/ccgateway
docker build -f tools/ccgateway/runtime/Dockerfile.egress -t ccg-egress:1.12.14 tools/ccgateway/runtime
docker build -f tools/ccgateway/runtime/Dockerfile.controller -t ccg-controller:accounts tools/ccgateway/runtime
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
legacy API key is unused in this mode. Create accounts through the existing
Accounts editor and choose a proxy there. Then use the plugin's Settings tab
to view synchronization, retry, and authorize each account independently.

The old shared container is not automatically migrated, overwritten, or deleted.
Do not point the new mode at the old endpoint. To reuse port 8787, first plan
the old container's retirement; alternatively validate the controller using a
different port locally before making the switch. Existing remote SSH
`permitopen` rules must allow the configured loopback endpoint.

Account deletion/disable or proxy removal stops its containers; persistent data
is retained for recovery. Permanent data deletion is deliberately an explicit
administrator operation. Moving an existing account to a different remote host
requires stopping its old runtime and migrating its data first.

## Verification

`test_network.py` tests generated policy/configuration. `integration_test.py`
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
an empty credential object and use the existing authorization workflow.

The core sends credentials to the controller only during reconciliation over the
pinned SSH connection. The controller sets `ANTHROPIC_API_KEY` and
`ANTHROPIC_BASE_URL` in that account's container. **API credentials are visible to
that container and Docker administrators; proxy credentials remain outside it.**
No fake OAuth token is created. API Key accounts reject OAuth management actions.
A credential change recreates only the account's business container, retaining its
data volume. Existing requests can be interrupted. Proxy-only changes retain the
business container. Until the new revision passes readiness, calls fail closed.
API Key accounts are rejected in legacy shared-container mode.
