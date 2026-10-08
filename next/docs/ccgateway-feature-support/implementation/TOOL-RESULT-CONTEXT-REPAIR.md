# Tool-result session-context repair (2026-10-08)

## Observed failure

After Worker 0.1.65 deployment, account 22 request `f62f9687-1d6a-4c1d-a5f3-a866c4f74f39` failed before provider dispatch: `client user turn 3: client user block sequence changed`. The preceding Read call succeeded (`bd2ab881-f183-44fd-8fed-2d6c8d8f8b7d`). The original tool-result string was 3606 characters; inner CLI appended a 573-character session-context wrapper. The original content remained an exact prefix. The authenticated Mod attachment event identified its 534-character inner text as engine `session_context`. No credentials, account context, or file contents are copied into this record.

## Change

The Mod now acknowledges kept engine session-context text over its existing authenticated, loopback, per-request channel regardless of diagnostic logging. Registration is bounded to 32 distinct entries, 64 KiB each. The relay only uses this evidence after main-request attribution.

A temporary alignment view recognizes a unique tool-result ID, complete original string prefix, unchanged protocol metadata, and an exact registered wrapper suffix. All existing history, citation, tool, system and cache validation operates on that view. Before encoding, restoration revalidates the user/block location and original content and restores the suffix exactly where CLI placed it. Restoration is idempotent and validates every target before any write. Unknown suffixes, changed prefixes/IDs/metadata and duplicate IDs are not accepted. No client prompt fingerprint, attachment policy, tool execution gate, cooldown or provider error policy changes.

The Mod is embedded by `companions/mod/assets.go` and extracted by Runner; rebuilding/replacing the Worker binary includes the new hook. An independent filesystem hook update is unnecessary.

## Evidence

- Production failure above is the initial regression evidence; no new production model request was made by this agent.
- Unit positive/negative alignment and authenticated-registration tests pass, including no-log registration, fake/missing proof, duplicate IDs, original client reminders, batch restoration failure atomicity and idempotence.
- Real CLI 2.1.292 with isolated HOME/config, dummy OAuth and dummy email, fake upstream: JSON/SSE × initial tool call/result continuation/cold import/rollback = 8 calls, PASS 7.511s. Each result preserves its exact original prefix; context appears exactly once. At least one result embeds the registered wrapper. Cold CLI can place context outside the result, which stays unchanged.
- Initial fixture attempts did not generate the context because the default client attachment policy filtered it; setting gateway policy reproduces the production branch. The missing-context assertions were retained and strengthened rather than removed.
- `go test ./engine -count=1`: PASS 3.986s; `go vet ./engine`: PASS.
- `node --test engine/attachment_policy_mod_test.mjs`: 2 PASS.
- Independent review tests are in `tool_result_context_review_test.go`; reviewer will record its own final CLI rerun.

Source is ready for independent review. This document does not claim the repair is deployed or that a repaired production Read roundtrip has passed.
