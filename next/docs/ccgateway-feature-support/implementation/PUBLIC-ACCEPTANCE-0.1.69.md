# Public acceptance: Worker 0.1.69

2026-10-08 UTC. Product build `decd22f1f7e43f5fd45f426d192553f1d9f6494e`, Worker0.1.69/catalog2026-10-08.12. Root ran the public probes only after coordinated release stability; this reviewer issued no model requests and inspected existing Worker logs read-only. Original JSON evidence is unchanged.

## Image, document and citation continuation

Evidence: `evidence/public-media-citations-0.1.69.json`. Root reports all three public requests HTTP200 and exact synthetic-source citation slices verified. The fixture uses a generated red PNG and public synthetic text, not user files.

All three correlate to account22, one upstream model request each:

- Image: Worker `a5b03434-fc23-414b-a0e8-c22a9e0c2b3b`, metadata timestamp07:11:47.240828573Z, HTTP200/end_turn, rebuild.
- Document citation: Worker `1d35e126-aadd-4b8c-b9ce-7a8e1fbe2005`, 07:11:52.140076716Z, HTTP200/end_turn, rebuild, one response citation.
- Citation continuation: Worker `ca294f81-082b-4df8-9309-0044b6e052e5`, 07:11:57.626995450Z, HTTP200/end_turn, local prefix-hit, one new response citation.

Document source SHA256 remains `43c11b05148a2ee9e50f78baa9384763c1965920fc5fafed25ffdc880473f375` in client, CLI and final upstream requests. Citation-enabled source configuration remains intact. On continuation, client history has one citation; raw CLI history has `citations: []`; final upstream history restores the original one citation. Entire historical assistant content client/upstream hash is identical: `6984d610c8d79aa1de116d6a5fe57ef1f8751413a705e96b7e50ac7f246df2dd`. The intermediate CLI content hash is `56606190ca928622a0f5312568d32537d9dd09d79e614c6a4872814227d980ee`. Text identity remains unchanged throughout. Existing CC system frames remain present rather than removing messages to make alignment pass.

There was no pre-upstream restoration failure in these three requests. Local prefix-hit is not proof of upstream prompt-cache billing. Hashes above use Node JSON serialization; root's sorted Python citation hash in the original evidence uses a different serialization and is not compared as if byte-identical.

## Pinned deferred MCP + API ToolSearch

Evidence: `evidence/public-pinned-mcp-search-0.1.69.json`. Public request ID `0eded4ddbae9681c179ca0c2`, duration14.287s, HTTP200/end_turn. Worker account22 UUID `da25f294-e690-44ab-a38b-8fa742e258c5`, metadata timestamp07:13:03.789269766Z. Exactly one upstream model request, no pause continuation or retry.

The anonymous endpoint is `https://mcp.deepwiki.com/mcp`. Its complete tools/list catalog of three tools was pinned. Default configuration is `enabled:false,defer_loading:true`; only `read_wiki_structure` overrides to enabled/deferred. Client and actual upstream full tools catalog are semantically identical under recursive key sorting (SHA256 `dc6ecc8fd460f10f9f77923c5b55080310f23d057e3d7205529f3c754f112f6e`); pinned definitions hash `440b97dba84fe4bef59e4dc38018f51fce65ed48f594ccb84d03394ca3210598`. Other remote tools were not opened. No MCP authorization token is present in client or upstream server definitions.

Original provider SSE sequence:

1. `server_tool_use`: API `tool_search_tool_regex`, pattern `read_wiki_structure`.
2. `tool_search_tool_result`: reference `deepwiki_public_fixture_read_wiki_structure`.
3. `mcp_tool_use`: server `deepwiki_public_fixture`, tool `read_wiki_structure`, repoName `modelcontextprotocol/python-sdk`.
4. Paired `mcp_tool_result`, is_error false.
5. Text, end_turn and real message_stop.

Provider-source and client-returned search references are equal, without name translation (nested reference-list hash `b01a84fa23747a64e19bafe2eccdf8c61cb03389b305ba3c5e9245d09407f848`). Probe additionally checks nonempty unique IDs, strict call/result ordering and one successful pair. The original public user block remains in the upstream message history.

This is now real-provider evidence for the documented composed name in this one pinned anonymous server/tool scenario, in addition to prior isolated CLI tests. It does not prove every provider, credentialed server, name-collision behavior, unpinned dynamic catalog, arbitrary MCP operation or real-provider cold/rollback combination. Those broader claims are not made.
