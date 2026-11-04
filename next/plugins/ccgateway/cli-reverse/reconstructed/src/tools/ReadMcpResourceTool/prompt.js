/**
 * tools/ReadMcpResourceTool/prompt.ts
 *
 * ReadMcpResourceTool 名称常量、description 与 prompt
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ReadMcpResourceTool/prompt.ts
 * pieces: chunk-sfy7bm1n.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-sfy7bm1n.js:5989-6520 fingerprint (2.1.88 match: DESCRIPTION, 0.508)
/**
 * ReadMcpResourceTool 名称常量与 description/prompt 文本。
 */
var READMCPRESOURCETOOL = "ReadMcpResourceTool";
var READ_MCP_RESOURCE_DESCRIPTION = `
Reads a specific resource from an MCP server.
- server: The name of the MCP server to read from
- uri: The URI of the resource to read

Usage examples:
- Read a resource from a server: \`readMcpResource({ server: "myserver", uri: "my-resource-uri" })\`
`;
var READ_MCP_RESOURCE_PROMPT = `
Reads a specific resource from an MCP server, identified by server name and resource URI.

Parameters:
- server (required): The name of the MCP server from which to read the resource
- uri (required): The URI of the resource to read
`;
export { READMCPRESOURCETOOL, READ_MCP_RESOURCE_DESCRIPTION, READ_MCP_RESOURCE_PROMPT };
