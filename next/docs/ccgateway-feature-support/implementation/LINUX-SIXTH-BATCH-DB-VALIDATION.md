# Sixth-batch Linux PostgreSQL and race validation

## Candidate and isolation

Validated exact Git commit `4903994f459cae7959bd6307b602c91e045f0ed6`. OVH fetched that SHA from Git and created detached worktree `/home/debian/sub2api-next-test/git-audit-six-4903994f4`. The checkout was clean before execution and remained read-only during tests. No source tree was uploaded. The subsequent `160f6064ada938e69e84a32797df82fd660d8e6e` change is an engine test-fixture correction; these results are still attributed specifically to `4903994f`.

The runner used `golang:1.27-trixie` reporting Go 1.27.1 linux/amd64, with 2 CPUs, 2 GiB RAM, GOMAXPROCS=2, CGO enabled, and the repository's `/src/next/go.work`. Caches were the existing `sub2api-next-ci_gomod` and `sub2api-next-ci_gocache` volumes.

PostgreSQL was exclusively `sub2api-next-testdb-pg-1`, whose identity and loopback mapping `127.0.0.1:45432` were asserted before constructing the test DSN in memory. Credentials were not printed or written to result files. Tests created fresh databases from the migrated test template; migration 0040 was present. Production databases were not accessed. The isolated Redis container on 36379 was checked as available; gateway fixtures actually use their own in-process miniredis, so this is not a claim of exercising the external Redis container.

## Successful run

Remote evidence directory:

`/home/debian/sub2api-next-test/feature-validation-audit-4903994f4/run3`

Files: `core-db-race.jsonl`, `core-vet.log`, `environment.log`, `status.txt`.

Executed:

```sh
go test -json -race -p 1 -parallel 2 -timeout 25m -count=1 \
  ./internal/providerresources ./internal/gateway ./internal/ccgateway \
  ./internal/app ./internal/store ./internal/migrations
go vet -p 1 \
  ./internal/providerresources ./internal/gateway ./internal/ccgateway \
  ./internal/app ./internal/store ./internal/migrations
```

Both commands exited 0. Package times: providerresources 2.135 s; gateway 9.310 s; ccgateway 3.309 s; app 3.567 s; store 1.213 s; migrations 1.202 s. Vet output was empty. No race warning or failing test event was reported.

All 10 provider-resource DB tests produced actual `pass` events, not skips:

- `TestObservedResourcesDBExpiredCapacityAndRenewal`
- `TestReviewObservedDBParentIdentityAcrossOwners`
- `TestReviewObservedDBRenewalReacquiresAllQuotas`
- `TestReviewObservedDBFinalizeCannotRaceAdoption`
- `TestObservedResourcesDBConcurrencyAndContexts`
- `TestProviderResourceDBFilteredPagination`
- `TestProviderResourceDBLifecycle`
- `TestSkillsReviewUploadEvidenceDB`
- `TestSkillResourcesDBAtomicVersionsOwnershipAndDeletion`
- `TestSkillResourcesDBUnknownUploadAndQuota`

CCGateway DB tests `TestResourceTransportDBReusesAccountDiscoveryWithoutControllerBody` and `TestDBEncryptedAuditAndModelForward` also passed. Gateway's DB-backed settings and scheduling tests ran successfully.

Only the optional real-CLI tests `TestOpenAIWorkerRealCLIProtocolChain` and `TestOpenAIWorkerRealCLIExactToolNumbers` were skipped because this Go-only runner did not provide their CLI prerequisite. This run is not evidence of real Claude CLI, cloud inference, or production deployment.

## Earlier harness failures retained

The first launch used a login shell that reset PATH, causing `go: command not found` before tests. `run2` set `GOWORK=off` and exposed standalone server-test module metadata that would require `go mod tidy` for embedded-postgres/libpq/xz; no DB tests ran there. A read-only `go mod tidy -diff` confirmed that condition without editing the checkout. `run3` used the tracked repository workspace and passed. Those earlier attempts are preserved and are not counted as passing validation or as business-code/DB failures.
