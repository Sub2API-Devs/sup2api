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
import { j, yt, y, P, Q, R } from "../../../vendor/react/cjs/react.production.js";
import {
  RATE_LIMIT_DISPLAY_NAMES,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  isRateLimitMockingEnabled,
  USAGE_SETTINGS_URL,
} from "../../services/claudeAiLimits.js";
import {
  i9,
  s9,
  readOfferNote,
  TENGU_WISE_BEAR_COPY,
  Jre,
  getOfferHint,
  logCreditOfferShown,
} from "../../services/usageCreditOffers.js";
import {
  subscribeResetChanges,
  O7,
  Ltn,
  canArmLowPriorityReset,
  resetsUsedUpLine,
  Xxs,
} from "../../services/rateLimit/rateLimitWall.js";
import { getLimitScopeKind } from "../../services/mockRateLimits.js";
import { usageCreditsSpentLine } from "../rateLimit/usageCreditsOffer.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { vc } from "../../utils/taskDescription.js";
import { useHost } from "../../context/session.js";
import { getSubscriptionType, getRateLimitTier, isClaudeAISubscriber } from "../../utils/auth.js";
import {
  useRateLimitState,
  TENGU_PEWTER_SUMMIT,
  useQuotaAutoResumeState,
  logRateLimitMessageShownOnce,
} from "../rateLimit/quotaAutoResume.js";
import { Gpe, isConsumerPlan } from "../../utils/planTiers.js";
import { usageCreditsCommand } from "../../commands/extra-usage/index.js";
import { Fyt, A7e, T7e } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { ORG_SPEND_CAP_REASONS } from "../../services/api/usage.js";
import { TENGU_VELLUM_ANCHOR } from "../../services/usageLimitGrace.js";
import { useContinueResult } from "../../commands/continue/continueState.js";
import { logEvent } from "../../services/analytics/index.js";
import { rateLimitWindowLabel } from "../../services/rateLimitMessages.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../MessageResponse.js";
import { Box, Text } from "../../ink/components/Text.js";
import { LinkifiedText as LinkifiedText_2 } from "../LinkifiedText.js";
import { MarkdownText_2, MARKDOWN_LINK_SCHEMES } from "../pluginUi/render/MarkdownBlock.js";
import { RETURN_SYMBOL } from "../../utils/permissions/autoModeRulesPrompt.js";
import { StatusIcon } from "../design-system/StatusIcon.js";

//@ chunk-ah34pb7m.js:43543-43547 sole-consumer
j();
//@ chunk-ah34pb7m.js:43547-43551 sole-consumer
j();
//@ chunk-ah34pb7m.js:43551-43555 sole-consumer
j();
//@ chunk-ah34pb7m.js:43555-43809 sole-consumer
function classifyRateLimitText(m) {
  let d = RATE_LIMIT_DISPLAY_NAMES,
    c = (g) => m.startsWith(`You've hit your ${g}`);
  if (c(d.five_hour) || c("session limit")) return "session";
  if (c(d.seven_day)) return "weekly";
  return c(d.seven_day_opus) || c(d.seven_day_sonnet) || c(d.seven_day_overage_included) ? "model" : void 0;
}
//@ chunk-ah34pb7m.js:43809-44067 sole-consumer
function getRateLimitOfferNote(m, d, c) {
  (yt(i9, s9, s9), yt(subscribeResetChanges, O7, O7));
  let g = c ? classifyRateLimitText(m) : void 0,
    f = getLimitScopeKind(d.rateLimitType);
  if (
    g === void 0 ||
    (g !== f && !(d.rateLimitType === "seven_day_sonnet" && g === "weekly")) ||
    Ltn(d) ||
    canArmLowPriorityReset(d) ||
    resetsUsedUpLine(d) !== void 0 ||
    usageCreditsSpentLine(d) !== void 0
  )
    return;
  return readOfferNote(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_BEAR_COPY, null), g, vc, Xxs(d));
}
/**
 * 限额提示中各种升级/调整入口的说明文字（打开选项、/usage-credits 调整月度上限或补充额度等）。
 */
//@ chunk-ah34pb7m.js:44067-44584 sole-consumer
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
  shouldShowUpsell: shouldShowUpsell,
  isMax20x: isMax20x,
  isExtraUsageCommandEnabled: isExtraUsageCommandEnabled,
  shouldAutoOpenRateLimitOptionsMenu: shouldAutoOpenRateLimitOptionsMenu,
  isTeamOrEnterprise: isTeamOrEnterprise,
  hasBillingAccess: hasBillingAccess,
  serverHidesUpgrade: serverHidesUpgrade,
  serverHidesOverage: serverHidesOverage,
  spendLimitNudgePath: spendLimitNudgePath,
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
/**
 * 限流消息：根据订阅（pro/max/team/enterprise）与 overage 状态给出建议（/upgrade、/usage-credits、/login、联系管理员），显示重置时间。
 */
//@ chunk-ah34pb7m.js:45072-48024 fingerprint = RateLimitMessage (0.312)
function RateLimitMessage({
  text: text,
  onOpenRateLimitOptions: onOpenRateLimitOptions,
  onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
}) {
  let g = useHost(),
    f = getSubscriptionType(),
    h = getRateLimitTier(),
    M = f === "team" || f === "enterprise",
    T = f === "max" && h === "default_claude_max_20x",
    x = isRateLimitMockingEnabled() || isClaudeAISubscriber(),
    k = useRateLimitState(),
    upgradePaths = k.upgradePaths,
    E = upgradePaths !== void 0 && !upgradePaths.includes("upgrade_plan"),
    B = upgradePaths !== void 0 && !upgradePaths.includes("overage"),
    L = Gpe(),
    isEnabled = usageCreditsCommand.isEnabled(),
    W = isConsumerPlan(),
    U =
      upgradePaths !== void 0 &&
      ((upgradePaths.includes("upgrade_plan") && L) || (upgradePaths.includes("overage") && isEnabled)),
    K =
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PEWTER_SUMMIT, !1) &&
      !M &&
      k.overageDisabledReason === "org_level_disabled_until" &&
      W &&
      isEnabled,
    V = x && (upgradePaths !== void 0 ? U : !T),
    Y = Fyt(k),
    X = useQuotaAutoResumeState(),
    z = X.phase === "armed",
    ee = A7e(X.phase),
    le = k.resetsAt !== void 0 && T7e(k.resetsAt),
    [ge, ae] = y("pending"),
    pe = k.status === "rejected" && k.resetsAt !== void 0 && !k.isUsingOverage,
    te = k.rateLimitType === "seven_day_overage_included" || k.errorCode === "credits_required",
    resetsAt = k.resetsAt,
    ue = k.overageDisabledReason !== void 0 && ORG_SPEND_CAP_REASONS.has(k.overageDisabledReason),
    se =
      pe &&
      !z &&
      !le &&
      resetsAt !== void 0 &&
      Number.isFinite(resetsAt) &&
      k.rateLimitType === "five_hour" &&
      !te &&
      !K &&
      !ue &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELLUM_ANCHOR, !1),
    claudeAiLimits = useContinueResult(),
    Te = se && claudeAiLimits?.committed === !0,
    Me = (V || Y) && !z && !le && ge === "pending" && pe && !te && onOpenRateLimitOptions,
    be = se && ge === "pending" && resetsAt !== void 0 && onRateLimitAutoQueueContinue;
  P(() => {
    if (Me) ae(onOpenRateLimitOptions() ? "opened" : "blocked");
    else if (be) ae("blocked");
    if (be && resetsAt !== void 0) {
      if (onRateLimitAutoQueueContinue(resetsAt))
        (logEvent("tengu_rl_checkpoint_copy_shown", {}),
          logEvent("tengu_rl_checkpoint_auto_continue_queued", {}));
    }
  }, [Me, onOpenRateLimitOptions, be, onRateLimitAutoQueueContinue, resetsAt]);
  let ve = Q(() => {
      if (te) return null;
      return getUpsellMessage({
        shouldShowUpsell: x,
        isMax20x: T,
        isExtraUsageCommandEnabled: isEnabled,
        shouldAutoOpenRateLimitOptionsMenu: !!Me,
        isTeamOrEnterprise: M,
        hasBillingAccess: W,
        serverHidesUpgrade: E || !L,
        serverHidesOverage: B,
        spendLimitNudgePath: K,
      });
    }, [x, T, E, L, B, M, Me, isEnabled, W, K, te]),
    Ue = R(void 0),
    we = !ee && ge !== "opened" && ve !== null;
  P(() => {
    if (!pe || ve === "opening_options") return;
    Ue.current ??= k;
    let resetsAt = Ue.current.resetsAt;
    if (resetsAt === void 0 || resetsAt * 1000 <= Date.now()) return;
    logRateLimitMessageShownOnce(g, Ue.current, {
      kind: te ? "in_limit_line" : (ve ?? "none"),
      shown: we,
      waitLive: ee,
    });
  }, [g, k, pe, te, ve, we, ee]);
  let $e = K && pe && !te,
    De = X.phase !== "armed" || X.resetsAtSeconds === k.resetsAt,
    xe = $e && De ? rateLimitWindowLabel(k) : null,
    Pe = getRateLimitOfferNote(text, k, x && pe && !$e),
    co = yt(Jre, getOfferHint, getOfferHint),
    [qe] = y(k.resetsAt),
    Ke =
      co === void 0
        ? void 0
        : te
          ? k.status === "rejected"
            ? "cli_credits_required"
            : void 0
          : pe && k.resetsAt === qe && X.phase !== "stale" && isEnabled && !B && !Me && ge !== "opened"
            ? "cli_limit_line"
            : void 0,
    Ro = Ke !== void 0 ? co : void 0;
  P(() => {
    if (Ke !== void 0) logCreditOfferShown(Ke);
  }, [Ke]);
  let Uo = $e
    ? xe
      ? `You've hit your monthly spend limit \xB7 your ${xe.limitName} resets ${xe.resetTime}`
      : "You've hit your monthly spend limit."
    : text;
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        e(LinkifiedText_2, { color: $e ? "warning" : "error", linkHref: QU, children: Uo }),
        Pe
          ? e(MarkdownText_2, {
              dimColor: !0,
              stripPromptTags: !1,
              linkSchemes: MARKDOWN_LINK_SCHEMES,
              children: Pe,
            })
          : null,
        se
          ? r(Text, { dimColor: !0, children: ["Press ", RETURN_SYMBOL, " to continue after reset"] })
          : null,
        Te && claudeAiLimits?.committed === !0
          ? r(Fragment, {
              children: [
                r(Text, {
                  dimColor: !0,
                  children: [
                    e(StatusIcon, { status: "success", withSpace: !0 }),
                    "checkpointed \u2014 see ",
                    claudeAiLimits.resumePath,
                  ],
                }),
                r(Text, { dimColor: !0, children: ["  ", "or /rewind to undo this turn's file edits"] }),
              ],
            })
          : null,
        we && ve ? e(Text, { dimColor: !0, children: UPSELL_TEXTS[ve] }) : null,
        Ro !== void 0 ? e(Text, { dimColor: !0, children: Ro }) : null,
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:48024-48071 sole-consumer
function QU(m) {
  return m === USAGE_SETTINGS_URL || m === HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE ? m : void 0;
}

export { RateLimitMessage };
