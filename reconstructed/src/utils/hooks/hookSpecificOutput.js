/**
 * utils/hooks/hookSpecificOutput.ts
 *
 * hookSpecificOutput 解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (16)
 * attribution: placement 16
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
} from "util";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { U, u, o, Ir, T, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { externalPermissionModeSchema } from "../permissions/browserToolNames.js";
import { clipDisplayText } from "../resultError.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";

//@ chunk-s61vbvea.js:310452-310547 placement
var Sl = DoctorLazy(() => U(["allow", "deny", "ask"])),
  _l = DoctorLazy(() => u({ toolName: o(), ruleContent: o().optional() }));
/**
 * 权限更新目标与权限更新操作（添加/替换/删除规则、设置模式等）的 schema。
 */
//@ chunk-s61vbvea.js:310547-311057 placement
var permissionUpdateDestinationSchema = DoctorLazy(() =>
    U(["userSettings", "projectSettings", "localSettings", "session", "cliArg"]),
  ),
  permissionUpdateSchema = DoctorLazy(() =>
    Ir("type", [
      u({
        type: T("addRules"),
        rules: A(_l()),
        behavior: Sl(),
        destination: permissionUpdateDestinationSchema(),
      }),
      u({
        type: T("replaceRules"),
        rules: A(_l()),
        behavior: Sl(),
        destination: permissionUpdateDestinationSchema(),
      }),
      u({
        type: T("removeRules"),
        rules: A(_l()),
        behavior: Sl(),
        destination: permissionUpdateDestinationSchema(),
      }),
      u({
        type: T("setMode"),
        mode: externalPermissionModeSchema(),
        destination: permissionUpdateDestinationSchema(),
      }),
      u({ type: T("addDirectories"), directories: A(o()), destination: permissionUpdateDestinationSchema() }),
      u({
        type: T("removeDirectories"),
        directories: A(o()),
        destination: permissionUpdateDestinationSchema(),
      }),
    ]),
  );
//@ chunk-s61vbvea.js:311099-311310 placement
var HOOK_TEXT_FIELD_LIMITS = {
    reason: 2000,
    stopReason: 2000,
    systemMessage: 4000,
    additionalContext: 8000,
    permissionDecisionReason: 2000,
  },
  YS = 200,
  jD = { reason: 20, stopReason: 20, systemMessage: 20, additionalContext: YS, permissionDecisionReason: 20 };
//@ chunk-s61vbvea.js:311310-311375 placement
function jVo(e, n, r = YS) {
  return clipDisplayText(e, { maxCodeUnits: n, maxLines: r });
}
//@ chunk-s61vbvea.js:311375-311418 placement
function GD(e) {
  if (e === ASKUSERQUESTION) return !0;
  return !1;
}
//@ chunk-s61vbvea.js:311418-312014 placement
var SELF_HOOK_CHANGE_WARNINGS =
    "A hook from the user's own Claude Code files tried to change this tool call's input. In this session such hooks may block or ask about a call but not change it, so the call was not made. Retrying will not help while the hook keeps changing the input: go on without this call, and tell the user their hook's change to it was refused.",
  zD =
    "A hook from your own Claude Code files tried to change your answer to Claude's question. Claude read your answer as you gave it.",
  KD =
    "A hook from your own Claude Code files tried to change the Slack messages Claude read. Claude read them unchanged.";
//@ chunk-s61vbvea.js:312014-312204 placement
function clipHookTextField(e, n, r) {
  if (typeof r !== "string") return;
  if (e.options.personal === !0) return r;
  let { text: text, truncated: truncated } = jVo(r, HOOK_TEXT_FIELD_LIMITS[n], jD[n]);
  if (truncated) e.report.truncated.push(n);
  return text.trim() === "" ? void 0 : text;
}
//@ chunk-s61vbvea.js:312204-312284 placement
function $t(e, n, r) {
  if (r && !e.report.dropped.includes(n)) e.report.dropped.push(n);
}
//@ chunk-s61vbvea.js:312284-312416 placement
function additionalContextOutput(e, n, r) {
  let s = clipHookTextField(e, "additionalContext", r.additionalContext);
  return { hookEventName: n, ...(s !== void 0 && { additionalContext: s }) };
}
//@ chunk-s61vbvea.js:312416-314632 placement
function parsePreToolUseOutput(e, n, r) {
  if (n.hookEventName !== r) {
    $t(e, "hookSpecificOutput_event_mismatch", !0);
    return;
  }
  switch (n.hookEventName) {
    case "PreToolUse": {
      if (
        e.options.personal === !0 &&
        n.permissionDecision !== "deny" &&
        n.updatedInput !== void 0 &&
        !isDeepStrictEqual(n.updatedInput, e.options.toolInput)
      )
        return (
          $t(e, "updatedInput", !0),
          {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: SELF_HOOK_CHANGE_WARNINGS,
          }
        );
      let h = e.options.personal === !0 && n.permissionDecision === "defer" ? "ask" : n.permissionDecision,
        y = h === "deny" || h === "ask";
      ($t(e, "allow", h === "allow"),
        $t(e, "defer", h === "defer"),
        $t(e, "updatedInput", n.updatedInput !== void 0),
        $t(e, "permissionDecisionReason", !y && n.permissionDecisionReason !== void 0));
      let S = y ? clipHookTextField(e, "permissionDecisionReason", n.permissionDecisionReason) : void 0,
        w = clipHookTextField(e, "additionalContext", n.additionalContext);
      return {
        hookEventName: "PreToolUse",
        ...(y && { permissionDecision: h }),
        ...(S !== void 0 && { permissionDecisionReason: S }),
        ...(w !== void 0 && { additionalContext: w }),
      };
    }
    case "UserPromptSubmit":
      return (
        $t(e, "sessionTitle", n.sessionTitle !== void 0),
        {
          ...additionalContextOutput(e, "UserPromptSubmit", n),
          ...(n.suppressOriginalPrompt === !0 && { suppressOriginalPrompt: !0 }),
        }
      );
    case "PostToolUse": {
      let s = e.options.personal === !0 && !GD(e.options.toolName);
      if (
        e.options.personal === !0 &&
        !s &&
        [n.updatedToolOutput, n.updatedMCPToolOutput].some(
          (h) => h !== void 0 && !isDeepStrictEqual(h, e.options.toolResponse),
        )
      )
        e.wordsReplaced = !0;
      return (
        $t(e, "updatedToolOutput", !s && n.updatedToolOutput !== void 0),
        $t(e, "updatedMCPToolOutput", !s && n.updatedMCPToolOutput !== void 0),
        $t(e, "classifierContext", n.classifierContext !== void 0),
        {
          ...additionalContextOutput(e, "PostToolUse", n),
          ...(s && n.updatedToolOutput !== void 0 && { updatedToolOutput: n.updatedToolOutput }),
          ...(s && n.updatedMCPToolOutput !== void 0 && { updatedMCPToolOutput: n.updatedMCPToolOutput }),
        }
      );
    }
    case "UserPromptExpansion":
      return {
        ...additionalContextOutput(e, "UserPromptExpansion", n),
        ...(n.suppressOriginalPrompt === !0 && { suppressOriginalPrompt: !0 }),
      };
    case "PostToolUseFailure":
      return additionalContextOutput(e, "PostToolUseFailure", n);
    case "PostToolBatch":
      return additionalContextOutput(e, "PostToolBatch", n);
    case "Stop":
      return additionalContextOutput(e, "Stop", n);
    case "SubagentStop":
      return additionalContextOutput(e, "SubagentStop", n);
    case "SubagentStart":
      return additionalContextOutput(e, "SubagentStart", n);
    case "PermissionDenied":
      return ($t(e, "retry", n.retry !== void 0), { hookEventName: "PermissionDenied" });
    default:
      return e.options.personal === !0 ? parsePermissionRequestOutput(e, n) : qS(e);
  }
}
//@ chunk-s61vbvea.js:314632-314702 placement
function qS(e) {
  $t(e, "hookSpecificOutput_unsupported_event", !0);
  return;
}
//@ chunk-s61vbvea.js:314702-316104 placement
function parsePermissionRequestOutput(e, n) {
  switch (n.hookEventName) {
    case "PermissionRequest": {
      if (n.decision.behavior !== "deny") {
        $t(e, "allow", !0);
        return;
      }
      let r = clipHookTextField(e, "reason", n.decision.message);
      return {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "deny",
          ...(r !== void 0 && { message: r }),
          ...(n.decision.interrupt === !0 && { interrupt: !0 }),
        },
      };
    }
    case "PreModelSwitch": {
      let r = n.permissionDecision === "deny" || n.permissionDecision === "ask";
      $t(e, "allow", n.permissionDecision === "allow");
      let s = r ? clipHookTextField(e, "permissionDecisionReason", n.permissionDecisionReason) : void 0;
      return {
        hookEventName: "PreModelSwitch",
        ...(r && { permissionDecision: n.permissionDecision }),
        ...(s !== void 0 && { permissionDecisionReason: s }),
      };
    }
    case "SessionStart":
      return (
        $t(e, "initialUserMessage", n.initialUserMessage !== void 0),
        $t(e, "sessionTitle", n.sessionTitle !== void 0),
        {
          ...additionalContextOutput(e, "SessionStart", n),
          ...(n.watchPaths !== void 0 && { watchPaths: n.watchPaths }),
          ...(n.reloadSkills === !0 && { reloadSkills: !0 }),
        }
      );
    case "Setup":
      return additionalContextOutput(e, "Setup", n);
    case "PostModelSwitch":
      return additionalContextOutput(e, "PostModelSwitch", n);
    case "Notification":
      return additionalContextOutput(e, "Notification", n);
    case "Elicitation":
    case "ElicitationResult": {
      let r = n.action === "decline" || n.action === "cancel";
      return (
        $t(e, "allow", n.action === "accept"),
        $t(e, "content", n.content !== void 0),
        { hookEventName: n.hookEventName, ...(r && { action: n.action }) }
      );
    }
    case "CwdChanged":
    case "FileChanged":
      return { hookEventName: n.hookEventName, ...(n.watchPaths !== void 0 && { watchPaths: n.watchPaths }) };
    default:
      return qS(e);
  }
}
//@ chunk-s61vbvea.js:316104-317233 placement
function parseHookJsonOutput(e, n, r = {}) {
  let s = { report: { dropped: [], truncated: [] }, options: r };
  if ("async" in e) return ($t(s, "async", !0), { answer: {}, report: s.report });
  let h = e;
  ($t(s, "approve", h.decision === "approve"),
    $t(s, "reason", h.decision === "approve" && h.reason !== void 0));
  let y = r.personal === !0;
  ($t(s, "terminalSequence", !y && h.terminalSequence !== void 0),
    $t(s, "metrics", h.metrics !== void 0),
    $t(s, "rewakeSummary", h.rewakeSummary !== void 0));
  let S = clipHookTextField(s, "stopReason", h.stopReason),
    w = h.decision === "approve" ? void 0 : clipHookTextField(s, "reason", h.reason),
    R = clipHookTextField(s, "systemMessage", h.systemMessage),
    hookSpecificOutput = h.hookSpecificOutput,
    P =
      typeof hookSpecificOutput === "object" &&
      hookSpecificOutput !== null &&
      !Array.isArray(hookSpecificOutput);
  $t(s, "hookSpecificOutput_not_object", hookSpecificOutput !== void 0 && !P);
  let j = P ? parsePreToolUseOutput(s, hookSpecificOutput, n) : void 0,
    G = s.wordsReplaced
      ? [R, r.toolName === ASKUSERQUESTION ? zD : KD].filter((L) => L !== void 0).join(`
`)
      : R;
  return {
    answer: {
      ...(h.continue === !1 && { continue: !1 }),
      ...(y && h.terminalSequence !== void 0 && { terminalSequence: h.terminalSequence }),
      ...(h.suppressOutput === !0 && { suppressOutput: !0 }),
      ...(S !== void 0 && { stopReason: S }),
      ...(h.decision === "block" && { decision: "block" }),
      ...(G !== void 0 && { systemMessage: G }),
      ...(w !== void 0 && { reason: w }),
      ...(j !== void 0 && { hookSpecificOutput: j }),
    },
    report: s.report,
  };
}
/**
 * 判断 hook 输出是否要求阻止（decision 为 block、continue 为 false 或权限 deny）。
 */
//@ chunk-s61vbvea.js:317233-317538 placement
function isBlockingHookOutput(e) {
  if ("decision" in e && e.decision === "block") return !0;
  if ("continue" in e && e.continue === !1) return !0;
  let n = "hookSpecificOutput" in e ? e.hookSpecificOutput : void 0;
  return (
    n !== void 0 &&
    typeof n === "object" &&
    n !== null &&
    "permissionDecision" in n &&
    (n.permissionDecision === "deny" || n.permissionDecision === "ask")
  );
}
//@ chunk-s61vbvea.js:317538-317770 placement
function isAskOnlyHookOutput(e) {
  if (isDenyingHookOutput(e) || ("continue" in e && e.continue === !1)) return !1;
  let n = "hookSpecificOutput" in e ? e.hookSpecificOutput : void 0;
  return (
    n !== void 0 &&
    typeof n === "object" &&
    n !== null &&
    "permissionDecision" in n &&
    n.permissionDecision === "ask"
  );
}
//@ chunk-s61vbvea.js:317770-318000 placement
function isDenyingHookOutput(e) {
  if ("decision" in e && e.decision === "block") return !0;
  let n = "hookSpecificOutput" in e ? e.hookSpecificOutput : void 0;
  return (
    n !== void 0 &&
    typeof n === "object" &&
    n !== null &&
    "permissionDecision" in n &&
    n.permissionDecision === "deny"
  );
}

export {
  permissionUpdateSchema,
  isBlockingHookOutput,
  parseHookJsonOutput,
  isDenyingHookOutput,
  isAskOnlyHookOutput,
  jVo,
};
