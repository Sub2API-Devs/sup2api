# MCP connector implementation plan

Evidence date: 2026-10-08. This is a fourth-batch implementation plan, not a deployment/support declaration.

## Protocol boundary

Provider-side MCP uses `mcp_servers` plus `tools[type=mcp_toolset]`. It must not become CC local MCP configuration or a synthetic `mcp__ccgateway__` tool. Admit `mcp-client-2025-11-20` and the superseding `mcp-client-2026-09-15`; reject deprecated `mcp-client-2025-04-04` explicitly rather than silently upgrading semantics. The newer version preserves listing blocks and supports pinned tool lists. Each server has exactly one toolset; dynamic unknown per-tool configuration names are not rejected merely because they are absent from a pinned list.

Sources: [connector guide](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector), [toolset schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_toolset_param.py), [server schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_request_mcp_server_url_definition_param.py).

## Secret ownership and capture

Extract authorization tokens into a private, in-memory request plan bound to the exact server name and URL. Public/raw diagnostic request copies omit the token. Token material never belongs in RequestPlan.RawRequest, feature decisions, Mod config, CLI environment/arguments, native JSONL or a history fingerprint. Only the attributed main upstream request receives the secret; auxiliary requests do not receive MCP configuration. The final injection verifies the server identity before attaching credentials.

Current code logs client body before parsing, saves the final upstream body, and appends raw upstream/response chunks. All three are integration gates: extraction/redaction must precede the first body capture. A structured JSON sanitizer can remove authorization fields and redact complete secret-bearing scalar values; it must not perform unrestricted substring rewriting of protocol data. Non-JSON and split SSE chunks cannot be safely sanitized independently. For secret-bearing connector requests, omit such raw captures with an explicit diagnostic reason and retain sanitized structured events. Execution and client response bytes remain unchanged. Malformed/rejected requests containing credential fields also require safe capture handling.

URL validation accepts HTTPS, a valid hostname and no userinfo; rejects literal loopback/private/link-local/unspecified/multicast hosts and local-only hostname forms. Worker never fetches or resolves the remote MCP endpoint. Provider execution remains responsible for DNS rebinding and provider-side transport policy. No deployment claim will imply a local static URL check completely prevents provider-side SSRF.

## Codec and history

`mcp_tool_use` preserves id/name/server_name/input and cache control. `mcp_tool_result` binds to the outstanding call and preserves string or text-block-array content plus is_error. `mcp_tool_listing` preserves server name, ordered tools, descriptions and arbitrary input schema; its presence requires the listing beta on replay. Tool names remain server-scoped, never routed through client tool name mapping. Repeated names on different servers are valid; duplicate call IDs and unmatched results are not.

Sources: [tool-use schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_tool_use_block_param.py), [result schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_tool_result_block.py), [pinned tool schema](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_tool_param_param.py).

Use the existing terminal observer, server ledger, omission restoration and exact history alignment where applicable. Do not convert MCP results into user tool_result or simulate execution locally. Real CLI probes must establish whether these blocks survive JSONL; any missing blocks require registered, exact-position restoration rather than a permissive generic block allowlist. Pending calls allow pause_turn and mixed client-tool continuation under the existing ledger rules. Cache reconstruction must restore the original combined tool ordering and toolset cache breakpoints.

## Work sequence and gates

1. Independent schema/secret-plan helpers and negative tests; no API admission yet.
2. Isolated real CLI probes for listing/use/result, including no-text assistant, pause and ordinary continuation.
3. Wire the main-only plan, codec/ledger/history, beta registry and exact cache restoration after probe evidence.
4. Test JSON/SSE, long histories, rollback, cold import, same-named tools across servers, missing/changed definitions, and call/result pairing.
5. Scan all fixture artifacts for unique token sentinels, including malformed requests, upstream errors and chunk-split token echoes. Assert the correct token reaches only its matching fake provider server definition.
6. Parent independent review before feature catalog status is changed. Real provider execution and OAuth eligibility remain separate from fake-upstream protocol evidence.

Mid-conversation `mcp_servers` requires separate inline timeline integration and the relevant inline-tools beta. It will remain an explicit unsupported combination until its secret lifetime, server identity and historical placement are proven; it must not silently become a top-level server declaration.
