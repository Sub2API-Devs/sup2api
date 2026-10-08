# Independent review: core fallback-credit custody and routing

Reviewed root-authored gateway credit admission/headers/observation, dispatch candidate filtering, response buffering and original usage accounting. The reviewer did not author the original credit implementation. The earlier sixth-batch Linux DB/race result is recorded separately and does not cover these uncommitted seventh-batch changes.

## Confirmed compatibility regression and repair

Credit admission originally required every Anthropic-route token to exist in the local CCGateway registry. This blocked ordinary non-CCGateway Anthropic routes, even though their provider-issued tokens should remain a normal protocol passthrough. After coordination with root, unresolved local custody is now retained as a request-local error rather than immediately terminating all routes:

- A successfully resolved token belonging to the current owner still pins its original CCGateway account and issuer.
- Failed/missing local registry lookup excludes CCGateway candidates. It does not exclude otherwise-authorized ordinary Anthropic candidates or add private tracking/identity headers to those requests.
- If only credit-excluded CCGateway candidates were otherwise eligible, the client receives the preserved 404 or registry-unavailable error instead of a misleading generic no-account response.
- After an actual HTTP send, any request carrying a token is protected against automatic account retry, including an externally issued token unknown to the local registry. Pre-inference eligibility checks remain distinct.

`fallback_credit_independent_review_test.go` covers nil/empty/unavailable registry with ordinary Anthropic passthrough, mixed CC/non-CC scheduling, CC-only error fidelity, and a 429 resulting in exactly one provider call. This fix does not infer token provenance from a client-supplied prefix.

## Independently checked invariants

The HTTP tests additionally exercise same-owner API-key rotation, different user/group, denied target model, issuer replacement, exact issuing account selection, resource-binding agreement/conflict, changed beta headers, and an initial unavailable issuer being skipped before the single inference call. A registered token uses the original account even when another account has higher scheduling priority. Credit ownership does not bypass normal model authorization or pricing admission.

Original provider usage is consumed before public resource-ID rewriting or credit persistence, and scratch accumulators used for delivery do not add another charge. Credit state-storage errors use the distinct gateway-storage error path; a valid ordinary 200 refusal is not classified as an upstream failure. Existing root JSON/SSE/storage/no-retry tests were rerun alongside the independent tests.

Worker review was limited to confirming the second client-digest, configuration and issuer check that complements the core gate; this is not an independent verdict on all Worker snapshot/replay behavior. No production inference was performed.

## Official schema gap discovered, coordination still required

The current [Messages SDK schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/message_create_params.py) declares a nullable union for `fallback_credit_token`. The [object token schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_fallback_credit_token_param.py) supports a token plus an optional strict/best-effort mode. A bare string and mode-less object have equivalent strict behavior; the best-effort mode has materially different provider behavior and reports its result in usage.

At this review checkpoint, core and Worker parsing remain string-specific. The reviewer reported this to root for a shared parser and coordinated Worker wire implementation; it is not claimed as supported by the string-routing fix. In particular, an object must not be hashed as its entire JSON, converted silently to strict, or treated as an unknown source merely because it wraps an already-owned token. Null is not a redemption attempt. Ordinary non-CC passthrough must also remain compatible with these legal forms. This remains an explicit follow-up until the shared contract is implemented and tested.

The [official fallback-credit guide](https://platform.claude.com/docs/en/build-with-claude/fallback-credit) was checked for bound prompt fields, beta matching, expiry, explicit retry control and resource/prefill behavior. Core's allowed non-prompt field changes and exempt beta families match that documented contract; no automatic retry ladder is introduced.

## Validation

Windows with `SUB2API_TESTPG=off`: all independent credit and existing root credit tests PASS; complete `go test ./internal/gateway -count=1` PASS (5.585 s), and `go vet ./internal/gateway` PASS at this checkpoint. DB tests, actual upstream credits and a seventh-batch Linux candidate are separate pending evidence. No commit or deployment was performed by this reviewer.

## July object/null compatibility remediation

Shared `credits.Parameter` accepts a bare token (strict), `{token, mode}` with `strict` or `best_effort`, and null (no redemption). Object requests require the exact `fallback-credit-2026-07-01` beta. The original string/object wire shape is retained; a best-effort object is never rewritten to strict. Unknown object fields and token-plus-fallbacks are rejected.

Core `LookupOwned` now separates retained owner custody from strict redemption. A known same-owner CCGateway token remains bound to its account/issuer even when expired or used with a changed prompt. Strict mismatches stop admission; best-effort requests can proceed on that issuer with normal provider pricing, without automatic retry. Only verified, still-live prompt claims may bypass PTC echo checks. Missing/other-owner records remain unavailable on CCGateway; eligible non-CC Anthropic routes retain passthrough behavior.

Evidence: shared parser shape/beta/error tests and six real core HTTP fake-provider combinations (strict/best_effort × matching/changed prompt/expired) passed, with original object mode and account selection asserted. All current credit-targeted gateway tests passed. DB test now checks retained expired lookup and cross-owner rejection; this new DB assertion awaits Linux execution (local PostgreSQL disabled). No real cloud best-effort billing claim is made.

Official schema checked: https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_fallback_credit_token_param.py and https://platform.claude.com/docs/en/build-with-claude/fallback-credit .

### Shared-account ownership boundary and negative regression checks

CCGateway `best_effort` still requires an already registered token owned by the same UserID+GroupID and the original issuer. Records within the retained 24-hour expired-record window can establish custody; expiry does not confer strict prompt privileges. An unknown token cannot enter a shared CCGateway account merely by selecting best_effort. Ordinary non-CC Anthropic routes retain their original protocol passthrough. This distinction protects shared-account resources; it does not redefine the provider's public best_effort mode.

Independent added checks passed locally: `TestReviewBestEffortPTCPrivilegeRequiresLiveVerifiedPrompt` covers changed prompt, expiry after admission, both mismatches, and different issuer; `TestReviewNullCreditWithoutBetaDoesNotTrack` runs actual core HTTP for CC and non-CC routes, asserts explicit null preserved and no identity probe/tracking/admission header; `TestReviewUnregisteredBestEffortCannotEnterSharedCC` asserts 404 before any model dispatch. Targeted run passed (4.992s). No business code changes were needed for this follow-up.
