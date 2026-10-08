# Worker resource transport independent review

Date: 2026-10-08. Reviewer: root; implementation owner: research_api. This reviews the fifth-batch local changes after `bfcbc3b4203cb664e53db305da4fadaecda67106`, not deployed production behavior.

## Findings and fixes

1. Resource requests retained the CLI's default `Anthropic-Version`, silently discarding the explicitly supplied resource API version. `resourceRoute` now carries that header into the authenticated resource request. The real-CLI isolated GET/POST/DELETE fixture checks a distinct version end to end, alongside product beta, binary body and single-dispatch assertions.
2. Resource generation initially lived in the conversation cache directory. The implementation owner's follow-up review correctly identified that cache replacement could invalidate existing resource IDs. Persistence now uses `DataDir/resource-identity/identity-v1.json`, independently of conversation cache. A restart with a replacement cache retains the same issuer generation; an explicit managed epoch change rotates it.
3. OAuth refresh or reauthorization to the same authenticated account and organization must not invalidate resources. The current persisted identity compares actual profile-derived issuer facts. The diagnostics authorization epoch is separate. API-key resources require an explicit managed issuer and epoch; the implementation does not substitute credential hashes or runtime revision.
4. A real lock-order cycle was found during integration review: a model request retained the authorization lock but released its identity-check slot; queued resource calls could then occupy every slot while waiting for that same lock. All resource paths now acquire authorization before a CLI slot, with cancellable waiting. Deterministic barrier-based saturation/cancellation tests pass for 20 repetitions. The authorization lock remains held through the model operation; it was not removed to hide the deadlock.

## Reviewed boundaries

- Resource paths use the shared fixed operation matrix. Profile lookup is private; callers cannot provide an arbitrary URL, profile route or model route.
- The first attributed CLI request is converted into one resource operation before leaving the relay. Auxiliary and repeated carrier requests are rejected. Resource responses are captured before reaching the CLI; resource operations do not create model history checkpoints.
- CLI-generated authentication remains inside the account Worker. OAuth product authentication beta is retained, client resource beta is applied, inference-only defaults are removed for CRUD.
- Body and response spools have per-operation and concurrent byte limits. Cancellation closes sources and removes temporary files. OS leases protect active runtime spools; reclamation touches only recognized direct files in abandoned instances, without recursive deletion.
- Managed authorization changes and a resource operation share the authorization lock. A verified issuer/generation is required for CRUD. Resource identity persistence uses a separate OS lock and atomic replacement.
- Response headers use the shared safe facts selection plus bounded content metadata. Cookies, upstream credentials and raw profile facts are not returned.
- Model `file_id` admission and resource diagnostics are implemented separately and require their own tests; a working CRUD carrier alone does not prove model file support.

## Evidence

- Root real CLI 2.1.292 carrier/version and identity targeted suite: `go test -count=1 -run '^(TestRealCLIResourceCarrierNeverGenerates|TestResourceIdentity.*)$' .` PASS 5.435s. The three carrier subcases use an isolated fake provider, not a live account.
- After lock-order repair, the implementation owner reran the complete fifth-batch resource and file-history set: PASS 34.114s, with vet passing. Root ordinary engine/companions tests and vet also passed. The final set includes legacy Files beta and explicit document cache markers; it remains isolated-provider evidence.
- An initial invocation selected the PowerShell `claude.ps1` shim and could not read a CLI version; rerun explicitly used the native package binary. A parallel in-progress file admission edit briefly caused a compile failure before its Gateway hook was added. Neither attempt is counted as a passing test.
- The earlier checkpoint `bfcbc3b42` Worker image starts on default 8787 with a fixture Worker key and reports CLI 2.1.292 healthy. This image predates fifth-batch resources. The first health attempt omitted the required Worker key and correctly failed startup.
- Linux locks/race, fifth-batch database transitions and actual #22 OAuth profile/resource qualification still require the next committed Git checkpoint and server build. No account container or authorization was replaced by this review.

Resource diagnostics intentionally record bounded JSON or binary metadata/digests with an explicit omission reason; this is not a claim that every uploaded binary is retained in request logs.
