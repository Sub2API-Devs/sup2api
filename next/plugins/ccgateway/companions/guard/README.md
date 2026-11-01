# ccgateway-guard

The host service that executes Docker operations for the CCGateway
controller. The design is `next/docs/ccgateway-guard/03-guard-go-design.md`,
and the binding decisions are in `00-decisions.md`. Module `ccgateway/guard`
uses the standard library only.

```text
cmd/ccgateway-guard   serve | ready | print-rules [--chain X] | diff-rules [--chain X] | print-cleanup | version
internal/config       environment (03 §10.1)
internal/names        resource names, labels, KEY
internal/dockerapi    Engine API client, fixed version 1.54; fakedocker = in-memory daemon for tests
internal/policy       every create body (golden files in testdata/policy)
internal/files        openat/O_NOFOLLOW reads and writes, mount source checks (Linux)
internal/imagecheck   image archive tag scan and whitelist
internal/firewall     CCG-PROXY-BRIDGE, CCG-CONTROL-FWD, CCG-CONTROL-IN
internal/watch        Docker events, debounce, 60 s reconciliation, control endpoint
internal/compose      docker compose (controller, egress only), .env rewrite, compose lock
internal/controller   controller self-upgrade state machine
internal/gateway      gateway ensure / recreate
internal/api          HTTP API (31 endpoints), auth, limits
```

## Tests

| Layer | Command | Where |
|---|---|---|
| unit | `go test -json -count=1 ./...` | any OS |
| linux | `go test -json -count=1 -race ./...` | Linux; adds the `//go:build linux` tests |
| netns | `go test -tags netns -json -count=1 ./internal/firewall/` | root, in a `--privileged` throwaway container with its own network namespace; needs `iptables` (nft) and `iproute2` |
| dockerit | `go test -tags dockerit -json -count=1 -run Dockerit ./internal/api/` | real dockerd, prefix `ccg-gtu`; the environment is listed in `internal/api/dockerit_test.go` |

Check every run with `scripts/check-test-json.sh <log> <layer>`. The script
fails when any test is skipped, any test fails, or the number of passing
tests is below the layer's minimum in `testdata/test-count.min`.

## API contract samples

`testdata/api-contract/<endpoint>/<case>.json` holds the request and answer
samples (05 §5). The guard runs them against its real handlers in
`TestContract`. The Go controller's FakeGuard and `guardapi` read the same
files. The samples belong to the guard: they are generated from the table in
`internal/api/contract_gen_test.go` with
`go test ./internal/api -run TestContractFilesMatchTable -gen-contract`, and
`TestContractFilesMatchTable` fails when the files and the table differ.

A sample is an object with these fields:

- `name`, `covers`
- `setup`: the Docker and host state before the call. See the `setup*` types
  in `internal/api/contract_test.go`:
  - `images`, `networks`, `other_networks`, `volumes`, `containers`,
    `oneshots`, `gateway`
  - `files`: `"<aid>/resolv.conf"` or `"shared-egress"` mapped to `"ok"`, or to
    a rejection reason (`symlink`, `hardlink`, `name`, and so on)
  - `exec`, `job`, `pullable`, `load_lines`, `load_error`, `no_quota`
  - `controller_unguarded`, `starting`, `disk_full`, `lifecycle_busy`,
    `compose_fails`
- `request`:
  - `method`, `path` (including the query string)
  - the body: `json`, `text` or `body_base64`
  - `content_type`, `content_length` (overrides the header), `chunked`
  - `auth`: `""` means a valid token, `"none"` means no header, any other
    value is sent verbatim
  - `remote`: `""` means the controller's address
  - `headers`
- `response`:
  - `status`
  - `body`: a subset match on the top-level keys
  - `keys`: the exact top-level key set
  - `headers`
  - `body_base64`: an exact match on the raw body
- `after`:
  - `docker_unchanged`: no Docker request other than GET was made
  - `files`: the content of the runtime files after the call
  - `recompute`: the call triggered a firewall recompute

Names use prefix `ccg`. The token is
`0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` and the
controller address is `172.29.255.2`.
