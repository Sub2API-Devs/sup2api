/**
 * components/LogoV2/PromoNotices.tsx
 *
 * 2.1.316 新增：订阅切换与促销额度提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (10)
 * attribution: placement 10
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { recordSubscriptionNoticeShown } from "../../hooks/notifs/useCanSwitchToExistingSubscription.js";
import { useNoticeImpression } from "./CondensedLogo.js";
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
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { PROMO_CREDIT } from "../../utils/subscriptionNoticeIds.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isSessionRestored } from "../../utils/sessionRestore.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId, getIsRemoteMode } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_PROMO_OFFERS } from "../../utils/planTiers.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:87709-88134 placement
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
  if ($[3] !== subscriptionType) {
    notice = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "suggestion",
        children: ["Use your existing Claude ", subscriptionType, " plan with Claude Code", loginHint],
      }),
    });
    $[3] = subscriptionType;
    $[4] = notice;
  } else notice = $[4];
  return notice;
}
//@ chunk-ag5x7vhf.js:88134-88169 placement
var PROMO_CREDIT_NOTICE_ID = "promo-credit";
var PROMO_FRESH_WINDOW_MS = 604800000;
//@ chunk-ag5x7vhf.js:88169-88358 placement
/**
 * 判断促销额度是否还有剩余：未过重置时间，且剩余金额 > 0（有金额字段时）或用量 < 100%。
 */
function hasRemainingPromoCredit(wattleEmber, nowMs) {
  if (!wattleEmber) return false;
  if (wattleEmber.resets_at !== null && !isBeforeTimestamp(wattleEmber.resets_at, nowMs)) return false;
  if (wattleEmber.remaining_dollars != null) return wattleEmber.remaining_dollars > 0;
  return wattleEmber.utilization !== null && wattleEmber.utilization < 100;
}
//@ chunk-ag5x7vhf.js:88358-88467 placement
/**
 * 返回当前 OAuth 账号的 "组织uuid:账号uuid" 作为促销检查的登录键；没有组织时返回 null。
 */
function getPromoLoginKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo?.organizationUuid) return null;
  return `${oauthAccountInfo.organizationUuid}:${oauthAccountInfo.accountUuid}`;
}
//@ chunk-ag5x7vhf.js:88467-88659 placement
/**
 * 判断是否满足促销额度提示的基本条件：从未展示过、企业订阅者且有 profile 权限、第一方提供商、非后台/队友/远程/桥接重连会话。
 */
function isPromoCreditNoticeEligible(session) {
  return (
    (getGlobalConfig().seenNotifications?.[PROMO_CREDIT] ?? 0) === 0 &&
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
//@ chunk-ag5x7vhf.js:88659-88863 placement
/**
 * 在基本资格之上，检查缓存的促销检查结果属于当前登录、处于开放状态、未过期且在有效期内，并受 ALLOW_PROMO_OFFERS 策略放行。
 */
function shouldShowPromoCreditNotice(session) {
  if (!isPromoCreditNoticeEligible(session)) return false;
  let promoCreditCheck = getGlobalConfig().promoCreditCheck;
  let answer = promoCreditCheck?.answer;
  if (promoCreditCheck?.login !== getPromoLoginKey() || !answer?.open) return false;
  let now = Date.now();
  let ageMs = now - answer.atMs;
  return (
    ageMs >= 0 &&
    ageMs < PROMO_FRESH_WINDOW_MS &&
    (answer.endsAt === null || isBeforeTimestamp(answer.endsAt, now)) &&
    isPolicyAllowed(ALLOW_PROMO_OFFERS)
  );
}
//@ chunk-ag5x7vhf.js:88863-89004 placement
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
//@ chunk-ag5x7vhf.js:89004-89375 placement
function PromoCreditNotice() {
  let $ = useMemoCache(3);
  let { storageV5 } = useTheme_2();
  let onShown;
  if ($[0] !== storageV5) {
    onShown = () => markPromoCreditSeen(storageV5);
    $[0] = storageV5;
    $[1] = onShown;
  } else onShown = $[1];
  useNoticeImpression(PROMO_CREDIT_NOTICE_ID, onShown);
  let notice;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    notice = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "suggestion",
        children: [
          "Fable is on us",
          jsxProd_default(Text, {
            color: "text",
            dimColor: true,
            children:
              " \xB7 Your admin opted you in to a free credit for Fable usage, available for a limited time \xB7 /usage",
          }),
        ],
      }),
    });
    $[2] = notice;
  } else notice = $[2];
  return notice;
}
//@ chunk-ag5x7vhf.js:89375-89440 placement
function isBeforeTimestamp(timestamp, nowMs) {
  let timestamp_2 = Date.parse(timestamp);
  return !Number.isNaN(timestamp_2) && nowMs < timestamp_2;
}
//@ chunk-ag5x7vhf.js:89440-89444 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:89440", () => {
  init_react_production();
});
export {
  PROMO_CREDIT_NOTICE_ID,
  shouldShowPromoCreditNotice,
  PromoCreditNotice,
  SubscriptionSwitchNotice,
  isPromoCreditNoticeEligible,
  getPromoLoginKey,
  hasRemainingPromoCredit,
};
