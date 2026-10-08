# Independent review: sixth-batch resource admission

Reviewed root-authored `contracts/resources/ptc_references.go`, request/skill reference scanning, and gateway typed admission, output capability grants, PTC context binding and request-local scan caching. CodeGraph was available and its explicit `D:/projects/golang/sup2api` binding check located `applyResourceContexts`; complete current files were then read with native tools. Worker changes and Skills storage authored by this reviewer are not claimed as independently reviewed here.

## Confirmed findings and fixes

1. **Explicit `container: null` was treated as output capability.** A presence check activated resource identity/output registration even for a plain request that reset its container. The independent contract test failed with `Outputs=true`. It now requires a non-null container or another real execution trigger. An HTTP regression also proves that null-only reset works without resource transport and grants no resource-output header.
2. **Protocol conversion could introduce execution capability without resource admission.** Mapping previously compared only concrete reference IDs. A converted target containing a code-execution declaration, inline execution addition, or empty new-container object passed when it had no existing IDs. Independent gateway tests failed. Converted targets now reject unadmitted references, execution/output capability, skill selectors and PTC contexts. Ordinary client function tools do not activate this gate; no previously supported pure Chat/Responses function-tool mapping is removed.
3. **Duplicate active execution parent cleared pending PTC state.** Repeating a `server_tool_use` ID after its programmatic child reset the stored `hasCalls` value from true to false. The independent test showed no pending context despite a live child. Repeated active parent IDs and invalid execution parent IDs are now rejected. Valid completed parents, nested programmatic parents and ordinary history replay retain their existing behavior.

## Verified boundaries

New contract tests cover top-level execution, mid-conversation tool additions, signed-compaction `tool_changes` positions (without altering the block), nested server caller references, completed and unknown parents, and opaque tool-input/text fields. Custom skill selector defaults and exact JSON paths are covered; builtin skills do not become tenant custom references.

Gateway tests cover conversion denial, null reset, missing PTC container, rejection of a different same-owner container, and the exact remote-container trusted header for a valid binding. Cache tests cover different skill versions, revisiting the prior immutable body, null reset after resource use, and duplicate escaped ID members. The cache's two entries remain request-local and keyed by the complete body digest; this review found no production caller mutating the returned snapshots.

The scanner intentionally conservatively grants output handling for known execution history/declarations, including prior timeline declarations. It does not claim to replace Worker semantic validation or establish every upstream model's execution eligibility. Arbitrary tool inputs, schemas, encrypted payloads and text are not interpreted as PTC or resource control structures.

## Additional requested exact lookup

Added `ProviderResources.FindOwnedRemote(ctx, owner, binding, kind, remoteID)` in a separate store file for trusted response mapping of previously registered custom skills. SQL requires the exact owner, `ccgateway`, kind, account/principal/generation, remote ID, ready state and unexpired resource. This is read-only, does not enumerate workspace resources, and never registers an unknown output or changes quota. The matching memory fixture supports gateway integration. This addition is authored here, not an independent review result; root review remains appropriate.

## Evidence

- Contracts `go test ./resources -count=1`: PASS, 3.797 s; `go vet ./resources`: PASS.
- Server `SUB2API_TESTPG=off go test ./internal/gateway ./internal/providerresources -run '^TestReview|^TestSkill' -count=1`: PASS, 6.434 s / 0.377 s; both packages' `go vet`: PASS.
- Three findings above were reproduced as red tests before their fixes.
- No deployment, cloud-account inference or PostgreSQL result is claimed.

Current Skills PostgreSQL tests to execute in the Git-based Linux candidate:

- `TestSkillResourcesDBAtomicVersionsOwnershipAndDeletion` — includes new exact remote lookup, cross-owner/issuer/kind, unknown ID, expiry and tombstone assertions, plus version concurrency/restart/deletion cases.
- `TestSkillResourcesDBUnknownUploadAndQuota` — unknown outcomes retain quota; confirmed rejection releases it without redispatch.
- `TestSkillsReviewUploadEvidenceDB` — added by the separate Skills reviewer for successful-upload evidence retained across a later metadata failure.

Migration 0040 is required for these Skills tests. The pending evidence fix belongs to the separate Skills reviewer; its implementation is not included in this review's independent verdict.
