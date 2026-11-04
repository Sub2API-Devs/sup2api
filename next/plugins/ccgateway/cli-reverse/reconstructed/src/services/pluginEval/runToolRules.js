/**
 * services/pluginEval/runToolRules.ts
 *
 * 2.1.316 新增：plugin eval 子会话的工具授权规则（allowed_tools、只读路径、/proc 拒绝等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (16)
 * attribution: placement 16
 */
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import { partitionAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { mcpToolNames, PUBLISH_TOOL_NAMES, READ_TOOL_NAMES } from "../artifacts/artifactsMcpServer.js";
import { uniq } from "../../utils/collections.js";
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
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { toSandboxRulePath } from "./evalFence.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { LSP_TOOL_NAME } from "../../tools/LSPTool/UI.js";

//@ chunk-qchp9vrd.js:119534-119692 placement (2.1.88 match: SAFE_READ_ONLY_TOOLS, 0.494)
/**
 * 推测执行中允许的安全只读工具名集合。
 */
var SAFE_READ_ONLY_TOOLS = new Set([
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
//@ chunk-qchp9vrd.js:119692-120503 placement
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
        WORKTREE_TOOLS.includes(permissionRuleValueFromString(rule).toolName),
      );
      denied.push(...worktreeRules);
      allowed.push(...toolRules);
      operatorRules.push(...toolRules.map(permissionRuleValueFromString));
    } else denied.push(entry);
  }
  if (options.artifactPublishGranted) {
    allowed.push(ARTIFACT_TOOL_NAME);
    operatorRules.push(permissionRuleValueFromString(ARTIFACT_TOOL_NAME));
    for (let toolName of mcpToolNames([...PUBLISH_TOOL_NAMES, ...READ_TOOL_NAMES])) {
      allowed.push(toolName);
      operatorRules.push(permissionRuleValueFromString(toolName));
    }
  }
  for (let toolName of options.mockedTools ?? []) {
    allowed.push(toolName);
    operatorRules.push(permissionRuleValueFromString(toolName));
  }
  for (let rule of splitRuleList([allowedTools.join(",")])) {
    if (!isValidAllowedToolRule(rule)) {
      denied.push(rule);
      continue;
    }
    let parsed = permissionRuleValueFromString(rule);
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
    else if (SAFE_READ_ONLY_TOOLS.has(parsed.toolName)) allowed.push(rule);
    else if (!operatorRules.some((operatorRule) => rulesOverlap(operatorRule, parsed))) denied.push(rule);
  }
  let disallowedNames = new Set(options.disallowedTools);
  return {
    allowed: uniq(allowed).filter(
      (rule) => !disallowedNames.has(permissionRuleValueFromString(rule).toolName),
    ),
    denied: uniq(denied),
  };
}
//@ chunk-qchp9vrd.js:120503-120619 placement
function isValidAllowedToolRule(ruleString) {
  let { toolName, ruleContent } = permissionRuleValueFromString(ruleString);
  return (
    !/[()]/.test(toolName) &&
    validateWildcardToolName(toolName) === null &&
    (ruleContent === undefined || mcpInfoFromString(toolName) === null)
  );
}
//@ chunk-qchp9vrd.js:120619-120803 placement
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
//@ chunk-qchp9vrd.js:148702-148746 placement
/**
 * MCP 控制类工具。
 */
var SHELL_TOOLS = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME];
var WORKTREE_TOOLS = [MONITOR, ENTER_WORKTREE_TOOL_NAME, EXIT_WORKTREE_TOOL_NAME];
var MCP_CONTROL_TOOLS = [WAITFORMCPSERVERS, REFRESH_MCP_TOOLS_TOOL_NAME, TOOL_SEARCH_TOOL_NAME];
//@ chunk-qchp9vrd.js:148746-148802 placement
/**
 * 判断允许规则里是否已包含某工具。
 */
function hasToolRule(rules, toolName) {
  return rules.some((rule) => permissionRuleValueFromString(rule).toolName === toolName);
}
//@ chunk-qchp9vrd.js:148802-148962 placement
/**
 * 构建评测运行禁用的工具列表（未授权的写入类工具、固定禁用项与额外项）。
 */
function buildDisallowedTools(allowedTools, extraNames = []) {
  let disallowed = [];
  for (let shellTool of SHELL_TOOLS) if (!hasToolRule(allowedTools, shellTool)) disallowed.push(shellTool);
  disallowed.push(...WORKTREE_TOOLS);
  let known = new Set(disallowed);
  disallowed.push(...listUnlistedBaseTools(allowedTools).filter((toolName) => !known.has(toolName)));
  return uniq([...disallowed, ...extraNames]);
}
//@ chunk-qchp9vrd.js:148962-149424 placement
/**
 * 列出不在允许集合中的内置工具名（允许集合含只读工具、规则中的工具、其 V1/族父工具及成组工具），用于子会话禁用。
 */
function listUnlistedBaseTools(allowedTools) {
  let allBaseTools = getAllBaseTools();
  let listedNames = new Set([...SAFE_READ_ONLY_TOOLS, ...READ_TOOLS, ...MCP_CONTROL_TOOLS]);
  for (let rule of allowedTools) listedNames.add(permissionRuleValueFromString(rule).toolName);
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
//@ chunk-qchp9vrd.js:149424-149682 placement
/**
 * 把评测允许的工具规则拆分为内置工具与其他工具。
 */
function splitAllowedTools(rules) {
  let allBaseTools = getAllBaseTools();
  let knownTools = new Set([
    ...allBaseTools.filter((baseTool) => !isConversationEndTool(baseTool)).map((baseTool) => baseTool.name),
    ...SAFE_READ_ONLY_TOOLS,
    ...SHELL_TOOLS,
    ...WORKTREE_TOOLS,
  ]);
  let tools = [];
  let rejected = [];
  for (let rule of splitRuleList([...rules])) {
    let parsed = permissionRuleValueFromString(rule);
    if (parsed.ruleContent === undefined && knownTools.has(parsed.toolName)) tools.push(parsed.toolName);
    else rejected.push(rule);
  }
  return {
    tools: uniq(tools),
    rejected: uniq(rejected),
  };
}
//@ chunk-qchp9vrd.js:149682-149709 placement
/**
 * 写入类工具集合。
 */
var WRITE_TOOLS = new Set([FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-qchp9vrd.js:149709-149967 placement
/**
 * 把写入类工具的无参数规则限定到评测工作目录内。
 */
function scopeWriteToolRules(rules, writeRoots) {
  let writeToolNames = new Set();
  let kept = [];
  for (let rule of rules) {
    let parsed = permissionRuleValueFromString(rule);
    if (parsed.ruleContent === undefined && WRITE_TOOLS.has(parsed.toolName)) {
      writeToolNames.add(parsed.toolName);
      continue;
    }
    kept.push(rule);
  }
  if (writeToolNames.size === 0) return kept;
  let flattened = writeRoots.flatMap((dir) =>
    uniq([FILE_EDIT_TOOL_NAME, ...writeToolNames]).map(
      (toolName) => `${toolName}(${toSandboxRulePath(dir)}/**)`,
    ),
  );
  return uniq([...kept, ...flattened]);
}
//@ chunk-qchp9vrd.js:149967-150019 placement
/**
 * 禁止读取 /proc 的规则。
 */
var READ_TOOLS = new Set([FILE_READ_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME, LSP_TOOL_NAME]);
var PROC_READ_RULE = `${FILE_READ_TOOL_NAME}(//proc/**)`;
//@ chunk-qchp9vrd.js:150019-150295 placement
/**
 * 把读写工具规则中的相对路径锚定到评测根目录（单层名字前加 **\/）。
 */
function anchorRelativeRules(rules, cwd) {
  return rules.map((rule) => {
    let parsed = permissionRuleValueFromString(rule);
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
//@ chunk-qchp9vrd.js:150295-150433 placement
function isRelativeRulePath(ruleContent) {
  return (
    !ruleContent.startsWith("/") &&
    !ruleContent.startsWith("~") &&
    !ruleContent.startsWith("\\") &&
    !/^[A-Za-z]:/.test(ruleContent) &&
    !ruleContent.split(/[\\/]/).includes("..")
  );
}
//@ chunk-qchp9vrd.js:150433-150705 placement
/**
 * 把读取类工具的无参数规则限定到允许的目录。
 */
function scopeReadToolRules(rules, readRoots, readFiles = []) {
  let hasBareReadTool = false;
  let kept = [];
  for (let rule of rules) {
    let parsed = permissionRuleValueFromString(rule);
    if (parsed.ruleContent === undefined && READ_TOOLS.has(parsed.toolName)) {
      hasBareReadTool = true;
      continue;
    }
    kept.push(rule);
  }
  if (!hasBareReadTool) return kept;
  let flattened = readRoots.flatMap((dir) =>
    [FILE_READ_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME].map(
      (toolName) => `${toolName}(${toSandboxRulePath(dir)}/**)`,
    ),
  );
  let mapped = readFiles.map((filePath) => `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(filePath)})`);
  return uniq([...kept, ...flattened, ...mapped]);
}
//@ chunk-qchp9vrd.js:150705-150731 placement
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
