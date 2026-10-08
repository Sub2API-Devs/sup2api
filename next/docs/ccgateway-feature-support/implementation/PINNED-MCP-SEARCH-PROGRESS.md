# Pinned deferred MCP + API ToolSearch

2026-10-08. Candidate only; not deployed or verified against a real provider.

## Evidence and design

The official SDK's `BetaToolChangeToolReference` documentation explicitly describes provider MCP model names as `{server}_{name}`. The search response `BetaToolReferenceBlock` itself has only `type` and `tool_name`; it does not carry `server_name`. This is an inline-tool SDK comment, **not an observed real-provider search response**.

Sources:
- https://github.com/anthropics/anthropic-sdk-typescript/blob/main/src/resources/beta/messages/messages.ts
- https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool

The implementation enumerates complete pinned `(server, tool)` identities into exact composed keys. It never splits a name or recognizes a speculative `mcp__` prefix. Any deferred connector requires every connector catalog in the request/timeline to be pinned, so a dynamic neighboring catalog cannot hide a name collision. Multiple pairs producing one key, or collisions with client/typed/server tool identities, are rejected. Unknown encodings remain errors.

## State and preservation

Search references retain their original `tool_name` in both directions. Historical search results activate the matching tool only at their protocol position, using the MCP timeline. Disabled, withdrawn, missing or not-yet-defined members cannot be discovered. Complete history reconstructs state for cold imports and rollback. Response discoveries are held in the response ledger, never written into the shared Request. Ordinary client references continue through the existing name mapper.

Credential binding, secret guard, server URL validation and MCP result identity remain unchanged. No credential is included in the search index. This implements API provider ToolSearch, not Claude Code's local/internal ToolSearch.

## Verification

- Unit tests: deferred-before-search rejection; exact unchanged reference; one-server-only activation; response does not mutate Request; historical reconstruction; withdrawal cannot be revived; pair/client collisions; disabled and unknown reference rejection; incomplete neighboring catalog rejection.
- Real CLI 2.1.292 with isolated fake provider: JSON/SSE × new, continuation, cold import, rollback = 8 generation requests; PASS 7.243s. Final tools catalog and server credential bindings are checked; complete search reference history is compared, no extra request/retry occurs.
- Full engine suite PASS 5.309s; go vet passed.
- No real provider call, public MCP interaction, deployment or catalog claim was made for this change. A later controlled anonymous pinned DeepWiki probe must confirm the exact search reference encoding; an unexpected encoding remains rejected.

## Remaining boundaries

Unpinned deferred MCP catalogs are not admitted. Completed history whose server/catalog was removed entirely cannot gain an identity from a bare opaque search name. Future support needs explicit listing evidence and position-aware catalog lifetime, not heuristic prefix parsing. Forced tool choice and fallback-credit internal-round gates are untouched.
