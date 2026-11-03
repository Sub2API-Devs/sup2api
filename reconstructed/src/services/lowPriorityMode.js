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
import {
  isFiveHourAutoResumable,
  isAutoContinueEligible,
  currentSubscriptionTier,
  enqueueAutoContinuation,
} from "./rateLimitContinuation.js";
import {
  isBudgetSpent,
  getCooloffUntil,
  isLowPriorityActive,
  resumableResetAt,
  acceptLowPriorityOffer,
  resumeLowPriority,
  getLowPriorityStateValue,
  endLowPriority,
} from "./lowPriority/lowPriorityMode.js";
import { isLowPriorityEnabled, getLowPriorityConfigVersion, LOW_PRIORITY } from "./lowPriority/headers.js";
import {
  quotaAutoResumeState,
  isQuotaAutoResumeArmed,
  cancelQuotaAutoResume,
  isConversationResetSwitch,
} from "./quotaAutoResume/quotaAutoResume.js";
import { logEvent } from "./analytics/index.js";
import { fromEnum, fromEnumOpt } from "./analytics/safeMetadata.js";
import { getCurrentLimits } from "./claudeAiLimits.js";
import { formatResetTimeWithLocale } from "../utils/format.js";
import { statusLineShouldDisplay } from "../components/StatusLine.js";

//@ chunk-77a3xzkb.js:584-704 placement
/**
 * 低优先级模式的进程状态（已记录/已显示/已扣留的重置点）。
 */
var LOW_PRIORITY_STATE = new HostScoped(() => ({
  notedWallResetsAt: null,
  shownWallResetsAt: null,
  withheldWallResetsAt: null,
  sessionSwitchSubscribed: false,
}));
//@ chunk-77a3xzkb.js:704-739 placement
/**
 * 取当前宿主的低优先级状态。
 */
function getLowPrioritySessionState() {
  return LOW_PRIORITY_STATE.of(getRootSession().host);
}
//@ chunk-77a3xzkb.js:739-896 placement
/**
 * 是否可提供低优先级等待（实验组、有重置时间、未冷却、客户端开启）。
 */
function canOfferLowPriority(t, e = Date.now()) {
  return (
    isFiveHourAutoResumable(t) &&
    t.lowPriorityOffer === "treatment" &&
    t.resetsAt !== undefined &&
    t.resetsAt * 1000 > e &&
    !isBudgetSpent(e) &&
    getCooloffUntil(e) === undefined &&
    !isLowPriorityActive() &&
    isLowPriorityEnabled()
  );
}
//@ chunk-77a3xzkb.js:896-1024 placement = extractQuotaStatusFromError (1)
/**
 * 是否可提供低优先级等待（未被拒、存在重置点且未处于其他等待状态）。旧版名错配；疑似归错文件。
 */
function shouldOfferLowPriorityResume(currentLimits, e = Date.now()) {
  let headersToUse = resumableResetAt(e);
  return (
    isAutoContinueEligible() &&
    currentLimits.status !== "rejected" &&
    headersToUse !== undefined &&
    !isLowPriorityArmStale(headersToUse) &&
    !isBudgetSpent(e) &&
    getCooloffUntil(e) === undefined &&
    isLowPriorityEnabled()
  );
}
//@ chunk-77a3xzkb.js:1024-1149 placement
/**
 * 低优先级等待 arm 状态是否已与当前重置点不符（stale）。
 */
function isLowPriorityArmStale(headersToUse) {
  let e = quotaAutoResumeState();
  switch (e.phase) {
    case "idle":
      return false;
    case "armed":
      return e.resetsAtSeconds !== headersToUse;
    case "stale":
      return true;
  }
}
//@ chunk-77a3xzkb.js:1149-1712 placement
/**
 * 记录低优先级提议可用或被扣留（每个重置点一次）。
 */
function logLowPriorityCapability(quotaLimits) {
  if (quotaLimits.lowPriorityOffer === undefined || !isFiveHourAutoResumable(quotaLimits)) return;
  let resetsAt = quotaLimits.resetsAt ?? null;
  if (resetsAt === null) return;
  let lowPrioritySessionState = getLowPrioritySessionState();
  if (lowPrioritySessionState.notedWallResetsAt !== resetsAt) {
    lowPrioritySessionState.notedWallResetsAt = resetsAt;
    logEvent("tengu_lowpri_offer_capable", {
      arm: fromEnum(quotaLimits.lowPriorityOffer),
      tier: fromEnum(currentSubscriptionTier()),
      limit_type: fromEnumOpt(quotaLimits.rateLimitType) ?? undefined,
      auto_armed: isQuotaAutoResumeArmed(),
      client_enabled: isLowPriorityEnabled(),
      config_version: getLowPriorityConfigVersion(),
    });
  }
  if (
    quotaLimits.lowPriorityOffer === "treatment" &&
    getCooloffUntil() !== undefined &&
    lowPrioritySessionState.withheldWallResetsAt !== resetsAt
  ) {
    lowPrioritySessionState.withheldWallResetsAt = resetsAt;
    logEvent("tengu_lowpri_offer_withheld", {
      arm: fromEnum(quotaLimits.lowPriorityOffer),
      reason: fromEnum("cooloff"),
      client_enabled: isLowPriorityEnabled(),
      config_version: getLowPriorityConfigVersion(),
    });
  }
}
//@ chunk-77a3xzkb.js:1712-1926 placement
/**
 * 记录低优先级提议已显示。
 */
function logLowPriorityShown(t, e) {
  let resetsAt = t.resetsAt ?? null;
  let lowPrioritySessionState = getLowPrioritySessionState();
  if (resetsAt === null || lowPrioritySessionState.shownWallResetsAt === resetsAt) return;
  lowPrioritySessionState.shownWallResetsAt = resetsAt;
  logEvent("tengu_lowpri_offer_shown", {
    arm: fromEnumOpt(t.lowPriorityOffer) ?? undefined,
    surface: fromEnum(e),
    config_version: getLowPriorityConfigVersion(),
  });
}
//@ chunk-77a3xzkb.js:1926-2339 placement
/**
 * 开启低优先级模式或恢复已排队的模式，返回 accepted/resumed/unavailable。
 */
function enableLowPriorityMode(entry) {
  let currentLimits = getCurrentLimits();
  if (canOfferLowPriority(currentLimits) && currentLimits.resetsAt !== undefined) {
    cancelQuotaAutoResume("low_priority");
    subscribeLowPriorityReset();
    if (
      !acceptLowPriorityOffer({
        resetsAtSeconds: currentLimits.resetsAt,
        arm: currentLimits.lowPriorityOffer,
        entry,
        retryAfterSeconds: currentLimits.lowPriorityRetryAfterSeconds,
        maxWaitSeconds: currentLimits.lowPriorityMaxWaitSeconds,
      })
    )
      return "unavailable";
    enqueueAutoContinuation();
    return "accepted";
  }
  if (shouldOfferLowPriorityResume(currentLimits)) {
    let o = isQuotaAutoResumeArmed();
    if (o) cancelQuotaAutoResume("low_priority");
    subscribeLowPriorityReset();
    if (!resumeLowPriority(entry)) return "unavailable";
    if (o) enqueueAutoContinuation();
    return "resumed";
  }
  return "unavailable";
}
//@ chunk-77a3xzkb.js:2339-2697 placement
/**
 * 低优先级模式开启的提示文本。
 */
function lowPriorityOnMessage(t) {
  let lowPriorityStateValue = getLowPriorityStateValue();
  let o =
    lowPriorityStateValue.phase === "active"
      ? formatResetTimeWithLocale(lowPriorityStateValue.resetsAtSeconds)
      : undefined;
  let r = o ? `until your limit resets at ${o}` : "until your limit resets";
  return `${t === "resumed" ? `Lower-priority mode is back on ${r}` : `Continuing now at lower priority ${r}`}. Your weekly limit still applies, and responses may pause while waiting for spare capacity. Run /${LOW_PRIORITY} to stop.`;
}
//@ chunk-77a3xzkb.js:2697-3077 placement
/**
 * 低优先级不可用的原因文本。
 */
function lowPriorityUnavailableMessage(t = Date.now()) {
  if (isBudgetSpent(t))
    return `${statusLineShouldDisplay().budgetExhaustedCopy}. Lower-priority mode is offered again after your weekly limit resets.`;
  let cooloffUntil = getCooloffUntil(t);
  if (cooloffUntil !== undefined)
    return `Lower-priority mode is taking a break until ${formatResetTimeWithLocale(Math.ceil(cooloffUntil / 1000)) ?? "later"}, after waiting too long for spare capacity. Try /${LOW_PRIORITY} again then.`;
  return "Lower-priority mode isn't available right now.";
}
//@ chunk-77a3xzkb.js:3077-3247 placement
/**
 * 低优先级模式关闭的提示文本。
 */
function lowPriorityOffMessage() {
  let currentLimits = getCurrentLimits();
  return `Lower-priority mode is off. New messages wait for your usage limit as usual${canOfferLowPriority(currentLimits) || shouldOfferLowPriorityResume(currentLimits) ? `; run /${LOW_PRIORITY} again to turn it back on` : ""}.`;
}
//@ chunk-77a3xzkb.js:3247-3383 placement
/**
 * 订阅会话切换以在对话重置时结束低优先级模式（只订阅一次）。
 */
function subscribeLowPriorityReset() {
  let lowPrioritySessionState = getLowPrioritySessionState();
  if (lowPrioritySessionState.sessionSwitchSubscribed) return;
  lowPrioritySessionState.sessionSwitchSubscribed = true;
  onSessionSwitch((e, o) => {
    if (isConversationResetSwitch(o)) endLowPriority("conversation_reset");
  });
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
