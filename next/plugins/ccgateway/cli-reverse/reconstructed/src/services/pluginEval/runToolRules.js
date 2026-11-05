/**
 * services/pluginEval/runToolRules.ts
 *
 * 2.1.316 新增：plugin eval 子会话的工具授权规则（allowed_tools、只读路径、/proc 拒绝等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { partitionAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { parseRuleString } from "../../utils/permissions/permissionRuleParser.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { mcpToolNames, PUBLISH_TOOL_NAMES, READ_TOOL_NAMES } from "../artifacts/artifactsMcpServer.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { validateWildcardToolName } from "../../utils/settings/permissionValidation.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { mcpRuleMatchesTool } from "../mcp/serverIdentity.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../../tools/EnterWorktreeTool/constants.js";
import { EXIT_WORKTREE_TOOL_NAME } from "../../tools/ExitWorktreeTool/constants.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { REFRESH_MCP_TOOLS_TOOL_NAME } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { getAllBaseTools } from "../../tools.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { toolMatchesAnyName } from "../tools/permissionCheckGuard.js";
import { isConversationEndTool } from "../../utils/permissions/permissions.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { toSandboxRulePath } from "./evalFence.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { LSP_TOOL_NAME } from "../../tools/LSPTool/UI.js";

//@ chunk-af1hzzme.js:120887-121045 placement
/**
 * 推测执行中允许的安全只读工具名集合。
 */
var ungatedToolNames = new Set([
  "Read",
  "Glob",
  "Grep",
  "NotebookRead",
  "Skill",
  "AskUserQuestion",
  "TaskCreate",
  "TaskGet",
  "TaskList",
  "TaskUpdate",
  "TaskStop",
  "Agent",
  "TodoWrite",
]);
//@ chunk-af1hzzme.js:121045-121856 placement
/**
 * 由用例的 allowed_tools 生成子会话的权限规则。
 */
function buildRunToolRules(allowedTools, allowTools, options = {}) {
  let allowed = [];
  let denied = [];
  let operatorRules = [];
  for (let entry of allowTools) {
    let rules = splitRuleList([entry]);
    if (rules.length === 0) continue;
    if (rules.every(isValidAllowedToolRule)) {
      let [worktreeRules, toolRules] = partitionAlias(rules, (rule) =>
        WORKTREE_TOOLS.includes(parseRuleString(rule).toolName),
      );
      denied.push(...worktreeRules);
      allowed.push(...toolRules);
      operatorRules.push(...toolRules.map(parseRuleString));
    } else denied.push(entry);
  }
  if (options.artifactPublishGranted) {
    allowed.push(ARTIFACT_TOOL_NAME);
    operatorRules.push(parseRuleString(ARTIFACT_TOOL_NAME));
    for (let toolName of mcpToolNames([...PUBLISH_TOOL_NAMES, ...READ_TOOL_NAMES])) {
      allowed.push(toolName);
      operatorRules.push(parseRuleString(toolName));
    }
  }
  for (let toolName of options.mockedTools ?? []) {
    allowed.push(toolName);
    operatorRules.push(parseRuleString(toolName));
  }
  for (let rule of splitRuleList([allowedTools.join(",")])) {
    if (!isValidAllowedToolRule(rule)) {
      denied.push(rule);
      continue;
    }
    let parsed = parseRuleString(rule);
    if (
      (READ_TOOLS.has(parsed.toolName) || WRITE_TOOLS.has(parsed.toolName)) &&
      parsed.ruleContent !== undefined &&
      !isRelativeRulePath(parsed.ruleContent) &&
      !operatorRules.some(
        (operatorRule) =>
          operatorRule.toolName === parsed.toolName && operatorRule.ruleContent === parsed.ruleContent,
      )
    )
      denied.push(rule);
    else if (ungatedToolNames.has(parsed.toolName)) allowed.push(rule);
    else if (!operatorRules.some((operatorRule) => rulesOverlap(operatorRule, parsed))) denied.push(rule);
  }
  let disallowedNames = new Set(options.disallowedTools);
  return {
    allowed: normalizeCaseForComparison_2(allowed).filter(
      (rule) => !disallowedNames.has(parseRuleString(rule).toolName),
    ),
    denied: normalizeCaseForComparison_2(denied),
  };
}
//@ chunk-af1hzzme.js:121856-121972 placement
function isValidAllowedToolRule(ruleString) {
  let { toolName, ruleContent } = parseRuleString(ruleString);
  return (
    !/[()]/.test(toolName) &&
    validateWildcardToolName(toolName) === null &&
    (ruleContent === undefined || mcpInfoFromString(toolName) === null)
  );
}
//@ chunk-af1hzzme.js:121972-122156 placement
function rulesOverlap(left, right) {
  if (
    mcpRuleMatchesTool(left.toolName, {
      name: right.toolName,
    })
  )
    return true;
  if (left.toolName !== right.toolName) return false;
  return (
    left.ruleContent === undefined ||
    right.ruleContent === undefined ||
    left.ruleContent === right.ruleContent
  );
}
//@ chunk-af1hzzme.js:150068-150112 placement
/**
 * MCP 控制类工具。
 */
var SHELL_TOOLS = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME];
var WORKTREE_TOOLS = [MONITOR, ENTER_WORKTREE_TOOL_NAME, EXIT_WORKTREE_TOOL_NAME];
var MCP_CONTROL_TOOLS = [WAITFORMCPSERVERS, REFRESH_MCP_TOOLS_TOOL_NAME, TOOL_SEARCH_TOOL_NAME];
//@ chunk-af1hzzme.js:150112-150168 placement
/**
 * 判断允许规则里是否已包含某工具。
 */
function hasToolRule(rules, toolName) {
  return rules.some((rule) => parseRuleString(rule).toolName === toolName);
}
//@ chunk-af1hzzme.js:150168-150328 placement
/**
 * 构建评测运行禁用的工具列表（未授权的写入类工具、固定禁用项与额外项）。
 */
function buildDisallowedTools(allowedTools, extraNames = []) {
  let disallowed = [];
  for (let shellTool of SHELL_TOOLS) if (!hasToolRule(allowedTools, shellTool)) disallowed.push(shellTool);
  disallowed.push(...WORKTREE_TOOLS);
  let known = new Set(disallowed);
  disallowed.push(...listUnlistedBaseTools(allowedTools).filter((toolName) => !known.has(toolName)));
  return normalizeCaseForComparison_2([...disallowed, ...extraNames]);
}
//@ chunk-af1hzzme.js:150328-150790 placement
/**
 * 列出不在允许集合中的内置工具名（允许集合含只读工具、规则中的工具、其 V1/族父工具及成组工具），用于子会话禁用。
 */
function listUnlistedBaseTools(allowedTools) {
  let allBaseTools = getAllBaseTools();
  let listedNames = new Set([...ungatedToolNames, ...READ_TOOLS, ...MCP_CONTROL_TOOLS]);
  for (let rule of allowedTools) listedNames.add(parseRuleString(rule).toolName);
  for (let baseTool of allBaseTools)
    if (listedNames.has(baseTool.name) && baseTool.underlyingV1ToolName !== undefined)
      listedNames.add(baseTool.underlyingV1ToolName);
  if ([...WRITE_TOOLS].some((writeTool) => listedNames.has(writeTool)))
    for (let writeTool of WRITE_TOOLS) listedNames.add(writeTool);
  if (SHELL_TOOLS.some((shellTool) => listedNames.has(shellTool))) listedNames.add(GET_TASK_TOOL_TEXT);
  let familyParents = new Set();
  for (let baseTool of allBaseTools)
    if (listedNames.has(baseTool.name) && baseTool.familyParentToolName !== undefined)
      familyParents.add(baseTool.familyParentToolName);
  return allBaseTools
    .filter(
      (baseTool) =>
        !toolMatchesAnyName(baseTool, listedNames) &&
        !familyParents.has(baseTool.name) &&
        !isConversationEndTool(baseTool),
    )
    .map((baseTool) => baseTool.name);
}
//@ chunk-af1hzzme.js:150790-151048 placement
/**
 * 把评测允许的工具规则拆分为内置工具与其他工具。
 */
function splitAllowedTools(rules) {
  let allBaseTools = getAllBaseTools();
  let knownTools = new Set([
    ...allBaseTools.filter((baseTool) => !isConversationEndTool(baseTool)).map((baseTool) => baseTool.name),
    ...ungatedToolNames,
    ...SHELL_TOOLS,
    ...WORKTREE_TOOLS,
  ]);
  let tools = [];
  let rejected = [];
  for (let rule of splitRuleList([...rules])) {
    let parsed = parseRuleString(rule);
    if (parsed.ruleContent === undefined && knownTools.has(parsed.toolName)) tools.push(parsed.toolName);
    else rejected.push(rule);
  }
  return {
    tools: normalizeCaseForComparison_2(tools),
    rejected: normalizeCaseForComparison_2(rejected),
  };
}
//@ chunk-af1hzzme.js:151048-151075 placement
/**
 * 写入类工具集合。
 */
var WRITE_TOOLS = new Set([FILE_WRITE_TOOL_NAME, EDIT, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-af1hzzme.js:151075-151333 placement
/**
 * 把写入类工具的无参数规则限定到评测工作目录内。
 */
function scopeWriteToolRules(rules, writeRoots) {
  let writeToolNames = new Set();
  let kept = [];
  for (let rule of rules) {
    let parsed = parseRuleString(rule);
    if (parsed.ruleContent === undefined && WRITE_TOOLS.has(parsed.toolName)) {
      writeToolNames.add(parsed.toolName);
      continue;
    }
    kept.push(rule);
  }
  if (writeToolNames.size === 0) return kept;
  let flattened = writeRoots.flatMap((dir) =>
    normalizeCaseForComparison_2([EDIT, ...writeToolNames]).map(
      (toolName) => `${toolName}(${toSandboxRulePath(dir)}/**)`,
    ),
  );
  return normalizeCaseForComparison_2([...kept, ...flattened]);
}
//@ chunk-af1hzzme.js:151333-151385 placement
/**
 * 禁止读取 /proc 的规则。
 */
var READ_TOOLS = new Set([READ, GLOB_TOOL_NAME, GREP_TOOL_NAME, LSP_TOOL_NAME]);
var PROC_READ_RULE = `${READ}(//proc/**)`;
//@ chunk-af1hzzme.js:151385-151661 placement
/**
 * 把读写工具规则中的相对路径锚定到评测根目录（单层名字前加 **\/）。
 */
function anchorRelativeRules(rules, cwd) {
  return rules.map((rule) => {
    let parsed = parseRuleString(rule);
    if (
      (READ_TOOLS.has(parsed.toolName) || WRITE_TOOLS.has(parsed.toolName)) &&
      parsed.ruleContent !== undefined &&
      isRelativeRulePath(parsed.ruleContent)
    ) {
      let replaced = parsed.ruleContent.replace(/^\.\/+/, "");
      let isSingleSegment = !replaced.replace(/\/+$/, "").includes("/");
      return `${parsed.toolName}(${toSandboxRulePath(cwd)}/${isSingleSegment ? "**/" : ""}${replaced})`;
    }
    return rule;
  });
}
//@ chunk-af1hzzme.js:151661-151799 placement
function isRelativeRulePath(ruleContent) {
  return (
    !ruleContent.startsWith("/") &&
    !ruleContent.startsWith("~") &&
    !ruleContent.startsWith("\\") &&
    !/^[A-Za-z]:/.test(ruleContent) &&
    !ruleContent.split(/[\\/]/).includes("..")
  );
}
//@ chunk-af1hzzme.js:151799-152071 placement
/**
 * 把读取类工具的无参数规则限定到允许的目录。
 */
function scopeReadToolRules(rules, readRoots, readFiles = []) {
  let hasBareReadTool = false;
  let kept = [];
  for (let rule of rules) {
    let parsed = parseRuleString(rule);
    if (parsed.ruleContent === undefined && READ_TOOLS.has(parsed.toolName)) {
      hasBareReadTool = true;
      continue;
    }
    kept.push(rule);
  }
  if (!hasBareReadTool) return kept;
  let flattened = readRoots.flatMap((dir) =>
    [READ, GLOB_TOOL_NAME, GREP_TOOL_NAME].map((toolName) => `${toolName}(${toSandboxRulePath(dir)}/**)`),
  );
  let mapped = readFiles.map((filePath) => `${READ}(${toSandboxRulePath(filePath)})`);
  return normalizeCaseForComparison_2([...kept, ...flattened, ...mapped]);
}
//@ chunk-af1hzzme.js:152071-152097 placement
/**
 * 规则内容里需要特殊处理的正则元字符。
 */
var RULE_META_CHARS_RE = /[()\[\]{}*?!#\\]/;
export {
  SHELL_TOOLS,
  hasToolRule,
  scopeWriteToolRules,
  scopeReadToolRules,
  anchorRelativeRules,
  PROC_READ_RULE,
  buildDisallowedTools,
  RULE_META_CHARS_RE,
  buildRunToolRules,
  WORKTREE_TOOLS,
  splitAllowedTools,
};
