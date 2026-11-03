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
    ...allBaseTools.filter((n) => n.enablesCodeExecution).map((n) => n.name),
    POWERSHELL_TOOL_NAME,
  ]);
}
//@ chunk-a76knw89.js:39023-39092 placement
/**
 * 默认预设工具名：当前启用的工具名列表。
 */
function defaultPresetToolNames(e) {
  return e.filter((n) => n.isEnabled()).map((n) => n.name);
}
//@ chunk-a76knw89.js:39092-39574 placement
/**
 * 按 deny 规则过滤工具池：整工具 deny、MCP effectiveMaxPermission 为 blocked、标准键 MCP 在不支持时、不在 --tools 启动清单内的工具都去掉；后者每个工具告警一次并上报 tengu_tool_withheld_outside_launch_list。
 */
function filterToolsByDenyRules(e, n) {
  let o = registerMcpStandardKeys(e);
  let r = [...getDenyRules(n), ...isNarrowedByToolsFlag(e, n)];
  let denyRuleIndex = buildDenyRuleIndex(n, r);
  return e.filter((s) => {
    if (
      isToolDenied(n, s, r, denyRuleIndex) ||
      s.mcpInfo?.effectiveMaxPermission === "blocked" ||
      (!o && s.mcpInfo?.standardKey !== undefined)
    )
      return false;
    if (!isOutsideLaunchToolList(n, s)) return true;
    if (claimOnce().claim(`tool_outside_launch_list:${s.name}`)) {
      logForDebugging(
        `${toolCategoryForTelemetry(s)} is not on this session's --tools list and no deny rule names it; withheld. Name it in --tools to offer it`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_tool_withheld_outside_launch_list", {
        toolName: sanitizeToolNameForAnalytics(toolCategoryForTelemetry(s)),
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
function isToolDroppedByDenyRules(e, n, rules = getDenyRules(e), index) {
  return isToolDenied(e, n, rules, index);
}
//@ chunk-a76knw89.js:39813-40162 placement
/**
 * 工具是否被 deny 规则拒绝：本身、底层 v1 工具名、启用的别名工具、以 Bash 身份运行代码的工具命中 Bash 规则等。
 */
function isToolDenied(e, n, o, r) {
  let c = (s) => (r !== undefined ? isToolDeniedByIndex(e, r, s) : getDenyRuleForTool(e, s, o) !== null);
  if (c(n)) return true;
  if (
    n.underlyingV1ToolName &&
    c({
      name: n.underlyingV1ToolName,
    })
  )
    return true;
  if (n.mcpInfo === undefined) {
    let s = toolByAlias(n.name);
    if (s !== undefined && c(s) && s.isEnabled()) return true;
  }
  if (isHostOnlyNativeTool(n) && deniesWholeBashTool(e, o)) return true;
  if (n.mcpInfo === undefined && toolsRunningCodeAsBash().includes(n.name) && findBashRule(e, o) !== null)
    return true;
  return false;
}
//@ chunk-a76knw89.js:40162-40306 placement
/**
 * 工具是否因启动清单被省略（而不是被 deny 规则拒绝）：属于可省略集合、非 HIPAA，且去掉 toolsNarrowing 来源后不被 deny 规则拒绝。
 */
function isToolOmittedByLaunchToolList(e, n) {
  if (!getToolsOmittedByLaunchList().has(n.name)) return false;
  if (hasComplianceTaint("hipaa")) return false;
  let filtered = getDenyRules(e).filter((r) => r.source !== "toolsNarrowing");
  return !isToolDroppedByDenyRules(e, n, filtered);
}
//@ chunk-a76knw89.js:40306-40369 placement
function deniesWholeBashTool(e, n) {
  return n.some((o) => o.ruleValue.toolName === BASH_TOOL_NAME);
}
//@ chunk-a76knw89.js:40369-40450 placement
/**
 * 以 Bash 方式运行代码的工具名：PowerShell 工具与 Artifact REPL 工具。
 */
function toolsRunningCodeAsBash() {
  return [MONITOR, require("./chunk-q973gz0n.js").APPIFACT_REPL_TOOL_NAME];
}
//@ chunk-a76knw89.js:40450-40523 placement
function findBashRule(e, n) {
  return findBashRuleInList(
    e,
    n.filter((o) => o.source !== "toolsNarrowing"),
  );
}
//@ chunk-a76knw89.js:40523-40935 placement
/**
 * 运行代码的工具（如 Monitor）沿用 Bash 的 deny/ask 规则：命中 Bash deny 则拒绝，命中 ask 则确认。
 */
function wholeBashRuleVerdict(e, n) {
  let bashRule = findBashRule(e, getDenyRules(e));
  if (bashRule !== null)
    return {
      rule: bashRule,
      verdict: {
        behavior: "deny",
        message: `Permission to use ${n} has been denied: it runs code as ${BASH_TOOL_NAME} does, and a rule denies ${BASH_TOOL_NAME}.`,
        decisionReason: {
          type: "rule",
          rule: bashRule,
        },
      },
    };
  let bashRule_2 = findBashRule(e, getAskRules(e));
  return bashRule_2 === null
    ? null
    : {
        rule: bashRule_2,
        verdict: {
          behavior: "ask",
          message: `${n} runs code as ${BASH_TOOL_NAME} does, and a rule asks before ${BASH_TOOL_NAME} runs.`,
          decisionReason: {
            type: "rule",
            rule: bashRule_2,
          },
        },
      };
}
//@ chunk-a76knw89.js:40935-41189 placement = getDenyRuleForAgent (0.778)
function findBashRuleInList(e, n) {
  let o = e.toolAliases?.[BASH_TOOL_NAME];
  let r = [BASH_TOOL_NAME, ...(o !== undefined ? [o] : [])];
  for (let name of r) {
    let denyRuleForTool = getDenyRuleForTool(
      e,
      {
        name,
      },
      n,
    );
    if (denyRuleForTool !== null) return denyRuleForTool;
  }
  return (
    n.find(
      (rule) =>
        r.includes(rule.ruleValue.toolName) &&
        rule.ruleValue.ruleContent !== undefined &&
        isWildcardOnlyContent(rule.ruleValue.ruleContent),
    ) ?? null
  );
}
//@ chunk-a76knw89.js:41189-41458 placement
function isNarrowedByToolsFlag(e, { restricted, toolsKeptByLaunchList }) {
  if (!(restricted === true && toolsKeptByLaunchList === undefined)) return [];
  let r = new Set([...e.filter((c) => c.enablesCodeExecution).map((c) => c.name), POWERSHELL_TOOL_NAME]);
  return isCodeExecutionTool(r, new Set()).map((toolName) => ({
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
