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
import { u, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { INTERRUPT_SEND_NOW_V1 } from "../../utils/messages/systemInit.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { REMOTE_TOOLS_LOG_EVENTS } from "../remoteTools/remoteToolsDebug.js";
import { TICK } from "../../constants/xml.js";

//@ chunk-08945j39.js:4170-4321 placement
/**
 * 瘦客户端帧处理：更新等待完成与前台状态，返回后台任务结束与任务生命周期帧判断结果。
 */
function trackThinClientFrame(e, n) {
  trackBackgroundTask(e.awaitingFinish, n);
  isSystemInitMessage(e.foreground, n);
  return {
    backgroundTaskEnded: emitTaskTerminatedSdk(e.awaitingFinish, n),
    isTaskLifecycleFrame: toBackgroundTaskEvent(e.running, n),
  };
}
//@ chunk-08945j39.js:4321-4395 placement
/**
 * 把任务/子代理类型等标签清洗成可展示文本（限长）。
 */
function sanitizeLabel(e) {
  return typeof e === "string"
    ? sanitizeDisplayText(e, {
        maxCodeUnits: MAX_TITLE_LENGTH,
      })
    : undefined;
}
//@ chunk-08945j39.js:4395-4531 placement
function toBackgroundTaskInfo(id, n, subagentType) {
  return {
    id,
    taskType: sanitizeLabel(n.task_type),
    subagentType: sanitizeLabel(subagentType),
    description: sanitizeLabel(n.description) ?? "",
    ambient: n.ambient === true,
  };
}
//@ chunk-08945j39.js:4531-4737 placement
/**
 * 比较两个后台任务列表（id、类型、子代理类型、描述、ambient）是否相同。
 */
function sameBackgroundTaskList(remoteBackgroundTasks, n) {
  return (
    remoteBackgroundTasks.length === n.length &&
    remoteBackgroundTasks.every(
      (s, i) =>
        s.id === n[i]?.id &&
        s.taskType === n[i]?.taskType &&
        s.subagentType === n[i]?.subagentType &&
        s.description === n[i]?.description &&
        s.ambient === n[i]?.ambient,
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
var stillSendingText = (e) => `Still sending this machine's settings (${Math.round(e / 1000)} s)\u2026`;
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
  e,
  {
    retire,
    noticeAfterMs = HOME_SEED_SEND_TEXTS,
    progressEveryMs = PROGRESS_UPDATE_MS,
    typedAheadGraceMs = TYPED_AHEAD_GRACE_MS,
    now = Date.now,
  },
) {
  let h = (E) => e.failureAnsweredAtMs !== undefined && E - e.failureAnsweredAtMs >= typedAheadGraceMs;
  let v = e.outcome();
  if (v !== undefined && (getFirstSendHold(v) === undefined || h(now()))) {
    if (getFirstSendHold(v) !== undefined)
      logFirstSendOutcome(
        getFirstSendGate(v) === "hold_unsure" ? "ungated_after_timeout" : "ungated_after_failure",
      );
    return null;
  }
  let w = false;
  let R = 0;
  let y;
  let b = false;
  e.completion.then(
    (E) => {
      if (getFirstSendHold(E) !== undefined) e.failureAnsweredAtMs ??= now();
    },
    () => {},
  );
  let k = (E, L, A, j, ne) => {
    let G = E === undefined ? undefined : getFirstSendHold(E);
    if (G !== undefined && (L || !h(A))) {
      e.failureAnsweredAtMs ??= now();
      w = true;
      logFirstSendOutcome(
        j
          ? "came_back_at_exit"
          : L
            ? "came_back_waited"
            : now() - (e.settledAtMs() ?? now()) < typedAheadGraceMs
              ? "came_back_early"
              : "came_back_late",
      );
      return G;
    }
    logFirstSendOutcome(describeFirstSendOutcome(E, w ? "resent" : "unasked"));
    retire();
    return;
  };
  let P = async (signal) => {
    let L = now();
    await sleep(noticeAfterMs, signal);
    for (let A = false; !signal.aborted; A = true) {
      e.status.publish(A ? stillSendingText(now() - L) : SENDING_SETTINGS_TEXT, "progress");
      await sleep(progressEveryMs, signal);
    }
  };
  let q = () => {
    R += 1;
    if (y === undefined) {
      let abortController = new AbortController();
      y = abortController;
      e.completion.then(
        () => abortController.abort(),
        () => abortController.abort(),
      );
      P(abortController.signal);
    }
    return () => {
      R -= 1;
      if (R === 0 && e.outcome() === undefined) {
        y?.abort();
        y = undefined;
      }
    };
  };
  let fe = (passed) => {
    let L = passed.then((A) => (A ? q() : undefined));
    return () => void L.then((A) => A?.());
  };
  return async (E) => {
    let { released, withdrawn, exiting, final, decided } = E;
    let Y = now();
    let X = e.outcome();
    if (X !== undefined) {
      let K = k(X, false, Y, false, false);
      if (K !== undefined) logFirstSendWait(0, "upload_failed", false);
      return K;
    }
    let z = undefined;
    let B = z !== undefined;
    let V = () => now() - Y;
    let se = e.completion.then(
      (settled) => ({
        settled,
      }),
      () => ({
        settled: undefined,
      }),
    );
    let Q = z === undefined ? q() : fe(z.passed);
    let winner = await Promise.race([
      se,
      released.then(() => "released"),
      withdrawn.then(() => "withdrawn"),
      decided.then(() => "decided"),
    ]);
    Q();
    let M = winner === "released" && exiting();
    if (M) {
      winner = await Promise.race([se, withdrawn.then(() => "withdrawn"), decided.then(() => "decided")]);
      if (typeof winner === "object" && !final()) {
        logFirstSendWait(V(), "upload_settled", B);
        logFirstSendOutcome(describeFirstSendOutcome(winner.settled, "handover"));
        retire();
        return;
      }
    }
    if (winner === "decided") {
      logFirstSendWait(V(), "decided", B);
      return;
    }
    if (winner === "released") {
      if (!b && !B) {
        b = true;
        setTimeout(() => {
          b = false;
        }, 0);
        e.status.publish(MESSAGE_NOT_SENT_TEXT, "info");
      }
      logFirstSendWait(V(), "released", B);
      return {
        go: false,
        reason: STOPPED_WAITING_TEXT,
      };
    }
    if (winner === "withdrawn") {
      logFirstSendWait(V(), "withdrawn", B);
      return {
        go: false,
        reason: WITHDRAWN_TEXT,
      };
    }
    let O = k(winner.settled, true, Y, M, B);
    logFirstSendWait(V(), O === undefined ? "upload_settled" : "upload_failed", B);
    return O;
  };
}
//@ chunk-08945j39.js:7489-7796 placement
/**
 * 根据设置上传结果决定首条消息能否发送：上传失败/满/不可用/未授权为 hold_failed，超时为 hold_unsure，其余放行。
 */
function getFirstSendGate(e) {
  if (e.kind !== "uploaded") return "go";
  switch (e.outcome) {
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
function getFirstSendHold(e) {
  switch (getFirstSendGate(e)) {
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
function describeFirstSendOutcome(e, n) {
  if (e === undefined) return "upload_rejected";
  switch (getFirstSendGate(e)) {
    case "go":
      return "went";
    case "hold_failed":
      return `ran_without_settings_${n}`;
    case "hold_unsure":
      return `ran_unsure_${n}`;
  }
}
//@ chunk-08945j39.js:8112-8279 placement
function logFirstSendOutcome(e) {
  if (e === "went") logFeatureOk("ccr_home_seed_first_message");
  else if (e === "upload_rejected") logFeatureBad("ccr_home_seed_first_message", e);
  else logFeatureSad("ccr_home_seed_first_message", e);
}
//@ chunk-08945j39.js:8279-8365 placement
/**
 * 记录“首条发送等待设置上传”的埋点。
 */
function logFirstSendWait(heldMs, n, s) {
  logEvent("tengu_home_seed_first_send_wait", {
    held_ms: heldMs,
    release: fromEnum(n),
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
function noopGuard(e, n, s) {
  return;
}
//@ chunk-08945j39.js:8606-8705 placement
/**
 * 瘦客户端 interrupt 回复的 schema。
 */
var thinClientInterruptReplySchema = DoctorLazy(() =>
  u({
    send_now: _enum(["stopped", "delivering", "nothing_waiting"]).optional().catch(undefined),
  }),
);
//@ chunk-08945j39.js:8705-8788 placement
/**
 * 云会话是否声明支持 interrupt + send_now。
 */
function supportsSendNow(e) {
  return Array.isArray(e.capabilities) && e.capabilities.includes(INTERRUPT_SEND_NOW_V1);
}
//@ chunk-08945j39.js:8788-9046 placement
/**
 * 向云会话发 interrupt 并 send_now 请求，返回 send_now 结果；请求失败记日志返回 failed。
 */
async function requestSendNow(e, n) {
  try {
    let s = await e({
      subtype: "interrupt",
      send_now: true,
      ...(n !== undefined && {
        message_uuid: n,
      }),
    });
    return (
      parseThinClientReply("interrupt", thinClientInterruptReplySchema(), s ?? {})?.send_now ?? "stopped"
    );
  } catch (error) {
    logForDebugging(`[thin-client] send-now request failed: ${errorMessage(error)}`, {
      level: "error",
    });
    return "failed";
  }
}
//@ chunk-08945j39.js:9046-9225 placement
var FORWARDED_CONTROL_REQUESTS = [
  "can_use_tool",
  "request_user_dialog",
  "hook_callback",
  ...REMOTE_TOOLS_LOG_EVENTS,
];
var HOST_HANDLED_CONTROL_REQUESTS = [
  "elicitation",
  "mcp_message",
  "oauth_token_refresh",
  "host_auth_token_refresh",
  "remote_control_work_secret",
];
//@ chunk-08945j39.js:9262-9330 placement
var regExp = new RegExp(`<${TICK}[\\s>]`, "i");
var regExp_2 = new RegExp(`</${TICK}>`, "i");
//@ chunk-08945j39.js:9330-9375 placement
/**
 * 判断一帧是否属于可透传的消息类型。
 */
function isForwardedFrame(e) {
  return regExp.test(e) && regExp_2.test(e);
}
//@ chunk-08945j39.js:9375-9672 placement
/**
 * 瘦客户端转发的消息类型，以及各 system 子类型允许透传的字段。
 */
var FORWARDED_MESSAGE_TYPES = new Set(["user", "env_manager_log"]);
var SYSTEM_SUBTYPE_FIELDS = new Map([
  ["thinking_tokens", ["estimated_tokens", "estimated_tokens_delta", "user_message_uuid"]],
  ["post_turn_summary", ["summarizes_uuid", "status_category", "status_detail", "needs_action"]],
  ["task_summary", ["detail"]],
  ["commands_changed", ["commands"]],
]);
//@ chunk-08945j39.js:9672-9903 placement
function pickSystemMessageFields(payload) {
  let subtype = payload.subtype;
  if (payload.type !== "system" || typeof subtype !== "string") return null;
  let s = SYSTEM_SUBTYPE_FIELDS.get(subtype);
  if (!s) return null;
  let i = {
    type: "system",
    subtype,
    uuid: payload.uuid,
    session_id: payload.session_id,
  };
  for (let r of s) if (r in payload) i[r] = payload[r];
  return i;
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
