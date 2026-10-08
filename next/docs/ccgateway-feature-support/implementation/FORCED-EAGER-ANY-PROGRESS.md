# Forced choice over eager client tools

## Scope and contract

This implements `tool_choice:any` only for an ordinary client-tool catalog in which every tool explicitly has defer_loading:false. It shares one boolean eligibility function with the existing named loaded-tool path. No server tools, typed tools/toolsets, MCP connector, inline catalog mutations, safeguards or synthetic/API output format are added to this subset.

The incoming any/named selection and disable_parallel_tool_use stay unchanged. CLI's offered tool whitelist does not add internal ToolSearch. The attributed provider catalog is verified in one pass against the complete expected client map: every client schema must exist once, explicit non-deferral is restored, known engine-only ToolSearch/DeferredToolPlaceholder entries are removed, unknown/duplicate/missing definitions rejected. A client-owned tool with the same name takes precedence over helper removal. Existing Mod and stdio execution denial remains in force, response admission excludes the engine helper, and maxTurns=1 prevents hidden discovery loops.

Eligibility is now `forcedLoadedClientCatalog() bool`, replacing the previous pointer/nil predicate mechanically in feature_plan, runner_config and history_alignment. The implementation no longer returns an arbitrary tool as a sentinel for any. No task-budget code or global catalog documentation is changed by this author.

## Unsupported deferred combination

Deferred tools still require a discovery phase. Putting the hidden helper into an any catalog could satisfy the wrong choice. Changing a named deferred request to auto/helper first changes the request's constraint. No equivalent phase exemption is established, so this change does not silently admit those combinations, force-load their definitions, or relabel synthetic execution as a client call.

[Official tool choice documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) states that several current models, including Opus5.5, reject any/tool. Gateway compatibility must preserve that rejection; it does not claim model capability or replace any with auto. [Tool search documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) separately describes API server search, which is not the internal CLI helper.

## Validation

- Unit tests cover any eligibility, one-turn bound, client-only CLI whitelist/provider catalog, exact choice/parallel flag, explicit non-deferral, unknown/duplicate injection rejection and deferred rejection.
- Isolated real CLI2.1.292/fake upstream: JSON/SSE new/continuation/rollback/cold passes with two complete client definitions, cache/description preserved, large integer exact and no helper offered to provider. Malicious helper response fails with one model call, never internal execution.
- Combined named + any CLI regression PASS17.968s before the final single-pass refactor; final any suite (eight successful paths plus helper-negative and provider400-negative) PASS8.881s after refactor.
- The simulated Opus5.5 provider400 is preserved with its original error message, once, rather than relaxed/retried. No new real-provider request was made for this change.
- Full engine tests PASS5.021s; vet PASS.

Author source frozen for independent audit_code_beta review. Not committed/deployed by this author.
