# Context / compaction / assistant-tail implementation

2026-10-08. This records source and isolated actual-CLI evidence, not production deployment or provider entitlement.

## Implemented

- `context_management.edits` validates the known tool clearing, thinking clearing and `compact_20260112` shapes. Raw numbers and optional documented null values remain intact. `exclude_tools` and list-valued `clear_tool_inputs` map declared client tool names consistently with the actual exposed tool names; other fields are not rewritten.
- The distinct new `compaction: {type: summarize}` request requires `compact-2026-09-04`. The old threshold edit requires `compact-2026-01-12`; ordinary edits require `context-management-2025-06-27`. No attempt to translate one compaction protocol into the other.
- Signed compaction blocks keep their content, opaque signature, `encrypted_content` and `tool_changes`. Documented nullable fields, including failed-compaction `content:null` no-ops, remain null. Unsigned old blocks and `compaction_delta` are supported independently. Signed replay must start the message history; signing, signature verification, accounting, model eligibility and provider availability remain upstream responsibilities. Responses keep nonempty `tool_changes`; replay of a nonempty tool-change list explicitly requires the not-yet-integrated inline-tool state adapter.
- Context/compaction parameters apply only inside the existing main-request attribution boundary. Response `context_management.applied_edits`, `usage.iterations`, all stop reasons and empty content are preserved through the common accumulator and SSE forwarding.
- API compaction, context-edit and assistant continuation terminal responses use the existing API-output completion observer, rather than a second retry loop. A successful empty `max_tokens` response ends the call instead of triggering an implicit CC retry.
- Assistant-tail continuation keeps `Request.Messages` unchanged. All real client messages are seeded into native history. A random runtime-only user trigger initiates the CLI; the authenticated main relay removes only its exact unique final block. The real assistant remains last in the model request. Final client tool calls without results are rejected; outstanding declared server tools can continue after a pause.
- The known CLI conversion of a final server-tool-only assistant to the sole text `[Tool use interrupted]` is restored only when every expected block is still pending in the server ledger, the entire preceding client history matches, and the exact placeholder shape matches. Unknown differences are rejected. This placeholder is not sent to the model.
- Server-tool requests install the terminal observer for `pause_turn`. Ordinary server `end_turn`/client `tool_use` keep their prior native lifecycle, preserving already validated prefix-hit behavior.
- Continuation and context/compaction runs conservatively use response-only checkpoints when necessary; they never resume a native transcript containing a synthetic transport user turn. Continuation checkpoint fingerprints normalize adjacent assistant content the same way the client parser does. Known recoverable citation/cache omissions are ignored by native response comparison; arbitrary content changes still invalidate the checkpoint.

## Evidence

Actual CLI version: 2.1.292; local temporary config, extracted current Mod, loopback fake upstream, fixture credentials only.

- `TestRealCLIAssistantTailContinuation`: Opus 5.5 JSON and SSE, exact assistant tail, no runtime marker forwarded, one model request per API call.
- `TestRealCLIContextCompactionGateway`: JSON and SSE for context edits, signed summary, old streamed summary, empty successful max_tokens, nullable no-op response, nullable no-op replay, signed assistant-first replay, signed user-first replay and old summary replay. Eighteen calls total in the full matrix. Signed response/replay fixtures also include opaque encrypted metadata and empty tool-change lists. Main fields, compaction block location/content/signature, response extensions and no implicit retry are checked. New nullable/metadata cases were rerun separately after official SDK schema review.
- `TestRealCLIServerPauseAssistantContinuation`: pause returned after one request, followed by assistant-only continuation and the delayed server result. Two calls; no fabricated user prompt.
- Existing `TestRealCLIWebGatewayCompatibility/web_search_20250305` and `TestRealCLIWebDelayedResultCompatibility`: fourteen calls passed, including local prefix-hit/import and mixed client/server handoff. Their original history assertions were not weakened.
- `TestContextCompactionAdmissionAndOpaqueMapping`, `TestContinuationTransportAndMergedCheckpoint`, `TestServerPauseObserverAndNativeMetadataComparison` cover negative schemas, required beta, explicit null, integer overflow, name mapping without plan alias mutation, strict trigger removal and canonical checkpoint hashes.
- Latest non-opt-in `go test ./engine -count=1` passed (3.913 s), `go vet ./engine` passed. Isolated CLI tests are separate opt-in evidence; this is not a real-model feature or token-billing assertion.

## Current limits and open review

- Internal CC ToolSearch rounds combined with context/compaction or assistant-tail continuation are rejected until multi-round transport ownership is demonstrated. API server tools remain a separate supported path.
- Sonnet 4.6 was observed adding its own Auto Mode Active system-reminder before the runtime trigger. The strict continuation guard rejects this rather than dropping a CC safety instruction or silently changing assistant-prefill semantics. A constrained attachment mapping requires further validation; Opus 5.5 success must not be presented as all-model success.
- No arbitrary extra trigger-turn text is discarded. Unknown CLI block transformations, mutated compaction content or reordered signed blocks fail explicitly.
- Summary signatures in fake fixtures are opaque strings. Cryptographic validation, preserved-thinking prefix binding, actual summarization quality and real provider billing were not tested. The implementation does not select `drop_block`, alter safeguards, invent signatures or suppress upstream rejection.
- The capability/source catalog statuses and release version are to be reconciled by the main integration checkpoint; this document does not claim an account runtime has been upgraded.

## Primary sources

- [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)
- [Compaction on demand](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)
- [Threshold compaction](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold)
- [Compaction and preserved thinking](https://platform.claude.com/docs/en/build-with-claude/compaction-thinking-blocks)
- Official Python SDK beta edit parameter definitions confirm list/bool/null `clear_tool_inputs`, nullable threshold trigger/instructions, and `keep: {type: all}` in addition to the shorthand `all`.
