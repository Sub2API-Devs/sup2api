/**
 * tools/REPLTool/mcpTools.ts
 *
 * REPL 内 MCP 工具的错误类型、工具枚举与隐藏规则（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { storedRemoteToolResult } from "../../services/remoteTools/storedRemoteToolResult.js";
import { matchesToolName } from "../../Tool.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { isBashAvailable, isPowerShellToolEnabled } from "../../utils/shell/shellToolUtils.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { filterToolsByDenyRules } from "../../utils/permissions/filterToolsByDenyRules.js";
import { getFileAndShellTools } from "../../tools.js";
import { REPL_TOOL_NAME } from "./constants.js";
import { isMultiEntryAliasTool } from "../../services/tools/permissionCheckGuard.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-n51jggtb.js:38362-38468 placement
/**
 * 把内层调用的结果改写成“已剥离”形态，并附上远端工具结果。
 */
function stripStoredRemoteResult(result, content) {
  let stored = storedRemoteToolResult(result, [content], true);
  return {
    toolUseResultStripped: true,
    ...(stored !== undefined && {
      remoteToolResult: stored,
    }),
  };
}
//@ chunk-n51jggtb.js:38468-38523 placement
/**
 * 判断工具是否是当前模式下需要隐藏的 Bash/PowerShell 工具。
 */
function isUnavailableShellTool(tool) {
  return (
    (matchesToolName(tool, BASH_TOOL_NAME) && !isBashAvailable()) ||
    (matchesToolName(tool, POWERSHELL_TOOL_NAME) && !isPowerShellToolEnabled())
  );
}
//@ chunk-n51jggtb.js:38523-38741 placement
/**
 * 计算 REPL 里可用的工具集：内置工具与允许的外部工具合并去重。
 */
function withShellTools(tools, permissionContext, primitiveToolGrant) {
  let allowedTools = filterToolsByDenyRules(
    getFileAndShellTools().filter((tool) => !isUnavailableShellTool(tool)),
    permissionContext,
  );
  let grantedTools =
    primitiveToolGrant === undefined
      ? allowedTools
      : allowedTools.filter((tool) => primitiveToolGrant.has(tool.name));
  let existingNames = new Set(tools.map((tool) => tool.name));
  let filtered = tools.filter(
    (tool) => !matchesToolName(tool, REPL_TOOL_NAME) && !isMultiEntryAliasTool(tool),
  );
  for (let tool of grantedTools) if (!existingNames.has(tool.name)) filtered.push(tool);
  return filtered;
}
//@ chunk-n51jggtb.js:38741-38763 placement
/**
 * MCP 工具错误的名字常量。
 */
var MCPTOOLERROR = "McpToolError";
//@ chunk-n51jggtb.js:38763-39016 placement
/**
 * MCP 工具调用失败时抛出的错误，携带工具名、消息与（JSON 时）解析后的 body。
 */
class McpToolError extends Error {
  toolName;
  error;
  detailJson;
  constructor(toolName, message) {
    super(message);
    this.name = MCPTOOLERROR;
    this.toolName = toolName;
    this.error = message;
    let detailJson;
    let trimmed = message.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("["))
      try {
        let parsed = jsonParse(trimmed);
        if (parsed !== null && typeof parsed === "object") detailJson = trimmed;
      } catch {}
    this.detailJson = detailJson;
  }
}
//@ chunk-n51jggtb.js:39016-39072 placement
/**
 * MCP 工具错误是否按抛出处理的开关。
 */
function mcpToolsThrow() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_repl_mcp_error_throw", true);
}
export {
  mcpToolsThrow,
  withShellTools,
  isUnavailableShellTool,
  stripStoredRemoteResult,
  McpToolError,
  MCPTOOLERROR,
};
