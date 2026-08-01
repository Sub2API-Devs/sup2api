# Sup2API AI Gateway

`ai-gateway` is the standalone Caddy-based data plane for Sup2API. It owns
public AI API connections and talks to the existing application through a
private gRPC control-plane contract.

The first foundation milestone intentionally keeps the authority boundary
small:

- Caddy listens on `:9999` and runs statically linked Sup2API modules.
- `sup2api_request_id` validates or creates the request ID and initializes the
  shared request state.
- `sup2api_auth` extracts credentials, uses the local AuthGrant cache, and
  enforces downloaded IP policy.
- `sup2api_admission` opens one control-plane billing and scheduling lease.
- `sup2api_lease` renews leases for long-lived streaming and WebSocket calls.
  Transient RPC failures retry only while the last acknowledged lease remains
  valid; an explicit rejection or actual expiry cancels the upstream request.
- `sup2api_gateway` applies the returned execution plan and proxies the body
  directly to the upstream without sending it through the control plane.
- `sup2api_responses_websocket` accepts Responses WebSocket v2 connections and
  runs every `response.create` as a separately admitted, renewed, observed,
  and durably settled turn. A still-valid signed AuthGrant can be rotated over
  the private RPC, so long sessions never retain the plaintext API key.
- `sup2api.protocols.*` modules own provider-specific request and response
  transformations. `passthrough` is the streaming-safe default for compatible
  API-key accounts; unknown profiles fail closed.
- `sup2api.transports.*` modules provide selectable pooled, proxy-aware, or
  TLS-fingerprinted upstream transports; `standard` is the default.
  `fingerprint` consumes an immutable control-plane profile snapshot and uses
  uTLS with bounded digest-keyed connection pools. It supports direct, HTTP
  CONNECT, and SOCKS5 egress without persisting proxy credentials in the WAL.
- `sup2api_settlement` observes the streamed response and submits raw usage
  facts for authoritative pricing and persistence. Settlement facts are
  fsynced to a bounded local WAL before the request lifecycle is released and
  are deleted only after the control plane acknowledges them.
  Deferred finalization also covers ReverseProxy's streaming-abort panic path,
  so disconnects and lease revocations cannot bypass the WAL.
- The existing application remains the authority for API keys, billing,
  scheduling, account credentials, and token refresh.

## Development

Generate RPC bindings after changing the protobuf contract:

```sh
make generate
```

Run checks:

```sh
make check
```

Probe the process separately from its control-plane dependency:

- `GET /healthz` reports Caddy process liveness.
- `GET /readyz` returns 200 only while the private control-plane connection is
  ready and the local billing WAL can safely admit new requests.

The process is configured with environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_GATEWAY_LISTEN` | `:9999` | Public Caddy listener |
| `AI_GATEWAY_NODE_ID` | hostname | Stable data-plane identity |
| `AI_GATEWAY_CONTROL_PLANE` | `unix:///tmp/sup2api-control.sock` | Private gRPC target |
| `AI_GATEWAY_CONTROL_PLANE_INSECURE` | `true` for Unix sockets | Permit plaintext transport |
| `AI_GATEWAY_STARTUP_REQUIRED` | `true` | Fail startup if the control plane is unavailable |
| `AI_GATEWAY_DIAL_TIMEOUT` | `5s` | Initial gRPC dial timeout |
| `AI_GATEWAY_REQUEST_TIMEOUT` | `2s` | Admission/settlement RPC timeout |
| `AI_GATEWAY_GRACE_PERIOD` | `10s` | Caddy graceful shutdown bound |
| `AI_GATEWAY_LEASE_RENEW_INTERVAL` | `30s` | Retry interval while an acknowledged admission lease remains valid |
| `AI_GATEWAY_SETTLEMENT_WAL_PATH` | `./data/settlements` | Durable settlement WAL directory |
| `AI_GATEWAY_SETTLEMENT_WAL_MAX_BYTES` | `1073741824` | Fail-closed WAL capacity limit |
| `AI_GATEWAY_AUTH_CACHE_TTL` | `60s` | Maximum local AuthGrant lifetime |
| `AI_GATEWAY_AUTH_CACHE_SIZE` | `65536` | Maximum local AuthGrant entries |

Execution-plan extension namespaces:

| Namespace | Included modules | Purpose |
| --- | --- | --- |
| `sup2api.protocols` | `passthrough`, `openai_codex`, `anthropic_oauth`, `anthropic_upstream`, `vertex_anthropic`, `bedrock`, `grok`, `gemini_oauth`, `antigravity` | Provider request/response protocol transforms |
| `sup2api.transports` | `standard`, `proxy`, `fingerprint` | Pooled upstream connection behavior |

Authority matrix:

| Capability | Caddy data plane | Sup2API control plane |
| --- | --- | --- |
| API Key extraction | Extracts bounded header credentials and removes plaintext before proxying | Performs authoritative key/user/group lookup and signs short-lived AuthGrants |
| Authentication cache | Bounded digest-keyed LRU with TTL and streamed invalidation | Publishes durable auth mutations through the Redis invalidation bridge |
| IP policy | Executes the downloaded whitelist/blacklist against the direct peer IP | Owns and versions the rules in each AuthGrant |
| Balance/subscription admission | Sends metadata-only `OpenRequest` and enforces the decision | Revalidates authority, subscription windows, quota, scheduling, and pricing availability |
| Quota reservation | Initiates one lease per request/WS turn | Atomically reserves concurrent billing headroom in Redis |
| Lease lifecycle | Renews while streaming; cancels upstream on rejection or expiry | Owns lease identity, expiry, reservation, and distributed concurrency |
| Usage observation | Extracts cumulative JSON/SSE/WS counters without buffering streams | Treats submitted counters as raw facts tied to the admitted lease |
| Final price and deduction | Never calculates or persists financial values | Calculates authoritative cost and commits DB-backed idempotent billing and usage logs |
| Failed settlement retry | Fsyncs facts to a mode-0600 local WAL, including stream-abort paths | Uses transactional `(request_id, api_key_id)` dedup; Redis acknowledgement accelerates replay |

Account routing and provider configuration are not cached in the data plane:
every admitted request receives a fresh authoritative execution-plan snapshot.
Consequently account/config changes do not create a second local source of
truth; the invalidation stream is needed only for cached AuthGrants.

TCP control-plane targets require TLS unless explicitly marked insecure. Unix
socket security relies on filesystem ownership and permissions.

## Current boundary

This directory is an independent Go module so Caddy's dependency graph does
not force version upgrades into the existing backend. The backend now exposes
the private control-plane RPC server for key resolution, admission, leases,
invalidation, and authoritative settlement. Standard API-key accounts and
explicit HTTP/SOCKS proxy profiles use the direct data path. Gemini and
Anthropic Vertex service-account flows keep private-key exchange in the control
plane and send only short-lived bearer tokens to the data plane. The Anthropic
Vertex plugin rewrites top-level JSON fields as a stream, so large multimodal
values are not buffered or re-encoded. Anthropic OAuth and setup-token accounts
use `anthropic_oauth`; refresh tokens and refresh locking remain in the control
plane. Genuine Claude Code requests take a byte-preserving passthrough path,
while third-party requests use a two-pass bounded-memory mimic transformer. It
spools the body to a mode-0600 temporary file, streams large multimodal values
without re-encoding, injects Claude Code system/metadata/default fields,
normalizes configured cache and dateline policy, and restores mapped tool names
in streamed responses. OpenAI OAuth, Codex personal-access-token, and
agent-identity accounts use `openai_codex`: OAuth refresh tokens and signing
keys remain in the control plane, while the data plane receives only a
request-local Authorization value, authoritative ChatGPT account headers,
model mapping, and Codex client snapshot. The plugin applies a strict client
header boundary, isolates session identifiers per API key, normalizes the
Responses/compact body contract, and enforces a 64 MiB body bound. Unsupported
OpenAI OAuth endpoints remain fail-closed. Bedrock accounts use the dedicated
`bedrock` plugin for model/body normalization, API-key auth, SigV4, and AWS
EventStream-to-Anthropic-SSE conversion. For SigV4, the data plane sends only
the transformed payload SHA-256 over the private RPC and the control plane
returns signed headers; AWS access keys and secret keys never enter an
execution plan, Redis lease, data-plane WAL, or log. Body-derived beta
capabilities are checked against the control-plane policy snapshot before they
are injected. Grok OAuth Responses requests use `grok`: refresh tokens and
refresh locking remain in the control plane, while the execution plan contains
only the current request bearer, validated endpoint, mapped model, CLI identity,
and Free-tier cache policy snapshot. The plugin replaces raw conversation keys
with deterministic API-key/model-isolated identities, lowers and restores Codex
`custom`, `tool_search`, and namespace tools (including stateful SSE lifecycles),
emulates `/responses/compact` over xAI's normal Responses endpoint, and applies
a strict client-header allowlist. Compact requests never receive a cache identity.
If xAI returns its specific invalid-encrypted-content 400, a bounded protocol
transport wrapper removes only the rejected reasoning blob and retries once
with the same authoritative route and credential; unrelated 400s are not retried.
Gemini OAuth accounts use `gemini_oauth`. The control plane refreshes the token,
validates AI Studio or Code Assist routing, and snapshots the Code Assist project;
refresh tokens never enter the data plane. Code Assist bodies are wrapped and
responses are unwrapped frame-by-frame. Non-streaming Code Assist requests use
the provider's streaming endpoint and are aggregated back into native Gemini
JSON with final usage preserved for settlement. AI Studio OAuth remains native,
and `countTokens` falls back to the existing bounded text estimate only for an
explicit insufficient-scope response.
Antigravity native Gemini accounts use `antigravity`. OAuth refresh and project
discovery stay in the control plane; the request plan contains only the current
bearer, validated production endpoint, project, mapped model, and client identity.
The plugin injects the required Antigravity identity, expands and normalizes
bounded tool schemas, wraps `v1internal` requests, unwraps SSE frames, aggregates
non-streaming responses, and preserves final usage for settlement. Its
compatibility `countTokens` response is produced locally without an upstream
call. Anthropic Messages requests use the same plugin's pure Claude-to-Gemini
converter and restore non-streaming JSON or the complete Anthropic SSE lifecycle,
including thinking, tools, images, MCP schemas, and cache usage. Client routing
metadata is not forwarded. A provider-specific invalid-thought-signature 400
removes signature-sensitive prior thinking and retries exactly once; unrelated
400 responses are never retried.
Operator-configured Antigravity upstream accounts use `anthropic_upstream`
instead of the generic passthrough profile. The control plane validates the
base URL, freezes model mapping and both compatible authentication headers,
and owns the authoritative beta/version snapshot. The plugin streams the body,
removes unsupported context management when its beta is absent, suppresses
client credentials, cookies, and forwarding metadata, and leaves native
Anthropic JSON/SSE available to the shared usage observer.
Responses WebSocket v2 ingress is served on the `/v1/responses`, `/responses`,
`/openai/v1/responses`, and `/backend-api/codex/responses` aliases. The current
data-plane implementation admits, renews, observes, and settles every sequential
turn independently. HTTP execution plans are bridged to Responses/SSE, while
`ws` and `wss` plans use a bounded native upstream connection pool. Native
connections are isolated by account, downstream session, API-key digest,
credential/header snapshot, transport/proxy/TLS fingerprint, and protocol
profile. A clean connection is reused across turns, stale connections are
detected with a bounded Ping and reconnected, and any credential snapshot
change retires the old connection. Native mode is currently enabled only for
the tested `passthrough` and `openai_codex` frame contracts; other profiles fail
closed. `response.cancel` interrupts the active HTTP or native upstream context,
rejects a mismatched response ID, preserves partial usage and response bytes,
fsyncs a client-cancelled settlement, and keeps the downstream session usable.
Overlapping `response.create` events are rejected without cancelling the active
turn. This gives API-key, Codex OAuth, and Grok plans the same authority and
billing boundary without sending request bodies through gRPC.
Other provider flows stay on the existing in-process path until
their dedicated transforms are complete; admission never silently bypasses
provider requirements.
