/**
 * components/messages/RateLimitMessage.tsx
 *
 * 限流/用量上限消息：按订阅类型给出升级、额外用量、/usage-credits、/login 等建议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/RateLimitMessage.tsx
 * pieces: chunk-ah34pb7m.js (9)
 * attribution: sole-consumer 7, fingerprint 2
 */
import {
  init_react_production,
  useSyncExternalStore,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
import {
  RATE_LIMIT_DISPLAY_NAMES,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  isRateLimitMockingEnabled,
  USAGE_SETTINGS_URL,
} from "../../services/claudeAiLimits.js";
import {
  onUsageCreditStateChange,
  currentUsageCreditState,
  readOfferNote,
  TENGU_WISE_BEAR_COPY,
  onCreditOfferPromptChange,
  getOfferHint,
  logCreditOfferShown,
} from "../../services/usageCreditOffers.js";
import {
  subscribeResetChanges,
  getResetFlowPhase,
  isResetOfferAvailable,
  canArmLowPriorityReset,
  resetsUsedUpLine,
  hasResetGrantCoveringLatestEnd,
} from "../../services/rateLimit/rateLimitWall.js";
import { getLimitScopeKind } from "../../services/mockRateLimits.js";
import { usageCreditsSpentLine } from "../rateLimit/usageCreditsOffer.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { useHost } from "../../context/session.js";
import { getSubscriptionType, getRateLimitTier, isClaudeAISubscriber } from "../../utils/auth.js";
import {
  useRateLimitState,
  TENGU_PEWTER_SUMMIT,
  useQuotaAutoResumeState,
  logRateLimitMessageShownOnce,
} from "../rateLimit/quotaAutoResume.js";
import { canShowUpgradeCommand, isConsumerPlan } from "../../utils/planTiers.js";
import { usageCreditsCommand } from "../../commands/extra-usage/index.js";
import {
  canAutoResumeThisLimit,
  isPhaseActive,
  isResetKeyArmed,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { ORG_SPEND_CAP_REASONS } from "../../services/api/usage.js";
import { TENGU_VELLUM_ANCHOR } from "../../services/usageLimitGrace.js";
import { useContinueResult } from "../../commands/continue/continueState.js";
import { logEvent } from "../../services/analytics/index.js";
import { rateLimitWindowLabel } from "../../services/rateLimitMessages.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";
import { LinkifiedText as LinkifiedText_2 } from "../LinkifiedText.js";
import { MarkdownText_2, MARKDOWN_LINK_SCHEMES } from "../pluginUi/render/MarkdownBlock.js";
import { RETURN_SYMBOL } from "../../constants/figures.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:43543-43547 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:43543", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:43547-43551 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:43547", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:43551-43555 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:43551", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:43555-43809 sole-consumer
function classifyRateLimitText(text) {
  let displayNames = RATE_LIMIT_DISPLAY_NAMES;
  let isHit = (label) => text.startsWith(`You've hit your ${label}`);
  if (isHit(displayNames.five_hour) || isHit("session limit")) return "session";
  if (isHit(displayNames.seven_day)) return "weekly";
  return isHit(displayNames.seven_day_opus) ||
    isHit(displayNames.seven_day_sonnet) ||
    isHit(displayNames.seven_day_overage_included)
    ? "model"
    : undefined;
}
//@ chunk-ah34pb7m.js:43809-44067 sole-consumer
function getRateLimitOfferNote(text, limits, creditState) {
  useSyncExternalStore(onUsageCreditStateChange, currentUsageCreditState, currentUsageCreditState);
  useSyncExternalStore(subscribeResetChanges, getResetFlowPhase, getResetFlowPhase);
  let limitScope = creditState ? classifyRateLimitText(text) : undefined;
  let limitScopeKind = getLimitScopeKind(limits.rateLimitType);
  if (
    limitScope === undefined ||
    (limitScope !== limitScopeKind &&
      !(limits.rateLimitType === "seven_day_sonnet" && limitScope === "weekly")) ||
    isResetOfferAvailable(limits) ||
    canArmLowPriorityReset(limits) ||
    resetsUsedUpLine(limits) !== undefined ||
    usageCreditsSpentLine(limits) !== undefined
  )
    return;
  return readOfferNote(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_BEAR_COPY, null),
    limitScope,
    cleanTaskDescription,
    hasResetGrantCoveringLatestEnd(limits),
  );
}
//@ chunk-ah34pb7m.js:44067-44584 sole-consumer
/**
 * 限额提示中各种升级/调整入口的说明文字（打开选项、/usage-credits 调整月度上限或补充额度等）。
 */
var UPSELL_TEXTS; // deferred: uses USAGE_SETTINGS_URL (../../services/claudeAiLimits.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ah34pb7m.js:44067", () => {
  UPSELL_TEXTS = {
    opening_options: "Opening your options\u2026",
    spend_limit: "/usage-credits to adjust your monthly spend limit.",
    extra_usage: "/usage-credits to finish what you\u2019re working on.",
    api_login: "/login to switch to an API usage-billed account.",
    admin_can_enable: `Your admin can enable extra usage at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}.`,
    ask_admin: "/usage-credits to request more usage from your admin.",
    upgrade: "/upgrade to increase your usage limit.",
    upgrade_or_extra_usage: "/upgrade or /usage-credits to finish what you\u2019re working on.",
  };
});
//@ chunk-ah34pb7m.js:44584-45072 fingerprint (2.1.88 match: getUpsellMessage, 0.336)
function getUpsellMessage({
  shouldShowUpsell,
  isMax20x,
  isExtraUsageCommandEnabled,
  shouldAutoOpenRateLimitOptionsMenu,
  isTeamOrEnterprise,
  hasBillingAccess,
  serverHidesUpgrade,
  serverHidesOverage,
  spendLimitNudgePath,
}) {
  if (!shouldShowUpsell) return null;
  if (shouldAutoOpenRateLimitOptionsMenu) return "opening_options";
  if (spendLimitNudgePath) return "spend_limit";
  let isExtraUsageAvailable = isExtraUsageCommandEnabled && !serverHidesOverage;
  if (isMax20x) return isExtraUsageAvailable ? "extra_usage" : "api_login";
  if (isTeamOrEnterprise) {
    if (!isExtraUsageAvailable) return "admin_can_enable";
    return hasBillingAccess ? "extra_usage" : "ask_admin";
  }
  if (serverHidesUpgrade) return isExtraUsageAvailable ? "extra_usage" : null;
  return isExtraUsageAvailable ? "upgrade_or_extra_usage" : "upgrade";
}
//@ chunk-ah34pb7m.js:45072-48024 fingerprint (2.1.88 match: RateLimitMessage, 0.312)
/**
 * 限流消息：根据订阅（pro/max/team/enterprise）与 overage 状态给出建议（/upgrade、/usage-credits、/login、联系管理员），显示重置时间。
 */
function RateLimitMessage({ text, onOpenRateLimitOptions, onRateLimitAutoQueueContinue }) {
  let host = useHost();
  let subscriptionType = getSubscriptionType();
  let rateLimitTier = getRateLimitTier();
  let isTeamOrEnterprise = subscriptionType === "team" || subscriptionType === "enterprise";
  let isMax20x = subscriptionType === "max" && rateLimitTier === "default_claude_max_20x";
  let isClaudeAiSubscriber = isRateLimitMockingEnabled() || isClaudeAISubscriber();
  let limits = useRateLimitState();
  let upgradePaths = limits.upgradePaths;
  let hidesUpgradePlan = upgradePaths !== undefined && !upgradePaths.includes("upgrade_plan");
  let hidesOverage = upgradePaths !== undefined && !upgradePaths.includes("overage");
  let canShowUpgrade = canShowUpgradeCommand();
  let creditsCommandEnabled = usageCreditsCommand.isEnabled();
  let consumerPlan = isConsumerPlan();
  let hasServerUpgradePath =
    upgradePaths !== undefined &&
    ((upgradePaths.includes("upgrade_plan") && canShowUpgrade) ||
      (upgradePaths.includes("overage") && creditsCommandEnabled));
  let spendLimitNudgePath =
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PEWTER_SUMMIT, false) &&
    !isTeamOrEnterprise &&
    limits.overageDisabledReason === "org_level_disabled_until" &&
    consumerPlan &&
    creditsCommandEnabled;
  let shouldUpsell = isClaudeAiSubscriber && (upgradePaths !== undefined ? hasServerUpgradePath : !isMax20x);
  let canAutoResume = canAutoResumeThisLimit(limits);
  let quotaAutoResumeState = useQuotaAutoResumeState();
  let isArmed = quotaAutoResumeState.phase === "armed";
  let phaseActive = isPhaseActive(quotaAutoResumeState.phase);
  let resetKeyArmed = limits.resetsAt !== undefined && isResetKeyArmed(limits.resetsAt);
  let [openState, setOpenState] = useState("pending");
  let isRejectedWithReset =
    limits.status === "rejected" && limits.resetsAt !== undefined && !limits.isUsingOverage;
  let isCreditsLimit =
    limits.rateLimitType === "seven_day_overage_included" || limits.errorCode === "credits_required";
  let resetsAt = limits.resetsAt;
  let hasOrgSpendCap =
    limits.overageDisabledReason !== undefined && ORG_SPEND_CAP_REASONS.has(limits.overageDisabledReason);
  let canPressReturnToContinue =
    isRejectedWithReset &&
    !isArmed &&
    !resetKeyArmed &&
    resetsAt !== undefined &&
    Number.isFinite(resetsAt) &&
    limits.rateLimitType === "five_hour" &&
    !isCreditsLimit &&
    !spendLimitNudgePath &&
    !hasOrgSpendCap &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELLUM_ANCHOR, false);
  let claudeAiLimits = useContinueResult();
  let isCheckpointed = canPressReturnToContinue && claudeAiLimits?.committed === true;
  let shouldAutoOpenOptions =
    (shouldUpsell || canAutoResume) &&
    !isArmed &&
    !resetKeyArmed &&
    openState === "pending" &&
    isRejectedWithReset &&
    !isCreditsLimit &&
    onOpenRateLimitOptions;
  let shouldAutoQueueContinue =
    canPressReturnToContinue &&
    openState === "pending" &&
    resetsAt !== undefined &&
    onRateLimitAutoQueueContinue;
  useEffect(() => {
    if (shouldAutoOpenOptions) setOpenState(onOpenRateLimitOptions() ? "opened" : "blocked");
    else if (shouldAutoQueueContinue) setOpenState("blocked");
    if (shouldAutoQueueContinue && resetsAt !== undefined) {
      if (onRateLimitAutoQueueContinue(resetsAt)) {
        logEvent("tengu_rl_checkpoint_copy_shown", {});
        logEvent("tengu_rl_checkpoint_auto_continue_queued", {});
      }
    }
  }, [
    shouldAutoOpenOptions,
    onOpenRateLimitOptions,
    shouldAutoQueueContinue,
    onRateLimitAutoQueueContinue,
    resetsAt,
  ]);
  let upsellMessage = useMemo(() => {
    if (isCreditsLimit) return null;
    return getUpsellMessage({
      shouldShowUpsell: isClaudeAiSubscriber,
      isMax20x,
      isExtraUsageCommandEnabled: creditsCommandEnabled,
      shouldAutoOpenRateLimitOptionsMenu: !!shouldAutoOpenOptions,
      isTeamOrEnterprise,
      hasBillingAccess: consumerPlan,
      serverHidesUpgrade: hidesUpgradePlan || !canShowUpgrade,
      serverHidesOverage: hidesOverage,
      spendLimitNudgePath,
    });
  }, [
    isClaudeAiSubscriber,
    isMax20x,
    hidesUpgradePlan,
    canShowUpgrade,
    hidesOverage,
    isTeamOrEnterprise,
    shouldAutoOpenOptions,
    creditsCommandEnabled,
    consumerPlan,
    spendLimitNudgePath,
    isCreditsLimit,
  ]);
  let firstShownLimitsRef = useRef(undefined);
  let showsUpsell = !phaseActive && openState !== "opened" && upsellMessage !== null;
  useEffect(() => {
    if (!isRejectedWithReset || upsellMessage === "opening_options") return;
    firstShownLimitsRef.current ??= limits;
    let resetsAt = firstShownLimitsRef.current.resetsAt;
    if (resetsAt === undefined || resetsAt * 1000 <= Date.now()) return;
    logRateLimitMessageShownOnce(host, firstShownLimitsRef.current, {
      kind: isCreditsLimit ? "in_limit_line" : (upsellMessage ?? "none"),
      shown: showsUpsell,
      waitLive: phaseActive,
    });
  }, [host, limits, isRejectedWithReset, isCreditsLimit, upsellMessage, showsUpsell, phaseActive]);
  let isMonthlySpendLimit = spendLimitNudgePath && isRejectedWithReset && !isCreditsLimit;
  let isResetSynced =
    quotaAutoResumeState.phase !== "armed" || quotaAutoResumeState.resetsAtSeconds === limits.resetsAt;
  let windowLabel = isMonthlySpendLimit && isResetSynced ? rateLimitWindowLabel(limits) : null;
  let rateLimitOfferNote = getRateLimitOfferNote(
    text,
    limits,
    isClaudeAiSubscriber && isRejectedWithReset && !isMonthlySpendLimit,
  );
  let offerHint = useSyncExternalStore(onCreditOfferPromptChange, getOfferHint, getOfferHint);
  let [resetsAt_2] = useState(limits.resetsAt);
  let creditOfferKind =
    offerHint === undefined
      ? undefined
      : isCreditsLimit
        ? limits.status === "rejected"
          ? "cli_credits_required"
          : undefined
        : isRejectedWithReset &&
            limits.resetsAt === resetsAt_2 &&
            quotaAutoResumeState.phase !== "stale" &&
            creditsCommandEnabled &&
            !hidesOverage &&
            !shouldAutoOpenOptions &&
            openState !== "opened"
          ? "cli_limit_line"
          : undefined;
  let creditOfferHint = creditOfferKind !== undefined ? offerHint : undefined;
  useEffect(() => {
    if (creditOfferKind !== undefined) logCreditOfferShown(creditOfferKind);
  }, [creditOfferKind]);
  let children = isMonthlySpendLimit
    ? windowLabel
      ? `You've hit your monthly spend limit \xB7 your ${windowLabel.limitName} resets ${windowLabel.resetTime}`
      : "You've hit your monthly spend limit."
    : text;
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(LinkifiedText_2, {
          color: isMonthlySpendLimit ? "warning" : "error",
          linkHref: allowedUsageLink,
          children,
        }),
        rateLimitOfferNote
          ? jsxProd_default(MarkdownText_2, {
              dimColor: true,
              stripPromptTags: false,
              linkSchemes: MARKDOWN_LINK_SCHEMES,
              children: rateLimitOfferNote,
            })
          : null,
        canPressReturnToContinue
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: ["Press ", RETURN_SYMBOL, " to continue after reset"],
            })
          : null,
        isCheckpointed && claudeAiLimits?.committed === true
          ? jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    jsxProd_default(StatusIcon, {
                      status: "success",
                      withSpace: true,
                    }),
                    "checkpointed \u2014 see ",
                    claudeAiLimits.resumePath,
                  ],
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["  ", "or /rewind to undo this turn's file edits"],
                }),
              ],
            })
          : null,
        showsUpsell && upsellMessage
          ? jsxProd_default(Text, {
              dimColor: true,
              children: UPSELL_TEXTS[upsellMessage],
            })
          : null,
        creditOfferHint !== undefined
          ? jsxProd_default(Text, {
              dimColor: true,
              children: creditOfferHint,
            })
          : null,
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:48024-48071 sole-consumer
function allowedUsageLink(url) {
  return url === USAGE_SETTINGS_URL || url === HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE ? url : undefined;
}
export { RateLimitMessage };
