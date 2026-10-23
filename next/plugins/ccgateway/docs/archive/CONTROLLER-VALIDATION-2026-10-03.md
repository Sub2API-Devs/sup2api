> 归档（2026-10-24，审核 02 §5 第 5 条）：这是原 `companions/controller/VALIDATION.md` 的原文，记录 2026-10-03/04 的控制器与出口验证。当时的拓扑是核心经 SSH 隧道连控制器、每账号一个 sing-box 出口、"十个用户指定模型"白名单，不覆盖之后的 HTTPS 控制面板与隧道（CONTRACTS §53）、共享 Xray 出口、CLI 固定版本与请求日志。不代表当前验证状态；现状见 [controller/README.md](../../companions/controller/README.md) 与 CONTRACTS §49、§53。

# Account egress validation — 2026-10-03

Implemented account-scoped runtime management and change-driven proxy
reconciliation. The existing account editor supplies `proxy_id` or `proxy_url`;
the controller receives decrypted credentials only on the configuration path.
Model calls carry account ID and the current opaque configuration revision.
They never apply configuration, and the remote controller rejects stale
revisions. PostgreSQL advisory transaction locks serialize multi-core writers.

Verified locally:

- Next frontend type checking and production build (temporary output directory).
- Go tests and vet for changed backend paths.
- CCGateway process tests, including stripping proxy/control variables and
  refusing in-container proxy overrides when external egress is enabled.

Verified against a disposable PostgreSQL instance on OVH over an SSH tunnel:

- ccgateway, account and gateway package tests actually ran with a database.
- Account reconciliation applies credentials only on configuration changes;
  repeated calls do not write configuration.
- Editing the proxy invalidates the previous request revision; synchronization
  restores forwarding with the new revision.
- Existing encrypted configuration, JSON/SSE forwarding and account tests pass.

Verified with disposable Docker resources on cc-max:

- Two accounts have different business containers, volumes, internal networks
  and transparent egress containers.
- HTTP CONNECT proxies return distinct markers; 16 concurrent network probes
  retain account isolation.
- Changing one account's proxy changes its subsequent connections; unchanged
  configuration retains the same container identities.
- Authenticated SOCKS5 works. DNS is resolved through proxied DoH.
- Metadata/private destinations and IPv6 cannot bypass the configured egress.
- Stopping one egress blocks that account while the other remains operational.
- Business environments contain no proxy variables or proxy credentials.
- The controller API rejects unauthenticated and stale-revision requests.

No paid model calls, Claude OAuth login, or production account changes were
performed. The original cc-max `ccgateway` container remains running. OVH core
was not upgraded. The disposable PostgreSQL container, tunnel, and labeled
test account containers/networks/volumes were removed; test images and source
copies remain available for repeat validation.

Known boundaries:

- Switching proxies restarts only that account's egress and can interrupt its
  existing connections. This is disclosed in the settings UI.
- Real HTTPS-proxy certificate/authentication acceptance remains unverified;
  HTTP CONNECT and authenticated SOCKS5 have real network tests.
- Existing shared accounts require explicit migration/authorization. Enable
  account runtimes only after installing the matching remote controller.
- Backend integration and UI remain partly core-hosted; this is not a claim
  that full plugin/core separation has been completed.

## 2026-10-04: OAuth and API Key account modes

Real Docker integration passed with the production business/egress images and
an isolated resource prefix. API Key creation, credential rotation, persistent
volume retention, rejection of OAuth operations in API Key mode, removal of API
environment when returning to OAuth, and proxy-only updates preserving the app
container all passed. The existing 16-call/two-account isolation, HTTP/SOCKS5,
DNS, fail-closed and controller-restart checks also passed. This isolated test
made no model calls and did not modify production containers.

The separate production test account used the user-supplied API relay and HTTP
proxy through sing-box. Before formal account-mode rollout, its injected test
credentials completed an account test plus JSON and SSE public gateway calls.
Both public requests were recorded against account 20 / ccgateway with billed
usage. The temporary access key was revoked, group disabled/detached, and the
account removed from scheduling. This is API Key validation, not real OAuth
login validation. The ten user-specified model names are a configured allowlist;
only `claude-haiku-4-5-20251001` has been exercised in these calls.
