# Public remote MCP smoke plan

Official primary sources checked 2026-10-08:

- [DeepWiki MCP](https://docs.devin.ai/work-with-devin/deepwiki-mcp): Cognition's official free/no-auth remote service for public repositories. Recommended HTTPS Streamable HTTP endpoint `https://mcp.deepwiki.com/mcp`; `read_wiki_structure` returns repository documentation topics.
- [Anthropic MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector): `mcp_servers` plus `mcp_toolset`, optional authorization token, HTTPS remote endpoint, per-tool enabled controls. Baseline beta `mcp-client-2025-11-20` is implemented and is used here; no deferred search, inline mutation or pinned-list beta is involved.

`evidence/public_mcp_smoke.py` is opt-in and executed by root. It obtains only the gateway key from SUP2API_API_KEY, never reads local project files/settings/authorization, and never supplies an MCP authorization token. Only a fixed public `modelcontextprotocol/python-sdk` documentation query is requested. The toolset disables all tools except `read_wiki_structure`; prompt requires exactly its public repoName and forbids transmitting account/environment/local-workspace context. Actual returned tool input must exactly equal that fixture object to count as successful. This is model-instructed remote tool use, not proof of argument enforcement by DeepWiki.

Default is one API request. `--allow-one-pause-continuation` permits one exact-history continuation only for pause_turn; no error retry, alternate account, endpoint probing, local server deployment or network bypass. Failures/refusals remain evidence and are not called success. A valid result must include exactly one allowed MCP call and matching non-error result, ending normally. Stored evidence contains status/usage/types/counts and result hashes; no raw returned documentation or tool inputs are persisted.

Preparation tests: Python compilation and offline request/summary positive/incorrect-repository assertions PASS. No provider/MCP request was made by the preparing agent. Real endpoint/provider eligibility remains unverified until root executes the script and records its outcome.
