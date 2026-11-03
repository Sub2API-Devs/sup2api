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
function planModeResumeEnabled() {
  return getFeatureValue_SESSION_PINNED(TENGU_TRANQUIL_FERN, true);
}
//@ chunk-0089hrfm.js:689-767 placement
function createPlanModeResumeOutcome() {
  return {
    source: "none",
    trustedMode: undefined,
    recordedMode: "absent",
  };
}
//@ chunk-0089hrfm.js:767-918 placement
function planModeResumeResult(planModeResumeOutcome) {
  if (planModeResumeOutcome.source !== "none") return "restored";
  return (planModeResumeOutcome.recordedMode === "plan" || planModeResumeOutcome.transcriptOpen === true) &&
    planModeResumeOutcome.trustedMode !== "plan"
    ? "declined"
    : "none";
}
//@ chunk-0089hrfm.js:918-1016 placement
function parsePermissionModeOrState(e) {
  if (e === undefined || e === null) return "absent";
  return (typeof e === "string" && parsePermissionMode(e)) || "invalid";
}
//@ chunk-0089hrfm.js:1016-1073 placement = handlePlanModeTransition (0.674)
function handlePlanModeTransition(e) {
  return {
    ...transitionPermissionMode(e.mode, "plan", e),
    mode: "plan",
  };
}
//@ chunk-0089hrfm.js:1073-1149 placement
function withPlanModeContext(e) {
  return {
    ...e,
    toolPermissionContext: handlePlanModeTransition(e.toolPermissionContext),
  };
}
//@ chunk-0089hrfm.js:1149-1218 placement
function _(e) {
  return (
    planModeResumeEnabled() &&
    e.mode !== "plan" &&
    ExitPlanModeV2Tool.isEnabled() &&
    !getDenyRuleForTool(e, ExitPlanModeV2Tool)
  );
}
//@ chunk-0089hrfm.js:1218-1779 placement
function planModeFromWorkerRecord(internal, planModeResumeOutcome, { forkSession: o, transcript: s } = {}) {
  planModeResumeOutcome.recordedMode = parsePermissionModeOrState(internal?.worker_permission_mode);
  if (planModeResumeOutcome.recordedMode === "invalid")
    logForDebugging("[planModeResume] ignoring unrecognized internal_metadata.worker_permission_mode", {
      level: "warn",
    });
  if (planModeResumeOutcome.recordedMode === "plan" && s && planModeResumeEnabled())
    planModeResumeOutcome.recordTranscriptState = planSegmentState(s);
  return (r) => {
    planModeResumeOutcome.trustedMode ??= r.toolPermissionContext.mode;
    if (planModeResumeOutcome.recordedMode !== "plan" || o || !_(r.toolPermissionContext)) return r;
    planModeResumeOutcome.source = "internal";
    logForDebugging(
      `[planModeResume] re-entering plan mode from the prior worker's record (was ${r.toolPermissionContext.mode})`,
    );
    return withPlanModeContext(r);
  };
}
//@ chunk-0089hrfm.js:1779-2021 placement
function settleWorkerPermissionModeRecord(
  sessionState,
  mode,
  { planModeOnResume, restored, restartedWorker },
) {
  let i = Boolean(restored?.external || restored?.internal);
  if (restartedWorker && !i) return;
  sessionState.enableWorkerPermissionModeRecord();
  if (planModeOnResume !== undefined && i)
    sessionState.notifyInternalMetadataChanged({
      worker_permission_mode: toExternalPermissionMode(mode),
    });
}
//@ chunk-0089hrfm.js:2021-2471 placement
function planModeFromTranscript(e, planModeResumeOutcome, o, s) {
  let r =
    s &&
    planModeResumeOutcome.source === "none" &&
    (planModeResumeOutcome.recordedMode === "absent" || planModeResumeOutcome.recordedMode === "invalid") &&
    planModeResumeEnabled() &&
    planSegmentState(e) === "open";
  if (r) planModeResumeOutcome.transcriptOpen = true;
  o((i) => {
    planModeResumeOutcome.trustedMode ??= i.toolPermissionContext.mode;
    if (
      !r ||
      i.toolPermissionContext.mode === "plan" ||
      getDenyRuleForTool(i.toolPermissionContext, ExitPlanModeV2Tool)
    )
      return i;
    planModeResumeOutcome.source = "transcript";
    logForDebugging(
      `[planModeResume] re-entering plan mode from the transcript's open plan segment (was ${i.toolPermissionContext.mode})`,
    );
    return withPlanModeContext(i);
  });
}
//@ chunk-0089hrfm.js:2471-3414 placement
/**
 * 从转写中找出最后一段未关闭的计划模式段（plan_mode 附件、/plan、ExitPlanMode 的结果），供恢复会话时判断是否重新进入计划模式。2.1.316 新增，受 tengu_tranquil_fern 控制。
 */
function planSegmentState(messages) {
  let n = `<${COMMAND_NAME}>/plan</${COMMAND_NAME}>`;
  let o = new Set();
  let s = new Set();
  let r = countToolCallsSince(messages);
  let i = false;
  let d = () => (i ? "none" : "open");
  for (let j = messages.length - 1; j >= 0; j--) {
    let l = messages[j];
    if (l.type === "attachment") {
      let m = l.attachment.type;
      if (m === "plan_mode" || m === "plan_mode_reentry") return d();
      if (m === "plan_mode_exit") return "exited";
    } else if (l.type === "assistant" && Array.isArray(l.message.content)) {
      let content = l.message.content;
      for (let j = content.length - 1; j >= 0; j--) {
        let u = content[j];
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
      if (l.permissionMode !== undefined && !l.isMeta && isHumanOrAutoContinuation(l.origin)) i = true;
    }
  }
  return "none";
}
//@ chunk-0089hrfm.js:3414-3654 placement = countToolCallsSince (1)
function countToolCallsSince(e) {
  let n = new Set();
  let o = new Set();
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
//@ chunk-0089hrfm.js:3654-3855 placement
/**
 * 计划是否在等团队负责人批准
 */
function isPlanAwaitingLeader(e, content) {
  let toolUseResult = e.toolUseResult;
  if (
    toolUseResult !== null &&
    typeof toolUseResult === "object" &&
    toolUseResult.awaitingLeaderApproval === true
  )
    return true;
  return typeof content === "string" && content.startsWith("Your plan has been submitted to the team lead");
}
//@ chunk-0089hrfm.js:3855-3980 placement
function isTranscriptPlanSourceAllowed({ sdkUrl, permissionModeSuppliedOnInvocation, forkSession }) {
  if (!ExitPlanModeV2Tool.isEnabled() || forkSession) return false;
  return !!sdkUrl || permissionModeSuppliedOnInvocation === false;
}
//@ chunk-0089hrfm.js:3980-4115 placement
function restorePlanModeFromTranscriptOnly(messages, n, o) {
  let planModeResumeOutcome = createPlanModeResumeOutcome();
  planModeFromTranscript(messages, planModeResumeOutcome, o, isTranscriptPlanSourceAllowed(n));
  logPlanModeResumeOutcome(planModeResumeOutcome, {
    lane: n.sdkUrl ? "sdk_url" : "print",
    hadExternal: false,
    hadInternal: false,
  });
  return planModeResumeResult(planModeResumeOutcome);
}
//@ chunk-0089hrfm.js:4115-4367 placement
function restorePlanModeOnResume(e, n, { lane, forkSession, transcript }) {
  let planModeResumeOutcome = createPlanModeResumeOutcome();
  n(
    planModeFromWorkerRecord(e?.internal, planModeResumeOutcome, {
      forkSession,
      transcript: transcript?.messages,
    }),
  );
  if (transcript)
    planModeFromTranscript(transcript.sourceRows, planModeResumeOutcome, n, transcript.sourceAllowed);
  logPlanModeResumeOutcome(planModeResumeOutcome, {
    lane,
    hadExternal: !!e?.external,
    hadInternal: !!e?.internal,
  });
  return planModeResumeResult(planModeResumeOutcome);
}
//@ chunk-0089hrfm.js:4367-4945 placement
function planModeOnInteractiveResume(
  e,
  { storedPermissionMode, messages, forkSession, startupModePinned, lane },
) {
  let planModeResumeOutcome = createPlanModeResumeOutcome();
  planModeResumeOutcome.trustedMode = e.mode;
  planModeResumeOutcome.recordedMode = parsePermissionModeOrState(storedPermissionMode);
  if (!startupModePinned && !forkSession && _(e)) {
    if (planModeResumeOutcome.recordedMode === "plan") {
      planModeResumeOutcome.recordTranscriptState = planSegmentState(messages);
      if (planModeResumeOutcome.recordTranscriptState !== "exited") planModeResumeOutcome.source = "stored";
    } else if (
      (planModeResumeOutcome.recordedMode === "absent" || planModeResumeOutcome.recordedMode === "invalid") &&
      planSegmentState(messages) === "open"
    ) {
      planModeResumeOutcome.transcriptOpen = true;
      planModeResumeOutcome.source = "transcript";
    }
  }
  logPlanModeResumeOutcome(planModeResumeOutcome, {
    lane,
    hadExternal: false,
    hadInternal: false,
  });
  if (planModeResumeOutcome.source === "none") return;
  logForDebugging(
    `[planModeResume] re-entering plan mode on resume (source: ${planModeResumeOutcome.source}, was ${e.mode})`,
  );
  return handlePlanModeTransition(e);
}
//@ chunk-0089hrfm.js:4945-5368 placement
function logPlanModeResumeOutcome(planModeResumeOutcome, { lane, hadExternal, hadInternal }) {
  let trustedMode = planModeResumeOutcome.source === "none" ? planModeResumeOutcome.trustedMode : "plan";
  logEvent("tengu_worker_permission_mode_restore", {
    source: fromEnum(planModeResumeOutcome.source),
    lane: fromEnum(lane),
    trusted_mode: fromEnumOpt(planModeResumeOutcome.trustedMode),
    recorded_mode: fromEnum(planModeResumeOutcome.recordedMode),
    target_mode: fromEnumOpt(trustedMode),
    had_external: hadExternal,
    had_internal: hadInternal,
    guard_enabled: planModeResumeEnabled(),
    ...(planModeResumeOutcome.recordTranscriptState && {
      record_transcript_state: fromEnum(planModeResumeOutcome.recordTranscriptState),
    }),
    ...(planModeResumeOutcome.transcriptOpen && {
      transcript_open: true,
    }),
  });
}
export {
  settleWorkerPermissionModeRecord,
  restorePlanModeFromTranscriptOnly,
  restorePlanModeOnResume,
  isTranscriptPlanSourceAllowed,
};
