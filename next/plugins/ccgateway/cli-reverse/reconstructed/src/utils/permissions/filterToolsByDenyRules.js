/**
 * utils/permissions/filterToolsByDenyRules.ts
 *
 * 按 deny 规则与启动时的 --tools 列表过滤工具；识别以 Bash 身份运行代码的工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (13)
 * attribution: placement 13
 */
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { registerMcpStandardKeys, isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import {
  getDenyRules,
  buildDenyRuleIndex,
  isConversationEndTool,
  isToolDeniedByIndex,
  getDenyRuleForTool,
  getAskRules,
  isWildcardOnlyContent,
} from "./permissions.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logForDebugging } from "../debug.js";
import { toolCategoryForTelemetry } from "../../services/api/toolDefinitionShape.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { isMcpTool } from "../../services/mcp/utils.js";
import { toolByAlias } from "../../services/tools/batchTools.js";
import { getToolsOmittedByLaunchList } from "../../bootstrap/state.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isCodeExecutionTool } from "../../services/mcp/redactMcpErrors.js";

//@ chunk-a76knw89.js:38928-39023 placement
/**
 * 能执行代码的工具名集合：声明 enablesCodeExecution 的工具，加上 PowerShell 工具。
 */
function codeExecutionToolNames(allBaseTools) {
  return new Set([
    ...allBaseTools.filter((tool) => tool.enablesCodeExecution).map((tool) => tool.name),
    POWERSHELL_TOOL_NAME,
  ]);
}
//@ chunk-a76knw89.js:39023-39092 placement
/**
 * 默认预设工具名：当前启用的工具名列表。
 */
function defaultPresetToolNames(tools) {
  return tools.filter((tool) => tool.isEnabled()).map((tool) => tool.name);
}
//@ chunk-a76knw89.js:39092-39574 placement
/**
 * 按 deny 规则过滤工具池：整工具 deny、MCP effectiveMaxPermission 为 blocked、标准键 MCP 在不支持时、不在 --tools 启动清单内的工具都去掉；后者每个工具告警一次并上报 tengu_tool_withheld_outside_launch_list。
 */
function filterToolsByDenyRules(tools, toolPermissionContext) {
  let standardKeysRegistered = registerMcpStandardKeys(tools);
  let denyRules = [
    ...getDenyRules(toolPermissionContext),
    ...isNarrowedByToolsFlag(tools, toolPermissionContext),
  ];
  let denyIndex = buildDenyRuleIndex(toolPermissionContext, denyRules);
  return tools.filter((tool) => {
    if (
      isToolDenied(toolPermissionContext, tool, denyRules, denyIndex) ||
      tool.mcpInfo?.effectiveMaxPermission === "blocked" ||
      (!standardKeysRegistered && tool.mcpInfo?.standardKey !== undefined)
    )
      return false;
    if (!isOutsideLaunchToolList(toolPermissionContext, tool)) return true;
    if (claimOnce().claim(`tool_outside_launch_list:${tool.name}`)) {
      logForDebugging(
        `${toolCategoryForTelemetry(tool)} is not on this session's --tools list and no deny rule names it; withheld. Name it in --tools to offer it`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_tool_withheld_outside_launch_list", {
        toolName: sanitizeToolNameForAnalytics(toolCategoryForTelemetry(tool)),
      });
    }
    return false;
  });
}
//@ chunk-a76knw89.js:39574-39766 placement
/**
 * 工具是否在 --tools 启动清单之外：有清单，且不是必需工具、MCP、特殊工具，也不在清单（或其父工具名不在清单）内。
 */
function isOutsideLaunchToolList({ toolsKeptByLaunchList }, tool) {
  return !(
    toolsKeptByLaunchList === undefined ||
    isMcpTool(tool) ||
    tool.mcpInfo !== undefined ||
    isHostOnlyNativeTool(tool) ||
    isConversationEndTool(tool) ||
    toolsKeptByLaunchList.includes(tool.name) ||
    (tool.familyParentToolName !== undefined && toolsKeptByLaunchList.includes(tool.familyParentToolName))
  );
}
//@ chunk-a76knw89.js:39766-39813 placement
function isToolDroppedByDenyRules(
  toolPermissionContext,
  tool,
  denyRules = getDenyRules(toolPermissionContext),
  denyIndex,
) {
  return isToolDenied(toolPermissionContext, tool, denyRules, denyIndex);
}
//@ chunk-a76knw89.js:39813-40162 placement
/**
 * 工具是否被 deny 规则拒绝：本身、底层 v1 工具名、启用的别名工具、以 Bash 身份运行代码的工具命中 Bash 规则等。
 */
function isToolDenied(toolPermissionContext, tool, denyRules, denyIndex) {
  let isCandidateDenied = (candidate) =>
    denyIndex !== undefined
      ? isToolDeniedByIndex(toolPermissionContext, denyIndex, candidate)
      : getDenyRuleForTool(toolPermissionContext, candidate, denyRules) !== null;
  if (isCandidateDenied(tool)) return true;
  if (
    tool.underlyingV1ToolName &&
    isCandidateDenied({
      name: tool.underlyingV1ToolName,
    })
  )
    return true;
  if (tool.mcpInfo === undefined) {
    let aliasTool = toolByAlias(tool.name);
    if (aliasTool !== undefined && isCandidateDenied(aliasTool) && aliasTool.isEnabled()) return true;
  }
  if (isHostOnlyNativeTool(tool) && deniesWholeBashTool(toolPermissionContext, denyRules)) return true;
  if (
    tool.mcpInfo === undefined &&
    toolsRunningCodeAsBash().includes(tool.name) &&
    findBashRule(toolPermissionContext, denyRules) !== null
  )
    return true;
  return false;
}
//@ chunk-a76knw89.js:40162-40306 placement
/**
 * 工具是否因启动清单被省略（而不是被 deny 规则拒绝）：属于可省略集合、非 HIPAA，且去掉 toolsNarrowing 来源后不被 deny 规则拒绝。
 */
function isToolOmittedByLaunchToolList(toolPermissionContext, tool) {
  if (!getToolsOmittedByLaunchList().has(tool.name)) return false;
  if (hasComplianceTaint("hipaa")) return false;
  let filtered = getDenyRules(toolPermissionContext).filter((rule) => rule.source !== "toolsNarrowing");
  return !isToolDroppedByDenyRules(toolPermissionContext, tool, filtered);
}
//@ chunk-a76knw89.js:40306-40369 placement
function deniesWholeBashTool(toolPermissionContext, rules) {
  return rules.some((rule) => rule.ruleValue.toolName === BASH_TOOL_NAME);
}
//@ chunk-a76knw89.js:40369-40450 placement
/**
 * 以 Bash 方式运行代码的工具名：PowerShell 工具与 Artifact REPL 工具。
 */
function toolsRunningCodeAsBash() {
  return [MONITOR, require("../../tools/AppifactReplTool/prompt.js").APPIFACT_REPL_TOOL_NAME];
}
//@ chunk-a76knw89.js:40450-40523 placement
function findBashRule(toolPermissionContext, rules) {
  return findBashRuleInList(
    toolPermissionContext,
    rules.filter((rule) => rule.source !== "toolsNarrowing"),
  );
}
//@ chunk-a76knw89.js:40523-40935 placement
/**
 * 运行代码的工具（如 Monitor）沿用 Bash 的 deny/ask 规则：命中 Bash deny 则拒绝，命中 ask 则确认。
 */
function wholeBashRuleVerdict(toolPermissionContext, toolName) {
  let bashRule = findBashRule(toolPermissionContext, getDenyRules(toolPermissionContext));
  if (bashRule !== null)
    return {
      rule: bashRule,
      verdict: {
        behavior: "deny",
        message: `Permission to use ${toolName} has been denied: it runs code as ${BASH_TOOL_NAME} does, and a rule denies ${BASH_TOOL_NAME}.`,
        decisionReason: {
          type: "rule",
          rule: bashRule,
        },
      },
    };
  let bashRule_2 = findBashRule(toolPermissionContext, getAskRules(toolPermissionContext));
  return bashRule_2 === null
    ? null
    : {
        rule: bashRule_2,
        verdict: {
          behavior: "ask",
          message: `${toolName} runs code as ${BASH_TOOL_NAME} does, and a rule asks before ${BASH_TOOL_NAME} runs.`,
          decisionReason: {
            type: "rule",
            rule: bashRule_2,
          },
        },
      };
}
//@ chunk-a76knw89.js:40935-41189 placement = getDenyRuleForAgent (0.778)
function findBashRuleInList(toolPermissionContext, rules) {
  let bashAlias = toolPermissionContext.toolAliases?.[BASH_TOOL_NAME];
  let names = [BASH_TOOL_NAME, ...(bashAlias !== undefined ? [bashAlias] : [])];
  for (let name of names) {
    let denyRuleForTool = getDenyRuleForTool(
      toolPermissionContext,
      {
        name,
      },
      rules,
    );
    if (denyRuleForTool !== null) return denyRuleForTool;
  }
  return (
    rules.find(
      (rule) =>
        names.includes(rule.ruleValue.toolName) &&
        rule.ruleValue.ruleContent !== undefined &&
        isWildcardOnlyContent(rule.ruleValue.ruleContent),
    ) ?? null
  );
}
//@ chunk-a76knw89.js:41189-41458 placement
function isNarrowedByToolsFlag(tools, { restricted, toolsKeptByLaunchList }) {
  if (!(restricted === true && toolsKeptByLaunchList === undefined)) return [];
  let codeExecutionToolNames = new Set([
    ...tools.filter((tool) => tool.enablesCodeExecution).map((tool) => tool.name),
    POWERSHELL_TOOL_NAME,
  ]);
  return isCodeExecutionTool(codeExecutionToolNames, new Set()).map((toolName) => ({
    source: "toolsNarrowing",
    ruleBehavior: "deny",
    ruleValue: {
      toolName,
    },
  }));
}
export {
  toolsRunningCodeAsBash,
  filterToolsByDenyRules,
  defaultPresetToolNames,
  codeExecutionToolNames,
  isToolDroppedByDenyRules,
  isToolOmittedByLaunchToolList,
  isOutsideLaunchToolList,
  wholeBashRuleVerdict,
};
