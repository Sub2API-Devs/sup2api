/**
 * tools/ReadMcpResourceDirTool/prompt.ts
 *
 * 列出 MCP 目录资源的工具提示词（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gg17c06d.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { INODE_DIRECTORY } from "../../services/mcp/mcpCallConstants.js";

//@ chunk-gg17c06d.js:6164-6993 placement
/**
 * ReadMcpResourceDirTool 的简短描述。
 */
var READ_MCP_RESOURCE_DIR_TOOL_NAME = "ReadMcpResourceDirTool";
var READ_MCP_RESOURCE_DIR_DESCRIPTION = `
List the direct children of a directory resource on an MCP server.
- server: The name of the MCP server to read from
- uri: The URI of the directory resource

Only usable against a server that has declared support for directory listing. The listing is not recursive.
`;
var READ_MCP_RESOURCE_DIR_PROMPT = `
List the direct children of a directory resource on an MCP server (\`resources/directory/read\`).

Parameters:
- server (required): The name of the MCP server to read from
- uri (required): The URI of the directory resource

The listing is not recursive. Each entry carries its own \`uri\`; subdirectories appear with mimeType "${INODE_DIRECTORY}" \u2014 call this tool again on a subdirectory's \`uri\` to descend.

Only usable against a server that has declared support for directory listing; other servers return an error.
`;
export { READ_MCP_RESOURCE_DIR_TOOL_NAME, READ_MCP_RESOURCE_DIR_DESCRIPTION, READ_MCP_RESOURCE_DIR_PROMPT };
