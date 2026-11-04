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
function parsePermissionModeOrState(modeState) {
  if (modeState === undefined || modeState === null) return "absent";
  return (typeof modeState === "string" && parsePermissionMode(modeState)) || "invalid";
}
//@ chunk-0089hrfm.js:1016-1073 placement = handlePlanModeTransition (0.674)
function handlePlanModeTransition(permissionContext) {
  return {
    ...transitionPermissionMode(permissionContext.mode, "plan", permissionContext),
    mode: "plan",
  };
}
//@ chunk-0089hrfm.js:1073-1149 placement
function withPlanModeContext(context) {
  return {
    ...context,
    toolPermissionContext: handlePlanModeTransition(context.toolPermissionContext),
  };
}
//@ chunk-0089hrfm.js:1149-1218 placement
function _(permissionContext) {
  return (
    planModeResumeEnabled() &&
    permissionContext.mode !== "plan" &&
    ExitPlanModeV2Tool.isEnabled() &&
    !getDenyRuleForTool(permissionContext, ExitPlanModeV2Tool)
  );
}
//@ chunk-0089hrfm.js:1218-1779 placement
function planModeFromWorkerRecord(internal, planModeResumeOutcome, { forkSession, transcript } = {}) {
  planModeResumeOutcome.recordedMode = parsePermissionModeOrState(internal?.worker_permission_mode);
  if (planModeResumeOutcome.recordedMode === "invalid")
    logForDebugging("[planModeResume] ignoring unrecognized internal_metadata.worker_permission_mode", {
      level: "warn",
    });
  if (planModeResumeOutcome.recordedMode === "plan" && transcript && planModeResumeEnabled())
    planModeResumeOutcome.recordTranscriptState = planSegmentState(transcript);
  return (context) => {
    planModeResumeOutcome.trustedMode ??= context.toolPermissionContext.mode;
    if (planModeResumeOutcome.recordedMode !== "plan" || forkSession || !_(context.toolPermissionContext))
      return context;
    planModeResumeOutcome.source = "internal";
    logForDebugging(
      `[planModeResume] re-entering plan mode from the prior worker's record (was ${context.toolPermissionContext.mode})`,
    );
    return withPlanModeContext(context);
  };
}
//@ chunk-0089hrfm.js:1779-2021 placement
function settleWorkerPermissionModeRecord(
  sessionState,
  mode,
  { planModeOnResume, restored, restartedWorker },
) {
  let hasStoredRecord = Boolean(restored?.external || restored?.internal);
  if (restartedWorker && !hasStoredRecord) return;
  sessionState.enableWorkerPermissionModeRecord();
  if (planModeOnResume !== undefined && hasStoredRecord)
    sessionState.notifyInternalMetadataChanged({
      worker_permission_mode: toExternalPermissionMode(mode),
    });
}
//@ chunk-0089hrfm.js:2021-2471 placement
function planModeFromTranscript(messages, planModeResumeOutcome, updateSession, transcriptAllowed) {
  let shouldReenterPlanMode =
    transcriptAllowed &&
    planModeResumeOutcome.source === "none" &&
    (planModeResumeOutcome.recordedMode === "absent" || planModeResumeOutcome.recordedMode === "invalid") &&
    planModeResumeEnabled() &&
    planSegmentState(messages) === "open";
  if (shouldReenterPlanMode) planModeResumeOutcome.transcriptOpen = true;
  updateSession((session) => {
    planModeResumeOutcome.trustedMode ??= session.toolPermissionContext.mode;
    if (
      !shouldReenterPlanMode ||
      session.toolPermissionContext.mode === "plan" ||
      getDenyRuleForTool(session.toolPermissionContext, ExitPlanModeV2Tool)
    )
      return session;
    planModeResumeOutcome.source = "transcript";
    logForDebugging(
      `[planModeResume] re-entering plan mode from the transcript's open plan segment (was ${session.toolPermissionContext.mode})`,
    );
    return withPlanModeContext(session);
  });
}
//@ chunk-0089hrfm.js:2471-3414 placement
/**
 * 从转写中找出最后一段未关闭的计划模式段（plan_mode 附件、/plan、ExitPlanMode 的结果），供恢复会话时判断是否重新进入计划模式。2.1.316 新增，受 tengu_tranquil_fern 控制。
 */
function planSegmentState(messages) {
  let planCommandText = `<${COMMAND_NAME}>/plan</${COMMAND_NAME}>`;
  let erroredToolUseIds = new Set();
  let answeredToolUseIds = new Set();
  let repeatedToolUseIds = countToolCallsSince(messages);
  let humanTurnSeen = false;
  let openIfNoHumanTurn = () => (humanTurnSeen ? "none" : "open");
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message.type === "attachment") {
      let attachmentType = message.attachment.type;
      if (attachmentType === "plan_mode" || attachmentType === "plan_mode_reentry")
        return openIfNoHumanTurn();
      if (attachmentType === "plan_mode_exit") return "exited";
    } else if (message.type === "assistant" && Array.isArray(message.message.content)) {
      let content = message.message.content;
      for (let j = content.length - 1; j >= 0; j--) {
        let contentBlock = content[j];
        if (contentBlock.type !== "tool_use") continue;
        if (
          contentBlock.name === EXITPLANMODE_2 &&
          answeredToolUseIds.has(contentBlock.id) &&
          !erroredToolUseIds.has(contentBlock.id) &&
          !repeatedToolUseIds.has(contentBlock.id)
        )
          return "exited";
        if (
          contentBlock.name === ENTER_PLAN_MODE_TOOL_NAME &&
          answeredToolUseIds.has(contentBlock.id) &&
          (!erroredToolUseIds.has(contentBlock.id) || repeatedToolUseIds.has(contentBlock.id))
        )
          return openIfNoHumanTurn();
      }
    } else if (message.type === "user" && isToolUseResultMessage(message)) {
      let content = message.message.content;
      if (Array.isArray(content)) {
        for (let contentBlock of content)
          if (contentBlock.type === "tool_result")
            (contentBlock.is_error || isPlanAwaitingLeader(message, contentBlock.content)
              ? erroredToolUseIds
              : answeredToolUseIds
            ).add(contentBlock.tool_use_id);
      }
    } else if (message.type === "user") {
      if (getUserMessageText(message)?.trimStart().startsWith(planCommandText)) return openIfNoHumanTurn();
      if (message.permissionMode === "plan") return openIfNoHumanTurn();
      if (
        message.permissionMode !== undefined &&
        !message.isMeta &&
        isHumanOrAutoContinuation(message.origin)
      )
        humanTurnSeen = true;
    }
  }
  return "none";
}
//@ chunk-0089hrfm.js:3414-3654 placement = countToolCallsSince (1)
function countToolCallsSince(messages) {
  let seenToolUseIds = new Set();
  let repeatedToolUseIds = new Set();
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let contentBlock of message.message.content) {
      if (contentBlock.type !== "tool_use") continue;
      if (seenToolUseIds.has(contentBlock.id)) repeatedToolUseIds.add(contentBlock.id);
      else seenToolUseIds.add(contentBlock.id);
    }
  }
  return repeatedToolUseIds;
}
//@ chunk-0089hrfm.js:3654-3855 placement
/**
 * 计划是否在等团队负责人批准
 */
function isPlanAwaitingLeader(message, content) {
  let toolUseResult = message.toolUseResult;
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
function restorePlanModeFromTranscriptOnly(messages, laneOptions, updateSession) {
  let planModeResumeOutcome = createPlanModeResumeOutcome();
  planModeFromTranscript(
    messages,
    planModeResumeOutcome,
    updateSession,
    isTranscriptPlanSourceAllowed(laneOptions),
  );
  logPlanModeResumeOutcome(planModeResumeOutcome, {
    lane: laneOptions.sdkUrl ? "sdk_url" : "print",
    hadExternal: false,
    hadInternal: false,
  });
  return planModeResumeResult(planModeResumeOutcome);
}
//@ chunk-0089hrfm.js:4115-4367 placement
function restorePlanModeOnResume(priorWorkerRecord, updateSession, { lane, forkSession, transcript }) {
  let planModeResumeOutcome = createPlanModeResumeOutcome();
  updateSession(
    planModeFromWorkerRecord(priorWorkerRecord?.internal, planModeResumeOutcome, {
      forkSession,
      transcript: transcript?.messages,
    }),
  );
  if (transcript)
    planModeFromTranscript(
      transcript.sourceRows,
      planModeResumeOutcome,
      updateSession,
      transcript.sourceAllowed,
    );
  logPlanModeResumeOutcome(planModeResumeOutcome, {
    lane,
    hadExternal: !!priorWorkerRecord?.external,
    hadInternal: !!priorWorkerRecord?.internal,
  });
  return planModeResumeResult(planModeResumeOutcome);
}
//@ chunk-0089hrfm.js:4367-4945 placement
function planModeOnInteractiveResume(
  permissionContext,
  { storedPermissionMode, messages, forkSession, startupModePinned, lane },
) {
  let planModeResumeOutcome = createPlanModeResumeOutcome();
  planModeResumeOutcome.trustedMode = permissionContext.mode;
  planModeResumeOutcome.recordedMode = parsePermissionModeOrState(storedPermissionMode);
  if (!startupModePinned && !forkSession && _(permissionContext)) {
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
    `[planModeResume] re-entering plan mode on resume (source: ${planModeResumeOutcome.source}, was ${permissionContext.mode})`,
  );
  return handlePlanModeTransition(permissionContext);
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
  createPlanModeResumeOutcome,
  logPlanModeResumeOutcome,
  planModeFromTranscript,
  planModeFromWorkerRecord,
  planModeOnInteractiveResume,
  planModeResumeResult,
  planSegmentState,
};
