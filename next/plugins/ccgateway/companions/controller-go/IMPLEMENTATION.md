# controller-go: implementation guide for the parallel writers

The Go controller replaces the Python controller formerly in `../controller/`
(the reference during the rewrite; removed on 2026-11-01, last in `c2fe8834a`). Design: `next/docs/ccgateway-guard/02-controller-go-design.md`
(architecture), `03-guard-go-design.md` §3 and §13.1 (guard API, authoritative),
`01-controller-behavior-spec.md` (behaviour IDs), `05-test-plan.md` (tests),
`00-decisions.md` (overrides everything).

Module `ccgateway/controller`, `go 1.24`, standard library only (no `require`
in go.mod, ever). One writer per package directory; the foundation below is
frozen.

## 1. Who owns what

| Owner | Directories | Delivers |
|---|---|---|
| foundation (done) | everything not listed below, plus every `options.go` | frozen interfaces and shared code |
| **A** accounts | `internal/accounts/` (except `options.go`) | `accounts.New(accounts.Options) (*accounts.Manager, error)`; the Manager implements `contract.Accounts`, `contract.UpdateHost`, `contract.CleanupHost`, `contract.AdminHost`; the shared gateway orchestration (`shared.go`), recover/collect/proxy recheck |
| **B** updates/uploads/cleanup/admin | `internal/updates/`, `internal/uploads/`, `internal/cleanup/`, `internal/admin/` (except their `options.go`) | `updates.New(updates.Options) (contract.Updates, error)`, `uploads.New(uploads.Options) (contract.Uploads, error)`, `cleanup.New(cleanup.Options) (contract.Cleanup, error)`, `admin.New(admin.Options) (contract.Admin, error)` |
| **C** api + cmd | `internal/api/` (new), `cmd/ccg-controller/` | the HTTP server (02 §3) on `contract.*` interfaces; `serve` wiring and shutdown (02 §4.5) |

Frozen (change only through the coordinator): `go.mod`, `Dockerfile`,
`.dockerignore`, `scripts/`, `testdata/pyref/`, every `options.go`, and the
packages `auth`, `clock`, `cliprofile`, `config`, `containerfs`, `contract`,
`errs`, `guardapi` (+ `fakeguard`), `healthcheck`, `hoststate`, `keylock`,
`logx`, `names`, `netplan`, `pyjson`, `pyreftest`, `rnd`, `scripts`,
`store`, `workeradmin`, `xrayconf`.

A writer that needs something from a frozen package (a missing FakeGuard
hook, a helper) asks the coordinator instead of editing it; a writer may add
private helpers in its own directory. Never edit another writer's
directory. Merge order: A, then B, then C; after each merge run the full
Linux suite (`go test -race ./...` in `golang:1.27-bookworm`).

## 2. What each writer may use

Everyone: `errs` (named failures, `errs.Request/Delete/Management/Worker/Tunnel`
sets), `names`, `pyjson` (every byte that Python also writes or hashes goes
through it), `store`, `keylock`, `clock`, `rnd`, `logx`, `guardapi` (the
`Client` interface; tests use `fakeguard.New()` and `g.Client()`).

**A (accounts)** additionally: `auth` (credential check and fingerprint,
byte-compatible), `netplan` (policy, allocator, business rules, proxy pinning
through `Options.Resolver`), `xrayconf` (Xray/nft texts and tags),
`cliprofile` (CLI validation and the probe job), `containerfs` (identity for
`_same_runtime`), `scripts` (PREPARE_VOLUME, PROBE, disk quota program,
telemetry environment), `workeradmin` (PUT admin/environment),
`hoststate` (target images, quota support).

**B** additionally: `contract.UpdateHost` / `CleanupHost` / `AdminHost`
(implemented by A; test with your own stubs), `containerfs`, `scripts`,
`workeradmin` (maintenance), `cliprofile`, `hoststate`.

**C** additionally: `contract.Accounts`, `Updates`, `Uploads`, `Cleanup`,
`Admin` (test the HTTP layer with stub implementations of these; wire the
real constructors in `cmd` after A and B are merged), `config.FromEnv`,
`workeradmin` (pass-through `Do`), `store.Open`, `healthcheck.Run`.

## 3. Contracts that are easy to get wrong

- **Bytes.** Answers, state files, labels and digests use `pyjson.Marshal`
  / `MarshalSorted`, never `encoding/json`. Answer types implement
  `pyjson.Valuer` with Python's key order (see `contract`). State is
  `store.AccountState`: keys keep the file's order; a new key goes after the
  existing ones in canonical order; use `st.Mark(...)` when a code path adds
  several new keys in an order that differs from the canonical one; `st.Pop(k)`
  is `dict.pop` (a later assignment appends the key again).
- **Request bodies** are decoded with `pyjson.Decode` (ordered objects,
  `json.Number`). Type checks follow Python: `pyjson.IsInt` (5.0 is not an
  int), `pyjson.Truthy`, `pyjson.IntOf` (`int()`), `pyjson.Equal` (dict ==).
- **Guard errors.** A guard 404 is `guardapi.ErrNotFound` and is never
  mapped automatically; leaked, it is an unnamed 503 (H9). The client already
  maps 409 ownership_mismatch/resource_in_use/upgrade_in_progress, 503
  busy/disk_quota_unavailable, pull failures and upgrade 403 to `*errs.Error`
  (02 §5.3). Retry once on `ErrExists` (re-query, then treat as existing) and
  on `ErrSubnetOverlap` (re-read `Subnets`, allocate again); on
  `ErrUplinkMissing` call `EnsureGateway` again with an `UplinkRequest`.
  `ErrNotRunning` in `_worker_healthy` means "not yet".
- **Order of guard calls when creating an app (A):** network, volume, jobs
  (disk quota `ro`, then PREPARE_VOLUME `rw` with caps `CHOWN`,
  `DAC_OVERRIDE` only, D5), `WriteResolv`, then `CreateApp` (it refuses
  without resolv.conf), start only in shared apply. Network label is
  `policy.Label()`; `ImageLabel` is the image ID; the guard sorts the env.
- **Readiness (A):** one `AccountState` call per check (BUG-2 fixed); never
  take the shared operation lock on the request path (BUG-1 fixed); a guard
  transport error answers 503 and does not take the runtime offline (02 §5.5).
- **BUG fixes to implement** (05 §8, user-approved): BUG-1, 2, 3
  (egress-desired.json written only after activation succeeds, except when
  blocking), 5 (`netplan.ValidateProxy` at the entry, 400), 7, 8, 9, 11, 12,
  16, 17 (done in xrayconf), 18 (done in store/xrayconf); keep 6, 10, 13, 21, 22, 23.
- **Locks (A):** account lock -> sharedOp -> network lock; `sharedMu` and the
  memory lock are leaves without I/O. Methods that need the account lock take
  `*keylock.Held` and call `h.Check(aid)`.
- **Test doubles:** `Options.Clock` (`clock.NewFake`), `Options.Rand`
  (`rnd.Fixed`), `Options.Resolver` (`netplan.StaticResolver`),
  `Options.Worker` (`workeradmin.Client{Port, HostOverride, Dial}` toward an
  `httptest` server), `Options.BusinessRules`.
- **FakeGuard** follows the guard's policy rules, so a request the real guard
  would refuse fails in unit tests. Script execs with `OnExec`, jobs with
  `OnJob`, loads with `OnLoad`, faults with `Fail`; `RecreateGatewayNow`
  for 02 §7.3; `Calls()` / `Count(route)` to assert guard traffic.

## 4. Tests

- Default suite: `go test -count=1 ./...` on Windows and Linux; CI and the
  Linux check run `go test -count=1 -race -json ./... > t.json && sh
  scripts/check-test-json.sh t.json`. No `t.Skip`, no `testing.Short`, no
  package without tests (all three fail the check).
- Every test function has a `// covers:` comment with 01 behaviour IDs.
- Raise `testdata/test-count.min` with the tests you add (never lower it).
  It is the Windows count (Linux runs four more `//go:build unix` tests).
- Linux-only assertions go in `*_unix_test.go` with `//go:build unix`.
- Cross-language vectors: `testdata/pyref/*.json` and
  `testdata/http-golden/python.json` are fixed files (05-test-plan §6). They
  were generated by `../controller/reference_vectors.py` and
  `differential_dump.py` with Python 3.12, removed together with the Python
  controller on 2026-11-01; to regenerate, check out `c2fe8834a`.

## 5. Contract alignment

`guardapi` and `fakeguard` were aligned with the guard as implemented
(`companions/guard/`, 2026-11-01). The guard's 252 API contract samples
(`companions/guard/testdata/api-contract/`, format in `guard/README.md`) are
now run on this side twice:

- `internal/guardapi/fakeguard/fakeguard_contract_test.go`: every sample
  against FakeGuard (status, headers, raw body, body subset, exact key set;
  the comparison rules and the setup mapping are at the top of the file).
- `internal/guardapi/client_contract_test.go`: every sample's answer replayed
  to the HTTP client over httptest; error answers must map to their sentinel
  or named failure, success answers must decode, and for success samples the
  client must send the sample's request.

A guard change that breaks a sample fails these tests; fix this side, never
the samples (they belong to the guard).

### 5.1 guardapi (client) changes

- `New` accepts only a token of 64 lowercase hex characters (the guard
  answers 401 to anything else). `config` already enforces this.
- Success statuses are exact: PUT network and PUT app 201 (the body is the
  raw inspect itself), PUT volume 201 created / 200 existing (`created:false`,
  `quota_supported:null`, decoded as `QuotaSupported == nil`), POST
  controller/upgrade 202 with `{"accepted": true}` (anything else is an
  error), every other change 204. A success status the endpoint does not use
  (e.g. 200 for a 204 endpoint) is now a `*TransportError` (`ErrUnavailable`),
  no longer a `*Error`.
- `RecreateGateway` only accepts `{"gateway": <inspect>}` (a bare inspect is
  a shape error).
- `ImageFile` requires the answer's Content-Length (none: error); the
  returned size is exact, and a read that ends before Content-Length bytes
  (a cut transfer) fails with `ErrUnavailable` instead of returning a short
  file. `AppArchiveGet` enforces a Content-Length when the answer has one; a
  cut chunked stream fails the read with `ErrUnavailable` (as before).
- Raw request bodies (`ImageLoad`, `AppArchivePut`, `WriteGatewayFile`) go out
  with Content-Length and are never chunked: `size < 0` is an error and
  nothing is sent; a reader shorter than `size` fails with `ErrUnavailable`.
- A JSON request body over 1 MiB (`MaxJSONRequest`) is not sent: the call
  returns a local `*Error{Status: 413, Code: "too_large"}` (what the guard
  would answer).
- New sentinels: `ErrStarting` (503 unavailable/starting), `ErrMountRejected`
  (403 mount_source_rejected), `ErrMountReplaced` (409
  mount_source_replaced). A 503 `unavailable` answer also matches
  `errors.Is(err, ErrUnavailable)`: while the guard starts, callers see the
  same as "guard unreachable" (02 §5.5: readiness does not take the runtime
  offline).
- Unchanged and now verified by the samples: error bodies `{error, reason?,
  message, names?}`; exec `output` and job `stdout` are standard base64;
  Content-Types (JSON `application/json`, archives `application/x-tar`,
  loads `application/x-tar` or `application/gzip` by the gzip magic, gateway
  files `application/octet-stream`); the 02 §5.3 mappings.

### 5.2 FakeGuard changes

Request handling follows the guard's order and rules:

- Authentication first (before 404/405): exactly one `Authorization:
  Bearer <64 lowercase hex>` equal to the token. `SetControllerAddr(ip)`
  also checks the source address (off by default: the in-process client has
  none). `SetToken` changes the token.
- Then the route (404, 405); then, for every route but health,
  `SetControllerUnguarded` (403 forbidden/controller_unguarded) and
  `SetStarting` (503 unavailable/starting), which health reports; then the
  account key; then the query: unknown or repeated parameters are 400, and
  `GET accounts/{aid}?fields=` other than `state` is 400.
- JSON bodies: media type `application/json` (parameters allowed), at most
  1 MiB (413 too_large), no unknown fields, nothing after the value (400).
  Only app start/stop/restart and gateway ensure accept an empty body.
- Raw bodies: Content-Length required (chunked: 400), size limits (413),
  media types: archive PUT `application/x-tar`, images/load
  `application/x-tar` or `application/gzip`, gateway files
  `application/octet-stream` (400 otherwise); a body that does not match
  Content-Length is 400.
- JSON answers end with a newline and carry Content-Length; error messages
  use the guard's wording (messages are not part of the contract).

Endpoint behaviour that changed (it is now the guard's):

- Jobs: caps only `CHOWN` and `DAC_OVERRIDE`; `FOWNER`, any other cap, a
  duplicate, or caps without `volume: "rw"` are **400 invalid_request** (were
  403 forbidden/policy, and FOWNER was accepted). `memory_bytes` is 0
  (default) or 64 MiB to 2 GiB. Entrypoint items are checked like argv. A
  volume of another owner is 409; a missing image is 502 job_failed (after
  the volume check). Stdout over 64 KiB is 502 output_too_large. `OnJob`
  returning `ExitTimeout` is 504 timeout/job_timeout, any other negative
  code 502 job_failed.
- Exec (app and gateway): output over 16 MiB is 502 output_too_large;
  `ExitTimeout` from an `OnExec` hook is 504 timeout/exec_timeout. Gateway
  exec without a gateway is **409 not_running** with names (was 404).
- PUT app checks in the guard's order: ipv4 syntax, the request fields
  (`auth_label` must be non-empty), network (404 / 409 ownership), address
  inside the subnet, **address in use (400)**, volume (404 / 409 ownership),
  resolv.conf (403 mount_source_rejected), image (404), existing container
  (409 exists / ownership). A second `CreateApp` with the address the
  existing container has therefore answers 400, not 409 exists; `ErrExists`
  comes back only when the address is free.
- App start/restart: the container's mounts must be exactly the resolv.conf
  bind and the account volume, and resolv.conf must be accepted (403
  mount_source_rejected). An unknown action is 404 not_found without a
  reason.
- PUT resolv: a resolv.conf marked with `RejectMountSource` is replaced and
  answered 409 mount_source_replaced (names: the app container).
- PUT firewall: the guard's check order; the helper is scripted with
  `OnFirewall` (non-zero: 502 helper_failed, `ExitTimeout`: 504
  job_timeout); the rules are recorded before the helper runs.
- Gateway ownership (shared label not the prefix) is 409 ownership_mismatch
  for GET gateway, `?fields=state`, ensure, exec, connect, disconnect and
  firewall. Ensure validates the uplink before anything else, creates the
  uplink with the overlap/exists checks, starts a stopped gateway only with
  the expected mount (403), refuses a rejected `shared-egress` (403); a
  creating ensure is 409 upgrade_in_progress while the lifecycle is busy
  (`SetLifecycleBusy`, or upgrade state running) and 502 compose_failed for
  `SetComposeFails` images; its answer is `{gateway, action}`. Recreate needs
  the uplink even when a gateway exists (409 uplink_missing), answers
  `{"gateway"}` only (no `managed_by`), and on a compose failure restores
  the previous image (the gateway is recreated with it) and answers 502
  compose_failed. Disconnect from a network of another owner is 409.
- DELETE network: the gateway is never counted as a user; it is detached
  after the user check.
- Images: pull and load whitelists take the guard's patterns (an exact
  repository, or a trailing `*` inside the last segment; compared
  qualified); a pull by digest (`@`) skips the whitelist; an image ID is 400.
  images/file: `/` is 400; `ImageSpec.Dirs` are directories (422
  not_regular_file). images/load runs the guard's archive checks (gzip or
  tar only: xz, bzip2, zstd are 400; duplicate or non-regular manifest.json,
  index.json or repositories, no manifest.json, a name outside the load
  whitelist: 403 load_forbidden); `SetDiskFull` is 503 busy; then the
  `OnLoad` hook gets the decompressed tar, and a tag it returns that the
  archive does not name is 502 load_failed. Loaded images become local;
  without a hook the manifest's image IDs are loaded with the archive's
  names.
- Controller upgrade: 409 upgrade_in_progress also for `SetLifecycleBusy`.
- GET subnets: the account label is reported only for `<p>-<aid>-net`.
- archive GET answers `X-Docker-Container-Path-Stat` (the client does not
  expose it; Python's dockerfs ignores it too).

New FakeGuard API: `SetToken`, `SetControllerAddr`,
`SetControllerUnguarded`, `SetStarting`, `SetLifecycleBusy`, `SetDiskFull`,
`SetComposeFails`, `RejectMountSource`, `SetResolv`, `MkDir`,
`AddGatewaySpec` / `GatewaySpec`, `OnFirewall`, `ExitTimeout`,
`ExitStartFailed`, `ImageSpec.Dirs`, `DockerState`.

### 5.3 What the writers must adjust

- **A (accounts):**
  - Do not rely on `ErrExists` from `CreateApp` with the address the
    existing container already has: the guard answers 400 first. Query
    (`Account` / `AccountState`) before creating, or treat a 400 after a lost
    answer as "query again".
  - Jobs: caps only `CHOWN`, `DAC_OVERRIDE` (D5), and only with
    `volume: "rw"`; `memory_bytes` 0 or 64 MiB to 2 GiB. 502 job_failed /
    output_too_large and 504 job_timeout are unnamed guard errors.
  - `GatewayExec` without a gateway is `ErrNotRunning` (not `ErrNotFound`).
  - `WriteResolv` can return `ErrMountReplaced` (unnamed for the HTTP layer):
    the running app container must be recreated. `AppAction` start/restart
    can return `ErrMountRejected`.
  - Readiness: `ErrStarting` also matches `ErrUnavailable`; treat it like an
    unreachable guard.
  - Tests: script job and helper failures with `ExitTimeout` /
    `ExitStartFailed` and `OnFirewall`; a FakeGuard test that expected 403
    for a refused cap must expect 400.
- **B (updates, uploads, cleanup, admin):**
  - uploads: FakeGuard checks image archives like the guard. Tests must load
    a real `docker save`-style tar (or its gzip) with a `manifest.json` whose
    names match `SetLoadRepos` (default: any repository); `OnLoad` receives
    the decompressed tar and may only return tags the archive names. 403
    load_forbidden is `guardapi.ErrLoadForbidden`. `ImageLoad` needs the
    exact size (never -1).
  - updates: `ImageFile` fails on a missing Content-Length or a cut transfer
    (`ErrUnavailable`); never treat a short read as the file.
    `AppArchivePut` needs the exact size. Script a directory with
    `ImageSpec.Dirs` (422).
  - cleanup: results unchanged (`DeleteNetwork` ignores the gateway as a
    user; ended Python helpers are removed first).
- **C (api, cmd):** `guardapi.New` refuses tokens that are not lowercase hex;
  a guard 503 unavailable (starting) and the local 413 are unnamed errors
  (503 `runtime_unavailable` through `errs.Answer`), like transport errors.
- **Everyone:** the Windows test minimum is now 612
  (`testdata/test-count.min`); the two contract tests add 510 passes
  (subtests count).
