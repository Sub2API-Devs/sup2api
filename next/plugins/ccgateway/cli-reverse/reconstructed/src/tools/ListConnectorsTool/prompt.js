/**
 * tools/ListConnectorsTool/prompt.ts
 *
 * 2.1.316 新增。ListConnectors 工具名与提示词。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kfxfsh2y.js (1)
 * attribution: placement 1
 */
//@ chunk-kfxfsh2y.js:191-1281 placement
var LIST_CONNECTORS_TOOL_NAME = "ListConnectors";
var DESCRIPTION =
  "List the MCP connectors installed for the user's claude.ai org, optionally filtered by keyword.";
var PROMPT = `List the MCP connectors installed for the user's claude.ai org. Call this when the user asks what connectors they have. Pass keywords to filter to a topic; omit to list all.

Returns name, description, whether each connector is connected at org level (connected may be null when the status check was unavailable \u2014 treat that as unknown, not disconnected), and enabledInChat (whether its tools are loaded in this session). enabledInChat: false with connected: true means the connector's tools are not loaded in this session, so you cannot call them; the field does not say why. There may be no connector setting for this chat alone. If the request needs the connector, tell the user it is not available here and that they can check it, and its tool permissions, in their claude.ai connector settings. To recommend connectors the user does NOT have yet, use SearchMcpRegistry \u2192 SuggestConnectors instead; this tool does not itself connect anything.`;
export { LIST_CONNECTORS_TOOL_NAME, DESCRIPTION, PROMPT };
