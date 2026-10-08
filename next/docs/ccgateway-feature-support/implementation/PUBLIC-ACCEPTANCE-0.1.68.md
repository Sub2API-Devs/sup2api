# Public acceptance — Worker0.1.68 / core0.1.67

2026-10-08. Root executed the live clients only after coordinated publication was stable. This reviewer inspected both account Worker logs read-only and did not issue duplicate inference calls or modify runtime state. Source candidate: `9ba4b278217f077e39cc4e31bc63f50658382133`; catalog2026-10-08.10. No source file body, account email, token or API key is recorded here. Existing probe JSON files remain unchanged.

## Five native Read calls and complete trailing-byte restoration

Root evidence: `implementation/evidence/local-parallel-read-0.1.68.json`;17.038s, five calls in one assistant message, five paired results, final five markers. Root sessionSHA `223a573d69bc935fa2464a6639eea2bc6069ca5204e3dcde384e872c2969cc46`.

Account22 metadata hash `53dfa794a3a8228b` matches exactly two requests across both accounts:

- `91d54099-465a-4a15-a599-f3bf5d30fc72`,06:21:20.178 UTC,HTTP200. One response contains five `Read` tool_use blocks and stop_reason tool_use.
- `9e1bb607-7010-47d5-9a06-35f0f518af78`,06:21:27.490 UTC,HTTP200. All five results match the five IDs; completion ends end_turn.

No matching502 request was found in this session. Worker logs alone do not prove the absence of every core-only cooldown event, but root's successful two-turn client and complete matching Worker requests show no retry was needed for this acceptance.

All five original results end in character code9 (TAB). First four are77 characters and remain unchanged, with SHA256 prefixes `267693ef5dec7912`, `613879535a172efd`, `bb567c6b6942543d`, `1f41b993e544f6c2`. Fifth is75 characters, hash `2bdbc9371c8808c9`; actual outbound is648 characters, exactly the full original75 including TAB plus the authenticated573-character wrapper. Session-context inner-text hash `8798029338750562` occurs once. No client tail byte is lost.

## Anonymous public remote MCP

Root evidence `public-mcp-0.1.68.json`, public requestID `5832ce7bac5b8e36103720a9`;9.052s,HTTP200/end_turn, exactly one MCP call and one successful result plus text. No pause continuation or error retry occurred.

Worker account22 request `65f8c75f-02e4-4fb1-849d-b205aad178c4`,06:22:19.636 UTC,HTTP200,one upstream request. The provider's original logged stream contains eight input_json_delta events (one empty), followed by real content_block_stop, non-error mcp_tool_result, final text, message_delta end_turn and message_stop. This directly exercises the formerly failing streamed input path; the complete provider terminal sequence is preserved.

Remote endpoint is official anonymous `https://mcp.deepwiki.com/mcp`; tool `read_wiki_structure`, server `deepwiki_public_fixture`, fixed public repository `modelcontextprotocol/python-sdk`. The root script validates exact public tool arguments and result pairing. No MCP authorization token is supplied; this proves this public endpoint/account/model combination, not arbitrary authenticated MCP eligibility.

## Inline changes with actual internal ToolSearch

Root evidence `public-inline-search-0.1.68.json`; twoHTTP200 calls, tool_use then end_turn, fixture_completedtrue. The original JSON's `internal_search_verified` remains unchanged; the additional log evidence below supplies the independent proof. Client tool-callSHA `17d73e829e153219a52091dfc507d934af53f6cd870f1c1703da984ef34f5224`.

- Account22 `75995ddb-656d-4759-a4cc-1678c257fbb4`,06:22:39.165 UTC: two actual upstream rounds. First provider response requests native internal ToolSearch; authenticated Mod records internal_execute/local_execution=true for ToolSearch. Second outbound round contains that ToolSearch call/result, while retaining the client tool_addition/tool_removal timeline. Second provider response calls `mcp__ccgateway__lookup_fixture`; Mod records client_handoff/local_execution=false, routing back to client `lookup_fixture`.
- Account22 `55d5b89e-fae6-4274-8407-91702f6d58b2`,06:22:45.129 UTC: one upstream round with complete client tool result and inline timeline, ending end_turn. No client tool is locally executed.

This confirms actual internal CLI ToolSearch execution in the tested inline fixture, not merely its presence in the tool catalog. It does not claim every inline/forced/server-search combination is interchangeable.
