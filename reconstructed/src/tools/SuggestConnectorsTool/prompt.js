/**
 * tools/SuggestConnectorsTool/prompt.ts
 *
 * 2.1.316 新增。SuggestConnectors 工具名与提示词。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ydxavk0r.js (1)
 * attribution: placement 1
 */

//@ chunk-ydxavk0r.js:191-1082 placement
var SUGGEST_CONNECTORS_TOOL_NAME = "SuggestConnectors",
  DESCRIPTION = "Resolve full connector payloads for directoryUuid values returned by SearchMcpRegistry.",
  PROMPT = `Resolve full connector payloads for a set of directoryUuid values returned by SearchMcpRegistry. Do NOT call this unless you already have directoryUuid values from a SearchMcpRegistry result, or installed connectors' server_id values listed in your system prompt \u2014 do not guess UUIDs or pass connector names.

Returns name, description, url, iconUrl, sample tool names, and whether the connector is already installed for the user's claude.ai org. installState reflects org-level auth, not whether tools are loaded this session \u2014 check ListConnectors' enabledInChat before claiming a connector is usable here. If a result looks relevant and is not installed, tell the user they could connect it via claude.ai; this tool does not itself connect anything.`;

export { SUGGEST_CONNECTORS_TOOL_NAME, DESCRIPTION, PROMPT };
