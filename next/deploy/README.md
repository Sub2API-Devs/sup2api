# sub2api-next test deployment

Two nodes behind Caddy, PostgreSQL 16, Redis 7 and a mock Anthropic upstream,
all started with docker compose (project `sub2api-next-test`). Only Caddy
publishes a port, and only on `127.0.0.1:3120` of the test server.

```
deploy/
├── compose.yml            # pg, redis, node-1, node-2, market-init, mock-upstream, caddy
├── .env.example           # secrets/settings; the real file lives at ~/sub2api-next-test/.env
├── caddy/Caddyfile        # LB (health /healthz, flush_interval -1), /market/*, test helpers
├── docker/                # build and entrypoint scripts used by ../Dockerfile
├── mock-upstream/         # mock Anthropic API (standalone Go module)
├── scripts/               # sync.sh (local), up.sh / down.sh / logs.sh (server)
└── ci/compose.yml         # Go test runner joined to the sub2api-next-testdb network
```

## Workflow

```bash
# local (Git Bash): copy this worktree's next/ to ovh:~/sub2api-next-test/src/next,
# including uncommitted files; --up also rebuilds and restarts the stack
bash next/deploy/scripts/sync.sh --up

# on the server (or: ssh ovh bash ~/sub2api-next-test/src/next/deploy/scripts/<script>)
bash ~/sub2api-next-test/src/next/deploy/scripts/up.sh [--no-cache]   # build + up -d + wait for /healthz
bash ~/sub2api-next-test/src/next/deploy/scripts/logs.sh [node-1 ...] # follow logs (LOGS_FOLLOW=0 to print once)
bash ~/sub2api-next-test/src/next/deploy/scripts/down.sh [--purge]    # stop; --purge drops the volumes
```

`up.sh` creates `~/sub2api-next-test/.env` with random secrets on first run
(outside `src/`, so syncing never overwrites it). The bootstrap admin
credentials are in that file:

```bash
ssh ovh grep ADMIN ~/sub2api-next-test/.env
```

## Access from your machine

```bash
ssh -N -L 3120:127.0.0.1:3120 ovh
```

Then open <http://127.0.0.1:3120>.

| URL | What |
|---|---|
| `/` , `/api/v1/*`, `/v1/*` | console, API and gateway, round robin over both nodes (`X-Served-By` response header tells which) |
| `/healthz` | `{"status","version","node"}` of the node that answered |
| `/market/index.json`, `index.json.sig`, `*.s2plugin`, `dev-official.pub` | signed dev market (served by Caddy from the image) |
| `/market/test/*.s2plugin` | signed test builds not listed in the index (guard `0.1.1-test`) |
| `/__node1/*`, `/__node2/*` | one node directly, bypassing the LB |
| `/__mock/*` | mock upstream: `/__mock/__requests`, `/__mock/__control` |

## Image (`next/Dockerfile`, context `next/`)

- `node:24` builds `web/` into `server/web/dist` and every `plugins/*/ui/native`
  (skipped while `package.json` is missing; the placeholder page stays).
- `golang:1.27-trixie` builds `sub2api` (`-X main.Version=$SUB2API_VERSION`),
  `tools/sub2api-plugin` and the plugins when they exist. Plugins are packed and
  signed with a **dev key** created on the first build and kept in the BuildKit
  cache mount `sub2api-next-devkeys` (stable across rebuilds, never in the
  image). `tools/sub2api-plugin/scripts/build-demo.sh` is used when present;
  otherwise every `plugins/*/manifest.json` is packed generically.
- Runtime `debian:trixie-slim`, user `sub2api` (1000), `/usr/local/bin/sub2api`,
  `/usr/local/bin/sub2api-plugin`, `/opt/sub2api/market/`, data in `/var/lib/sub2api`.
- The entrypoint derives `SUB2API_PLUGIN_OFFICIAL_KEYS=sub2api-dev=<pub>` and
  `SUB2API_MARKET_SOURCES=[{"name":"local-dev","url":$SUB2API_DEV_MARKET_URL,...}]`
  from the dev public key unless those variables are set.
- Without the plugin CLI the market contains an empty, unsigned `index.json`.

Node settings (compose): plugin dev mode off, unsigned packages refused, strict
network and seccomp on, `SUB2API_GATEWAY_ALLOW_PRIVATE_UPSTREAM=true` so accounts
can use `base_url=http://mock-upstream:8080`, `mem_limit` 1g per node.

## mock-upstream

| Endpoint | Behaviour |
|---|---|
| `POST /v1/messages` | JSON or SSE (`message_start` with input/cache usage, `content_block_*`, `message_delta` with `output_tokens`, `message_stop`). Default usage: input 120, output 42, cache read 50, cache creation 30 (5m) |
| `POST /v1/messages/count_tokens` | `{"input_tokens": N}` |
| `GET /__requests[?since=id]`, `DELETE /__requests` | last 100 requests (x-api-key, model, stream, metadata.user_id, headers, body) |
| `POST /__control` `{api_key, status, delay_ms, chunk_delay_ms, remaining, usage, text}` / `DELETE /__control[?api_key=]` | per-account behaviour, optionally for N requests |
| `ANY /__webhook/*` | accepts and records (plugin webhook target) |

Behaviour triggers, in increasing precedence: `metadata.mock_status` /
`metadata.mock_delay_ms` in the body, `-status-429` / `-delay-500` inside the
API key, a `/__control` rule for the key, request headers `x-mock-status`
(`429` adds `retry-after: 2`), `x-mock-delay-ms`, `x-mock-chunk-delay-ms`,
`x-mock-usage: input=..,output=..,cache_read=..,cache_creation=..,cache_creation_1h=..`.
The gateway does not forward client headers such as `x-mock-*`, so tests
through the gateway use `/__control` rules or key markers.

## End-to-end tests (`next/e2e`)

```bash
cd next/e2e
E2E_ADMIN_PASSWORD=... E2E_DOCKER_HOST=ovh go test -count=1 -v ./...
E2E_RUN_PENDING=1 ...   # also run tests whose modules are not merged yet
E2E_LONG=1 ...          # also wait for multi-minute schedules (AC 12)
```

| Variable | Default |
|---|---|
| `E2E_BASE_URL` | `http://127.0.0.1:3120` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | `admin@sub2api.test` / (required beyond AC 1) |
| `E2E_DOCKER_HOST` | empty; `ovh` runs `ssh ovh docker ...`, `local` runs docker locally. Needed to kill nodes/plugins and to query PG/Redis |
| `E2E_MOCK_URL`, `E2E_MOCK_INTERNAL_URL`, `E2E_NODE_URLS`, `E2E_PROJECT` | Caddy helper routes / compose names |

Request bodies the contract leaves open are assumed as follows (adjust in
`e2e/resources.go` if the modules differ): `POST /roles {key, name, description}`,
`POST /groups {name, description, visibility, rate_multiplier, model_allowlist}`,
`POST /me/api-keys {name, group_id}`, per-request price `config {"price": "0.04"}`,
publisher `POST /publishers {name, trust_level}`, `POST /publishers/:id/keys {key_id, public_key}`,
plugin detail node states under `nodes[].{node_id,state}`.
