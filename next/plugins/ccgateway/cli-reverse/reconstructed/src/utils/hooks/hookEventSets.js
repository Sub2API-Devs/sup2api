/**
 * utils/hooks/hookEventSets.ts
 *
 * 钩子事件集合（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-23ta5myf.js (1), chunk-7jxyna5q.js (15)
 * attribution: placement 16
 */
import { liveWeakRefs, getDiagLiveRefs } from "../diagLogs.js";
import { cgroupSpawnOptions } from "../toolCgroup.js";
import { listProcessHooksConfigSnapshots } from "./hooksConfigSnapshot.js";
import { getRootRegisteredHooks, getRootMainThreadAgentHooks } from "../../bootstrap/state.js";
import { canonicalToolName, aliasesFor, toolNameVariants } from "../permissions/permissionRuleParser.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-23ta5myf.js:814-1005 placement
/**
 * 收集存活会话的已注册钩子。
 */
function collectHookRegistries() {
  let registries = [];
  for (let ref of liveWeakRefs(getDiagLiveRefs())) {
    let hookRegistry = ref.session?.hookRegistry;
    registries.push(
      hookRegistry ? hookRegistry.holder().registeredHooks : ref.registeredHooks,
      hookRegistry ? hookRegistry.mainThreadAgentHooks() : ref.mainThreadAgentHooks,
    );
  }
  return registries;
}
//@ chunk-7jxyna5q.js:229345-229663 placement
var HOOK_EVENT_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:229345", () => {
  HOOK_EVENT_NAMES = new Set([
    "Notification",
    "SessionStart",
    "SessionEnd",
    "Setup",
    "StopFailure",
    "SubagentStart",
    "PostToolUseFailure",
    "PostCompact",
    "PostModelSwitch",
    "PermissionDenied",
    "WorktreeCreate",
    "WorktreeRemove",
    "InstructionsLoaded",
    "CwdChanged",
    "FileChanged",
    "DirectoryAdded",
    "MessageDisplay",
    "StatusLine",
    "FileSuggestion",
  ]);
});
//@ chunk-7jxyna5q.js:229663-229712 placement
/**
 * 某钩子事件的设置对象（hooks 分节），非事件返回空对象。
 */
function hooksSettingForEvent(hookEvent) {
  return HOOK_EVENT_NAMES.has(hookEvent) ? cgroupSpawnOptions("hooks") : {};
}
//@ chunk-7jxyna5q.js:229712-229774 placement
/**
 * 依次产出所有钩子配置快照（进程配置、根注册、主线程 agent、各注册表）。
 */
function* collectAllHookSnapshots() {
  yield* listProcessHooksConfigSnapshots();
  yield getRootRegisteredHooks();
  yield getRootMainThreadAgentHooks();
  yield* collectHookRegistries();
}
//@ chunk-7jxyna5q.js:248901-249738 placement
/**
 * 带 matcher 的钩子事件列表，以及各事件的转发类别（runs_locally/later/low_value/container_internal）。
 */
var TOOL_HOOK_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MATCHER_TOOL_HOOK_EVENTS;
var HOOK_EVENT_FORWARDING_KIND;
deferInit("chunk-7jxyna5q.js:248901", () => {
  TOOL_HOOK_EVENTS = [
    "PreToolUse",
    "PostToolUse",
    "PostToolUseFailure",
    "PostToolBatch",
    "UserPromptSubmit",
    "UserPromptExpansion",
    "Stop",
    "StopFailure",
    "SubagentStart",
    "SubagentStop",
    "PermissionDenied",
  ];
  MATCHER_TOOL_HOOK_EVENTS = new Set(TOOL_HOOK_EVENTS);
  HOOK_EVENT_FORWARDING_KIND = {
    SessionStart: "runs_locally",
    SessionEnd: "runs_locally",
    Notification: "runs_locally",
    PermissionRequest: "later",
    Setup: "low_value",
    PreCompact: "low_value",
    PostCompact: "low_value",
    PreModelSwitch: "later",
    PostModelSwitch: "later",
    TeammateIdle: "low_value",
    TaskCreated: "low_value",
    TaskCompleted: "low_value",
    Elicitation: "low_value",
    ElicitationResult: "low_value",
    ConfigChange: "container_internal",
    WorktreeCreate: "container_internal",
    WorktreeRemove: "container_internal",
    InstructionsLoaded: "container_internal",
    CwdChanged: "container_internal",
    FileChanged: "container_internal",
    DirectoryAdded: "container_internal",
    MessageDisplay: "container_internal",
  };
});
//@ chunk-7jxyna5q.js:249738-249771 placement
/**
 * 判断事件是否为带 matcher 的事件。
 */
function isMatcherEvent(event) {
  return MATCHER_TOOL_HOOK_EVENTS.has(event);
}
//@ chunk-7jxyna5q.js:249771-249812 placement
/**
 * 取非 matcher 事件的转发类别。
 */
function hookEventForwardingKind(event) {
  return isMatcherEvent(event) ? null : HOOK_EVENT_FORWARDING_KIND[event];
}
//@ chunk-7jxyna5q.js:249812-249878 placement (2.1.88 match: CODE_EDITING_TOOLS, 0.838)
var CODE_EDITING_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CODE_EDITING_TOOL_SET;
deferInit("chunk-7jxyna5q.js:249812", () => {
  CODE_EDITING_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];
  CODE_EDITING_TOOL_SET = new Set(CODE_EDITING_TOOLS);
});
//@ chunk-7jxyna5q.js:249878-249981 placement
function isCodeEditingTool(toolName, toolName_2) {
  if (toolName === undefined) return false;
  let canonical = canonicalToolName(toolName);
  return (
    CODE_EDITING_TOOL_SET.has(canonical) ||
    aliasesFor(canonical, toolName_2).some((alias) => CODE_EDITING_TOOL_SET.has(canonicalToolName(alias)))
  );
}
//@ chunk-7jxyna5q.js:249981-250185 placement
/**
 * 判断 PostToolUse 类钩子载荷是否涉及代码编辑工具。
 */
function isCodeEditingHookPayload(input, aliases) {
  switch (input.hook_event_name) {
    case "PostToolUse":
    case "PostToolUseFailure":
      return isCodeEditingTool(input.tool_name, aliases);
    case "PostToolBatch":
      return (input.tool_calls ?? []).some((call) => isCodeEditingTool(call.tool_name, aliases));
    default:
      return false;
  }
}
//@ chunk-7jxyna5q.js:250185-250215 placement
/**
 * 合法 matcher 名正则。
 */
var MATCHER_NAME_RE = /^[a-zA-Z0-9_|, -]+$/;
//@ chunk-7jxyna5q.js:250215-250384 placement
/**
 * 判断 matcher 是否只覆盖代码编辑工具。
 */
function isCodeEditingMatcherOnly(event, matcher, aliases) {
  if (event !== "PostToolUse" && event !== "PostToolUseFailure") return false;
  if (!matcher || matcher === "*" || !MATCHER_NAME_RE.test(matcher)) return false;
  let names = expandMatcherToolNames(matcher, aliases);
  return names.length > 0 && names.every((name) => isCodeEditingTool(name, aliases));
}
//@ chunk-7jxyna5q.js:250384-250565 placement
/**
 * 判断某事件/matcher 是否可能触达代码编辑工具。
 */
function mayTouchCodeEditingTool(event, matcher) {
  if (event === "PostToolBatch") return true;
  if (event !== "PostToolUse" && event !== "PostToolUseFailure") return false;
  if (matcher === undefined || isWildcardMatcher(matcher) || !MATCHER_NAME_RE.test(matcher)) return true;
  return expandMatcherToolNames(matcher).some((name) => isCodeEditingTool(name));
}
//@ chunk-7jxyna5q.js:250565-250667 placement
function expandMatcherToolNames(matcher, aliases) {
  return matcher
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => toolNameVariants(canonicalToolName(part), aliases));
}
//@ chunk-7jxyna5q.js:250667-250711 placement
/**
 * 判断 matcher 是否为通配（空、*、.*）。
 */
function isWildcardMatcher(matcher) {
  return !matcher || matcher === "*" || matcher === ".*";
}
//@ chunk-7jxyna5q.js:250711-250976 placement
function isMatcherSubset(matcher, matcher_2) {
  if (matcher === undefined || isWildcardMatcher(matcher)) return true;
  if (isWildcardMatcher(matcher_2) || !MATCHER_NAME_RE.test(matcher_2) || !MATCHER_NAME_RE.test(matcher))
    return false;
  let wanted = new Set(
    matcher
      .split(/[|,]/)
      .map((name) => canonicalToolName(name.trim()))
      .filter(Boolean),
  );
  let filtered = matcher_2
    .split(/[|,]/)
    .map((name) => canonicalToolName(name.trim()))
    .filter(Boolean);
  return filtered.length > 0 && filtered.every((name) => wanted.has(name));
}
export {
  isMatcherEvent,
  hookEventForwardingKind,
  isCodeEditingMatcherOnly,
  isWildcardMatcher,
  MATCHER_NAME_RE,
  isMatcherSubset,
  mayTouchCodeEditingTool,
  hooksSettingForEvent,
  HOOK_EVENT_NAMES,
  collectAllHookSnapshots,
  isCodeEditingHookPayload,
};
