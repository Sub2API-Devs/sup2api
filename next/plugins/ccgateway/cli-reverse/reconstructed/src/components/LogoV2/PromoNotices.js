/**
 * components/LogoV2/PromoNotices.tsx
 *
 * 2.1.316 新增：订阅切换与促销额度提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (22)
 * attribution: placement 10, layout 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { recordSubscriptionNoticeShown } from "../../hooks/notifs/useCanSwitchToExistingSubscription.js";
import { useNoticeImpression, hasNoticeImpression } from "./CondensedLogo.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  getOauthAccountInfo,
  isClaudeAISubscriber,
  isEnterpriseSubscriber,
  hasProfileScope,
} from "../../utils/auth.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isSessionRestored } from "../../utils/sessionRestore.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId, getIsRemoteMode } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  PROMO_CREDIT,
  PROMO_CREDIT_USED_UP,
  PROMO_CREDIT_APPROACHING,
} from "../../utils/subscriptionNoticeIds.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_PROMO_OFFERS } from "../../utils/planTiers.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { formatResetText } from "../../utils/format.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:83250-83254 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:83250", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:87194-87661 placement
function SubscriptionSwitchNotice(props) {
  let $ = useMemoCache(5);
  let { subscriptionType } = props;
  let { storageV5 } = useTheme_2();
  let onShown;
  if ($[0] !== storageV5) {
    onShown = () => recordSubscriptionNoticeShown(storageV5);
    $[0] = storageV5;
    $[1] = onShown;
  } else onShown = $[1];
  useNoticeImpression("subscription-switch", onShown);
  const planLabel = subscriptionType === "Pro" ? "Pro plan" : "subscription";
  let loginHint;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    loginHint = jsxProd_default_2(Text, {
      color: "text",
      dimColor: true,
      children: [" ", "\xB7 /login to activate"],
    });
    $[2] = loginHint;
  } else loginHint = $[2];
  let notice;
  if ($[3] !== planLabel) {
    notice = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "suggestion",
        children: ["Use your existing Claude", " ", planLabel, " with Claude Code", loginHint],
      }),
    });
    $[3] = planLabel;
    $[4] = notice;
  } else notice = $[4];
  return notice;
}
//@ chunk-hnxhr3bs.js:87665-87738 placement
var PROMO_CREDIT_NOTICE_ID = "promo-credit";
var PROMO_CREDIT_USAGE = "promo-credit-usage";
var PROMO_FRESH_WINDOW_MS = 604800000;
var PROMO_DEFAULT_WINDOW_MS = 5184000000;
//@ chunk-hnxhr3bs.js:87738-87927 placement
/**
 * 判断促销额度是否还有剩余：未过重置时间，且剩余金额 > 0（有金额字段时）或用量 < 100%。
 */
function hasRemainingPromoCredit(wattleEmber, nowMs) {
  if (!wattleEmber) return false;
  if (wattleEmber.resets_at !== null && !isBeforeTimestamp(wattleEmber.resets_at, nowMs)) return false;
  if (wattleEmber.remaining_dollars != null) return wattleEmber.remaining_dollars > 0;
  return wattleEmber.utilization !== null && wattleEmber.utilization < 100;
}
//@ chunk-hnxhr3bs.js:87927-88036 placement
/**
 * 返回当前 OAuth 账号的 "组织uuid:账号uuid" 作为促销检查的登录键；没有组织时返回 null。
 */
function getPromoLoginKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo?.organizationUuid) return null;
  return `${oauthAccountInfo.organizationUuid}:${oauthAccountInfo.accountUuid}`;
}
//@ chunk-hnxhr3bs.js:88036-88177 layout
function promoOfferEndsAt(promo) {
  if (promo.offerEndsAt !== undefined) return promo.offerEndsAt;
  return promo.open && Number.isFinite(promo.atMs)
    ? new Date(promo.atMs + PROMO_DEFAULT_WINDOW_MS).toISOString()
    : null;
}
//@ chunk-hnxhr3bs.js:88177-88329 layout
function shouldShowPromos(session) {
  return (
    isClaudeAISubscriber() &&
    isEnterpriseSubscriber() &&
    hasProfileScope() &&
    getAPIProvider() === "firstParty" &&
    getPromoLoginKey() !== null &&
    !isSessionRestored(session.host) &&
    !isActingAsBgJob() &&
    getTeammateAgentId() === undefined &&
    !getIsRemoteMode() &&
    !env.CLAUDE_BRIDGE_REATTACH_SESSION
  );
}
//@ chunk-hnxhr3bs.js:88329-88388 placement
/**
 * 判断是否满足促销额度提示的基本条件：从未展示过、企业订阅者且有 profile 权限、第一方提供商、非后台/队友/远程/桥接重连会话。
 */
function isPromoCreditNoticeEligible() {
  return (getGlobalConfig().seenNotifications?.[PROMO_CREDIT] ?? 0) === 0;
}
//@ chunk-hnxhr3bs.js:88388-88452 layout
function trimmedOrNull(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
//@ chunk-hnxhr3bs.js:88452-88535 layout
function promoCreditAnswer() {
  let promoCreditCheck = getGlobalConfig().promoCreditCheck;
  return promoCreditCheck?.login === getPromoLoginKey() ? promoCreditCheck?.answer : undefined;
}
//@ chunk-hnxhr3bs.js:88535-88648 layout
function isPromoCreditNoticeDue(session) {
  if (!shouldShowPromos(session)) return false;
  if (isPromoCreditNoticeEligible()) return true;
  let promo = promoCreditAnswer();
  let timestamp = promo ? promoOfferEndsAt(promo) : null;
  return timestamp !== null && isBeforeTimestamp(timestamp, Date.now());
}
//@ chunk-hnxhr3bs.js:88648-88867 placement
/**
 * 在基本资格之上，检查缓存的促销检查结果属于当前登录、处于开放状态、未过期且在有效期内，并受 ALLOW_PROMO_OFFERS 策略放行。
 */
function shouldShowPromoCreditNotice(session) {
  if (!isPromoCreditNoticeEligible() || !shouldShowPromos(session) || hasNoticeImpression(PROMO_CREDIT_USAGE))
    return false;
  let promo = promoCreditAnswer();
  if (!promo?.open || promo.usedUpNotice === true || promo.approachingNotice === true) return false;
  let now = Date.now();
  let ageMs = now - promo.atMs;
  return (
    ageMs >= 0 &&
    ageMs < PROMO_FRESH_WINDOW_MS &&
    (promo.endsAt === null || isBeforeTimestamp(promo.endsAt, now)) &&
    isPolicyAllowed(ALLOW_PROMO_OFFERS)
  );
}
//@ chunk-hnxhr3bs.js:88867-88877 layout
var DEFAULT_APPROACHING_PERCENT = 90;
//@ chunk-hnxhr3bs.js:88877-88958 layout
function normalizeApproachingPercent(approachingPercent) {
  return typeof approachingPercent === "number" &&
    Number.isInteger(approachingPercent) &&
    approachingPercent > 0 &&
    approachingPercent < 100
    ? approachingPercent
    : DEFAULT_APPROACHING_PERCENT;
}
//@ chunk-hnxhr3bs.js:88958-89029 layout
function promoCreditNoticeKey(level, periodEndsAtMs, approachingPercent) {
  return level === "used-up"
    ? `${PROMO_CREDIT_USED_UP}${periodEndsAtMs}`
    : `${PROMO_CREDIT_APPROACHING}${approachingPercent}_${periodEndsAtMs}`;
}
//@ chunk-hnxhr3bs.js:89029-89463 layout
function promoCreditNoticeState() {
  let promo = promoCreditAnswer();
  if (promo === undefined || promo.endsAt === null) return null;
  let level;
  if (promo.usedUpNotice === true) level = "used-up";
  else if (promo.approachingNotice === true) level = "approaching";
  else return null;
  let timestamp = Date.parse(promo.endsAt);
  if (Number.isNaN(timestamp)) return null;
  return {
    level,
    answeredAtMs: promo.atMs,
    periodEndsAt: promo.endsAt,
    periodEndsAtMs: timestamp,
    lastPeriod: promo.lastPeriod === true,
    approachingPercent: normalizeApproachingPercent(promo.approachingPercent),
    label: trimmedOrNull(promo.label),
    coveredModels: trimmedOrNull(promo.coveredModels),
  };
}
//@ chunk-hnxhr3bs.js:89463-89733 layout
function shouldShowPromoUsageNotice(session, isRestored) {
  let notice = promoCreditNoticeState();
  let now = Date.now();
  if (notice === null || now >= notice.periodEndsAtMs || !shouldShowPromos(session)) return false;
  if (hasNoticeImpression(PROMO_CREDIT_NOTICE_ID)) return false;
  if (hasNoticeImpression(PROMO_CREDIT_USAGE)) return true;
  let sinceAnswerMs = now - notice.answeredAtMs;
  return (
    !isRestored &&
    sinceAnswerMs >= 0 &&
    sinceAnswerMs < PROMO_FRESH_WINDOW_MS &&
    (getGlobalConfig().seenNotifications?.[
      promoCreditNoticeKey(notice.level, notice.periodEndsAtMs, notice.approachingPercent)
    ] ?? 0) === 0 &&
    isPolicyAllowed(ALLOW_PROMO_OFFERS)
  );
}
//@ chunk-hnxhr3bs.js:89733-89874 placement
function markPromoCreditSeen(storageV5) {
  saveGlobalConfig((config) => {
    let seenNotifications = config.seenNotifications ?? {};
    return {
      ...config,
      seenNotifications: {
        ...seenNotifications,
        [PROMO_CREDIT]: (seenNotifications[PROMO_CREDIT] ?? 0) + 1,
      },
    };
  }, storageV5);
  logFeatureOk("promo_credit_notice");
}
//@ chunk-hnxhr3bs.js:89874-90543 placement
function PromoCreditNotice() {
  let $ = useMemoCache(12);
  let { storageV5 } = useTheme_2();
  let onShown;
  if ($[0] !== storageV5) {
    onShown = () => markPromoCreditSeen(storageV5);
    $[0] = storageV5;
    $[1] = onShown;
  } else onShown = $[1];
  useNoticeImpression(PROMO_CREDIT_NOTICE_ID, onShown);
  let [promo] = useState(promoCreditAnswer);
  const coveredModels = promo?.coveredModels;
  let coveredModelsText2;
  if ($[2] !== coveredModels) {
    coveredModelsText2 = trimmedOrNull(coveredModels);
    $[2] = coveredModels;
    $[3] = coveredModelsText2;
  } else coveredModelsText2 = $[3];
  let coveredModelsText = coveredModelsText2;
  let headline;
  if ($[4] !== promo?.label || $[5] !== coveredModelsText) {
    headline = coveredModelsText
      ? (trimmedOrNull(promo?.label) ?? `${coveredModelsText} credit`)
      : "Fable is on us";
    $[4] = promo?.label;
    $[5] = coveredModelsText;
    $[6] = headline;
  } else headline = $[6];
  const children = ` \xB7 Your admin opted you in to a free credit for ${coveredModelsText || "Fable"} usage, available for a limited time \xB7 /usage`;
  let bodyText;
  if ($[7] !== children) {
    bodyText = jsxProd_default(Text, {
      color: "text",
      dimColor: true,
      children,
    });
    $[7] = children;
    $[8] = bodyText;
  } else bodyText = $[8];
  let notice;
  if ($[9] !== headline || $[10] !== bodyText) {
    notice = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "suggestion",
        children: [headline, bodyText],
      }),
    });
    $[9] = headline;
    $[10] = bodyText;
    $[11] = notice;
  } else notice = $[11];
  return notice;
}
//@ chunk-hnxhr3bs.js:90543-91048 layout
var PROMO_CREDIT_REMAINING_COPY = {
  approaching: {
    title(subject, percent) {
      return `${subject} ${percent}% used`;
    },
    lastPeriod(subject) {
      return `When it runs out, ${subject} is billed as usual. This credit doesn't reset`;
    },
    resetting(subject, resetDate) {
      return `When it runs out, ${subject} is billed as usual until your credit resets on ${resetDate}`;
    },
  },
  "used-up": {
    title(subject) {
      return `${subject} used up`;
    },
    lastPeriod(subject) {
      return `${subject} is now billed as usual, within your spend limits. This credit doesn't reset`;
    },
    resetting(subject, resetDate) {
      return `${subject} is billed as usual, within your spend limits, until your credit resets on ${resetDate}`;
    },
  },
};
//@ chunk-hnxhr3bs.js:91048-92292 layout
function PromoCreditRemainingNotice() {
  let $ = useMemoCache(19);
  let { storageV5 } = useTheme_2();
  let [notice] = useState(promoCreditNoticeState);
  let onShown;
  if ($[0] !== notice || $[1] !== storageV5) {
    onShown = () => {
      if (notice === null) {
        return;
      }
      let seenKey = promoCreditNoticeKey(notice.level, notice.periodEndsAtMs, notice.approachingPercent);
      saveGlobalConfig((config) => {
        let seenNotifications = config.seenNotifications ?? {};
        return {
          ...config,
          seenNotifications: {
            ...seenNotifications,
            [seenKey]: (seenNotifications[seenKey] ?? 0) + 1,
          },
        };
      }, storageV5);
      logFeatureOk("promo_credit_usage_notice", {
        used_up: notice.level === "used-up",
        last_period: notice.lastPeriod,
      });
    };
    $[0] = notice;
    $[1] = storageV5;
    $[2] = onShown;
  } else onShown = $[2];
  let impressionCallback = onShown;
  const enabled = notice !== null;
  let impressionOptions;
  if ($[3] !== enabled) {
    impressionOptions = {
      enabled,
    };
    $[3] = enabled;
    $[4] = impressionOptions;
  } else impressionOptions = $[4];
  useNoticeImpression(PROMO_CREDIT_USAGE, impressionCallback, impressionOptions);
  if (notice === null) {
    return null;
  }
  let copy = PROMO_CREDIT_REMAINING_COPY[notice.level];
  let creditLabel = notice.coveredModels ? notice.label || `${notice.coveredModels} credit` : "Fable credit";
  let subject = notice.coveredModels ? `${notice.coveredModels} usage` : "Fable";
  let detail;
  if ($[5] !== subject || $[6] !== notice.lastPeriod || $[7] !== notice.periodEndsAt || $[8] !== copy) {
    detail = notice.lastPeriod
      ? copy.lastPeriod(subject)
      : copy.resetting(subject, formatResetText(notice.periodEndsAt, true, true, true));
    $[5] = subject;
    $[6] = notice.lastPeriod;
    $[7] = notice.periodEndsAt;
    $[8] = copy;
    $[9] = detail;
  } else detail = $[9];
  let line = detail;
  let title;
  if ($[10] !== creditLabel || $[11] !== notice.approachingPercent || $[12] !== copy) {
    title = copy.title(creditLabel, notice.approachingPercent);
    $[10] = creditLabel;
    $[11] = notice.approachingPercent;
    $[12] = copy;
    $[13] = title;
  } else title = $[13];
  const children = ` \xB7 ${line} \xB7 /usage`;
  let suffix;
  if ($[14] !== children) {
    suffix = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[14] = children;
    $[15] = suffix;
  } else suffix = $[15];
  let row;
  if ($[16] !== title || $[17] !== suffix) {
    row = jsxProd_default_2(Text, {
      children: [title, suffix],
    });
    $[16] = title;
    $[17] = suffix;
    $[18] = row;
  } else row = $[18];
  return row;
}
//@ chunk-hnxhr3bs.js:92292-92357 placement
function isBeforeTimestamp(timestamp, nowMs) {
  let timestamp_2 = Date.parse(timestamp);
  return !Number.isNaN(timestamp_2) && nowMs < timestamp_2;
}
export {
  PROMO_CREDIT_USAGE,
  shouldShowPromoUsageNotice,
  PromoCreditRemainingNotice,
  PROMO_CREDIT_NOTICE_ID,
  shouldShowPromoCreditNotice,
  PromoCreditNotice,
  SubscriptionSwitchNotice,
  isPromoCreditNoticeDue,
  getPromoLoginKey,
  promoOfferEndsAt,
  hasRemainingPromoCredit,
  normalizeApproachingPercent,
};
