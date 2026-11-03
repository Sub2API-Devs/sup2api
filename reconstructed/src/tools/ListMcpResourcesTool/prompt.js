/**
 * tools/ListMcpResourcesTool/prompt.ts
 *
 * ListMcpResourcesTool 名称常量、description 与 prompt
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ListMcpResourcesTool/prompt.ts
 * pieces: chunk-sfy7bm1n.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-sfy7bm1n.js:4464-5160 fingerprint = DESCRIPTION (0.508)
/**
 * ListMcpResourcesTool 名称常量与 description/prompt 文本。
 */
var LISTMCPRESOURCESTOOL = "ListMcpResourcesTool";
var LIST_MCP_RESOURCES_DESCRIPTION = `
Lists available resources from configured MCP servers.
Each resource object includes a 'server' field indicating which server it's from.

Usage examples:
- List all resources from all servers: \`listMcpResources\`
- List resources from a specific server: \`listMcpResources({ server: "myserver" })\`
`;
var LIST_MCP_RESOURCES_PROMPT = `
List available resources from configured MCP servers.
Each returned resource will include all standard MCP resource fields plus a 'server' field 
indicating which server the resource belongs to.

Parameters:
- server (optional): The name of a specific MCP server to get resources from. If not provided,
  resources from all servers will be returned.
`;
export { LISTMCPRESOURCESTOOL, LIST_MCP_RESOURCES_DESCRIPTION, LIST_MCP_RESOURCES_PROMPT };
