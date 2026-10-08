# MCP connector fourth-batch progress

Evidence date: 2026-10-08. Local source and isolated real CLI evidence only; not a production deployment or provider entitlement claim.

## Implemented

Provider-side `mcp_servers` and `mcp_toolset` are admitted with `mcp-client-2025-11-20` or `mcp-client-2026-09-15`. Deprecated `mcp-client-2025-04-04` produces an explicit error. Server name/URL and toolset one-to-one binding, pinned listing shape, nullable tokens/configs and per-tool flags are validated. Dynamic configuration names are preserved. Original combined tool order and toolset cache breakpoints are restored at the attributed main request; nothing is registered as a local SDK/CLI MCP server.

Protocol blocks `mcp_tool_listing`, `mcp_tool_use`, `mcp_tool_result` remain provider blocks. Names remain server-scoped; call IDs share the server ledger, duplicate calls/unmatched results fail, and pending definitions must remain available. Classic and listing betas support pause and assistant-tail continuation. Input history result content/is_error are optional per the request SDK union; response fixtures include both. Result content is string or text blocks, not a permissive arbitrary execution-block union.

Sources: [connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector), [request result union](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_request_mcp_tool_result_block_param.py), [config flags](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_mcp_tool_config_param.py). The plan document records the other exact schema sources.

## Credential isolation

The token is stored only in private per-request state and injected only into the attributed main provider request, after matching the original server name and exact URL. RawRequest/public plan/request JSON do not serialize token storage. HTTP account authorization is unchanged. URL checks reject userinfo, non-HTTPS, obvious local/private/link-local literal targets and local hostname forms; Worker never fetches these URLs. DNS rebinding protection remains provider-side, not a claim made by this static check.

Before client body capture, diagnostics discover credential fields and retain only structured redacted copies. Raw response/transport chunks and unparseable snapshots are omitted with an explicit capture-policy reason. Request execution/client output is not rewritten by logging. Malformed JSON is never retained raw. Tests include token echo in structured error data and tokens split across raw chunks.

An additional provider-to-CLI guard rejects known token literal/JSON-escaped echoes before they can become native transcript text. SSE frames whose text may be a token prefix are held until disambiguated, then released byte-for-byte; nested input JSON is decoded before release. No guard/buffering is installed on requests without connector secrets. Limits: token 64 KiB, guarded JSON/unframed event/held-event buffer 16 MiB. The guard does not claim to prevent arbitrary encoding, encryption or steganography. Very short tokens can match unrelated actual strings; numeric fields are not treated as strings. Failures are explicit credential-isolation errors, not silently edited tool results.

## Real CLI differences and fixes

CLI 2.1.292 preserves completed MCP listing/call/result blocks in native JSONL and subsequent requests. A reply containing only MCP blocks causes raw CLI to try an additional generation; the existing API terminal observer stops that extra call in the integrated Worker path.

Unresolved calls differ: with a listing, CLI retains the listing but removes the call; without a listing, a sole unresolved call becomes `[Tool use interrupted]`. Both are repaired only after exact surrounding-history/ledger checks. In mixed MCP/client handoff, CLI also drops the unresolved MCP call when the user sends a local tool_result. A new final-wire assertion caught this despite the initial fake HTTP flow returning 200. The registered omission set now includes MCP calls and composes with advisor/fallback restoration; ordinary mismatched blocks are never overwritten.

## Evidence and remaining boundaries

- `TestRealCLIMCPConnectorBlocksProbe`: raw CLI listing/use/result, with/without ordinary text; five isolated provider calls. Exact history assertions, not observation-only logging.
- `TestRealCLIMCPConnectorGateway`: each beta runs new/continue/extended history/rollback/cold import/pause/assistant-tail resume/SSE, eight provider calls per beta. Every API request has exactly one final provider call. Full artifact scan checks token absence, including CLI native JSONL and Mod configuration.
- `TestRealCLIMCPProviderCredentialEchoBlocked`: malicious synthetic result echoes its bearer; explicit 502 and no full token in any fixture file.
- `TestRealCLIMCPMixedClientHandoff`: two calls with final-wire pending-call identity assertion and local client tool_result.
- Unit tests cover private serialization, mutation isolation, exact credential destination, malformed/duplicate configurations, beta boundaries, structured/split-log capture, cross-delta held frames, nested JSON escaping and short token versus numeric fields.

Still explicit unsupported combinations: API ToolSearch plus MCP requires verified cross-server tool_reference name encoding; inline tool changes plus MCP require a server/secret timeline; safeguards plus MCP require server-scoped classifier identity. These are implementation tasks, not claims that the official API cannot support them. Count-tokens does not admit mcp_servers. Pinning dynamic catalogs, long-history scale beyond the tested extension, cross-account behavior and a controlled actual remote-MCP provider run still need broader validation. No external write-capable MCP server was contacted.

The shared feature catalog has not yet been promoted by this batch; parent independent review is required before widening the advertised support surface.

## Author freeze verification

Final `go test ./engine -run '^TestRealCLIMCP' -count=1 -v`: PASS 21.521s, comprising 5 raw-probe calls, 16 full Worker compatibility calls, one malicious credential-echo call and two mixed-client handoff calls. Engine full unit suite passed 4.997s and `go vet ./engine` passed. The subsequent strict history test verifies that a modified preceding user turn, ordinary assistant anchor, retained MCP input, or extra trailing user turn is rejected; only the registered omitted call is restored. Final tests also verify that numeric fields equal to a short token are not treated as string echoes.

Non-SSE plain provider errors retain their original bytes/status when they do not contain a known literal credential; valid JSON additionally undergoes decoded-string checking. Thus the credential guard does not convert ordinary HTML/plaintext provider errors into protocol-shape errors. No checkpoint commit, push or deployment was performed by this author.
