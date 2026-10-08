# Worker fallback credit independent review — 2026-10-08

Independent review of contracts/credits, Worker credit snapshot custody, main attribution, MCP/resource interactions, JSON/SSE completion, logging and concurrency. No production credit requests, credentials, or deployed programs were changed; production remains sixth batch.

## Confirmed findings and repairs

### Snapshot directory and multi-runtime bounds

Credit custody originally used `resourceBroker.dir/credits`; `dir` is a per-runtime resource-spool instance. Restart lost access to the prior snapshot, and the nested directory prevented conservative spool cleanup while a new runtime obtained another independent quota.

Runtime broker now supplies stable `DataDir/fallback-credit`. AES-GCM ciphertext and Worker-key binding remain unchanged. Save holds both the local mutex and a dedicated OS file lock, so multiple registry objects/processes cannot race immutable-token checks and quota. Only recognized direct `.credit-write-*` regular files left by a crashed writer are removed under that exclusive lock. Expired/corrupt same-token refusal and 24-hour tombstone retention/counting remain unchanged. Key changes cannot decrypt old snapshots; they do not turn old custody into valid credit.

Independent tests verify restart uses the same credit directory while spool directories change and clean up, shared quota is not exceeded, abandoned write files are removed, and encrypted storage stays separate from ordinary history/log retention.

### PTC refusal/echo must not invent a container

A valid credit response may interrupt a current provider execution/client tool call. The original request may have no container even though the refusal response reports one. Redemption must preserve the original prompt and cannot add that response container.

Actual real-CLI regression sequence found two failures:
1. Initial JSON refusal with a live PTC parent/client child was rejected as missing server result (502).
2. After trusted-refusal handling was corrected, the exact appended assistant echo was rejected by ordinary final client tool pairing (400).

The parser now defers only final unfinished tool obligations for a credit candidate; this is not authorization. Main admission still requires trusted tracking/admission hash, current verified issuer, original exact client digest, policy/config match and stored snapshot. A mandatory post-admission gate rejects every unverified candidate. Ordinary missing results and mismatched/no-admission tokens remain rejected before any provider call.

Only the attributed provider observer with matching message ID, refusal reason and unchanged stop_details/token can end the original attempt's current-turn obligations. JSON provider completion records the same trusted facts before its normal accumulator validates the response. On a verified exact echo, only those echoed current-turn obligations are ended; older pending turns remain intact. Client blocks and original wire remain unchanged, no local tool executes, and no container is invented.

### Identity probe concurrency

When credit tracking had no resource input/output grant, `admitCredit` obtained authority then ran the identity CLI outside the shared slot limit. It now obtains authority then waits for a slot for that probe, releases the slot after identity, and retains authority for the actual model lifecycle. A deterministic saturated-slot/cancellation test verifies no probe runs early and neither slot nor authority is leaked.

## Evidence

- `fallback_credit_independent_review_test.go`: runtime restart, shared quota/crash-write cleanup, ordinary refusal denial, observer message mismatch, older pending obligations preserved, unverified deferred admission denied, deterministic slot/cancellation.
- `fallback_credit_combinations_cli_test.go`: real CLI 2.1.292 to isolated fake provider. PTC JSON, MCP credential-bearing request, and PTC SSE each issue/refusal then redeem (six provider calls). Missing admission is rejected without a provider call; no container is added; MCP target/authorization definitions and tools remain exact. New combined test passed 9.889s.
- Existing credit wire-binding and storage/provider-failure tests plus new combinations: PASS 23.964s. Storage failure still returns actual provider usage through internal HTTP200 plus private FailureHeader so core can withhold the token and return503. No automatic model retry was added.
- Full engine unit tests PASS3.934s; contracts packages passed; `go vet ./engine` passed. One test command initially used the contracts working directory for engine; corrected working directory and reran successfully (not a source failure).

Core's public-owner resolution, original-vs-mapped digest, resource registration and final503/accounting behavior are independently owned/tested by root. This review does not claim real provider credit qualification or seventh-batch deployment. Official protocol facts are inherited from the current FALLBACK-CREDIT-PROGRESS document; no speculative beta or permission relaxation was introduced.

## Object/null/best_effort incremental review — 2026-10-08

Independently reviewed shared Parameter parsing, Worker typed lookup errors, snapshot proof selection, PTC final admission, object-token diagnostics, and exact `usage.fallback_credit` recovery. The public core owner resolver is outside this incremental Worker review; a missing local snapshot is allowed only after the existing trusted tracking/admission and issuer checks. This does not permit an unknown external token to bypass core ownership.

Found and reproduced a directional precision bug in `restoreCreditUsage`: symmetric JS-number views treated provider `null` and CLI `1e400` as equivalent, including a swapped null/overflow array. Both new negative cases failed before the fix. The new `creditUsageMatchesSource` compares provider to CLI recursively. Only original numeric values may normalize; original non-numeric values, keys and positions must match. A genuine original overflowing number may become CLI null; the reverse is forbidden. The patch is confined to credit outcome restoration and does not relax the general history/tool codec.

New `fallback_credit_modes_review_test.go` independently verifies:

- Large integer normalization remains recoverable; strings/status changes, missing versus null and array-position changes fail without mutating the target.
- Best-effort with missing or mismatched-config local custody uses current wire with `previous == nil`; it gains no original-refusal/PTC proof.
- Corrupt custody remains a typed local-storage failure; a changed issuer generation is rejected even in best-effort mode.

Validation: new independent tests PASS1.978s; parameter/outcome/PTC/storage/diagnostic targeted tests PASS1.936s; real CLI 2.1.292 `TestRealCLI(CreditParameterModes|CreditReview)` after the fix PASS19.392s; engine vet passed. The unmodified author's parameter CLI matrix also passed21.461s before the new negative tests exposed the precision issue. JSON/SSE object shape and mode preservation, expired/missing/corrupt cases, single provider dispatch and old-beta rejection are exercised against an isolated fake provider. No real provider credit redemption, production deployment, commit or push was performed.
