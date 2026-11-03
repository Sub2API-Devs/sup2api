/**
 * skills/mcpSkillPrompt.ts
 *
 * 2.1.316 新增：MCP 技能的提示文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../tools/ReadMcpResourceDirTool/prompt.js";
import { READMCPRESOURCETOOL } from "../tools/ReadMcpResourceTool/prompt.js";

/**
 * MCP 提供的技能说明：如何用 ReadMcpResource 读取相对路径的支持文件。
 */
//@ chunk-e6aww6q8.js:3124230-3124614 placement
function mcpSkillResourceHint(e) {
  let n = e.directoryRead
    ? ` Call ${READ_MCP_RESOURCE_DIR_TOOL_NAME} on "${e.uri}" or a subdirectory URI to list its contents.`
    : "";
  return (
    `This skill is served by MCP server "${e.server}" at ${e.uri}. ` +
    `To read a supporting file this skill references by a relative path \u2014 for example "templates/invoice.md" \u2014 call ${READMCPRESOURCETOOL} with server "${e.server}" and uri "${e.uri}/templates/invoice.md".${n}`
  );
}

export { mcpSkillResourceHint };
