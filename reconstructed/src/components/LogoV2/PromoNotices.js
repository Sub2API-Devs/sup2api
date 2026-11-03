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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { recordSubscriptionNoticeShown } from "../../hooks/notifs/useCanSwitchToExistingSubscription.js";
import { at } from "./CondensedLogo.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { Xj } from "../../utils/sessionRestore.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId, getIsRemoteMode } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_PROMO_OFFERS } from "../../utils/planTiers.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ag5x7vhf.js:87709-88134 placement
function SubscriptionSwitchNotice(m) {
  let T = w(5),
    { subscriptionType: subscriptionType } = m,
    { storageV5: storageV5 } = Me(),
    k;
  if (T[0] !== storageV5)
    ((k = () => recordSubscriptionNoticeShown(storageV5)), (T[0] = storageV5), (T[1] = k));
  else k = T[1];
  at("subscription-switch", k);
  let I;
  if (T[2] === MEMO_CACHE_SENTINEL)
    ((I = r(Text, { color: "text", dimColor: !0, children: [" ", "\xB7 /login to activate"] })), (T[2] = I));
  else I = T[2];
  let D;
  if (T[3] !== subscriptionType)
    ((D = e(Box, {
      children: r(Text, {
        color: "suggestion",
        children: ["Use your existing Claude ", subscriptionType, " plan with Claude Code", I],
      }),
    })),
      (T[3] = subscriptionType),
      (T[4] = D));
  else D = T[4];
  return D;
}
//@ chunk-ag5x7vhf.js:88134-88169 placement
var PROMO_CREDIT_NOTICE_ID = "promo-credit",
  f0 = 604800000;
/**
 * 判断促销额度是否还有剩余：未过重置时间，且剩余金额 > 0（有金额字段时）或用量 < 100%。
 */
//@ chunk-ag5x7vhf.js:88169-88358 placement
function hasRemainingPromoCredit(m, h) {
  if (!m) return !1;
  if (m.resets_at !== null && !isBeforeTimestamp(m.resets_at, h)) return !1;
  if (m.remaining_dollars != null) return m.remaining_dollars > 0;
  return m.utilization !== null && m.utilization < 100;
}
/**
 * 返回当前 OAuth 账号的 "组织uuid:账号uuid" 作为促销检查的登录键；没有组织时返回 null。
 */
//@ chunk-ag5x7vhf.js:88358-88467 placement
function getPromoLoginKey() {
  let m = getOauthAccountInfo();
  if (!m?.organizationUuid) return null;
  return `${m.organizationUuid}:${m.accountUuid}`;
}
/**
 * 判断是否满足促销额度提示的基本条件：从未展示过、企业订阅者且有 profile 权限、第一方提供商、非后台/队友/远程/桥接重连会话。
 */
//@ chunk-ag5x7vhf.js:88467-88659 placement
function isPromoCreditNoticeEligible(m) {
  return (
    (getGlobalConfig().seenNotifications?.[PROMO_CREDIT] ?? 0) === 0 &&
    isClaudeAISubscriber() &&
    isEnterpriseSubscriber() &&
    hasProfileScope() &&
    getAPIProvider() === "firstParty" &&
    getPromoLoginKey() !== null &&
    !Xj(m.host) &&
    !isActingAsBgJob() &&
    getTeammateAgentId() === void 0 &&
    !getIsRemoteMode() &&
    !env.CLAUDE_BRIDGE_REATTACH_SESSION
  );
}
/**
 * 在基本资格之上，检查缓存的促销检查结果属于当前登录、处于开放状态、未过期且在有效期内，并受 ALLOW_PROMO_OFFERS 策略放行。
 */
//@ chunk-ag5x7vhf.js:88659-88863 placement
function shouldShowPromoCreditNotice(m) {
  if (!isPromoCreditNoticeEligible(m)) return !1;
  let promoCreditCheck = getGlobalConfig().promoCreditCheck,
    x = promoCreditCheck?.answer;
  if (promoCreditCheck?.login !== getPromoLoginKey() || !x?.open) return !1;
  let now = Date.now(),
    k = now - x.atMs;
  return (
    k >= 0 &&
    k < f0 &&
    (x.endsAt === null || isBeforeTimestamp(x.endsAt, now)) &&
    isPolicyAllowed(ALLOW_PROMO_OFFERS)
  );
}
//@ chunk-ag5x7vhf.js:88863-89004 placement
function markPromoCreditSeen(m) {
  (saveGlobalConfig((h) => {
    let x = h.seenNotifications ?? {};
    return { ...h, seenNotifications: { ...x, [PROMO_CREDIT]: (x[PROMO_CREDIT] ?? 0) + 1 } };
  }, m),
    logFeatureOk("promo_credit_notice"));
}
//@ chunk-ag5x7vhf.js:89004-89375 placement
function PromoCreditNotice() {
  let h = w(3),
    { storageV5: storageV5 } = Me(),
    x;
  if (h[0] !== storageV5) ((x = () => markPromoCreditSeen(storageV5)), (h[0] = storageV5), (h[1] = x));
  else x = h[1];
  at(PROMO_CREDIT_NOTICE_ID, x);
  let k;
  if (h[2] === MEMO_CACHE_SENTINEL)
    ((k = e(Box, {
      children: r(Text, {
        color: "suggestion",
        children: [
          "Fable is on us",
          e(Text, {
            color: "text",
            dimColor: !0,
            children:
              " \xB7 Your admin opted you in to a free credit for Fable usage, available for a limited time \xB7 /usage",
          }),
        ],
      }),
    })),
      (h[2] = k));
  else k = h[2];
  return k;
}
//@ chunk-ag5x7vhf.js:89375-89440 placement
function isBeforeTimestamp(m, h) {
  let parse = Date.parse(m);
  return !Number.isNaN(parse) && h < parse;
}
//@ chunk-ag5x7vhf.js:89440-89444 placement
j();

export {
  PROMO_CREDIT_NOTICE_ID,
  shouldShowPromoCreditNotice,
  PromoCreditNotice,
  SubscriptionSwitchNotice,
  isPromoCreditNoticeEligible,
  getPromoLoginKey,
  hasRemainingPromoCredit,
};
