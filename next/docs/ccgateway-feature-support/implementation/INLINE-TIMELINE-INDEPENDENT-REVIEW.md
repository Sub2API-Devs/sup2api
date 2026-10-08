# Inline timeline independent review

Reviewed the CC agent's timeline compiler, active/known identity split, server pending-call checks, signed compaction handling, cache paths, and response-local search discovery. Existing fake-CLI matrix evidence in `INLINE-SERVER-TIMELINE-PROGRESS.md` belongs to its author; this review does not relabel those runs as independently rerun production tests.

## Fixed discovery versus withdrawal ambiguity

An independent red test demonstrated that a historical tool search result reactivated an explicitly removed tool: both a deferred tool and a withdrawn tool were represented by `Active=false`, while the known definition remained registered. Response-local discovery used the same unrestricted activation.

The timeline now tracks `Withdrawn` separately. Explicit removal marks it, addition clears it, and compaction rebasing resets it with the catalog. Historical discovery and response discovery reject explicitly withdrawn names; response-local views also avoid enabling them defensively. Deferred tool discovery continues to work. No original signature block or tool-change object is rewritten.

`TestReviewToolSearchCannotReactivateWithdrawnTool` and `TestReviewResponseDiscoveryCannotOverrideWithdrawal` pass with the existing inline unit tests; `go vet ./engine` passed at this point.

## Compaction empty-net boundary fixed

`TestReviewEmptyCompactionChangesRebaseOriginalTools` additionally exercises explicit empty `tool_changes` on a non-null compaction summary after an inline addition. The original compiler only rebases for nonempty changes, potentially retaining a tool absent from the returned net effect. This was sent to the owner to confirm empty versus omitted/null semantics and implement the correct boundary. Its first attempted run was blocked by another agent's in-flight resource contract import, so that blocked run is not evidence of a passing or failing assertion.

The owner fixed this narrowly: a non-null summary with an explicit tool_changes array rebases even when the array is empty; omitted/null tool_changes is not an explicit replacement, and content:null stays a no-op. After the unrelated import was completed, the independent review and inline unit tests passed (0.282s), and engine vet passed.

Independent real CLI 2.1.292 rerun: TestRealCLIInlineServerTimeline plus TestRealCLIInlineToolSearchRoundtrip passed in 32.250s (40 isolated fake-upstream requests). This covers fresh/continuation/rollback/cold-import/SSE, signed block preservation, cache markers, and typed search roundtrip. It verifies CLI/wire behavior, not real provider signature acceptance or account eligibility.
