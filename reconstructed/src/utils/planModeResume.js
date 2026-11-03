/**
 * utils/planModeResume.ts
 *
 * 2.1.316 新增。从转写中找出最后一段未关闭的计划模式段（plan_mode 附件、/plan、ExitPlanMode 的结果），供恢复会话时判断是否重新进入计划模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0089hrfm.js (19)
 * attribution: placement 19
 */
import { getFeatureValue_SESSION_PINNED } from "../services/analytics/growthbook.js";
import { parsePermissionMode } from "../types/permissions.js";
import { transitionPermissionMode } from "./permissions/permissionSetup.js";
import { ExitPlanModeV2Tool } from "../tools/ExitPlanModeTool/ExitPlanModeV2Tool.js";
import { getDenyRuleForTool } from "./permissions/permissions.js";
import { logForDebugging } from "./debug.js";
import { toExternalPermissionMode } from "./permissions/PermissionMode.js";
import { COMMAND_NAME } from "../constants/xml.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../tools/EnterPlanModeTool/constants.js";
import { isToolUseResultMessage, getUserMessageText } from "./messages.js";
import { isHumanOrAutoContinuation } from "./messageProvenance.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";

//@ chunk-0089hrfm.js:632-660 placement
var TENGU_TRANQUIL_FERN = "tengu_tranquil_fern";
//@ chunk-0089hrfm.js:660-689 placement
function f() {
  return getFeatureValue_SESSION_PINNED(TENGU_TRANQUIL_FERN, !0);
}
//@ chunk-0089hrfm.js:689-767 placement
function createPlanModeResumeOutcome() {
  return { source: "none", trustedMode: void 0, recordedMode: "absent" };
}
//@ chunk-0089hrfm.js:767-918 placement
function planModeResumeResult(e) {
  if (e.source !== "none") return "restored";
  return (e.recordedMode === "plan" || e.transcriptOpen === !0) && e.trustedMode !== "plan"
    ? "declined"
    : "none";
}
//@ chunk-0089hrfm.js:918-1016 placement
function g(e) {
  if (e === void 0 || e === null) return "absent";
  return (typeof e === "string" && parsePermissionMode(e)) || "invalid";
}
//@ chunk-0089hrfm.js:1016-1073 placement = handlePlanModeTransition (0.674)
function handlePlanModeTransition(e) {
  return { ...transitionPermissionMode(e.mode, "plan", e), mode: "plan" };
}
//@ chunk-0089hrfm.js:1073-1149 placement
function withPlanModeContext(e) {
  return { ...e, toolPermissionContext: handlePlanModeTransition(e.toolPermissionContext) };
}
//@ chunk-0089hrfm.js:1149-1218 placement
function _(e) {
  return (
    f() && e.mode !== "plan" && ExitPlanModeV2Tool.isEnabled() && !getDenyRuleForTool(e, ExitPlanModeV2Tool)
  );
}
//@ chunk-0089hrfm.js:1218-1779 placement
function planModeFromWorkerRecord(e, n, { forkSession: o, transcript: s } = {}) {
  if (((n.recordedMode = g(e?.worker_permission_mode)), n.recordedMode === "invalid"))
    logForDebugging("[planModeResume] ignoring unrecognized internal_metadata.worker_permission_mode", {
      level: "warn",
    });
  if (n.recordedMode === "plan" && s && f()) n.recordTranscriptState = planSegmentState(s);
  return (r) => {
    if (
      ((n.trustedMode ??= r.toolPermissionContext.mode),
      n.recordedMode !== "plan" || o || !_(r.toolPermissionContext))
    )
      return r;
    return (
      (n.source = "internal"),
      logForDebugging(
        `[planModeResume] re-entering plan mode from the prior worker's record (was ${r.toolPermissionContext.mode})`,
      ),
      withPlanModeContext(r)
    );
  };
}
//@ chunk-0089hrfm.js:1779-2021 placement
function settleWorkerPermissionModeRecord(
  e,
  n,
  { planModeOnResume: planModeOnResume, restored: restored, restartedWorker: restartedWorker },
) {
  let i = Boolean(restored?.external || restored?.internal);
  if (restartedWorker && !i) return;
  if ((e.enableWorkerPermissionModeRecord(), planModeOnResume !== void 0 && i))
    e.notifyInternalMetadataChanged({ worker_permission_mode: toExternalPermissionMode(n) });
}
//@ chunk-0089hrfm.js:2021-2471 placement
function planModeFromTranscript(e, n, o, s) {
  let r =
    s &&
    n.source === "none" &&
    (n.recordedMode === "absent" || n.recordedMode === "invalid") &&
    f() &&
    planSegmentState(e) === "open";
  if (r) n.transcriptOpen = !0;
  o((i) => {
    if (
      ((n.trustedMode ??= i.toolPermissionContext.mode),
      !r ||
        i.toolPermissionContext.mode === "plan" ||
        getDenyRuleForTool(i.toolPermissionContext, ExitPlanModeV2Tool))
    )
      return i;
    return (
      (n.source = "transcript"),
      logForDebugging(
        `[planModeResume] re-entering plan mode from the transcript's open plan segment (was ${i.toolPermissionContext.mode})`,
      ),
      withPlanModeContext(i)
    );
  });
}
/**
 * 从转写中找出最后一段未关闭的计划模式段（plan_mode 附件、/plan、ExitPlanMode 的结果），供恢复会话时判断是否重新进入计划模式。2.1.316 新增，受 tengu_tranquil_fern 控制。
 */
//@ chunk-0089hrfm.js:2471-3414 placement
function planSegmentState(e) {
  let n = `<${COMMAND_NAME}>/plan</${COMMAND_NAME}>`,
    o = new Set(),
    s = new Set(),
    r = countToolCallsSince(e),
    i = !1,
    d = () => (i ? "none" : "open");
  for (let M = e.length - 1; M >= 0; M--) {
    let l = e[M];
    if (l.type === "attachment") {
      let m = l.attachment.type;
      if (m === "plan_mode" || m === "plan_mode_reentry") return d();
      if (m === "plan_mode_exit") return "exited";
    } else if (l.type === "assistant" && Array.isArray(l.message.content)) {
      let content = l.message.content;
      for (let p = content.length - 1; p >= 0; p--) {
        let u = content[p];
        if (u.type !== "tool_use") continue;
        if (u.name === EXITPLANMODE_2 && s.has(u.id) && !o.has(u.id) && !r.has(u.id)) return "exited";
        if (u.name === ENTER_PLAN_MODE_TOOL_NAME && s.has(u.id) && (!o.has(u.id) || r.has(u.id))) return d();
      }
    } else if (l.type === "user" && isToolUseResultMessage(l)) {
      let content = l.message.content;
      if (Array.isArray(content)) {
        for (let p of content)
          if (p.type === "tool_result")
            (p.is_error || isPlanAwaitingLeader(l, p.content) ? o : s).add(p.tool_use_id);
      }
    } else if (l.type === "user") {
      if (getUserMessageText(l)?.trimStart().startsWith(n)) return d();
      if (l.permissionMode === "plan") return d();
      if (l.permissionMode !== void 0 && !l.isMeta && isHumanOrAutoContinuation(l.origin)) i = !0;
    }
  }
  return "none";
}
//@ chunk-0089hrfm.js:3414-3654 placement = countToolCallsSince (1)
function countToolCallsSince(e) {
  let n = new Set(),
    o = new Set();
  for (let message of e) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let r of message.message.content) {
      if (r.type !== "tool_use") continue;
      if (n.has(r.id)) o.add(r.id);
      else n.add(r.id);
    }
  }
  return o;
}
/**
 * 计划是否在等团队负责人批准
 */
//@ chunk-0089hrfm.js:3654-3855 placement
function isPlanAwaitingLeader(e, n) {
  let toolUseResult = e.toolUseResult;
  if (
    toolUseResult !== null &&
    typeof toolUseResult === "object" &&
    toolUseResult.awaitingLeaderApproval === !0
  )
    return !0;
  return typeof n === "string" && n.startsWith("Your plan has been submitted to the team lead");
}
//@ chunk-0089hrfm.js:3855-3980 placement
function isTranscriptPlanSourceAllowed({
  sdkUrl: sdkUrl,
  permissionModeSuppliedOnInvocation: permissionModeSuppliedOnInvocation,
  forkSession: forkSession,
}) {
  if (!ExitPlanModeV2Tool.isEnabled() || forkSession) return !1;
  return !!sdkUrl || permissionModeSuppliedOnInvocation === !1;
}
//@ chunk-0089hrfm.js:3980-4115 placement
function restorePlanModeFromTranscriptOnly(e, n, o) {
  let s = createPlanModeResumeOutcome();
  return (
    planModeFromTranscript(e, s, o, isTranscriptPlanSourceAllowed(n)),
    logPlanModeResumeOutcome(s, { lane: n.sdkUrl ? "sdk_url" : "print", hadExternal: !1, hadInternal: !1 }),
    planModeResumeResult(s)
  );
}
//@ chunk-0089hrfm.js:4115-4367 placement
function restorePlanModeOnResume(e, n, { lane: lane, forkSession: forkSession, transcript: transcript }) {
  let i = createPlanModeResumeOutcome();
  if (
    (n(
      planModeFromWorkerRecord(e?.internal, i, {
        forkSession: forkSession,
        transcript: transcript?.messages,
      }),
    ),
    transcript)
  )
    planModeFromTranscript(transcript.sourceRows, i, n, transcript.sourceAllowed);
  return (
    logPlanModeResumeOutcome(i, { lane: lane, hadExternal: !!e?.external, hadInternal: !!e?.internal }),
    planModeResumeResult(i)
  );
}
//@ chunk-0089hrfm.js:4367-4945 placement
function planModeOnInteractiveResume(
  e,
  {
    storedPermissionMode: storedPermissionMode,
    messages: messages,
    forkSession: forkSession,
    startupModePinned: startupModePinned,
    lane: lane,
  },
) {
  let d = createPlanModeResumeOutcome();
  if (
    ((d.trustedMode = e.mode),
    (d.recordedMode = g(storedPermissionMode)),
    !startupModePinned && !forkSession && _(e))
  ) {
    if (d.recordedMode === "plan") {
      if (((d.recordTranscriptState = planSegmentState(messages)), d.recordTranscriptState !== "exited"))
        d.source = "stored";
    } else if (
      (d.recordedMode === "absent" || d.recordedMode === "invalid") &&
      planSegmentState(messages) === "open"
    )
      ((d.transcriptOpen = !0), (d.source = "transcript"));
  }
  if ((logPlanModeResumeOutcome(d, { lane: lane, hadExternal: !1, hadInternal: !1 }), d.source === "none"))
    return;
  return (
    logForDebugging(`[planModeResume] re-entering plan mode on resume (source: ${d.source}, was ${e.mode})`),
    handlePlanModeTransition(e)
  );
}
//@ chunk-0089hrfm.js:4945-5368 placement
function logPlanModeResumeOutcome(e, { lane: lane, hadExternal: hadExternal, hadInternal: hadInternal }) {
  let r = e.source === "none" ? e.trustedMode : "plan";
  logEvent("tengu_worker_permission_mode_restore", {
    source: fromEnum(e.source),
    lane: fromEnum(lane),
    trusted_mode: fromEnumOpt(e.trustedMode),
    recorded_mode: fromEnum(e.recordedMode),
    target_mode: fromEnumOpt(r),
    had_external: hadExternal,
    had_internal: hadInternal,
    guard_enabled: f(),
    ...(e.recordTranscriptState && { record_transcript_state: fromEnum(e.recordTranscriptState) }),
    ...(e.transcriptOpen && { transcript_open: !0 }),
  });
}

export {
  settleWorkerPermissionModeRecord,
  restorePlanModeFromTranscriptOnly,
  restorePlanModeOnResume,
  isTranscriptPlanSourceAllowed,
};
