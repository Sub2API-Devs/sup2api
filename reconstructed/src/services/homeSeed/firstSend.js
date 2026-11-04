/**
 * services/homeSeed/firstSend.ts
 *
 * 云会话首条消息等待本机设置上传（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-08945j39.js (23)
 * attribution: placement 23
 */
import {
  trackBackgroundTask,
  isSystemInitMessage,
  toBackgroundTaskEvent,
} from "../../remote/backgroundTaskEvents.js";
import { emitTaskTerminatedSdk } from "../../utils/sdkEventQueue.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../../utils/resultError.js";
import { WITHOUT_DENY_ASK_RULES } from "./writeHomeSettings.js";
import { sleep } from "../../utils/sleep.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { INTERRUPT_SEND_NOW_V1 } from "../../utils/messages/systemInit.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../remoteTools/remoteToolsDebug.js";
import { TICK } from "../../constants/xml.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-08945j39.js:4170-4321 placement
/**
 * 瘦客户端帧处理：更新等待完成与前台状态，返回后台任务结束与任务生命周期帧判断结果。
 */
function trackThinClientFrame(frame, server) {
  trackBackgroundTask(frame.awaitingFinish, server);
  isSystemInitMessage(frame.foreground, server);
  return {
    backgroundTaskEnded: emitTaskTerminatedSdk(frame.awaitingFinish, server),
    isTaskLifecycleFrame: toBackgroundTaskEvent(frame.running, server),
  };
}
//@ chunk-08945j39.js:4321-4395 placement
/**
 * 把任务/子代理类型等标签清洗成可展示文本（限长）。
 */
function sanitizeLabel(value) {
  return typeof value === "string"
    ? sanitizeDisplayText(value, {
        maxCodeUnits: MAX_TITLE_LENGTH,
      })
    : undefined;
}
//@ chunk-08945j39.js:4395-4531 placement
function toBackgroundTaskInfo(id, task, subagentType) {
  return {
    id,
    taskType: sanitizeLabel(task.task_type),
    subagentType: sanitizeLabel(subagentType),
    description: sanitizeLabel(task.description) ?? "",
    ambient: task.ambient === true,
  };
}
//@ chunk-08945j39.js:4531-4737 placement
/**
 * 比较两个后台任务列表（id、类型、子代理类型、描述、ambient）是否相同。
 */
function sameBackgroundTaskList(remoteBackgroundTasks, remote) {
  return (
    remoteBackgroundTasks.length === remote.length &&
    remoteBackgroundTasks.every(
      (left, right) =>
        left.id === remote[right]?.id &&
        left.taskType === remote[right]?.taskType &&
        left.subagentType === remote[right]?.subagentType &&
        left.description === remote[right]?.description &&
        left.ambient === remote[right]?.ambient,
    )
  );
}
//@ chunk-08945j39.js:4737-5452 placement
/**
 * 设置可能未到达云端的说明。
 */
var HOME_SEED_SEND_TEXTS = 2000;
var PROGRESS_UPDATE_MS = 1e4;
var TYPED_AHEAD_GRACE_MS = 2000;
var DEFAULT_TYPED_AHEAD_GRACE_MS = TYPED_AHEAD_GRACE_MS;
var SENDING_SETTINGS_TEXT = "Sending this machine's settings \u2014 Esc cancels the message\u2026";
var stillSendingText = (value) =>
  `Still sending this machine's settings (${Math.round(value / 1000)} s)\u2026`;
var MESSAGE_NOT_SENT_TEXT =
  "That message was not sent; this machine's settings are still on their way to the cloud session, and your next message waits for them too.";
var STOPPED_WAITING_TEXT =
  "you stopped waiting for this machine's settings to reach the cloud session; they are still uploading, and a message sent now waits for them again";
var WITHDRAWN_TEXT = "withdrawn before it was sent";
var SEND_FAILED_DENY_RULES_TEXT = `this machine's settings were not sent (see above); send it again to run it ${WITHOUT_DENY_ASK_RULES}`;
var SEND_MAYBE_FAILED_TEXT =
  "this machine's settings may not have reached the cloud session (see above); send it again to run it anyway";
//@ chunk-08945j39.js:5452-7489 placement
/**
 * 首条消息发送前等待本机设置上传完成，超时/失败后放行
 */
function holdFirstSendForSettings(
  state,
  {
    retire,
    noticeAfterMs = HOME_SEED_SEND_TEXTS,
    progressEveryMs = PROGRESS_UPDATE_MS,
    typedAheadGraceMs = TYPED_AHEAD_GRACE_MS,
    now = Date.now,
  },
) {
  let pastGrace = (nowMs) =>
    state.failureAnsweredAtMs !== undefined && nowMs - state.failureAnsweredAtMs >= typedAheadGraceMs;
  let outcome = state.outcome();
  if (outcome !== undefined && (getFirstSendHold(outcome) === undefined || pastGrace(now()))) {
    if (getFirstSendHold(outcome) !== undefined)
      logFirstSendOutcome(
        getFirstSendGate(outcome) === "hold_unsure" ? "ungated_after_timeout" : "ungated_after_failure",
      );
    return null;
  }
  let seeingFailure = false;
  let progressUsers = 0;
  let progressController;
  let stopNoticeShown = false;
  state.completion.then(
    (completed) => {
      if (getFirstSendHold(completed) !== undefined) state.failureAnsweredAtMs ??= now();
    },
    () => {},
  );
  let decide = (outcome, cameBack, waitStartedAt, atExit, alreadyResent) => {
    let hold = outcome === undefined ? undefined : getFirstSendHold(outcome);
    if (hold !== undefined && (cameBack || !pastGrace(waitStartedAt))) {
      state.failureAnsweredAtMs ??= now();
      seeingFailure = true;
      logFirstSendOutcome(
        atExit
          ? "came_back_at_exit"
          : cameBack
            ? "came_back_waited"
            : now() - (state.settledAtMs() ?? now()) < typedAheadGraceMs
              ? "came_back_early"
              : "came_back_late",
      );
      return hold;
    }
    logFirstSendOutcome(describeFirstSendOutcome(outcome, seeingFailure ? "resent" : "unasked"));
    retire();
    return;
  };
  let runProgress = async (signal) => {
    let startedAt = now();
    await sleep(noticeAfterMs, signal);
    for (let later = false; !signal.aborted; later = true) {
      state.status.publish(later ? stillSendingText(now() - startedAt) : SENDING_SETTINGS_TEXT, "progress");
      await sleep(progressEveryMs, signal);
    }
  };
  let acquireProgress = () => {
    progressUsers += 1;
    if (progressController === undefined) {
      let abortController = new AbortController();
      progressController = abortController;
      state.completion.then(
        () => abortController.abort(),
        () => abortController.abort(),
      );
      runProgress(abortController.signal);
    }
    return () => {
      progressUsers -= 1;
      if (progressUsers === 0 && state.outcome() === undefined) {
        progressController?.abort();
        progressController = undefined;
      }
    };
  };
  let fromPromise = (passed) => {
    let release = passed.then((proceed) => (proceed ? acquireProgress() : undefined));
    return () => void release.then((releaseFn) => releaseFn?.());
  };
  return async (signals) => {
    let { released, withdrawn, exiting, final, decided } = signals;
    let startedAt = now();
    let outcome = state.outcome();
    if (outcome !== undefined) {
      let decision = decide(outcome, false, startedAt, false, false);
      if (decision !== undefined) logFirstSendWait(0, "upload_failed", false);
      return decision;
    }
    let precomputed = undefined;
    let usedPrecompute = precomputed !== undefined;
    let waitedMs = () => now() - startedAt;
    let settledPromise = state.completion.then(
      (settled) => ({
        settled,
      }),
      () => ({
        settled: undefined,
      }),
    );
    let releaseProgress = precomputed === undefined ? acquireProgress() : fromPromise(precomputed.passed);
    let winner = await Promise.race([
      settledPromise,
      released.then(() => "released"),
      withdrawn.then(() => "withdrawn"),
      decided.then(() => "decided"),
    ]);
    releaseProgress();
    let releasedAtExit = winner === "released" && exiting();
    if (releasedAtExit) {
      winner = await Promise.race([
        settledPromise,
        withdrawn.then(() => "withdrawn"),
        decided.then(() => "decided"),
      ]);
      if (typeof winner === "object" && !final()) {
        logFirstSendWait(waitedMs(), "upload_settled", usedPrecompute);
        logFirstSendOutcome(describeFirstSendOutcome(winner.settled, "handover"));
        retire();
        return;
      }
    }
    if (winner === "decided") {
      logFirstSendWait(waitedMs(), "decided", usedPrecompute);
      return;
    }
    if (winner === "released") {
      if (!stopNoticeShown && !usedPrecompute) {
        stopNoticeShown = true;
        setTimeout(() => {
          stopNoticeShown = false;
        }, 0);
        state.status.publish(MESSAGE_NOT_SENT_TEXT, "info");
      }
      logFirstSendWait(waitedMs(), "released", usedPrecompute);
      return {
        go: false,
        reason: STOPPED_WAITING_TEXT,
      };
    }
    if (winner === "withdrawn") {
      logFirstSendWait(waitedMs(), "withdrawn", usedPrecompute);
      return {
        go: false,
        reason: WITHDRAWN_TEXT,
      };
    }
    let decision = decide(winner.settled, true, startedAt, releasedAtExit, usedPrecompute);
    logFirstSendWait(waitedMs(), decision === undefined ? "upload_settled" : "upload_failed", usedPrecompute);
    return decision;
  };
}
//@ chunk-08945j39.js:7489-7796 placement
/**
 * 根据设置上传结果决定首条消息能否发送：上传失败/满/不可用/未授权为 hold_failed，超时为 hold_unsure，其余放行。
 */
function getFirstSendGate(state) {
  if (state.kind !== "uploaded") return "go";
  switch (state.outcome) {
    case "failed":
    case "lane_full":
    case "unavailable":
    case "unauthorized":
      return "hold_failed";
    case "deadline":
      return "hold_unsure";
    case "sent":
    case "unchanged":
    case "conflict_resolved":
    case "raced":
    case "not_forwarded_at_create":
    case "aborted":
      return "go";
  }
}
//@ chunk-08945j39.js:7796-7926 placement
function getFirstSendHold(state) {
  switch (getFirstSendGate(state)) {
    case "go":
      return;
    case "hold_failed":
      return {
        go: false,
        reason: SEND_FAILED_DENY_RULES_TEXT,
      };
    case "hold_unsure":
      return {
        go: false,
        reason: SEND_MAYBE_FAILED_TEXT,
      };
  }
}
//@ chunk-08945j39.js:7926-8112 placement
function describeFirstSendOutcome(state, held) {
  if (state === undefined) return "upload_rejected";
  switch (getFirstSendGate(state)) {
    case "go":
      return "went";
    case "hold_failed":
      return `ran_without_settings_${held}`;
    case "hold_unsure":
      return `ran_unsure_${held}`;
  }
}
//@ chunk-08945j39.js:8112-8279 placement
function logFirstSendOutcome(outcome) {
  if (outcome === "went") logFeatureOk("ccr_home_seed_first_message");
  else if (outcome === "upload_rejected") logFeatureBad("ccr_home_seed_first_message", outcome);
  else logFeatureSad("ccr_home_seed_first_message", outcome);
}
//@ chunk-08945j39.js:8279-8365 placement
/**
 * 记录“首条发送等待设置上传”的埋点。
 */
function logFirstSendWait(heldMs, release, waitedMs) {
  logEvent("tengu_home_seed_first_send_wait", {
    held_ms: heldMs,
    release: fromEnum(release),
    ...{},
  });
}
//@ chunk-08945j39.js:8444-8459 placement
/**
 * 首次发送最多等待的毫秒数（5 分钟）。
 */
var HOLD_MAX_MS = 300000;
//@ chunk-08945j39.js:8459-8539 placement
/**
 * 按查询来源给出等待预算（side_question 10 分钟，其他 75 秒）。
 */
function defaultHoldBudgetMs(subtype, timeoutMs) {
  if (timeoutMs !== undefined) return timeoutMs;
  return subtype === "side_question" ? 600000 : 75000;
}
//@ chunk-08945j39.js:8581-8606 placement
/**
 * 空实现（保留调用点）。
 */
function noopGuard(unused1, unused2, unused3) {
  return;
}
//@ chunk-08945j39.js:8606-8705 placement
/**
 * 瘦客户端 interrupt 回复的 schema。
 */
var thinClientInterruptReplySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-08945j39.js:8606", () => {
  thinClientInterruptReplySchema = DoctorLazy(() =>
    objectSchema({
      send_now: _enum(["stopped", "delivering", "nothing_waiting"]).optional().catch(undefined),
    }),
  );
});
//@ chunk-08945j39.js:8705-8788 placement
/**
 * 云会话是否声明支持 interrupt + send_now。
 */
function supportsSendNow(server) {
  return Array.isArray(server.capabilities) && server.capabilities.includes(INTERRUPT_SEND_NOW_V1);
}
//@ chunk-08945j39.js:8788-9046 placement
/**
 * 向云会话发 interrupt 并 send_now 请求，返回 send_now 结果；请求失败记日志返回 failed。
 */
async function requestSendNow(send, options) {
  try {
    let response = await send({
      subtype: "interrupt",
      send_now: true,
      ...(options !== undefined && {
        message_uuid: options,
      }),
    });
    return (
      parseThinClientReply("interrupt", thinClientInterruptReplySchema(), response ?? {})?.send_now ??
      "stopped"
    );
  } catch (error) {
    logForDebugging(`[thin-client] send-now request failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return "failed";
  }
}
//@ chunk-08945j39.js:9046-9225 placement
var FORWARDED_CONTROL_REQUESTS; // deferred: uses REMOTE_TOOLS_LOG_EVENTS (../remoteTools/remoteToolsDebug.js) of its import cycle while loading; runs once the cycle is complete
var HOST_HANDLED_CONTROL_REQUESTS;
deferInit("chunk-08945j39.js:9046", () => {
  FORWARDED_CONTROL_REQUESTS = [
    "can_use_tool",
    "request_user_dialog",
    "hook_callback",
    ...REMOTE_TOOLS_LOG_EVENTS,
  ];
  HOST_HANDLED_CONTROL_REQUESTS = [
    "elicitation",
    "mcp_message",
    "oauth_token_refresh",
    "host_auth_token_refresh",
    "remote_control_work_secret",
  ];
});
//@ chunk-08945j39.js:9262-9330 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_2;
deferInit("chunk-08945j39.js:9262", () => {
  regExp = new RegExp(`<${TICK}[\\s>]`, "i");
  regExp_2 = new RegExp(`</${TICK}>`, "i");
});
//@ chunk-08945j39.js:9330-9375 placement
/**
 * 判断一帧是否属于可透传的消息类型。
 */
function isForwardedFrame(frame) {
  return regExp.test(frame) && regExp_2.test(frame);
}
//@ chunk-08945j39.js:9375-9672 placement
/**
 * 瘦客户端转发的消息类型，以及各 system 子类型允许透传的字段。
 */
var FORWARDED_MESSAGE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SYSTEM_SUBTYPE_FIELDS;
deferInit("chunk-08945j39.js:9375", () => {
  FORWARDED_MESSAGE_TYPES = new Set(["user", "env_manager_log"]);
  SYSTEM_SUBTYPE_FIELDS = new Map([
    ["thinking_tokens", ["estimated_tokens", "estimated_tokens_delta", "user_message_uuid"]],
    ["post_turn_summary", ["summarizes_uuid", "status_category", "status_detail", "needs_action"]],
    ["task_summary", ["detail"]],
    ["commands_changed", ["commands"]],
  ]);
});
//@ chunk-08945j39.js:9672-9903 placement
function pickSystemMessageFields(payload) {
  let subtype = payload.subtype;
  if (payload.type !== "system" || typeof subtype !== "string") return null;
  let msgPayload = SYSTEM_SUBTYPE_FIELDS.get(subtype);
  if (!msgPayload) return null;
  let value = {
    type: "system",
    subtype,
    uuid: payload.uuid,
    session_id: payload.session_id,
  };
  for (let fieldValue of msgPayload) if (fieldValue in payload) value[fieldValue] = payload[fieldValue];
  return value;
}
//@ chunk-08945j39.js:9903-9914 placement
/**
 * 帧跟踪的时间粒度（500 毫秒）。
 */
var FRAME_TRACK_INTERVAL_MS = 500;
export {
  toBackgroundTaskInfo,
  isForwardedFrame,
  FORWARDED_MESSAGE_TYPES,
  pickSystemMessageFields,
  FRAME_TRACK_INTERVAL_MS,
  noopGuard,
  supportsSendNow,
  FORWARDED_CONTROL_REQUESTS,
  HOST_HANDLED_CONTROL_REQUESTS,
  holdFirstSendForSettings,
  defaultHoldBudgetMs,
  HOLD_MAX_MS,
  trackThinClientFrame,
  requestSendNow,
  sanitizeLabel,
  sameBackgroundTaskList,
  DEFAULT_TYPED_AHEAD_GRACE_MS,
};
