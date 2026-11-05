/**
 * services/rateLimitMessages.ts
 *
 * 订阅限额的面向用户文案：被拒/预警/正在用 overage 时的提示文本、按订阅类型的升级或换模型建议。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/rateLimitMessages.ts
 * pieces: chunk-77cpes3s.js (6), chunk-7pwjpdkw.js (15), chunk-z20c443b.js (3)
 * attribution: placement 9, fingerprint 6, callgraph-fingerprint 3, layout 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { formatResetTimeWithLocale, utilizationPercent, planWindowPercent } from "../utils/format.js";
import {
  RATE_LIMIT_DISPLAY_NAMES,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  isSubagentWrapUpNoteDue,
  wrapUpOnMainTurnStart,
  takeWrapUpTurnNote,
  markWrapUpStartNotePlaced,
  getWrapUpZone,
  consumeNearLimitWrapUpHint,
} from "./claudeAiLimits.js";
import {
  isUsageBasedBilling,
  isConsumerPlan,
  canShowUpgradeCommand,
  isModelBilledOrRequired,
  usesPayAsYouGo,
} from "../utils/planTiers.js";
import { formatRateLimitMessage } from "../entrypoints/sdk/coreSchemas.js";
import { NEAR_LIMIT_UTILIZATION, isVellumAnchorEnabled, overageIncludedModels } from "./api/usage.js";
import {
  getSubscriptionType,
  getOauthAccountInfo,
  isExtraUsageAllowed,
  getRateLimitTier,
  getUsageCreditsCommand,
} from "../utils/auth.js";
import {
  renderUsageCreditsOnlyModelName,
  parseUserSpecifiedModel,
  isUsageCreditsOnlyModel,
  getPublicModelDisplayName,
} from "../utils/model/modelDisplay.js";
import { modelSupportsEffort, getEffortLevelOrHigh } from "../utils/effort.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import {
  isBotProtectedWrapUpTextOn,
  formatWrapUpText,
  WRAP_UP_TEXT_FLAG,
  parseWrapUpMode,
  TENGU_LANTERN_WICK_MODE,
  GRACE_CHECKPOINT_NOTE,
  USAGE_LIMIT_WRAP_UP_NOTE,
  TENGU_VELLUM_ANCHOR,
  WRAP_UP_APPROACHING_NOTICE,
  NOTICE,
  WRAP_UP_APPROACHING_CHECKPOINT_NOTE,
} from "./usageLimitGrace.js";
import { sanitizeAttributeValue } from "../utils/sanitization.js";
import { logFeatureSad, logFeatureOk } from "./analytics/featureTelemetry.js";
import { isSessionTaskTurn } from "../utils/messages/promptOrigin.js";
import { createUserMessage, createSystemMessage } from "../utils/messages.js";
import { getIsNonInteractiveSession, getSessionId } from "../bootstrap/state.js";
import { logError } from "../utils/log.js";

//@ chunk-z20c443b.js:49714-50279 placement
/**
 * 用量上限消息的开头文本集合。
 */
var LIMIT_MESSAGE_PREFIXES = [
  "You've hit your",
  "You've reached your",
  "You're out of usage credits",
  "Your org is out of usage \xB7 add funds to continue",
  "Your org is out of usage \xB7 contact your admin",
  "Your seat type doesn't include usage credits",
  "Your seat type doesn't include usage",
  "Your usage allocation has been disabled by your admin",
  "Your group's usage limit is set to $0",
  "Fable 5 requires usage credits",
  "You're out of extra usage",
  "Your seat type doesn't include extra usage",
];
var LIMIT_MESSAGE_PREFIX_PATTERNS = [
  /^(?:Fable|Haiku|Mythos|Opus|Sonnet)(?: [^\u00B7\n]{1,40})? requires usage credits\./,
];
//@ chunk-z20c443b.js:50279-50359 placement
function isRateLimitErrorMessage(text) {
  return (
    LIMIT_MESSAGE_PREFIXES.some((prefix) => text.startsWith(prefix)) ||
    LIMIT_MESSAGE_PREFIX_PATTERNS.some((pattern) => pattern.test(text))
  );
}
//@ chunk-z20c443b.js:50359-50662 fingerprint (2.1.88 match: RATE_LIMIT_ERROR_PREFIXES, 0.403)
/**
 * 限额文案前缀表：错误类、预警类（"You've used"/"You're close to"）、overage 类（"Now using usage credits" 等），用于识别限额消息。
 */
var RATE_LIMIT_ERROR_PREFIXES = ["This service is disabled for your org"];
var RATE_LIMIT_WARNING_PREFIXES = ["You've used", "You're close to"];
var OVERAGE_NOTICE_PREFIXES = [
  "You're now using usage credits",
  "You're now using your usage allocation",
  "Now using your usage allocation",
  "Now using usage credits",
  "Now using credits",
  "You're now using extra usage",
  "Now using extra usage",
];
//@ chunk-7pwjpdkw.js:20506-20861 placement
function rateLimitWindowLabel(limits) {
  let resetTime = limits.resetsAt ? formatResetTimeWithLocale(limits.resetsAt, true) : undefined;
  if (!resetTime) return null;
  switch (limits.rateLimitType) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
      return {
        limitName: RATE_LIMIT_DISPLAY_NAMES[limits.rateLimitType],
        resetTime,
      };
    case "seven_day_sonnet":
      return {
        limitName: getWeeklyModelLimitName(),
        resetTime,
      };
    case "seven_day_overage_included":
    case "overage":
    case undefined:
      return null;
    default:
      return null;
  }
}
//@ chunk-7pwjpdkw.js:20861-21427 fingerprint (2.1.88 match: getRateLimitMessage, 0.621)
/**
 * 由额度状态得到 {message, severity}：overage 预警、被拒（错误）、allowed_warning（团队/企业已开 extra usage 时不提示）。
 */
function getRateLimitMessage(limits, model, threshold) {
  if (limits.isUsingOverage) {
    if (limits.overageStatus === "allowed_warning") {
      let limitName = isUsageBasedBilling() ? "usage limit" : "usage credit limit";
      let utilizationPercent = toUtilizationPercent(threshold);
      return {
        message: utilizationPercent
          ? `Over ${utilizationPercent}% of your ${limitName} used`
          : `You're close to your ${limitName}`,
        severity: "warning",
      };
    }
    return null;
  }
  if (limits.status === "rejected")
    return {
      message: formatRateLimitMessage(limits, model),
      severity: "error",
    };
  if (limits.status === "allowed_warning") {
    if (limits.utilization !== undefined && limits.utilization < NEAR_LIMIT_UTILIZATION) return null;
    let subscriptionType = getSubscriptionType();
    let isTeamOrEnterprise = subscriptionType === "team" || subscriptionType === "enterprise";
    let hasExtraUsageEnabled = getOauthAccountInfo()?.hasExtraUsageEnabled === true;
    if (isTeamOrEnterprise && hasExtraUsageEnabled && !isConsumerPlan()) return null;
    let text = getEarlyWarningText(limits);
    if (text)
      return {
        message: text,
        severity: "warning",
      };
  }
  return null;
}
//@ chunk-7pwjpdkw.js:21427-21515 callgraph-fingerprint (2.1.88 match: getRateLimitErrorMessage, 1)
/**
 * 只取错误级文案。
 */
function getRateLimitErrorMessage(limits, model) {
  let message = getRateLimitMessage(limits, model);
  if (message && message.severity === "error") return message.message;
  return null;
}
//@ chunk-7pwjpdkw.js:21515-21609 callgraph-fingerprint (2.1.88 match: getRateLimitWarning, 1)
/**
 * 只取警告级文案。
 */
function getRateLimitWarning(limits, model, threshold) {
  let message = getRateLimitMessage(limits, model, threshold);
  if (message && message.severity === "warning") return message.message;
  return null;
}
//@ chunk-7pwjpdkw.js:24576-24893 callgraph-fingerprint (2.1.88 match: getLimitReachedText, 0.332)
/**
 * 被拒时的"You've hit your <限额>"文案（按限额类型）。
 */
function getLimitReachedText(limits, model, options) {
  switch (limits.rateLimitType) {
    case "seven_day_sonnet":
      return formatLimitReachedText(getWeeklyModelLimitName(), model, options, {
        progressSavedSuffix: isVellumAnchorEnabled(),
      });
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
      return formatLimitReachedText(RATE_LIMIT_DISPLAY_NAMES[limits.rateLimitType], model, options, {
        progressSavedSuffix: isVellumAnchorEnabled(),
      });
    case "seven_day_overage_included":
      return formatLimitReachedText(RATE_LIMIT_DISPLAY_NAMES[limits.rateLimitType], model, options);
    default:
      return null;
  }
}
//@ chunk-7pwjpdkw.js:24893-25016 layout
/**
 * 利用率转 1–99 的整数百分比。
 */
function toUtilizationPercent(fraction) {
  if (fraction === undefined || !Number.isFinite(fraction) || fraction <= 0 || fraction >= 1) return;
  return Math.min(99, Math.floor(Math.round(fraction * 1e4) / 100));
}
//@ chunk-7pwjpdkw.js:25016-25715 fingerprint (2.1.88 match: getEarlyWarningText, 0.526)
/**
 * 预警文案："You've used N% of your <限额>" 等。
 */
function getEarlyWarningText(limits) {
  let percent = limits.utilization
    ? Math.floor(
        limits.rateLimitType === "overage"
          ? utilizationPercent(limits.utilization)
          : planWindowPercent(limits.utilization),
      )
    : undefined;
  let limitName = null;
  switch (limits.rateLimitType) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
    case "seven_day_sonnet":
    case "seven_day_overage_included":
      limitName = RATE_LIMIT_DISPLAY_NAMES[limits.rateLimitType];
      break;
    case "overage":
      if (isUsageBasedBilling()) limitName = percent ? "usage" : "usage limit";
      else limitName = percent ? "usage credits" : "usage credit limit";
      break;
    case undefined:
      return null;
  }
  let isUsageAllocation = limits.rateLimitType === "overage" && isUsageBasedBilling();
  let resetTime =
    limits.resetsAt && !isUsageAllocation ? formatResetTimeWithLocale(limits.resetsAt, true) : undefined;
  let warningUpsellText = getWarningUpsellText(limits.rateLimitType);
  let surpassedPercent = percent ? undefined : toUtilizationPercent(limits.surpassedThreshold);
  return [
    percent
      ? `You've used ${percent}% of your ${limitName}`
      : surpassedPercent
        ? `Over ${surpassedPercent}% of your ${limitName} used`
        : `Approaching ${limitName}`,
    resetTime && `resets ${resetTime}`,
    warningUpsellText,
  ]
    .filter(Boolean)
    .join(" \xB7 ");
}
//@ chunk-7pwjpdkw.js:25715-26356 fingerprint (2.1.88 match: getWarningUpsellText, 0.61)
/**
 * 按订阅类型的升级/购买提示。
 */
function getWarningUpsellText(rateLimitType) {
  let subscriptionType = getSubscriptionType();
  let hasExtraUsageEnabled = getOauthAccountInfo()?.hasExtraUsageEnabled === true;
  let isConsumer = isConsumerPlan();
  if (subscriptionType === "team" || subscriptionType === "enterprise") {
    if (!hasExtraUsageEnabled && isExtraUsageAllowed())
      return isConsumer
        ? "Run /usage-credits to turn on extra usage for your org"
        : "Run /usage-credits to ask your admin for more";
    if (hasExtraUsageEnabled && rateLimitType === "overage") {
      if (isExtraUsageAllowed())
        return isConsumer
          ? "Run /usage-credits to raise the cap"
          : "Run /usage-credits to ask your admin for more";
      return isConsumer
        ? `Raise the cap at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}`
        : "Ask your admin for more";
    }
    return null;
  }
  if (subscriptionType === "max" && getRateLimitTier() === "default_claude_max_20x")
    return !hasExtraUsageEnabled && isExtraUsageAllowed() ? "/usage-credits to keep using Claude Code" : null;
  if (
    rateLimitType === "five_hour" &&
    (subscriptionType === "pro" || subscriptionType === "max") &&
    !hasExtraUsageEnabled &&
    canShowUpgradeCommand()
  )
    return "/upgrade to keep using Claude Code";
  return null;
}
//@ chunk-7pwjpdkw.js:26356-26579 layout
/**
 * 需要用量信用的模型受限时提示购买或换模型。
 */
function getModelSwitchUpsell(model) {
  if (model === null || !isCreditsOnlyModelLimit(model)) return null;
  if (!isExtraUsageAllowed()) return "Switch models to keep working.";
  if (!isConsumerPlan()) return "Switch models to keep working.";
  return `Buy more to keep using ${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(model))}, or switch models to keep working.`;
}
//@ chunk-7pwjpdkw.js:26579-26656 layout
/**
 * 模型受"仅用量信用"限制（可用、需信用、未豁免）。
 */
function isCreditsOnlyModelLimit(model) {
  if (model === null) return false;
  let modelId = parseUserSpecifiedModel(model);
  return isUsageCreditsOnlyModel(modelId) && isModelBilledOrRequired(modelId) && !usesPayAsYouGo();
}
//@ chunk-7pwjpdkw.js:26656-27057 layout
/**
 * Pro 用户周限额预警时的换模型建议（如 /model opus 更多余量）。
 */
function getProRunwayTip(claudeAiLimits, mainLoopModel, effortValue) {
  if (getSubscriptionType() !== "pro") return null;
  if (claudeAiLimits.rateLimitType !== "seven_day") return null;
  if (mainLoopModel.includes("fable"))
    return {
      lever: "model",
      text: "try /model opus \xB7 more runway",
    };
  if (mainLoopModel.includes("opus"))
    return {
      lever: "model",
      text: "try /model sonnet \xB7 ~2\xD7 runway",
    };
  if (!modelSupportsEffort(mainLoopModel)) return null;
  let effortLevelOrHigh = getEffortLevelOrHigh(mainLoopModel, effortValue);
  if (effortLevelOrHigh === "high" || effortLevelOrHigh === "xhigh" || effortLevelOrHigh === "max")
    return {
      lever: "effort",
      text: "try /effort medium",
    };
  return null;
}
//@ chunk-7pwjpdkw.js:27057-27697 fingerprint (2.1.88 match: getUsingOverageText, 0.407)
/**
 * 正在使用 overage 时的提示文案。
 */
function getUsingOverageText(limits, mainLoopModel) {
  let resetTime = limits.resetsAt ? formatResetTimeWithLocale(limits.resetsAt, true) : "";
  let limitName = "";
  switch (limits.rateLimitType) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
      limitName = RATE_LIMIT_DISPLAY_NAMES[limits.rateLimitType];
      break;
    case "seven_day_sonnet":
      limitName = getWeeklyModelLimitName();
      break;
    case "seven_day_overage_included":
    case "overage":
    case undefined:
      break;
  }
  let subscriptionType = isUsageBasedBilling();
  if (!limitName && !subscriptionType && mainLoopModel) {
    let publicModelDisplayName = getPublicModelDisplayName(parseUserSpecifiedModel(mainLoopModel));
    if (
      publicModelDisplayName &&
      overageIncludedModels().some(
        (includedModel) => includedModel.toLowerCase() === publicModelDisplayName.toLowerCase(),
      )
    ) {
      let resetSuffix = resetTime ? ` \xB7 Your ${publicModelDisplayName} limit resets ${resetTime}` : "";
      return `Now using usage credits for ${publicModelDisplayName}${resetSuffix}`;
    }
  }
  let allocationText = subscriptionType ? "your usage allocation" : "usage credits";
  if (!limitName) return subscriptionType ? `Now using ${allocationText}` : "Now using credits";
  let resetMessage = resetTime && !subscriptionType ? ` \xB7 Your ${limitName} resets ${resetTime}` : "";
  return `You're now using ${allocationText}${resetMessage}`;
}
//@ chunk-7pwjpdkw.js:27697-27793 layout
/**
 * Pro/企业显示 weekly limit，否则 Sonnet limit。
 */
function getWeeklyModelLimitName() {
  let subscriptionType = getSubscriptionType();
  return subscriptionType === "pro" || subscriptionType === "enterprise"
    ? RATE_LIMIT_DISPLAY_NAMES.seven_day
    : RATE_LIMIT_DISPLAY_NAMES.seven_day_sonnet;
}
//@ chunk-7pwjpdkw.js:27793-27924 layout
/**
 * " · run <命令> to ask your admin for a higher limit"。
 */
function getAskAdminSuffix() {
  let usageCreditsCommand = getUsageCreditsCommand();
  return usageCreditsCommand
    ? ` \xB7 run ${usageCreditsCommand} to ask your admin for a higher limit`
    : " \xB7 ask your admin for a higher limit";
}
//@ chunk-7pwjpdkw.js:27924-28036 fingerprint (2.1.88 match: formatLimitReachedText, 0.403)
/**
 * "You've hit your <限额><重置时间>[ · progress saved]"。
 */
function formatLimitReachedText(limitName, suffix, resetText, options) {
  let savedSuffix = options?.progressSavedSuffix ? " \xB7 progress saved" : "";
  return `You've hit your ${limitName}${suffix}${savedSuffix}`;
}
//@ chunk-77cpes3s.js:520-732 placement
var TENGU_LANTERN_WICK_RELEASE = "tengu_lantern_wick_release";
var TENGU_LANTERN_WICK_BRAID = "tengu_lantern_wick_braid";
var TENGU_LANTERN_WICK_BRAID_TEXT = "tengu_lantern_wick_braid_text";
var TENGU_LANTERN_WICK_BRAID_RELEASE = "tengu_lantern_wick_braid_release";
var TENGU_LANTERN_WICK_TEXT_BY_MODEL = "tengu_lantern_wick_text_by_model";
var TENGU_LANTERN_WICK_RELEASE_BY_MODEL = "tengu_lantern_wick_release_by_model";
//@ chunk-77cpes3s.js:732-775 placement
function servedTextOrFlag(byModelFlag, fallbackFlag, model) {
  return servedTextForModel(byModelFlag, model) ?? getFeatureValue_CACHED_MAY_BE_STALE(fallbackFlag, "");
}
//@ chunk-77cpes3s.js:775-927 placement
/**
 * 从开关配置中按模型名、规范名或 default 取服务端下发的文字。
 */
function servedTextForModel(byModelFlag, model) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(byModelFlag, {});
  if (typeof featureValue_CACHED_MAY_BE_STALE !== "object" || featureValue_CACHED_MAY_BE_STALE === null)
    return;
  let byModel = featureValue_CACHED_MAY_BE_STALE;
  return [model, getCanonicalName(model), "default"]
    .map((key) => byModel[key])
    .find((text) => typeof text === "string");
}
//@ chunk-77cpes3s.js:927-1240 placement
/**
 * 把服务端下发的文字清洗后加方括号，清洗失败或被改动时记遥测。
 */
function bracketServedText(text) {
  if (isBotProtectedWrapUpTextOn()) {
    let sanitized = sanitizeAttributeValue(text);
    if (sanitized === null) {
      if (typeof text === "string" && text.trim() !== "")
        logFeatureSad("usage_limit_served_text_rejected", "release_text");
      return "";
    }
    if (typeof text === "string" && sanitized !== text.trim())
      logFeatureSad("usage_limit_served_text_altered", "release_text");
    return `[${sanitized}]`;
  }
  let trimmed = typeof text === "string" ? text.trim() : "";
  return trimmed ? `[${trimmed}]` : "";
}
//@ chunk-77cpes3s.js:1240-1374 placement
function lastUsageLimitNote(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type === "user" && message.usageLimitNote !== undefined) return message.usageLimitNote;
  }
  return;
}
//@ chunk-77cpes3s.js:1374-3067 placement
function* usageLimitNotices(
  messages,
  {
    resumeActive,
    isMainLoop,
    querySource,
    depth,
    continuesInterruptedWork,
    model,
    toolUseContext,
    now,
    uuid,
  },
) {
  let { agentContext } = toolUseContext;
  let isAgentCall =
    !isMainLoop &&
    querySource.startsWith("agent:") &&
    agentContext.agentType !== "teammate" &&
    !(agentContext.agentType === "subagent" && agentContext.workflowRunId);
  if (resumeActive || !(isMainLoop || isAgentCall)) return messages;
  let notices = [];
  try {
    let isFirstTaskTurn = isMainLoop && depth === 0 && isSessionTaskTurn(messages);
    let wrapUpDue = isFirstTaskTurn && isSubagentWrapUpNoteDue();
    if (isMainLoop && depth === 0 && !wrapUpDue) wrapUpOnMainTurnStart();
    let wrapUpPushed = false;
    let wrapUpTurnNote = false;
    if (isMainLoop && (depth > 0 || wrapUpDue)) {
      wrapUpTurnNote = takeWrapUpTurnNote();
      if (wrapUpDue && !wrapUpTurnNote) {
        let lastNote = lastUsageLimitNote(messages);
        if (lastNote !== "wrap_up" && lastNote !== "near_limit") wrapUpOnMainTurnStart();
      }
    }
    if (
      isMainLoop
        ? wrapUpTurnNote
        : isSubagentWrapUpNoteDue() &&
          getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID, false) === true &&
          lastUsageLimitNote(messages) !== "wrap_up"
    ) {
      let wrapUpText =
        (isMainLoop
          ? null
          : formatWrapUpText(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID_TEXT, ""))) ??
        formatWrapUpText(servedTextOrFlag(TENGU_LANTERN_WICK_TEXT_BY_MODEL, WRAP_UP_TEXT_FLAG, model));
      let wrapUpMode =
        wrapUpText !== null
          ? "custom"
          : parseWrapUpMode(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_MODE, "off"));
      if (wrapUpMode !== "off") {
        notices.push(
          createUserMessage({
            content:
              wrapUpText ?? (wrapUpMode === "next-steps" ? GRACE_CHECKPOINT_NOTE : USAGE_LIMIT_WRAP_UP_NOTE),
            isMeta: true,
            turnCompanion: true,
            usageLimitNote: "wrap_up",
            now,
            uuidFn: uuid,
          }),
        );
        logFeatureOk(isMainLoop ? "usage_limit_grace_wrapup" : "usage_limit_grace_wrapup_subagent", {
          next_steps: wrapUpMode === "next-steps",
          custom: wrapUpMode === "custom",
        });
        wrapUpPushed = true;
        if (isMainLoop) markWrapUpStartNotePlaced();
      }
    }
    let wrapUpZone = !isMainLoop || isFirstTaskTurn ? getWrapUpZone() : null;
    let hasExtraUsage = wrapUpZone !== null && wrapUpZone.extraUsageStatus === undefined;
    let shouldRelease;
    if (isMainLoop) {
      let lastNote = depth === 0 ? lastUsageLimitNote(messages) : undefined;
      shouldRelease =
        !hasExtraUsage && !continuesInterruptedWork && (lastNote === "wrap_up" || lastNote === "near_limit");
    } else
      shouldRelease =
        !hasExtraUsage &&
        lastUsageLimitNote(messages) === "wrap_up" &&
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID, false) === true;
    if (shouldRelease) {
      let releaseText =
        (isMainLoop
          ? ""
          : bracketServedText(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID_RELEASE, ""))) ||
        bracketServedText(
          servedTextOrFlag(TENGU_LANTERN_WICK_RELEASE_BY_MODEL, TENGU_LANTERN_WICK_RELEASE, model),
        );
      if (releaseText) {
        notices.push(
          createUserMessage({
            content: releaseText,
            isMeta: true,
            turnCompanion: true,
            usageLimitNote: "release",
            now,
            uuidFn: uuid,
          }),
        );
        logFeatureOk(isMainLoop ? "usage_limit_grace_release" : "usage_limit_grace_release_subagent");
      }
    }
    if (
      isMainLoop &&
      depth > 0 &&
      consumeNearLimitWrapUpHint() &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELLUM_ANCHOR, false)
    ) {
      notices.push(createSystemMessage(WRAP_UP_APPROACHING_NOTICE, NOTICE));
      if (!wrapUpPushed)
        notices.push(
          createUserMessage({
            content: WRAP_UP_APPROACHING_CHECKPOINT_NOTE,
            isMeta: true,
            turnCompanion: true,
            usageLimitNote: "near_limit",
            now,
            uuidFn: uuid,
          }),
        );
      logFeatureOk("usage_limit_near_wrapup");
      if (!getIsNonInteractiveSession())
        import("./rateLimitCheckpoint/performRateLimitCheckpoint.lazy.js")
          .then(({ performRateLimitCheckpoint }) =>
            performRateLimitCheckpoint({
              todos: toolUseContext.getAppState().todos[toolUseContext.agentId ?? getSessionId()] ?? [],
              trigger: "near_limit",
            }),
          )
          .catch(() => {});
    }
  } catch (error) {
    logError(error);
  }
  let pushed = [];
  for (let notice of notices) {
    yield notice;
    if (notice.type === "user") pushed.push(notice);
  }
  return pushed.length === 0 ? messages : [...messages, ...pushed];
}
export {
  getLimitReachedText,
  rateLimitWindowLabel,
  formatLimitReachedText,
  getAskAdminSuffix,
  getRateLimitErrorMessage,
  isRateLimitErrorMessage,
  LIMIT_MESSAGE_PREFIXES,
  RATE_LIMIT_WARNING_PREFIXES,
  OVERAGE_NOTICE_PREFIXES,
  RATE_LIMIT_ERROR_PREFIXES,
  LIMIT_MESSAGE_PREFIX_PATTERNS,
  getWarningUpsellText,
  getUsingOverageText,
  getRateLimitWarning,
  getProRunwayTip,
  getModelSwitchUpsell,
  servedTextForModel,
  usageLimitNotices,
  getWeeklyModelLimitName,
};
