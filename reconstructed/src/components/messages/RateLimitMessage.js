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
import { init_react_production, yt, y, P, Q, R } from "../../../vendor/react/cjs/react.production.js";
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
import { RETURN_SYMBOL } from "../../utils/permissions/autoModeRulesPrompt.js";
import { StatusIcon } from "../design-system/StatusIcon.js";

//@ chunk-ah34pb7m.js:43543-43547 sole-consumer
init_react_production();
//@ chunk-ah34pb7m.js:43547-43551 sole-consumer
init_react_production();
//@ chunk-ah34pb7m.js:43551-43555 sole-consumer
init_react_production();
//@ chunk-ah34pb7m.js:43555-43809 sole-consumer
function classifyRateLimitText(m) {
  let d = RATE_LIMIT_DISPLAY_NAMES;
  let c = (g) => m.startsWith(`You've hit your ${g}`);
  if (c(d.five_hour) || c("session limit")) return "session";
  if (c(d.seven_day)) return "weekly";
  return c(d.seven_day_opus) || c(d.seven_day_sonnet) || c(d.seven_day_overage_included)
    ? "model"
    : undefined;
}
//@ chunk-ah34pb7m.js:43809-44067 sole-consumer
function getRateLimitOfferNote(text, rateLimitState, c) {
  yt(onUsageCreditStateChange, currentUsageCreditState, currentUsageCreditState);
  yt(subscribeResetChanges, getResetFlowPhase, getResetFlowPhase);
  let g = c ? classifyRateLimitText(text) : undefined;
  let limitScopeKind = getLimitScopeKind(rateLimitState.rateLimitType);
  if (
    g === undefined ||
    (g !== limitScopeKind && !(rateLimitState.rateLimitType === "seven_day_sonnet" && g === "weekly")) ||
    isResetOfferAvailable(rateLimitState) ||
    canArmLowPriorityReset(rateLimitState) ||
    resetsUsedUpLine(rateLimitState) !== undefined ||
    usageCreditsSpentLine(rateLimitState) !== undefined
  )
    return;
  return readOfferNote(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_BEAR_COPY, null),
    g,
    cleanTaskDescription,
    hasResetGrantCoveringLatestEnd(rateLimitState),
  );
}
//@ chunk-ah34pb7m.js:44067-44584 sole-consumer
/**
 * 限额提示中各种升级/调整入口的说明文字（打开选项、/usage-credits 调整月度上限或补充额度等）。
 */
var UPSELL_TEXTS = {
  opening_options: "Opening your options\u2026",
  spend_limit: "/usage-credits to adjust your monthly spend limit.",
  extra_usage: "/usage-credits to finish what you\u2019re working on.",
  api_login: "/login to switch to an API usage-billed account.",
  admin_can_enable: `Your admin can enable extra usage at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}.`,
  ask_admin: "/usage-credits to request more usage from your admin.",
  upgrade: "/upgrade to increase your usage limit.",
  upgrade_or_extra_usage: "/upgrade or /usage-credits to finish what you\u2019re working on.",
};
//@ chunk-ah34pb7m.js:44584-45072 fingerprint = getUpsellMessage (0.336)
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
  let k = isExtraUsageCommandEnabled && !serverHidesOverage;
  if (isMax20x) return k ? "extra_usage" : "api_login";
  if (isTeamOrEnterprise) {
    if (!k) return "admin_can_enable";
    return hasBillingAccess ? "extra_usage" : "ask_admin";
  }
  if (serverHidesUpgrade) return k ? "extra_usage" : null;
  return k ? "upgrade_or_extra_usage" : "upgrade";
}
//@ chunk-ah34pb7m.js:45072-48024 fingerprint = RateLimitMessage (0.312)
/**
 * 限流消息：根据订阅（pro/max/team/enterprise）与 overage 状态给出建议（/upgrade、/usage-credits、/login、联系管理员），显示重置时间。
 */
function RateLimitMessage({ text, onOpenRateLimitOptions, onRateLimitAutoQueueContinue }) {
  let host = useHost();
  let subscriptionType = getSubscriptionType();
  let rateLimitTier = getRateLimitTier();
  let M = subscriptionType === "team" || subscriptionType === "enterprise";
  let T = subscriptionType === "max" && rateLimitTier === "default_claude_max_20x";
  let x = isRateLimitMockingEnabled() || isClaudeAISubscriber();
  let rateLimitState = useRateLimitState();
  let upgradePaths = rateLimitState.upgradePaths;
  let E = upgradePaths !== undefined && !upgradePaths.includes("upgrade_plan");
  let B = upgradePaths !== undefined && !upgradePaths.includes("overage");
  let L = canShowUpgradeCommand();
  let N = usageCreditsCommand.isEnabled();
  let W = isConsumerPlan();
  let U =
    upgradePaths !== undefined &&
    ((upgradePaths.includes("upgrade_plan") && L) || (upgradePaths.includes("overage") && N));
  let K =
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PEWTER_SUMMIT, false) &&
    !M &&
    rateLimitState.overageDisabledReason === "org_level_disabled_until" &&
    W &&
    N;
  let V = x && (upgradePaths !== undefined ? U : !T);
  let Y = canAutoResumeThisLimit(rateLimitState);
  let quotaAutoResumeState = useQuotaAutoResumeState();
  let z = quotaAutoResumeState.phase === "armed";
  let ee = isPhaseActive(quotaAutoResumeState.phase);
  let le = rateLimitState.resetsAt !== undefined && isResetKeyArmed(rateLimitState.resetsAt);
  let [ge, ae] = y("pending");
  let pe =
    rateLimitState.status === "rejected" &&
    rateLimitState.resetsAt !== undefined &&
    !rateLimitState.isUsingOverage;
  let te =
    rateLimitState.rateLimitType === "seven_day_overage_included" ||
    rateLimitState.errorCode === "credits_required";
  let resetsAt = rateLimitState.resetsAt;
  let ue =
    rateLimitState.overageDisabledReason !== undefined &&
    ORG_SPEND_CAP_REASONS.has(rateLimitState.overageDisabledReason);
  let se =
    pe &&
    !z &&
    !le &&
    resetsAt !== undefined &&
    Number.isFinite(resetsAt) &&
    rateLimitState.rateLimitType === "five_hour" &&
    !te &&
    !K &&
    !ue &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELLUM_ANCHOR, false);
  let claudeAiLimits = useContinueResult();
  let Te = se && claudeAiLimits?.committed === true;
  let Me = (V || Y) && !z && !le && ge === "pending" && pe && !te && onOpenRateLimitOptions;
  let be = se && ge === "pending" && resetsAt !== undefined && onRateLimitAutoQueueContinue;
  P(() => {
    if (Me) ae(onOpenRateLimitOptions() ? "opened" : "blocked");
    else if (be) ae("blocked");
    if (be && resetsAt !== undefined) {
      if (onRateLimitAutoQueueContinue(resetsAt)) {
        logEvent("tengu_rl_checkpoint_copy_shown", {});
        logEvent("tengu_rl_checkpoint_auto_continue_queued", {});
      }
    }
  }, [Me, onOpenRateLimitOptions, be, onRateLimitAutoQueueContinue, resetsAt]);
  let ve = Q(() => {
    if (te) return null;
    return getUpsellMessage({
      shouldShowUpsell: x,
      isMax20x: T,
      isExtraUsageCommandEnabled: N,
      shouldAutoOpenRateLimitOptionsMenu: !!Me,
      isTeamOrEnterprise: M,
      hasBillingAccess: W,
      serverHidesUpgrade: E || !L,
      serverHidesOverage: B,
      spendLimitNudgePath: K,
    });
  }, [x, T, E, L, B, M, Me, N, W, K, te]);
  let rateLimitStateRef = R(undefined);
  let we = !ee && ge !== "opened" && ve !== null;
  P(() => {
    if (!pe || ve === "opening_options") return;
    rateLimitStateRef.current ??= rateLimitState;
    let resetsAt = rateLimitStateRef.current.resetsAt;
    if (resetsAt === undefined || resetsAt * 1000 <= Date.now()) return;
    logRateLimitMessageShownOnce(host, rateLimitStateRef.current, {
      kind: te ? "in_limit_line" : (ve ?? "none"),
      shown: we,
      waitLive: ee,
    });
  }, [host, rateLimitState, pe, te, ve, we, ee]);
  let $e = K && pe && !te;
  let De =
    quotaAutoResumeState.phase !== "armed" ||
    quotaAutoResumeState.resetsAtSeconds === rateLimitState.resetsAt;
  let xe = $e && De ? rateLimitWindowLabel(rateLimitState) : null;
  let rateLimitOfferNote = getRateLimitOfferNote(text, rateLimitState, x && pe && !$e);
  let co = yt(onCreditOfferPromptChange, getOfferHint, getOfferHint);
  let [resetsAt_2] = y(rateLimitState.resetsAt);
  let Ke =
    co === undefined
      ? undefined
      : te
        ? rateLimitState.status === "rejected"
          ? "cli_credits_required"
          : undefined
        : pe &&
            rateLimitState.resetsAt === resetsAt_2 &&
            quotaAutoResumeState.phase !== "stale" &&
            N &&
            !B &&
            !Me &&
            ge !== "opened"
          ? "cli_limit_line"
          : undefined;
  let Ro = Ke !== undefined ? co : undefined;
  P(() => {
    if (Ke !== undefined) logCreditOfferShown(Ke);
  }, [Ke]);
  let children = $e
    ? xe
      ? `You've hit your monthly spend limit \xB7 your ${xe.limitName} resets ${xe.resetTime}`
      : "You've hit your monthly spend limit."
    : text;
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(LinkifiedText_2, {
          color: $e ? "warning" : "error",
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
        se
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: ["Press ", RETURN_SYMBOL, " to continue after reset"],
            })
          : null,
        Te && claudeAiLimits?.committed === true
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
        we && ve
          ? jsxProd_default(Text, {
              dimColor: true,
              children: UPSELL_TEXTS[ve],
            })
          : null,
        Ro !== undefined
          ? jsxProd_default(Text, {
              dimColor: true,
              children: Ro,
            })
          : null,
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:48024-48071 sole-consumer
function allowedUsageLink(m) {
  return m === USAGE_SETTINGS_URL || m === HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE ? m : undefined;
}
export { RateLimitMessage };
