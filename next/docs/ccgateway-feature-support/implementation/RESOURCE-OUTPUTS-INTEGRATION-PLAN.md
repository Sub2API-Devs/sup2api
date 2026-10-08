# Provider outputs and stateful conversation integration

Date: 2026-10-08. Sixth-batch design, not implemented by the fifth-batch Files checkpoint. Owners: root (core request/response integration), audit_code_beta (resource persistence), research_cc (provider CodeExec/PTC protocol), research_api (Worker identity transport).

## Request contract

Extend the existing narrow resource-reference scanner only at declared protocol positions: top-level container ID, custom skills in the container definition, existing file-source/container-upload blocks, and generated file IDs in registered code-execution history result blocks. Arbitrary tool arguments, schema properties, text and encrypted strings remain opaque.

Public resource references are authenticated by user and group, resource state and expiry, current account eligibility, and actual Worker issuer/generation. Every stateful reference in a request must select the same account and issuer. An expired container is not silently recreated; moving a stateless conversation to another account does not authorize moving provider-owned container state.

A request that can create provider resources needs an identity binding even when it has no input file or container ID. Core discovers and verifies the selected account identity before dispatch, supplies a controlled output-registration capability and expected identity, and Worker pins managed authorization for the operation. Worker returns actual identity evidence on the authenticated response. External caller headers cannot create this capability. Count-only calls cannot create output resources.

## Output registration

Core must register each new provider resource before exposing a public ID. A shared scanner covers complete Messages responses and their registered SSE locations; it does not recursively rewrite matching strings. Known container IDs and file IDs are translated back to their existing public IDs. Fresh generated file IDs require a metadata GET on the same Worker and issuer, then a durable observation using provider bytes/expiry. No additional model inference is made.

`RegisterObserved` is atomic and idempotent for owner, binding, resource kind and remote ID. It must reuse one public ID on repeated SSE facts, reject ownership conflicts, and avoid charging quota twice. Deleted or failed resources never resurrect from a replayed response. Container renewals require a trustworthy core dispatch time while the existing container was valid; provider expiry can extend the stored lease, and a late response cannot shorten a newer lease.

Response processing uses request-local state and the existing bounded response/stream machinery. JSON can be buffered within the existing limit; SSE events are checked and rewritten before being emitted. Original upstream usage remains the source of accounting. A failed metadata/registration operation must not expose raw remote IDs or retry the model request; it produces an explicit integration error and a reconciliation record. Already completed inference usage must remain available for settlement.

## PTC continuation

The provider response's programmatic parent tool ID is persistently bound to its container and issuer, independently of conversation-cache retention. Client history still must pass the Worker parent/child/result ledger and exact content alignment. A continuation cannot substitute a second container owned by the same user. Imported history with an unknown parent binding is not sufficient authorization; the gateway must reject it with a specific missing-state explanation.

The CLI codec probe already shows that raw cold history omits `tool_use.caller`. Restore only this known omission from the exact admitted client history and verify the complete restored model request. Do not infer caller identity from a tool name or a prefix, and do not execute programmatic tools locally inside Worker.

## Verification gates

1. Resource-store concurrent observations, owner conflicts, replay, deletion tombstones, quota, container renewal and immutable PTC binding against the isolated PostgreSQL database.
2. All request reference locations, before/after-hook changes, account mapping, expired resources and cold history with a replaced API key in the same owner scope.
3. JSON/SSE generated file and container registration before emission; provider metadata failure, cancellation and partial stream; unchanged numeric values and opaque fields.
4. Worker exact CodeExec/result/caller unions, pause/resume, rollback, cold import, native tools and client tools mixed together, cache identity and authorized issuer changes.
5. Actual #22 Files and CodeExec qualification through a committed server-built Worker before claiming live support. #21 proxy capability must be measured separately. Custom/built-in API Skills follow their own issuer and version rules; CC local skills are not substitutes.

The current feature catalog must continue to describe CodeExec/PTC/Skills as unfinished until these implementation and integration gates are satisfied. This is a sequencing decision, not a claim that these features are impossible.
