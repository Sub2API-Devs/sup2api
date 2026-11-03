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
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-qchp9vrd.js:119534-119692 placement = SAFE_READ_ONLY_TOOLS (0.494)
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
function buildRunToolRules(allowedTools, allowTools, r = {}) {
  let a = [];
  let s = [];
  let h = [];
  for (let b of allowTools) {
    let y = splitRuleList([b]);
    if (y.length === 0) continue;
    if (y.every(isValidAllowedToolRule)) {
      let [R, S] = SS(y, (T) => WORKTREE_TOOLS.includes(permissionRuleValueFromString(T).toolName));
      s.push(...R);
      a.push(...S);
      h.push(...S.map(permissionRuleValueFromString));
    } else s.push(b);
  }
  if (r.artifactPublishGranted) {
    a.push(ARTIFACT_TOOL_NAME);
    h.push(permissionRuleValueFromString(ARTIFACT_TOOL_NAME));
    for (let b of mcpToolNames([...PUBLISH_TOOL_NAMES, ...READ_TOOL_NAMES])) {
      a.push(b);
      h.push(permissionRuleValueFromString(b));
    }
  }
  for (let b of r.mockedTools ?? []) {
    a.push(b);
    h.push(permissionRuleValueFromString(b));
  }
  for (let b of splitRuleList([allowedTools.join(",")])) {
    if (!isValidAllowedToolRule(b)) {
      s.push(b);
      continue;
    }
    let y = permissionRuleValueFromString(b);
    if (
      (READ_TOOLS.has(y.toolName) || WRITE_TOOLS.has(y.toolName)) &&
      y.ruleContent !== undefined &&
      !isRelativeRulePath(y.ruleContent) &&
      !h.some((R) => R.toolName === y.toolName && R.ruleContent === y.ruleContent)
    )
      s.push(b);
    else if (SAFE_READ_ONLY_TOOLS.has(y.toolName)) a.push(b);
    else if (!h.some((R) => rulesOverlap(R, y))) s.push(b);
  }
  let w = new Set(r.disallowedTools);
  return {
    allowed: uniq(a).filter((b) => !w.has(permissionRuleValueFromString(b).toolName)),
    denied: uniq(s),
  };
}
//@ chunk-qchp9vrd.js:120503-120619 placement
function isValidAllowedToolRule(e) {
  let { toolName, ruleContent } = permissionRuleValueFromString(e);
  return (
    !/[()]/.test(toolName) &&
    validateWildcardToolName(toolName) === null &&
    (ruleContent === undefined || mcpInfoFromString(toolName) === null)
  );
}
//@ chunk-qchp9vrd.js:120619-120803 placement
function rulesOverlap(e, n) {
  if (
    mcpRuleMatchesTool(e.toolName, {
      name: n.toolName,
    })
  )
    return true;
  if (e.toolName !== n.toolName) return false;
  return e.ruleContent === undefined || n.ruleContent === undefined || e.ruleContent === n.ruleContent;
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
function hasToolRule(e, n) {
  return e.some((r) => permissionRuleValueFromString(r).toolName === n);
}
//@ chunk-qchp9vrd.js:148802-148962 placement
/**
 * 构建评测运行禁用的工具列表（未授权的写入类工具、固定禁用项与额外项）。
 */
function buildDisallowedTools(e, n = []) {
  let r = [];
  for (let s of SHELL_TOOLS) if (!hasToolRule(e, s)) r.push(s);
  r.push(...WORKTREE_TOOLS);
  let a = new Set(r);
  r.push(...listUnlistedBaseTools(e).filter((s) => !a.has(s)));
  return uniq([...r, ...n]);
}
//@ chunk-qchp9vrd.js:148962-149424 placement
/**
 * 列出不在允许集合中的内置工具名（允许集合含只读工具、规则中的工具、其 V1/族父工具及成组工具），用于子会话禁用。
 */
function listUnlistedBaseTools(e) {
  let allBaseTools = getAllBaseTools();
  let r = new Set([...SAFE_READ_ONLY_TOOLS, ...READ_TOOLS, ...MCP_CONTROL_TOOLS]);
  for (let s of e) r.add(permissionRuleValueFromString(s).toolName);
  for (let baseTool of allBaseTools)
    if (r.has(baseTool.name) && baseTool.underlyingV1ToolName !== undefined)
      r.add(baseTool.underlyingV1ToolName);
  if ([...WRITE_TOOLS].some((s) => r.has(s))) for (let s of WRITE_TOOLS) r.add(s);
  if (SHELL_TOOLS.some((s) => r.has(s))) r.add(GET_TASK_TOOL_TEXT);
  let a = new Set();
  for (let baseTool of allBaseTools)
    if (r.has(baseTool.name) && baseTool.familyParentToolName !== undefined)
      a.add(baseTool.familyParentToolName);
  return allBaseTools
    .filter(
      (baseTool) =>
        !toolMatchesAnyName(baseTool, r) && !a.has(baseTool.name) && !isConversationEndTool(baseTool),
    )
    .map((baseTool) => baseTool.name);
}
//@ chunk-qchp9vrd.js:149424-149682 placement
/**
 * 把评测允许的工具规则拆分为内置工具与其他工具。
 */
function splitAllowedTools(e) {
  let allBaseTools = getAllBaseTools();
  let r = new Set([
    ...allBaseTools.filter((baseTool) => !isConversationEndTool(baseTool)).map((baseTool) => baseTool.name),
    ...SAFE_READ_ONLY_TOOLS,
    ...SHELL_TOOLS,
    ...WORKTREE_TOOLS,
  ]);
  let a = [];
  let s = [];
  for (let h of splitRuleList([...e])) {
    let w = permissionRuleValueFromString(h);
    if (w.ruleContent === undefined && r.has(w.toolName)) a.push(w.toolName);
    else s.push(h);
  }
  return {
    tools: uniq(a),
    rejected: uniq(s),
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
function scopeWriteToolRules(e, n) {
  let r = new Set();
  let a = [];
  for (let h of e) {
    let w = permissionRuleValueFromString(h);
    if (w.ruleContent === undefined && WRITE_TOOLS.has(w.toolName)) {
      r.add(w.toolName);
      continue;
    }
    a.push(h);
  }
  if (r.size === 0) return a;
  let flattened = n.flatMap((h) =>
    uniq([FILE_EDIT_TOOL_NAME, ...r]).map((w) => `${w}(${toSandboxRulePath(h)}/**)`),
  );
  return uniq([...a, ...flattened]);
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
function anchorRelativeRules(e, cwd) {
  return e.map((r) => {
    let a = permissionRuleValueFromString(r);
    if (
      (READ_TOOLS.has(a.toolName) || WRITE_TOOLS.has(a.toolName)) &&
      a.ruleContent !== undefined &&
      isRelativeRulePath(a.ruleContent)
    ) {
      let replaced = a.ruleContent.replace(/^\.\/+/, "");
      let h = !replaced.replace(/\/+$/, "").includes("/");
      return `${a.toolName}(${toSandboxRulePath(cwd)}/${h ? "**/" : ""}${replaced})`;
    }
    return r;
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
function scopeReadToolRules(e, n, readFiles = []) {
  let a = false;
  let s = [];
  for (let b of e) {
    let y = permissionRuleValueFromString(b);
    if (y.ruleContent === undefined && READ_TOOLS.has(y.toolName)) {
      a = true;
      continue;
    }
    s.push(b);
  }
  if (!a) return s;
  let flattened = n.flatMap((b) =>
    [FILE_READ_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME].map((y) => `${y}(${toSandboxRulePath(b)}/**)`),
  );
  let mapped = readFiles.map((b) => `${FILE_READ_TOOL_NAME}(${toSandboxRulePath(b)})`);
  return uniq([...s, ...flattened, ...mapped]);
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
