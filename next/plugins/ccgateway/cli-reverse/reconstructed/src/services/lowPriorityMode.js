/**
 * services/lowPriorityMode.ts
 *
 * 2.1.316 新增。低优先级模式。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gxp74sjc.js (11)
 * attribution: placement 11
 */
import { HostScoped } from "../utils/hostScoped.js";
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
  getLowPrioritySessionState,
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
import { onSessionSwitch } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-gxp74sjc.js:584-704 placement
/**
 * 低优先级模式的进程状态（已记录/已显示/已扣留的重置点）。
 */
var LOW_PRIORITY_STATE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gxp74sjc.js:584", () => {
  LOW_PRIORITY_STATE = new HostScoped(() => ({
    notedWallResetsAt: null,
    shownWallResetsAt: null,
    withheldWallResetsAt: null,
    sessionSwitchSubscribed: false,
  }));
});
//@ chunk-gxp74sjc.js:739-896 placement
/**
 * 是否可提供低优先级等待（实验组、有重置时间、未冷却、客户端开启）。
 */
function canOfferLowPriority(limits, nowMs = Date.now()) {
  return (
    isFiveHourAutoResumable(limits) &&
    limits.lowPriorityOffer === "treatment" &&
    limits.resetsAt !== undefined &&
    limits.resetsAt * 1000 > nowMs &&
    !isBudgetSpent(nowMs) &&
    getCooloffUntil(nowMs) === undefined &&
    !isLowPriorityActive() &&
    isLowPriorityEnabled()
  );
}
//@ chunk-gxp74sjc.js:896-1024 placement (2.1.88 match: extractQuotaStatusFromError, 1)
/**
 * 是否可提供低优先级等待（未被拒、存在重置点且未处于其他等待状态）。旧版名错配；疑似归错文件。
 */
function shouldOfferLowPriorityResume(currentLimits, nowMs = Date.now()) {
  let headersToUse = resumableResetAt(nowMs);
  return (
    isAutoContinueEligible() &&
    currentLimits.status !== "rejected" &&
    headersToUse !== undefined &&
    !isLowPriorityArmStale(headersToUse) &&
    !isBudgetSpent(nowMs) &&
    getCooloffUntil(nowMs) === undefined &&
    isLowPriorityEnabled()
  );
}
//@ chunk-gxp74sjc.js:1024-1149 placement
/**
 * 低优先级等待 arm 状态是否已与当前重置点不符（stale）。
 */
function isLowPriorityArmStale(headersToUse) {
  let resumeState = quotaAutoResumeState();
  switch (resumeState.phase) {
    case "idle":
      return false;
    case "armed":
      return resumeState.resetsAtSeconds !== headersToUse;
    case "stale":
      return true;
  }
}
//@ chunk-gxp74sjc.js:1149-1712 placement
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
//@ chunk-gxp74sjc.js:1712-1926 placement
/**
 * 记录低优先级提议已显示。
 */
function logLowPriorityShown(limits, surface) {
  let resetsAt = limits.resetsAt ?? null;
  let lowPrioritySessionState = getLowPrioritySessionState();
  if (resetsAt === null || lowPrioritySessionState.shownWallResetsAt === resetsAt) return;
  lowPrioritySessionState.shownWallResetsAt = resetsAt;
  logEvent("tengu_lowpri_offer_shown", {
    arm: fromEnumOpt(limits.lowPriorityOffer) ?? undefined,
    surface: fromEnum(surface),
    config_version: getLowPriorityConfigVersion(),
  });
}
//@ chunk-gxp74sjc.js:1926-2339 placement
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
    let wasArmed = isQuotaAutoResumeArmed();
    if (wasArmed) cancelQuotaAutoResume("low_priority");
    subscribeLowPriorityReset();
    if (!resumeLowPriority(entry)) return "unavailable";
    if (wasArmed) enqueueAutoContinuation();
    return "resumed";
  }
  return "unavailable";
}
//@ chunk-gxp74sjc.js:2339-2697 placement
/**
 * 低优先级模式开启的提示文本。
 */
function lowPriorityOnMessage(verb) {
  let lowPriorityStateValue = getLowPriorityStateValue();
  let resetLabel =
    lowPriorityStateValue.phase === "active"
      ? formatResetTimeWithLocale(lowPriorityStateValue.resetsAtSeconds)
      : undefined;
  let untilPhrase = resetLabel ? `until your limit resets at ${resetLabel}` : "until your limit resets";
  return `${verb === "resumed" ? `Lower-priority mode is back on ${untilPhrase}` : `Continuing now at lower priority ${untilPhrase}`}. Your weekly limit still applies, and responses may pause while waiting for spare capacity. Run /${LOW_PRIORITY} to stop.`;
}
//@ chunk-gxp74sjc.js:2697-3077 placement
/**
 * 低优先级不可用的原因文本。
 */
function lowPriorityUnavailableMessage(nowMs = Date.now()) {
  if (isBudgetSpent(nowMs))
    return `${statusLineShouldDisplay().budgetExhaustedCopy}. Lower-priority mode is offered again after your weekly limit resets.`;
  let cooloffUntil = getCooloffUntil(nowMs);
  if (cooloffUntil !== undefined)
    return `Lower-priority mode is taking a break until ${formatResetTimeWithLocale(Math.ceil(cooloffUntil / 1000)) ?? "later"}, after waiting too long for spare capacity. Try /${LOW_PRIORITY} again then.`;
  return "Lower-priority mode isn't available right now.";
}
//@ chunk-gxp74sjc.js:3077-3247 placement
/**
 * 低优先级模式关闭的提示文本。
 */
function lowPriorityOffMessage() {
  let currentLimits = getCurrentLimits();
  return `Lower-priority mode is off. New messages wait for your usage limit as usual${canOfferLowPriority(currentLimits) || shouldOfferLowPriorityResume(currentLimits) ? `; run /${LOW_PRIORITY} again to turn it back on` : ""}.`;
}
//@ chunk-gxp74sjc.js:3247-3383 placement
/**
 * 订阅会话切换以在对话重置时结束低优先级模式（只订阅一次）。
 */
function subscribeLowPriorityReset() {
  let lowPrioritySessionState = getLowPrioritySessionState();
  if (lowPrioritySessionState.sessionSwitchSubscribed) return;
  lowPrioritySessionState.sessionSwitchSubscribed = true;
  onSessionSwitch((previous, next) => {
    if (isConversationResetSwitch(next)) endLowPriority("conversation_reset");
  });
}
export {
  canOfferLowPriority,
  logLowPriorityShown,
  enableLowPriorityMode,
  lowPriorityUnavailableMessage,
  lowPriorityOnMessage,
  logLowPriorityCapability,
  lowPriorityOffMessage,
  LOW_PRIORITY_STATE,
};
