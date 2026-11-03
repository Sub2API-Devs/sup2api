/**
 * tools/ToolSearchTool/prompt.ts
 *
 * ToolSearch 提示词片段与延迟判定（isDeferredTool、isDeferredToolByEngine 等，其余在 chunk-3h9nvmn3 part-002）；混入 ShareOnboardingGuide 提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ToolSearchTool/prompt.ts
 * pieces: chunk-3h9nvmn3.js (13), chunk-nt81pzj6.js (1)
 * attribution: callgraph-fingerprint 1, placement 12, fingerprint 1
 */
import { REPORTFINDINGS } from "../ReportFindingsTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../WorkflowTool/constants.js";
import { SHAREONBOARDINGGUIDE } from "../ShareOnboardingGuideTool/prompt.js";
import { deferralOf } from "../../services/api/toolDescriptionCache.js";
import { TYt, f4 } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import {
  isDeferSpecialToolsEnabled,
  getNonDeferrableBuiltins,
  isPushNotificationDeferrable,
} from "../../utils/toolSearch.js";
import { toolMatchesAnyName } from "../../services/tools/permissionCheckGuard.js";
import { STRUCTUREDOUTPUT } from "../SyntheticOutputTool/SyntheticOutputTool.js";
import { AGENT } from "../AgentTool/constants.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../EnterWorktreeTool/constants.js";
import { env } from "../../utils/env.js";
import { PUSHNOTIFICATION } from "../PushNotificationTool/constants.js";
import { isAgentSdkEntrypoint } from "../../utils/entrypointKinds.js";
import { nK } from "../../utils/model/promptBundles.js";
import { fpi } from "../../constants/promptSections.js";
import { MTi } from "../../services/analytics/juniperShoalConfig.js";

//@ chunk-3h9nvmn3.js:1727-3074 callgraph-fingerprint = BRIEF_TOOL_NAME (0.2)
var BRIEF_TOOL_NAME = require("./chunk-vswknp5v.js").BRIEF_TOOL_NAME,
  SPECIAL_DEFERRABLE_TOOLS = new Set([REPORTFINDINGS, WORKFLOW_TOOL_NAME, SHAREONBOARDINGGUIDE]),
  TOOL_SEARCH_PROMPT_HEAD = `Fetches full schema definitions for deferred tools so they can be called.

Deferred tools appear by name in <system-reminder> messages.`,
  TOOL_SEARCH_PROMPT_UNFETCHED_SHORT =
    " Until fetched, only the name is known \u2014 there is no parameter schema, so the tool cannot be invoked.",
  TOOL_SEARCH_PROMPT_UNFETCHED_STRICT = ` Until fetched, only the name is known \u2014 there is no parameter schema, so calling the tool fails with InputValidationError. When any instruction, system reminder, or other tool's description names a deferred tool, fetch it with query "select:<name>" before calling it.`,
  TOOL_SEARCH_PROMPT_BODY = ` This tool takes a query, matches it against the deferred tool list, and returns the matched tools' complete JSONSchema definitions inside a <functions> block. Once a tool's schema appears in that result, it is callable exactly like any tool defined at the top of the prompt.

Result format: each matched tool appears as one <function>{"description": "...", "name": "...", "parameters": {...}}</function> line inside the <functions> block \u2014 the same encoding as the tool list at the top of this prompt.

Query forms:
- "select:Read,Edit,Grep" \u2014 fetch these exact tools by name
- "notebook jupyter" \u2014 keyword search, up to max_results best matches
- "+slack send" \u2014 require "slack" in the name, rank by remaining terms`;
/**
 * isDeferredTool：工具描述 hook 记录过的延迟结论优先（deferralOf），否则 isDeferredToolByEngine。
 */
//@ chunk-3h9nvmn3.js:3074-3120 placement
function isDeferredTool(e, n) {
  return deferralOf(e.name) ?? isDeferredToolByEngine(e, n);
}
/**
 * isDeferredToolByEngine：alwaysLoad 为真不延迟；总是内联的工具不延迟；否则 MCP 工具、开启 tengu_shiny_stardust 时的特殊工具、shouldDefer 为真的工具延迟。
 */
//@ chunk-3h9nvmn3.js:3120-3217 placement
function isDeferredToolByEngine(e, n) {
  if (e.alwaysLoad === !0) return !1;
  if (isNeverDeferred(e, n)) return !1;
  if (TYt()) return !1;
  return isDeferredTool_2(e);
}
/**
 * 基础延迟判定：MCP 工具一律延迟；tengu_shiny_stardust 开启时 ReportFindings/Workflow/ShareOnboardingGuide 延迟；否则看 shouldDefer。
 */
//@ chunk-3h9nvmn3.js:3217-3309 fingerprint = isDeferredTool (0.586)
function isDeferredTool_2(tool) {
  if (tool.isMcp === !0) return !0;
  if (isDeferSpecialToolsEnabled() && toolMatchesAnyName(tool, SPECIAL_DEFERRABLE_TOOLS)) return !0;
  return tool.shouldDefer === !0;
}
/**
 * 总是内联：isAlwaysInlineTool，或后台会话里的 EnterWorktree，或满足条件的 PushNotification。
 */
//@ chunk-3h9nvmn3.js:3309-3351 placement
function isNeverDeferred(e, n) {
  return isAlwaysInlineTool(e, n) || isBgSessionEnterWorktree(e) || isInlinePushNotification(e);
}
/**
 * 总是内联的工具：tengu_non_deferrable_builtins 列表中的工具、ToolSearch、StructuredOutput、fork 子代理开启时的 Agent、Brief（SendUserMessage）、tengu_drifting_heron 关闭时的 PushNotification。MCP 工具不在此列。
 */
//@ chunk-3h9nvmn3.js:3351-3613 placement
function isAlwaysInlineTool(e, n = getNonDeferrableBuiltins()) {
  if (toolMatchesAnyName(e, n)) return !0;
  if (e.isMcp === !0) return !1;
  if (e.name === TOOL_SEARCH_TOOL_NAME) return !0;
  if (e.name === STRUCTUREDOUTPUT) return !0;
  if (e.name === AGENT) {
    let r = require("./chunk-07hfshac.js");
    if (r.isForkSubagentEnabled()) return !0;
  }
  if (e.name === BRIEF_TOOL_NAME) return !0;
  if (isInlinePushNotification(e) && !isPushNotificationDeferrable()) return !0;
  return !1;
}
//@ chunk-3h9nvmn3.js:3613-3695 placement
function isBgSessionEnterWorktree(e) {
  return e.isMcp !== !0 && e.name === ENTER_WORKTREE_TOOL_NAME && env.CLAUDE_CODE_SESSION_KIND === "bg";
}
//@ chunk-3h9nvmn3.js:3695-3748 placement
function isInlinePushNotification(e) {
  return e.isMcp !== !0 && e.name === PUSHNOTIFICATION && isAgentSdkEntrypoint();
}
/**
 * isDeferredToolInConversation：请求级延迟判定。hook 记录优先；没有已声明集合时按 isDeferredTool（或 placements=engine 时 isDeferredToolByEngine）；工具搜索缺席（tool_addition 模式）且无集合时不延迟；有集合时：f4(tools)（外部构建恒 false）、总是内联的工具不延迟，其余不在已声明内联集合里就延迟。
 */
//@ chunk-3h9nvmn3.js:3748-4053 placement
function isDeferredToolInConversation(
  e,
  n,
  r,
  { toolSearchAbsent: t = !1, placements: s = "hooks", nonDeferrableBuiltins: o } = {},
) {
  let a = s === "hooks" ? deferralOf(e.name) : void 0;
  if (a !== void 0) return a;
  if (t) {
    if (n === void 0) return !1;
  } else if (n === void 0) return s === "hooks" ? isDeferredTool(e, o) : isDeferredToolByEngine(e, o);
  if (r !== void 0 && f4(r)) return !1;
  if (isAlwaysInlineTool(e, o)) return !1;
  return !n.has(e.name);
}
/**
 * formatDeferredToolLine：延迟工具宣告行；有 whenToUse 时为 "name: whenToUse"，否则只给名字。
 */
//@ chunk-3h9nvmn3.js:4053-4139 placement
function formatDeferredToolLine(e) {
  return e.whenToUse !== void 0 && isDeferredTool(e) ? `${e.name}: ${e.whenToUse}` : e.name;
}
/**
 * ToolSearch 的提示词：固定开头 + （新模型用"调用会因 InputValidationError 失败，看到工具名先 select"的严格版，否则简短版）+ 查询形式说明。
 */
//@ chunk-3h9nvmn3.js:4139-4192 placement
function getPrompt(e = {}) {
  return (
    (nK(e) ? fpi : TOOL_SEARCH_PROMPT_HEAD) +
    (MTi() ? TOOL_SEARCH_PROMPT_UNFETCHED_STRICT : TOOL_SEARCH_PROMPT_UNFETCHED_SHORT) +
    TOOL_SEARCH_PROMPT_BODY
  );
}
/**
 * 工具是否以"按值"方式露出：存在 heldInline 集合、工具本身不延迟、且尚未在列表里宣告。
 */
//@ chunk-3h9nvmn3.js:4192-4305 placement
function surfacedByValue(
  e,
  { heldInlineTools: heldInlineTools, nonDeferrableBuiltins: nonDeferrableBuiltins, listed: listed },
) {
  return heldInlineTools !== void 0 && !isDeferredTool(e, nonDeferrableBuiltins) && !listed.has(e.name);
}
/**
 * 对延迟工具给出宣告方式："again"（撤回后重新列出）、"surfaced"（按值露出）或 undefined。
 */
//@ chunk-3h9nvmn3.js:4305-4542 placement
function byValueRoute(e, n) {
  if (
    !isDeferredToolInConversation(e, n.heldInlineTools, void 0, {
      nonDeferrableBuiltins: n.nonDeferrableBuiltins,
    }) ||
    n.announced.has(e.name)
  )
    return;
  if (n.listed.has(e.name)) return n.withdrawn.has(e.name) ? "again" : void 0;
  return surfacedByValue(e, n) ? "surfaced" : void 0;
}
/**
 * ToolSearch 与 DeferredToolPlaceholder 名字、占位工具描述常量。
 */
//@ chunk-nt81pzj6.js:191-331 placement = TOOL_SEARCH_TOOL_NAME (0.474)
var TOOL_SEARCH_TOOL_NAME = "ToolSearch",
  DEFERREDTOOLPLACEHOLDER = "DeferredToolPlaceholder",
  Udr = "Reserved placeholder that keeps deferred tool loading active; never call this tool.";

export {
  TOOL_SEARCH_TOOL_NAME,
  isDeferredTool,
  isDeferredToolInConversation,
  isDeferredToolByEngine,
  DEFERREDTOOLPLACEHOLDER,
  surfacedByValue,
  formatDeferredToolLine,
  getPrompt,
  byValueRoute,
  Udr,
};
