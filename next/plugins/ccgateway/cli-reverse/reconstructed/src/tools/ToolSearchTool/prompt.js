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
import { alwaysFalseDefer, alwaysFalseFeed } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
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
import { leanRewriteOf } from "../../utils/model/promptBundles.js";
import { TOOL_SEARCH_DESCRIPTION } from "../../constants/promptSections.js";
import { toolSearchFetchRuleConfig } from "../../services/analytics/juniperShoalConfig.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nt81pzj6.js:191-331 placement (2.1.88 match: TOOL_SEARCH_TOOL_NAME, 0.474)
/**
 * ToolSearch 与 DeferredToolPlaceholder 名字、占位工具描述常量。
 */
var TOOL_SEARCH_TOOL_NAME = "ToolSearch";
var DEFERREDTOOLPLACEHOLDER = "DeferredToolPlaceholder";
var DEFERRED_PLACEHOLDER_NOTE =
  "Reserved placeholder that keeps deferred tool loading active; never call this tool.";
//@ chunk-3h9nvmn3.js:1727-3074 callgraph-fingerprint (2.1.88 match: BRIEF_TOOL_NAME, 0.2)
var BRIEF_TOOL_NAME; // deferred: loads other modules while loading; runs once its import cycle is complete
var SPECIAL_DEFERRABLE_TOOLS;
var TOOL_SEARCH_PROMPT_HEAD;
var TOOL_SEARCH_PROMPT_UNFETCHED_SHORT;
var TOOL_SEARCH_PROMPT_UNFETCHED_STRICT;
var TOOL_SEARCH_PROMPT_BODY;
deferInit("chunk-3h9nvmn3.js:1727", () => {
  BRIEF_TOOL_NAME = require("../BriefTool/prompt.js").BRIEF_TOOL_NAME;
  SPECIAL_DEFERRABLE_TOOLS = new Set([REPORTFINDINGS, WORKFLOW_TOOL_NAME, SHAREONBOARDINGGUIDE]);
  TOOL_SEARCH_PROMPT_HEAD = `Fetches full schema definitions for deferred tools so they can be called.

Deferred tools appear by name in <system-reminder> messages.`;
  TOOL_SEARCH_PROMPT_UNFETCHED_SHORT =
    " Until fetched, only the name is known \u2014 there is no parameter schema, so the tool cannot be invoked.";
  TOOL_SEARCH_PROMPT_UNFETCHED_STRICT = ` Until fetched, only the name is known \u2014 there is no parameter schema, so calling the tool fails with InputValidationError. When any instruction, system reminder, or other tool's description names a deferred tool, fetch it with query "select:<name>" before calling it.`;
  TOOL_SEARCH_PROMPT_BODY = ` This tool takes a query, matches it against the deferred tool list, and returns the matched tools' complete JSONSchema definitions inside a <functions> block. Once a tool's schema appears in that result, it is callable exactly like any tool defined at the top of the prompt.

Result format: each matched tool appears as one <function>{"description": "...", "name": "...", "parameters": {...}}</function> line inside the <functions> block \u2014 the same encoding as the tool list at the top of this prompt.

Query forms:
- "select:Read,Edit,Grep" \u2014 fetch these exact tools by name
- "notebook jupyter" \u2014 keyword search, up to max_results best matches
- "+slack send" \u2014 require "slack" in the name, rank by remaining terms`;
});
//@ chunk-3h9nvmn3.js:3074-3120 placement
/**
 * isDeferredTool：工具描述 hook 记录过的延迟结论优先（deferralOf），否则 isDeferredToolByEngine。
 */
function isDeferredTool(tool, nonDeferrableBuiltins) {
  return deferralOf(tool.name) ?? isDeferredToolByEngine(tool, nonDeferrableBuiltins);
}
//@ chunk-3h9nvmn3.js:3120-3217 placement
/**
 * isDeferredToolByEngine：alwaysLoad 为真不延迟；总是内联的工具不延迟；否则 MCP 工具、开启 tengu_shiny_stardust 时的特殊工具、shouldDefer 为真的工具延迟。
 */
function isDeferredToolByEngine(tool, nonDeferrableBuiltins) {
  if (tool.alwaysLoad === true) return false;
  if (isNeverDeferred(tool, nonDeferrableBuiltins)) return false;
  if (alwaysFalseDefer()) return false;
  return isDeferredTool_2(tool);
}
//@ chunk-3h9nvmn3.js:3217-3309 fingerprint (2.1.88 match: isDeferredTool, 0.586)
/**
 * 基础延迟判定：MCP 工具一律延迟；tengu_shiny_stardust 开启时 ReportFindings/Workflow/ShareOnboardingGuide 延迟；否则看 shouldDefer。
 */
function isDeferredTool_2(tool) {
  if (tool.isMcp === true) return true;
  if (isDeferSpecialToolsEnabled() && toolMatchesAnyName(tool, SPECIAL_DEFERRABLE_TOOLS)) return true;
  return tool.shouldDefer === true;
}
//@ chunk-3h9nvmn3.js:3309-3351 placement
/**
 * 总是内联：isAlwaysInlineTool，或后台会话里的 EnterWorktree，或满足条件的 PushNotification。
 */
function isNeverDeferred(tool, nonDeferrableBuiltins) {
  return (
    isAlwaysInlineTool(tool, nonDeferrableBuiltins) ||
    isBgSessionEnterWorktree(tool) ||
    isInlinePushNotification(tool)
  );
}
//@ chunk-3h9nvmn3.js:3351-3613 placement
/**
 * 总是内联的工具：tengu_non_deferrable_builtins 列表中的工具、ToolSearch、StructuredOutput、fork 子代理开启时的 Agent、Brief（SendUserMessage）、tengu_drifting_heron 关闭时的 PushNotification。MCP 工具不在此列。
 */
function isAlwaysInlineTool(tool, nonDeferrableBuiltins = getNonDeferrableBuiltins()) {
  if (toolMatchesAnyName(tool, nonDeferrableBuiltins)) return true;
  if (tool.isMcp === true) return false;
  if (tool.name === TOOL_SEARCH_TOOL_NAME) return true;
  if (tool.name === STRUCTUREDOUTPUT) return true;
  if (tool.name === AGENT) {
    let forkModule = require("../AgentTool/forkSubagent.js");
    if (forkModule.isForkSubagentEnabled()) return true;
  }
  if (tool.name === BRIEF_TOOL_NAME) return true;
  if (isInlinePushNotification(tool) && !isPushNotificationDeferrable()) return true;
  return false;
}
//@ chunk-3h9nvmn3.js:3613-3695 placement
function isBgSessionEnterWorktree(tool) {
  return (
    tool.isMcp !== true && tool.name === ENTER_WORKTREE_TOOL_NAME && env.CLAUDE_CODE_SESSION_KIND === "bg"
  );
}
//@ chunk-3h9nvmn3.js:3695-3748 placement
function isInlinePushNotification(tool) {
  return tool.isMcp !== true && tool.name === PUSHNOTIFICATION && isAgentSdkEntrypoint();
}
//@ chunk-3h9nvmn3.js:3748-4053 placement
/**
 * isDeferredToolInConversation：请求级延迟判定。hook 记录优先；没有已声明集合时按 isDeferredTool（或 placements=engine 时 isDeferredToolByEngine）；工具搜索缺席（tool_addition 模式）且无集合时不延迟；有集合时：f4(tools)（外部构建恒 false）、总是内联的工具不延迟，其余不在已声明内联集合里就延迟。
 */
function isDeferredToolInConversation(
  tool,
  loadedToolNames,
  feed,
  { toolSearchAbsent = false, placements = "hooks", nonDeferrableBuiltins } = {},
) {
  let placement = placements === "hooks" ? deferralOf(tool.name) : undefined;
  if (placement !== undefined) return placement;
  if (toolSearchAbsent) {
    if (loadedToolNames === undefined) return false;
  } else if (loadedToolNames === undefined)
    return placements === "hooks"
      ? isDeferredTool(tool, nonDeferrableBuiltins)
      : isDeferredToolByEngine(tool, nonDeferrableBuiltins);
  if (feed !== undefined && alwaysFalseFeed(feed)) return false;
  if (isAlwaysInlineTool(tool, nonDeferrableBuiltins)) return false;
  return !loadedToolNames.has(tool.name);
}
//@ chunk-3h9nvmn3.js:4053-4139 placement
/**
 * formatDeferredToolLine：延迟工具宣告行；有 whenToUse 时为 "name: whenToUse"，否则只给名字。
 */
function formatDeferredToolLine(tool) {
  return tool.whenToUse !== undefined && isDeferredTool(tool) ? `${tool.name}: ${tool.whenToUse}` : tool.name;
}
//@ chunk-3h9nvmn3.js:4139-4192 placement
/**
 * ToolSearch 的提示词：固定开头 + （新模型用"调用会因 InputValidationError 失败，看到工具名先 select"的严格版，否则简短版）+ 查询形式说明。
 */
function getPrompt(options = {}) {
  return (
    (leanRewriteOf(options) ? TOOL_SEARCH_DESCRIPTION : TOOL_SEARCH_PROMPT_HEAD) +
    (toolSearchFetchRuleConfig() ? TOOL_SEARCH_PROMPT_UNFETCHED_STRICT : TOOL_SEARCH_PROMPT_UNFETCHED_SHORT) +
    TOOL_SEARCH_PROMPT_BODY
  );
}
//@ chunk-3h9nvmn3.js:4192-4305 placement
/**
 * 工具是否以"按值"方式露出：存在 heldInline 集合、工具本身不延迟、且尚未在列表里宣告。
 */
function surfacedByValue(tool, { heldInlineTools, nonDeferrableBuiltins, listed }) {
  return (
    heldInlineTools !== undefined && !isDeferredTool(tool, nonDeferrableBuiltins) && !listed.has(tool.name)
  );
}
//@ chunk-3h9nvmn3.js:4305-4542 placement
/**
 * 对延迟工具给出宣告方式："again"（撤回后重新列出）、"surfaced"（按值露出）或 undefined。
 */
function byValueRoute(tool, state) {
  if (
    !isDeferredToolInConversation(tool, state.heldInlineTools, undefined, {
      nonDeferrableBuiltins: state.nonDeferrableBuiltins,
    }) ||
    state.announced.has(tool.name)
  )
    return;
  if (state.listed.has(tool.name)) return state.withdrawn.has(tool.name) ? "again" : undefined;
  return surfacedByValue(tool, state) ? "surfaced" : undefined;
}
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
  DEFERRED_PLACEHOLDER_NOTE,
};
