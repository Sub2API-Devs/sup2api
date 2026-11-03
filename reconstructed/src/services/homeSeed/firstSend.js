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
import { u, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { INTERRUPT_SEND_NOW_V1 } from "../../utils/messages/systemInit.js";
import { parseThinClientReply } from "../../cli/thinClient.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { _Ce } from "../remoteTools/remoteToolsDebug.js";
import { TICK } from "../../constants/xml.js";

/**
 * 瘦客户端帧处理：更新等待完成与前台状态，返回后台任务结束与任务生命周期帧判断结果。
 */
//@ chunk-08945j39.js:4170-4321 placement
function trackThinClientFrame(e, n) {
  return (
    trackBackgroundTask(e.awaitingFinish, n),
    isSystemInitMessage(e.foreground, n),
    {
      backgroundTaskEnded: emitTaskTerminatedSdk(e.awaitingFinish, n),
      isTaskLifecycleFrame: toBackgroundTaskEvent(e.running, n),
    }
  );
}
//@ chunk-08945j39.js:4321-4395 placement
function hen(e) {
  return typeof e === "string" ? sanitizeDisplayText(e, { maxCodeUnits: MAX_TITLE_LENGTH }) : void 0;
}
//@ chunk-08945j39.js:4395-4531 placement
function toBackgroundTaskInfo(e, n, s) {
  return {
    id: e,
    taskType: hen(n.task_type),
    subagentType: hen(s),
    description: hen(n.description) ?? "",
    ambient: n.ambient === !0,
  };
}
/**
 * 比较两个后台任务列表（id、类型、子代理类型、描述、ambient）是否相同。
 */
//@ chunk-08945j39.js:4531-4737 placement
function sameBackgroundTaskList(e, n) {
  return (
    e.length === n.length &&
    e.every(
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
var HOME_SEED_SEND_TEXTS = 2000,
  pt = 1e4,
  Ee = 2000,
  QAs = Ee,
  ht = "Sending this machine's settings \u2014 Esc cancels the message\u2026",
  ft = (e) => `Still sending this machine's settings (${Math.round(e / 1000)} s)\u2026`,
  mt =
    "That message was not sent; this machine's settings are still on their way to the cloud session, and your next message waits for them too.",
  gt =
    "you stopped waiting for this machine's settings to reach the cloud session; they are still uploading, and a message sent now waits for them again",
  _t = "withdrawn before it was sent",
  St = `this machine's settings were not sent (see above); send it again to run it ${WITHOUT_DENY_ASK_RULES}`,
  vt =
    "this machine's settings may not have reached the cloud session (see above); send it again to run it anyway";
/**
 * 首条消息发送前等待本机设置上传完成，超时/失败后放行
 */
//@ chunk-08945j39.js:5452-7489 placement
function holdFirstSendForSettings(
  e,
  {
    retire: retire,
    noticeAfterMs: noticeAfterMs = HOME_SEED_SEND_TEXTS,
    progressEveryMs: progressEveryMs = pt,
    typedAheadGraceMs: typedAheadGraceMs = Ee,
    now: now = Date.now,
  },
) {
  let h = (E) => e.failureAnsweredAtMs !== void 0 && E - e.failureAnsweredAtMs >= typedAheadGraceMs,
    outcome = e.outcome();
  if (outcome !== void 0 && (getFirstSendHold(outcome) === void 0 || h(now()))) {
    if (getFirstSendHold(outcome) !== void 0)
      logFirstSendOutcome(
        getFirstSendGate(outcome) === "hold_unsure" ? "ungated_after_timeout" : "ungated_after_failure",
      );
    return null;
  }
  let w = !1,
    R = 0,
    y,
    b = !1;
  e.completion.then(
    (E) => {
      if (getFirstSendHold(E) !== void 0) e.failureAnsweredAtMs ??= now();
    },
    () => {},
  );
  let k = (E, L, A, j, ne) => {
      let G = E === void 0 ? void 0 : getFirstSendHold(E);
      if (G !== void 0 && (L || !h(A)))
        return (
          (e.failureAnsweredAtMs ??= now()),
          (w = !0),
          logFirstSendOutcome(
            j
              ? "came_back_at_exit"
              : L
                ? "came_back_waited"
                : now() - (e.settledAtMs() ?? now()) < typedAheadGraceMs
                  ? "came_back_early"
                  : "came_back_late",
          ),
          G
        );
      (logFirstSendOutcome(describeFirstSendOutcome(E, w ? "resent" : "unasked")), retire());
      return;
    },
    P = async (E) => {
      let L = now();
      await sleep(noticeAfterMs, E);
      for (let A = !1; !E.aborted; A = !0)
        (e.status.publish(A ? ft(now() - L) : ht, "progress"), await sleep(progressEveryMs, E));
    },
    q = () => {
      if (((R += 1), y === void 0)) {
        let abortController = new AbortController();
        ((y = abortController),
          e.completion.then(
            () => abortController.abort(),
            () => abortController.abort(),
          ),
          P(abortController.signal));
      }
      return () => {
        if (((R -= 1), R === 0 && e.outcome() === void 0)) (y?.abort(), (y = void 0));
      };
    },
    fe = (E) => {
      let L = E.then((A) => (A ? q() : void 0));
      return () => void L.then((A) => A?.());
    };
  return async (E) => {
    let { released: released, withdrawn: withdrawn, exiting: exiting, final: final, decided: decided } = E,
      Y = now(),
      outcome = e.outcome();
    if (outcome !== void 0) {
      let K = k(outcome, !1, Y, !1, !1);
      if (K !== void 0) Z(0, "upload_failed", !1);
      return K;
    }
    let z = void 0,
      B = z !== void 0,
      V = () => now() - Y,
      se = e.completion.then(
        (K) => ({ settled: K }),
        () => ({ settled: void 0 }),
      ),
      Q = z === void 0 ? q() : fe(z.passed),
      winner = await Promise.race([
        se,
        released.then(() => "released"),
        withdrawn.then(() => "withdrawn"),
        decided.then(() => "decided"),
      ]);
    Q();
    let M = winner === "released" && exiting();
    if (M) {
      if (
        ((winner = await Promise.race([
          se,
          withdrawn.then(() => "withdrawn"),
          decided.then(() => "decided"),
        ])),
        typeof winner === "object" && !final())
      ) {
        (Z(V(), "upload_settled", B),
          logFirstSendOutcome(describeFirstSendOutcome(winner.settled, "handover")),
          retire());
        return;
      }
    }
    if (winner === "decided") {
      Z(V(), "decided", B);
      return;
    }
    if (winner === "released") {
      if (!b && !B)
        ((b = !0),
          setTimeout(() => {
            b = !1;
          }, 0),
          e.status.publish(mt, "info"));
      return (Z(V(), "released", B), { go: !1, reason: gt });
    }
    if (winner === "withdrawn") return (Z(V(), "withdrawn", B), { go: !1, reason: _t });
    let O = k(winner.settled, !0, Y, M, B);
    return (Z(V(), O === void 0 ? "upload_settled" : "upload_failed", B), O);
  };
}
/**
 * 根据设置上传结果决定首条消息能否发送：上传失败/满/不可用/未授权为 hold_failed，超时为 hold_unsure，其余放行。
 */
//@ chunk-08945j39.js:7489-7796 placement
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
      return { go: !1, reason: St };
    case "hold_unsure":
      return { go: !1, reason: vt };
  }
}
//@ chunk-08945j39.js:7926-8112 placement
function describeFirstSendOutcome(e, n) {
  if (e === void 0) return "upload_rejected";
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
function Z(e, n, s) {
  logEvent("tengu_home_seed_first_send_wait", { held_ms: e, release: fromEnum(n), ...{} });
}
//@ chunk-08945j39.js:8444-8459 placement
var Vkr = 300000;
//@ chunk-08945j39.js:8459-8539 placement
function Me(e, n) {
  if (n !== void 0) return n;
  return e === "side_question" ? 600000 : 75000;
}
//@ chunk-08945j39.js:8581-8606 placement
function H(e, n, s) {
  return;
}
//@ chunk-08945j39.js:8606-8705 placement
var Rt = DoctorLazy(() =>
  u({
    send_now: U(["stopped", "delivering", "nothing_waiting"])
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-08945j39.js:8705-8788 placement
function qkr(e) {
  return Array.isArray(e.capabilities) && e.capabilities.includes(INTERRUPT_SEND_NOW_V1);
}
/**
 * 向云会话发 interrupt 并 send_now 请求，返回 send_now 结果；请求失败记日志返回 failed。
 */
//@ chunk-08945j39.js:8788-9046 placement
async function requestSendNow(e, n) {
  try {
    let s = await e({ subtype: "interrupt", send_now: !0, ...(n !== void 0 && { message_uuid: n }) });
    return parseThinClientReply("interrupt", Rt(), s ?? {})?.send_now ?? "stopped";
  } catch (error) {
    return (
      logForDebugging(`[thin-client] send-now request failed: ${errorMessage(error)}`, { level: "error" }),
      "failed"
    );
  }
}
//@ chunk-08945j39.js:9046-9225 placement
var FORWARDED_CONTROL_REQUESTS = ["can_use_tool", "request_user_dialog", "hook_callback", ..._Ce],
  HOST_HANDLED_CONTROL_REQUESTS = [
    "elicitation",
    "mcp_message",
    "oauth_token_refresh",
    "host_auth_token_refresh",
    "remote_control_work_secret",
  ];
//@ chunk-08945j39.js:9262-9330 placement
var regExp = new RegExp(`<${TICK}[\\s>]`, "i"),
  regExp_2 = new RegExp(`</${TICK}>`, "i");
//@ chunk-08945j39.js:9330-9375 placement
function Ct(e) {
  return regExp.test(e) && regExp_2.test(e);
}
/**
 * 瘦客户端转发的消息类型，以及各 system 子类型允许透传的字段。
 */
//@ chunk-08945j39.js:9375-9672 placement
var FORWARDED_MESSAGE_TYPES = new Set(["user", "env_manager_log"]),
  SYSTEM_SUBTYPE_FIELDS = new Map([
    ["thinking_tokens", ["estimated_tokens", "estimated_tokens_delta", "user_message_uuid"]],
    ["post_turn_summary", ["summarizes_uuid", "status_category", "status_detail", "needs_action"]],
    ["task_summary", ["detail"]],
    ["commands_changed", ["commands"]],
  ]);
//@ chunk-08945j39.js:9672-9903 placement
function pickSystemMessageFields(e) {
  let subtype = e.subtype;
  if (e.type !== "system" || typeof subtype !== "string") return null;
  let s = SYSTEM_SUBTYPE_FIELDS.get(subtype);
  if (!s) return null;
  let i = { type: "system", subtype: subtype, uuid: e.uuid, session_id: e.session_id };
  for (let r of s) if (r in e) i[r] = e[r];
  return i;
}
//@ chunk-08945j39.js:9903-9914 placement
var Ue = 500;

export {
  toBackgroundTaskInfo,
  Ct,
  FORWARDED_MESSAGE_TYPES,
  pickSystemMessageFields,
  Ue,
  H,
  qkr,
  FORWARDED_CONTROL_REQUESTS,
  HOST_HANDLED_CONTROL_REQUESTS,
  holdFirstSendForSettings,
  Me,
  Vkr,
  trackThinClientFrame,
  requestSendNow,
  hen,
  sameBackgroundTaskList,
  QAs,
};
