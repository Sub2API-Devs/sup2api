/**
 * utils/hooks/hookEventSets.ts
 *
 * 钩子事件集合（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nsfjm4vg.js (1), chunk-s61vbvea.js (15)
 * attribution: placement 16
 */
import { Nd } from "../toolCgroup.js";
import { listProcessHooksConfigSnapshots } from "./hooksConfigSnapshot.js";
import { getRootRegisteredHooks, getRootMainThreadAgentHooks } from "../../bootstrap/state.js";
import { canonicalToolName, aliasesFor, toolNameVariants } from "../permissions/permissionRuleParser.js";
import { liveWeakRefs, S } from "../diagLogs.js";

//@ chunk-s61vbvea.js:305918-306236 placement
var HOOK_EVENT_NAMES = new Set([
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
//@ chunk-s61vbvea.js:306236-306285 placement
function xvt(e) {
  return HOOK_EVENT_NAMES.has(e) ? Nd("hooks") : {};
}
//@ chunk-s61vbvea.js:306285-306347 placement
function* WS() {
  (yield* listProcessHooksConfigSnapshots(),
    yield getRootRegisteredHooks(),
    yield getRootMainThreadAgentHooks(),
    yield* collectHookRegistries());
}
//@ chunk-s61vbvea.js:324324-325161 placement
var TOOL_HOOK_EVENTS = [
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
  ],
  QD = new Set(TOOL_HOOK_EVENTS),
  ZD = {
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
//@ chunk-s61vbvea.js:325161-325194 placement
function hee(e) {
  return QD.has(e);
}
//@ chunk-s61vbvea.js:325194-325235 placement
function BZs(e) {
  return hee(e) ? null : ZD[e];
}
//@ chunk-s61vbvea.js:325235-325301 placement = CODE_EDITING_TOOLS (0.839)
var eN = ["Write", "Edit", "MultiEdit", "NotebookEdit"],
  XS = new Set(eN);
//@ chunk-s61vbvea.js:325301-325404 placement
function bl(e, n) {
  if (e === void 0) return !1;
  let r = canonicalToolName(e);
  return XS.has(r) || aliasesFor(r, n).some((s) => XS.has(canonicalToolName(s)));
}
//@ chunk-s61vbvea.js:325404-325608 placement
function jZs(e, n) {
  switch (e.hook_event_name) {
    case "PostToolUse":
    case "PostToolUseFailure":
      return bl(e.tool_name, n);
    case "PostToolBatch":
      return (e.tool_calls ?? []).some((r) => bl(r.tool_name, n));
    default:
      return !1;
  }
}
//@ chunk-s61vbvea.js:325608-325638 placement
var qVe = /^[a-zA-Z0-9_|, -]+$/;
//@ chunk-s61vbvea.js:325638-325807 placement
function WZs(e, n, r) {
  if (e !== "PostToolUse" && e !== "PostToolUseFailure") return !1;
  if (!n || n === "*" || !qVe.test(n)) return !1;
  let s = expandMatcherToolNames(n, r);
  return s.length > 0 && s.every((h) => bl(h, r));
}
//@ chunk-s61vbvea.js:325807-325988 placement
function GZs(e, n) {
  if (e === "PostToolBatch") return !0;
  if (e !== "PostToolUse" && e !== "PostToolUseFailure") return !1;
  if (n === void 0 || znt(n) || !qVe.test(n)) return !0;
  return expandMatcherToolNames(n).some((r) => bl(r));
}
//@ chunk-s61vbvea.js:325988-326090 placement
function expandMatcherToolNames(e, n) {
  return e
    .split(/[|,]/)
    .map((r) => r.trim())
    .filter(Boolean)
    .flatMap((r) => toolNameVariants(canonicalToolName(r), n));
}
//@ chunk-s61vbvea.js:326090-326134 placement
function znt(e) {
  return !e || e === "*" || e === ".*";
}
//@ chunk-s61vbvea.js:326134-326399 placement
function isMatcherSubset(e, n) {
  if (e === void 0 || znt(e)) return !0;
  if (znt(n) || !qVe.test(n) || !qVe.test(e)) return !1;
  let r = new Set(
      e
        .split(/[|,]/)
        .map((h) => canonicalToolName(h.trim()))
        .filter(Boolean),
    ),
    filtered = n
      .split(/[|,]/)
      .map((h) => canonicalToolName(h.trim()))
      .filter(Boolean);
  return filtered.length > 0 && filtered.every((h) => r.has(h));
}
/**
 * 收集存活会话的已注册钩子。
 */
//@ chunk-nsfjm4vg.js:815-1006 placement
function collectHookRegistries() {
  let e = [];
  for (let t of liveWeakRefs(S())) {
    let n = t.session?.hookRegistry;
    e.push(
      n ? n.holder().registeredHooks : t.registeredHooks,
      n ? n.mainThreadAgentHooks() : t.mainThreadAgentHooks,
    );
  }
  return e;
}

export { HOOK_EVENT_NAMES, xvt, hee, qVe, GZs, WS, jZs, BZs, WZs, znt, isMatcherSubset };
