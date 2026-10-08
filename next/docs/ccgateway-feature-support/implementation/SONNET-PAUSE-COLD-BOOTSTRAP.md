# Sonnet server pause: cold native transcript bootstrap

2026-10-08. Implementation candidate; no deployment or real-provider call in this investigation.

## Reproduced behavior

Actual CLI2.1.292, model claude-sonnet-4-6, isolated fake provider. Initial API server web-search response stops with pause_turn and one pending server_tool_use. Same-worker assistant-tail continuation succeeds. Cold Worker/cache import of exactly that client history fails before inference with `continuation transport input changed; refusing to change assistant-tail semantics`, in both JSON and SSE modes.

Warm native history already contains the CLI's Auto Mode attachment at the original first user. Cold imported history lacks that native attachment, so the CLI inserts it beside the runtime continuation marker in a new user frame. Removing the whole frame would delete a safety instruction; moving the attachment would change its role/position. The original continuation guard correctly rejects this case and remains unchanged.

## Native bootstrap evidence and implementation

A zero-response probe submitted the actual first client user to CLI, blocked its model request, waited for the native writer and cancelled. Actual native rows included a user UUID followed by environment/model/auto_mode/token/session/date attachment records, with no assistant. Reusing those original rows under the same native session, then normally importing the client's pending assistant, produced the final assistant-tail request with the Auto Mode attachment still at the original first user. No safety text was copied by hash or invented.

The production helper follows that mechanism:

- Uses a private copied Runner/Request with only the actual first user; original Request.Messages and fingerprints remain untouched.
- Bootstrap relay is completely local. Every route, including count/classifier/resource/unknown paths, returns locally or waits for cancellation. None reaches provider transport. Main capture requires authenticated Mod readiness and per-request scope attribution; duplicate/main attribution failures abort.
- No model response, assistant, tool result or completed cache checkpoint is synthesized. Native writer evidence is read with 4MiB/128-record limits and an eight-second parent-cancellable deadline.
- Native user identity/content, UUID/session/CWD/CLI version and attachment parent links are validated. Unknown records, assistant output and nonregular files reject. The process is cancelled and waited for before final flushed rows are re-read; only expected cancellation is accepted. Bootstrap UUID files and temporary directories are cleaned on all exits.
- Original generated prefix rows are preserved byte-for-byte. The existing transcript writer reconnects only the imported client assistant suffix. Original strict final history/continuation checks run unchanged before the single actual inference.

## Narrow eligibility

This batch bootstraps exact model claude-sonnet-4-6 and a cold `rebuild` with no native auto_mode prefix already present. The first client user consists of text blocks; subsequent plain user/assistant history can contain ordinary text and completed provider-server call/result pairs. The final assistant may retain text and completed server pairs alongside pending server calls. The existing ledger must validate every pair and every still-pending call must belong to that final assistant.

Ordinary text prefill is not enabled. Signatures/thinking and arbitrary block kinds are excluded by the plain-history predicate. Resources/credit/MCP/inline tools/output schema/context controls/compaction/fallback/internal ToolSearch/safeguards/inline metadata are excluded. Other models and aliases retain existing behavior; all model fixtures use one unchanged explicit Sonnet4.6 model. There is no claim that unrecorded historical model transitions were proven equivalent.

CLI2.1.292 preserves the text and completed server pairs of a mixed final assistant, but removes its unresolved server calls without adding an interruption placeholder. The implementation reuses `restoreOmittedBlocks` only for IDs that the unchanged server ledger still marks pending. At least one retained block anchors the final turn; every other block and the complete preceding history must match before mutation. Changed text, missing completed result, extra unknown block, wrong call ID or changed prefix is rejected atomically. The previous all-pending interruption-placeholder path remains intact.

This adds a CLI startup for that cold case, but no additional provider inference. It does not disable permission/classifier logic or weaken tool handoff gates.

## Verification

- Initial reproduction: warm two calls passed3.544s; adding cold imports failed both JSON/SSE5.76s. Additional CLI-shape diagnostics confirmed the attachment position difference.
- Native no-response bootstrap/reuse probe passed1.93s before production hooks were added.
- Final production path: JSON/SSE × initial pause, continuation, cold import, rollback = eight actual fake-provider requests, PASS8.48s. Four Auto Mode block observations per mode retain exact role/message/block/hash between raw CLI and final wire; the final continuation remains the exact server-tool assistant, no transport marker. No extra provider calls occur.
- Unit tests cover all relay routes remaining local, unavailable attribution, cancellation, initial user changes, wrong session/CWD/version, missing parent/duplicate UUID, unexpected assistant, record/byte limits and excluded combinations.
- Full engine suite PASS4.240s; go vet passed. Local Windows race was not run. Independent review is pending; Linux race and actual provider behavior are separate future gates.

## Multi-turn extension evidence

- Exact multi-turn reproduction proved a normal completed text exchange before pending server calls is compatible with the same native prefix bootstrap.
- Mixed final text and completed call/result pairs initially failed because CLI dropped only the unresolved call. Shape diagnostics verified all retained blocks unchanged before implementing the registered omission recovery.
- JSON/SSE × pure pending / text+pending / completed-pairs+text+pending × same-cache repeat/cold/rollback: 24 fake-provider calls, PASS34.35s. No additional inference from bootstrap.
- JSON/SSE × completed server pair in an earlier assistant history × repeat/cold/rollback: another8 fake-provider calls, PASS13.66s. This extension asserts full preceding history alignment, not merely substring presence.
- Negative restoration unit tests: changed retained text, changed preceding user, missing completed block, extra unknown block and wrong pending ID all reject without partially changing the wire object.
- Expanded full engine suite PASS6.149s. Independent review must examine the added `continuation.go` mixed-tail helper in addition to the previously listed bootstrap scope.

Final unified32-call matrix with complete prefix assertions on all variants: PASS46.400s. No production changes or model calls were made.
