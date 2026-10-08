# Per-turn control CC compatibility

## Evidence and scope

Observed local Claude Code 2.1.292 sent `per-turn-control-2026-07-01` and a system message with `output_config.effort=medium` through the public gateway. Request `f11939e5-4843-4f91-b5a2-531448123936` at 2026-10-08 04:53:47.286 UTC was rejected in 38 ms because Worker recognized only the public API beta name. The subsequent successful request had exactly the same body except that the inline output_config was omitted; its header also omitted per-turn-control. Session-scope, metadata, system and content hashes matched. Thus eventual CLI success masked loss of the requested per-message effort.

Public documentation [mid-conversation system messages](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages) and [effort](https://platform.claude.com/docs/en/build-with-claude/effort) specify `mid-conversation-output-config-2026-07-01`. This change separately recognizes the observed CC name; it does not claim official aliasing, deprecation or chronological replacement. No real provider acceptance of the CC name is newly claimed by the isolated tests.

## Implementation

- Add the observed CC beta to shared BetaRules as `forward`.
- For messages[].output_config, require either independently admitted name. Preserve the incoming name and value; never replace a beta or remove the directive to make a request pass.
- Existing role/schema/effort/clear_at/AllowEffort and exact history position checks remain unchanged.
- No changes to forced-loaded tool execution, retry/cooldown, model authorization or billing.

## Validation

- Admission regression first failed on the observed CC name, then passed with the narrow fix. Both names retain their identity in Request.Betas. Missing beta, unsupported role/schema/effort, incompatible clear_at and disabled effort policy remain rejected.
- Real CLI 2.1.292, isolated temporary HOME/config, dummy credential, fake upstream: 2 independently supplied beta names × JSON/SSE × new/continue/fork/cold = 16 successful requests; PASS 14.442s. Full client history alignment and exactly one original inline directive are verified, with no extra provider requests.
- The CLI itself adds its own per-turn-control beta. Accordingly, public-beta input reaches upstream with its original name plus the CLI's own beta; CC-only input is not renamed to the public beta. The initial overly strict test expecting no CLI-native beta was corrected to check source-preserving semantics, not by changing forwarding.
- Full `go test ./engine -count=1`: PASS 4.964s; `go vet ./engine`: PASS. Contracts features tests PASS 0.250s.

Source is frozen for independent review; not yet deployed. A subsequent authorized real-provider/local-Claude verification must confirm the directive survives without automatic client downgrade.
