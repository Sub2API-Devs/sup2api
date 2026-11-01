# controller-go: implementation guide for the parallel writers

The Go controller replaces the Python controller in `../controller/` (kept
unchanged as the reference). Design: `next/docs/ccgateway-guard/02-controller-go-design.md`
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
- Cross-language vectors: `testdata/pyref/*.json`, generated by
  `../controller/reference_vectors.py` on Linux with Python 3.12
  (`python reference_vectors.py OUT --inspect inspects.json`). Go-written
  state files are read back by Python with `--check-go DIR` after
  `CCG_COMPAT_OUT=DIR go test -run TestWriteCompatFixtures ./internal/store/`.
