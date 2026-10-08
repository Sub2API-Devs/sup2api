# Provider resource ownership implementation

## Fifth batch A — durable intents

New `core.ProviderResources` port and `internal/providerresources` service use the existing PostgreSQL pool/transaction primitives. Migration `0038_provider_resources.sql` is additive and rerunnable.

Owner is `(UserID, GroupID)`, independent of the API key. Binding is `(AccountID, PrincipalID, Generation)`: PrincipalID is a stable issuer/workspace digest, not a credential; Generation changes on issuer replacement, not token refresh or Worker upgrade. Remote IDs are unique inside plugin/kind/binding. No network operation or cross-account copy is implemented in this storage service.

Reserve stores an intent before dispatch. Owner-scoped PostgreSQL advisory locks serialize quota decisions; row locks serialize transitions. Only the creator receives `Dispatch=true`. Repeating the same request ID with different intent data conflicts. Pending/uncertain operations are not automatically retried after restart. Finalize checks the original operation and full binding; identical completion is idempotent. An uncertain upload can be reconciled by explicit completion with its original evidence.

Delete transitions ready → deleting → deleted only on confirmed remote outcome. Failure/timeout becomes delete_uncertain and does not permit another automatic dispatch. Explicit reconciliation may confirm the same operation later. Expiry does not release quota or claim remote deletion.

`FailCreate` releases quota only for a confirmed provider `invalid_request_error`, `authentication_error`, or `permission_error` tied to the original operation. Gateway must establish provenance and non-creation; an arbitrary HTTP 400 body is not evidence. Timeouts/5xx remain uncertain. The failed intent remains durable and never redispatches for the same request ID. Repeating failure finalization must carry the identical evidence code.

Default configurable limits: 1,000 resources and 10 GiB per owner, 512 MiB per resource. The provider still enforces its own exact file limits. No expiry is invented by default. An explicitly configured TTL and a known provider `ExpiresAt` use the earlier limit. Get/List retain lifecycle state for reconciliation; public file lists must expose only ready and unexpired entries. Reference admission must validate expiry and the current binding in the gateway.

## Verification

- `go test ./internal/providerresources` and `go vet ./internal/providerresources` pass locally with `SUB2API_TESTPG=off`.
- `TestResourceIntentValidation` covers bounded metadata, exact large JSON integers, canonical nested-object intent hashes, no default expiry, and single-object limits.
- `TestProviderResourceDBLifecycle` is prepared for Linux PostgreSQL: 12 concurrent duplicate reserves, restart/unknown result, quota retention, issuer isolation, ownership, finalize idempotency, delete ambiguity and confirmed quota release.
- Database execution is **not claimed** from the Windows run; that test is skipped in that run. Gateway/Worker transport, tenant reference routing, and real provider operations belong to the separately integrated stages.

No existing billing files or application composition files were changed by this batch.

## SQL-filtered public pagination

`Query(owner, ResourceQuery)` now filters owner, plugin, kind, currently permitted account IDs, ready state and expiry inside SQL before applying a page limit. An empty account set returns no objects. IDs selection is bounded to 100 and limit to 1,000. Stable descending `(created_at, public_id)` ordering supports after/before cursors; cursor eligibility and rows use one repeatable-read snapshot. Cursors outside the same filtered tenant view return not found. `HasMore` is computed using one extra eligible row, not by filtering an already limited page.

The HTTP adapter owns current official `page`/`next_page` opaque-token syntax and deprecated before/after compatibility; the storage port does not claim an upstream pagination format. `TestProviderResourceDBFilteredPagination` prepares Linux coverage for pending/wrong-kind/expired/unauthorized-account rows between eligible rows, both directions, ID selection and unauthorized cursors. Local validation and vet pass; DB execution remains pending the Git-based Linux checkpoint.
