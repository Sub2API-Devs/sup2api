/**
 * services/lowPriorityMode.ts
 *
 * 2.1.316 新增。低优先级模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-77a3xzkb.js (12)
 * attribution: placement 12
 */
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession, onSessionSwitch } from "../bootstrap/state.js";
import { WQe, Qce, JTe, enqueueAutoContinuation } from "./rateLimitContinuation.js";
import {
  j8r,
  K4e,
  dD,
  Jdi,
  acceptLowPriorityOffer,
  resumeLowPriority,
  aAt,
  endLowPriority,
} from "./lowPriority/lowPriorityMode.js";
import { iAt, vEn, LOW_PRIORITY } from "./lowPriority/headers.js";
import {
  quotaAutoResumeState,
  isQuotaAutoResumeArmed,
  cancelQuotaAutoResume,
  isConversationResetSwitch,
} from "./quotaAutoResume/quotaAutoResume.js";
import { logEvent } from "./analytics/index.js";
import { fromEnum, fromEnumOpt } from "./analytics/safeMetadata.js";
import { getCurrentLimits } from "./claudeAiLimits.js";
import { xk } from "../utils/format.js";
import { statusLineShouldDisplay } from "../components/StatusLine.js";

/**
 * 低优先级模式的进程状态（已记录/已显示/已扣留的重置点）。
 */
//@ chunk-77a3xzkb.js:584-704 placement
var LOW_PRIORITY_STATE = new HostScoped(() => ({
  notedWallResetsAt: null,
  shownWallResetsAt: null,
  withheldWallResetsAt: null,
  sessionSwitchSubscribed: !1,
}));
//@ chunk-77a3xzkb.js:704-739 placement
function i() {
  return LOW_PRIORITY_STATE.of(getRootSession().host);
}
/**
 * 是否可提供低优先级等待（实验组、有重置时间、未冷却、客户端开启）。
 */
//@ chunk-77a3xzkb.js:739-896 placement
function canOfferLowPriority(t, e = Date.now()) {
  return (
    WQe(t) &&
    t.lowPriorityOffer === "treatment" &&
    t.resetsAt !== void 0 &&
    t.resetsAt * 1000 > e &&
    !j8r(e) &&
    K4e(e) === void 0 &&
    !dD() &&
    iAt()
  );
}
/**
 * 是否可提供低优先级等待（未被拒、存在重置点且未处于其他等待状态）。旧版名错配；疑似归错文件。
 */
//@ chunk-77a3xzkb.js:896-1024 placement = extractQuotaStatusFromError (1)
function shouldOfferLowPriorityResume(t, e = Date.now()) {
  let headersToUse = Jdi(e);
  return (
    Qce() &&
    t.status !== "rejected" &&
    headersToUse !== void 0 &&
    !isLowPriorityArmStale(headersToUse) &&
    !j8r(e) &&
    K4e(e) === void 0 &&
    iAt()
  );
}
/**
 * 低优先级等待 arm 状态是否已与当前重置点不符（stale）。
 */
//@ chunk-77a3xzkb.js:1024-1149 placement
function isLowPriorityArmStale(t) {
  let e = quotaAutoResumeState();
  switch (e.phase) {
    case "idle":
      return !1;
    case "armed":
      return e.resetsAtSeconds !== t;
    case "stale":
      return !0;
  }
}
/**
 * 记录低优先级提议可用或被扣留（每个重置点一次）。
 */
//@ chunk-77a3xzkb.js:1149-1712 placement
function logLowPriorityCapability(t) {
  if (t.lowPriorityOffer === void 0 || !WQe(t)) return;
  let e = t.resetsAt ?? null;
  if (e === null) return;
  let o = i();
  if (o.notedWallResetsAt !== e)
    ((o.notedWallResetsAt = e),
      logEvent("tengu_lowpri_offer_capable", {
        arm: fromEnum(t.lowPriorityOffer),
        tier: fromEnum(JTe()),
        limit_type: fromEnumOpt(t.rateLimitType) ?? void 0,
        auto_armed: isQuotaAutoResumeArmed(),
        client_enabled: iAt(),
        config_version: vEn(),
      }));
  if (t.lowPriorityOffer === "treatment" && K4e() !== void 0 && o.withheldWallResetsAt !== e)
    ((o.withheldWallResetsAt = e),
      logEvent("tengu_lowpri_offer_withheld", {
        arm: fromEnum(t.lowPriorityOffer),
        reason: fromEnum("cooloff"),
        client_enabled: iAt(),
        config_version: vEn(),
      }));
}
/**
 * 记录低优先级提议已显示。
 */
//@ chunk-77a3xzkb.js:1712-1926 placement
function logLowPriorityShown(t, e) {
  let o = t.resetsAt ?? null,
    r = i();
  if (o === null || r.shownWallResetsAt === o) return;
  ((r.shownWallResetsAt = o),
    logEvent("tengu_lowpri_offer_shown", {
      arm: fromEnumOpt(t.lowPriorityOffer) ?? void 0,
      surface: fromEnum(e),
      config_version: vEn(),
    }));
}
/**
 * 开启低优先级模式或恢复已排队的模式，返回 accepted/resumed/unavailable。
 */
//@ chunk-77a3xzkb.js:1926-2339 placement
function enableLowPriorityMode(t) {
  let e = getCurrentLimits();
  if (canOfferLowPriority(e) && e.resetsAt !== void 0) {
    if (
      (cancelQuotaAutoResume("low_priority"),
      subscribeLowPriorityReset(),
      !acceptLowPriorityOffer({
        resetsAtSeconds: e.resetsAt,
        arm: e.lowPriorityOffer,
        entry: t,
        retryAfterSeconds: e.lowPriorityRetryAfterSeconds,
        maxWaitSeconds: e.lowPriorityMaxWaitSeconds,
      }))
    )
      return "unavailable";
    return (enqueueAutoContinuation(), "accepted");
  }
  if (shouldOfferLowPriorityResume(e)) {
    let o = isQuotaAutoResumeArmed();
    if (o) cancelQuotaAutoResume("low_priority");
    if ((subscribeLowPriorityReset(), !resumeLowPriority(t))) return "unavailable";
    if (o) enqueueAutoContinuation();
    return "resumed";
  }
  return "unavailable";
}
/**
 * 低优先级模式开启的提示文本。
 */
//@ chunk-77a3xzkb.js:2339-2697 placement
function lowPriorityOnMessage(t) {
  let e = aAt(),
    o = e.phase === "active" ? xk(e.resetsAtSeconds) : void 0,
    r = o ? `until your limit resets at ${o}` : "until your limit resets";
  return `${t === "resumed" ? `Lower-priority mode is back on ${r}` : `Continuing now at lower priority ${r}`}. Your weekly limit still applies, and responses may pause while waiting for spare capacity. Run /${LOW_PRIORITY} to stop.`;
}
/**
 * 低优先级不可用的原因文本。
 */
//@ chunk-77a3xzkb.js:2697-3077 placement
function lowPriorityUnavailableMessage(t = Date.now()) {
  if (j8r(t))
    return `${statusLineShouldDisplay().budgetExhaustedCopy}. Lower-priority mode is offered again after your weekly limit resets.`;
  let e = K4e(t);
  if (e !== void 0)
    return `Lower-priority mode is taking a break until ${xk(Math.ceil(e / 1000)) ?? "later"}, after waiting too long for spare capacity. Try /${LOW_PRIORITY} again then.`;
  return "Lower-priority mode isn't available right now.";
}
/**
 * 低优先级模式关闭的提示文本。
 */
//@ chunk-77a3xzkb.js:3077-3247 placement
function lowPriorityOffMessage() {
  let t = getCurrentLimits();
  return `Lower-priority mode is off. New messages wait for your usage limit as usual${canOfferLowPriority(t) || shouldOfferLowPriorityResume(t) ? `; run /${LOW_PRIORITY} again to turn it back on` : ""}.`;
}
/**
 * 订阅会话切换以在对话重置时结束低优先级模式（只订阅一次）。
 */
//@ chunk-77a3xzkb.js:3247-3383 placement
function subscribeLowPriorityReset() {
  let t = i();
  if (t.sessionSwitchSubscribed) return;
  ((t.sessionSwitchSubscribed = !0),
    onSessionSwitch((e, o) => {
      if (isConversationResetSwitch(o)) endLowPriority("conversation_reset");
    }));
}

export {
  logLowPriorityCapability,
  canOfferLowPriority,
  logLowPriorityShown,
  enableLowPriorityMode,
  lowPriorityUnavailableMessage,
  lowPriorityOnMessage,
  lowPriorityOffMessage,
};
