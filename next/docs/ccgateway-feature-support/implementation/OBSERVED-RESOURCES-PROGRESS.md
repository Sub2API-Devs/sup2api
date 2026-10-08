# Observed-resource storage implementation

Sixth-batch implementation follows `OBSERVED-RESOURCES-PLAN.md`; no deployment or commit performed by this agent.

## Contracts and persistence

- `core.ResourceObservation` and `ProviderResources.RegisterObserved` register verified file/container facts. Same-owner repeated observations reuse the public ID and charge only actual quota deltas. Files cannot change size. Cross-owner claims on the same remote identity conflict, including deleted historical records.
- Owner and remote-identity PostgreSQL advisory locks serialize quota and ownership decisions. Existing `Finalize` now participates in the same remote lock and checks historical registrations, preventing an upload completion from bypassing observation/tombstone ownership.
- A new container requires provider expiry and a trusted host dispatch timestamp. Existing containers must have been ready and unexpired at that dispatch time. A valid in-flight response can renew after the old deadline; a new request starting after expiry cannot. Concurrent late responses cannot reduce the latest verified expiry. Deleted/failed/deleting states are not revived.
- `core.ResourceContext` exposes `BindContext` and `ResolveContext`. Initial context kind is `ptc`. Migration `0039_provider_resource_contexts.sql` stores owner + full issuer binding + parent-call ID → one public container. Binding is immutable, including when another target belongs to the same owner. Lookup rechecks current target state, expiry and binding. Default owner context capacity is 100,000 and can be set through constructor options; repeated binding does not consume another entry.
- Resource and context rows contain no provider tokens. The new table references durable resource records and leaves tombstones intact. No background retries, network requests or automatic file copying were added.

## Verification

`TestObservedContainerExpiryEvidence` passes locally: trusted earlier dispatch, late response, non-shortening renewal, revoked state, required provider expiry and no expired-file resurrection.

`TestObservedResourcesDBConcurrencyAndContexts` is ready for the Linux PostgreSQL checkpoint: 12 concurrent same-resource observations, exact one allocation, immutable file size, cross-owner conflicts, quota, parent binding replay after service restart, alternate-container rebinding rejection, issuer mismatch, expired/renewed contexts, out-of-order expiry responses, tombstone protection and concurrent cross-owner claim with one winner.

Local `go test ./internal/providerresources` and vet pass with `SUB2API_TESTPG=off`; the DB case is skipped locally and is **not** claimed as executed. Existing gateway/resource targets still compile and pass. Full gateway output/stream integration and provider artifact discovery belong to root/Worker work and are not established by these store tests.

## Root independent-review correction: expired capacity

Root identified that containers have no public delete path and their expired tombstones would permanently occupy the lifetime count/byte quota. Resource quota now excludes only containers with a real expired deadline, retaining all records and leaving Files expiry accounting unchanged. Context quota counts only bindings to ready, unexpired containers; parent identity associations remain stored and immutable.

A previously expired container renewed by a valid in-flight response must reacquire its full count/bytes allocation. Renewal also reacquires capacity for its preserved parent contexts, so expiration cannot bypass the context quota. One explicit clock instant is shared by the resource quota query and delta calculation, avoiding a Go/SQL expiry-boundary mismatch.

Unit expiry classification passes. New Linux DB case `TestObservedResourcesDBExpiredCapacityAndRenewal` covers expiry releasing active capacity without deleting records, new context binding, independent count/byte/context limits on renewal, and successful identity-preserving renewal when all three have capacity. Local package tests/vet pass (3.618s), with DB tests skipped pending the Linux checkpoint. This correction is credited to root's independent review, not presented as a self-review discovery.
