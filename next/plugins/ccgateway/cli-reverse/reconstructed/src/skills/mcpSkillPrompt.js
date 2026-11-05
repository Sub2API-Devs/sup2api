/**
 * skills/mcpSkillPrompt.ts
 *
 * 2.1.316 新增：MCP 技能的提示文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../tools/ReadMcpResourceDirTool/prompt.js";
import { READMCPRESOURCETOOL } from "../tools/ReadMcpResourceTool/prompt.js";

//@ chunk-5xgkngpb.js:3210758-3211142 placement
/**
 * MCP 提供的技能说明：如何用 ReadMcpResource 读取相对路径的支持文件。
 */
function mcpSkillResourceHint(mcpResourceRoot) {
  let directoryHint = mcpResourceRoot.directoryRead
    ? ` Call ${READ_MCP_RESOURCE_DIR_TOOL_NAME} on "${mcpResourceRoot.uri}" or a subdirectory URI to list its contents.`
    : "";
  return (
    `This skill is served by MCP server "${mcpResourceRoot.server}" at ${mcpResourceRoot.uri}. ` +
    `To read a supporting file this skill references by a relative path \u2014 for example "templates/invoice.md" \u2014 call ${READMCPRESOURCETOOL} with server "${mcpResourceRoot.server}" and uri "${mcpResourceRoot.uri}/templates/invoice.md".${directoryHint}`
  );
}
export { mcpSkillResourceHint };
