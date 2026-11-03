/**
 * services/api/referral.ts
 *
 * 邀请/Guest Passes：资格检查与缓存、推荐奖励与剩余次数、货币格式，以及远程会话 teleport 请求构建。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/referral.ts
 * pieces: chunk-ag5x7vhf.js (1), chunk-e6aww6q8.js (1), chunk-s61vbvea.js (23)
 * attribution: fingerprint 8, callgraph-fingerprint 1, layout 5, placement 11
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { apiClient } from "../routines/routinesApi.js";
import { withFeatureTelemetry, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  getSubscriptionType,
  getOauthAccountInfo,
  isClaudeAISubscriber,
  hasProfileScope,
} from "../../utils/auth.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { freeze as freeze_8 } from "../../../vendor/zod/v4/core/core.js";
import { logForDebugging } from "../../utils/debug.js";
import { fetchUserSettingsOnce } from "../settingsSync/index.js";
import { Vt } from "../../utils/agentId.js";
import { env } from "../../utils/env.js";
import { getApiCreditLinkText, Hm, Fm } from "../../components/LogoV2/ApiCreditLinkNotice.js";
import { arePromoOffersAllowed, isConsumerPlan as isConsumerPlan_2 } from "../../utils/planTiers.js";
import { sessionsApiWire } from "../../utils/teleport/api.js";
import { getOauthConfig } from "../../constants/oauth.js";

/**
 * 货币符号表；JPY/KRW/VND 为零小数位货币。
 */
//@ chunk-s61vbvea.js:499888-500019 fingerprint = CURRENCY_SYMBOLS (0.783)
var CURRENCY_SYMBOLS = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\xA3",
    JPY: "\xA5",
    BRL: "R$",
    CAD: "CA$",
    AUD: "A$",
    NZD: "NZ$",
    SGD: "S$",
  },
  ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);
/**
 * 货币符号，未知时 "<CODE> "。
 */
//@ chunk-s61vbvea.js:500019-500079 layout
function getCurrencySymbol(e) {
  let upper = e.toUpperCase();
  return CURRENCY_SYMBOLS[upper] ?? `${upper} `;
}
//@ chunk-s61vbvea.js:500079-500439 placement
function formatCurrency(e, n, r = "precise") {
  let upper = n.toUpperCase(),
    h = getCurrencySymbol(upper);
  if (ZERO_DECIMAL_CURRENCIES.has(upper)) return `${h}${Math.round(e).toLocaleString("en-US")}`;
  let y = e / 100;
  if (r === "whole") return `${h}${Math.round(y).toLocaleString("en-US")}`;
  if (r === "fit" && y % 1 === 0) return `${h}${y.toLocaleString("en-US")}`;
  return `${h}${y.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
//@ chunk-s61vbvea.js:500439-500455 placement
var pH = 86400000;
//@ chunk-s61vbvea.js:500455-500539 placement
function Aw(e, n) {
  return typeof e === "number" && Number.isFinite(e) ? Math.abs(n - e) > pH : !0;
}
//@ chunk-s61vbvea.js:500539-500562 placement
class Pw {
  inFlight = null;
}
//@ chunk-s61vbvea.js:500562-500587 placement
var mH = new HostScoped(() => new Pw());
//@ chunk-s61vbvea.js:500587-500624 placement
function gH() {
  return mH.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:500624-500737 placement
var REFERRAL_REASON_CODES = {
  "no-auth": "no_auth",
  "data-residency": "data_residency",
  "essential-traffic-only": "essential_traffic_only",
};
//@ chunk-s61vbvea.js:500737-500862 placement
class ReferralEligibilityUnavailableError extends Error {
  errorCode;
  constructor(e, n) {
    super(e);
    ((this.name = "ReferralEligibilityUnavailableError"), (this.errorCode = n));
  }
}
/**
 * 请求组织推荐活动资格接口，失败抛带原因分类的 ReferralEligibilityUnavailableError。
 */
//@ chunk-s61vbvea.js:501122-501433 placement
async function fetchReferralEligibility(e, n) {
  let r = await apiClient.get(
    `/api/oauth/organizations/:orgUUID/referral/eligibility?campaign=${encodeURIComponent(e)}`,
    { auth: "teleport-org", timeout: 5000, credentials: n },
  );
  if (!r.ok)
    throw new ReferralEligibilityUnavailableError(
      r.reason === "no-auth" ? r.detail : `Referral eligibility unavailable: ${r.reason}`,
      REFERRAL_REASON_CODES[r.reason],
    );
  return r.data;
}
//@ chunk-s61vbvea.js:501433-501785 placement
async function fetchReferralRedemptions(e, n) {
  return withFeatureTelemetry("api_referral_redemptions_fetch", async () => {
    let r = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/referral/redemptions?campaign=${encodeURIComponent(e)}`,
      { auth: "teleport-org", timeout: 1e4, credentials: n },
    );
    if (!r.ok)
      throw Error(r.reason === "no-auth" ? r.detail : `Referral redemptions unavailable: ${r.reason}`);
    return r.data;
  });
}
//@ chunk-s61vbvea.js:501785-501879 placement = isConsumerPlan (0.894)
function isConsumerPlan() {
  let e = getSubscriptionType();
  return !!(
    getOauthAccountInfo()?.organizationUuid &&
    isClaudeAISubscriber() &&
    hasProfileScope() &&
    (e === "max" || e === "pro")
  );
}
/**
 * 读缓存的 Passes 资格 {eligible, needsRefresh, hasCache}。
 */
//@ chunk-s61vbvea.js:501879-502222 fingerprint = checkCachedPassesEligibility (1)
function checkCachedPassesEligibility() {
  if (!isConsumerPlan()) return { eligible: !1, needsRefresh: !1, hasCache: !1 };
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return { eligible: !1, needsRefresh: !1, hasCache: !1 };
  let cachedEntry = getGlobalConfig().passesEligibilityCache?.[orgId];
  if (!cachedEntry) return { eligible: !1, needsRefresh: !0, hasCache: !1 };
  let { eligible: eligible, timestamp: timestamp } = cachedEntry,
    y = Aw(timestamp, Date.now());
  return { eligible: eligible, needsRefresh: y, hasCache: !0 };
}
/**
 * 按货币格式化最小单位金额。
 */
//@ chunk-s61vbvea.js:502222-502287 layout
function formatMinorUnits(e) {
  return formatCurrency(e.amount_minor_units, e.currency, "fit");
}
/**
 * {amount_minor_units, currency}。旧版名 formatCreditAmount 为错配。
 */
//@ chunk-s61vbvea.js:502287-502365 fingerprint = formatCreditAmount (0.734)
var creditAmountSchema = DoctorLazy(() =>
  u({ amount_minor_units: E(), currency: o().regex(/^[A-Za-z]{3}$/) }),
);
/**
 * 校验并解析 {amount_minor_units, currency}。
 */
//@ chunk-s61vbvea.js:502365-502433 layout
function parseCreditAmount(e) {
  let safeParse = creditAmountSchema().safeParse(e);
  return safeParse.success ? safeParse.data : null;
}
/**
 * 推荐活动 schema：campaign、code、referral_link（只接受 http/https）。
 */
//@ chunk-s61vbvea.js:502433-502668 layout
var referralCampaignSchema = DoctorLazy(() =>
  u({
    campaign: o(),
    code: o(),
    referral_link: o().transform((e, n) => {
      try {
        let r = new URL(e);
        if (r.protocol === "https:" || r.protocol === "http:") return r.href;
      } catch {}
      return (n.addIssue({ code: "custom", message: "not an http(s) URL" }), freeze_8);
    }),
  }),
);
/**
 * 解析推荐活动。
 */
//@ chunk-s61vbvea.js:502668-502738 layout
function parseReferralCampaign(e) {
  let safeParse = referralCampaignSchema().safeParse(e);
  return safeParse.success ? safeParse.data : void 0;
}
/**
 * 缓存中的推荐奖励金额。
 */
//@ chunk-s61vbvea.js:502738-502869 fingerprint = getCachedReferrerReward (1)
function getCachedReferrerReward() {
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  let cachedEntry = getGlobalConfig().passesEligibilityCache?.[orgId];
  return parseCreditAmount(cachedEntry?.referrer_reward);
}
/**
 * 缓存中的剩余 Pass 数。
 */
//@ chunk-s61vbvea.js:502869-503022 fingerprint = getCachedRemainingPasses (1)
function getCachedRemainingPasses() {
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  let cachedEntry = getGlobalConfig().passesEligibilityCache?.[orgId]?.remaining_passes;
  return typeof cachedEntry === "number" ? cachedEntry : null;
}
/**
 * 拉取并保存 Passes 资格（复用进行中请求）。
 */
//@ chunk-s61vbvea.js:503022-503691 fingerprint = fetchAndStorePassesEligibility (0.681)
async function fetchAndStorePassesEligibility(e, n) {
  let r = gH();
  if (r.inFlight) return (logForDebugging("Passes: Reusing in-flight eligibility fetch"), r.inFlight);
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  return (
    (r.inFlight = (async () => {
      try {
        let h = await fetchReferralEligibility("claude_code_guest_pass", e),
          cacheEntry = { ...h, timestamp: Date.now() };
        return (
          await saveGlobalConfig(
            (current) => ({
              ...current,
              passesEligibilityCache: { ...current.passesEligibilityCache, [orgId]: cacheEntry },
            }),
            n,
          ),
          logForDebugging(`Passes eligibility cached for org ${orgId}: ${h.eligible}`),
          logFeatureOk("api_referral_eligibility_fetch"),
          h
        );
      } catch (error) {
        return (
          logForDebugging(
            `Failed to fetch and cache passes eligibility: ${error instanceof Error ? error.message : String(error)}`,
            { level: "error" },
          ),
          logFeatureSad("api_referral_eligibility_fetch", fetchUserSettingsOnce(error)),
          null
        );
      } finally {
        r.inFlight = null;
      }
    })()),
    r.inFlight
  );
}
/**
 * 读缓存，无缓存时后台拉取。
 */
//@ chunk-s61vbvea.js:503691-504239 fingerprint = getCachedOrFetchPassesEligibility (0.889)
async function getCachedOrFetchPassesEligibility(e, n) {
  if (!isConsumerPlan()) return null;
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  let cachedEntry = getGlobalConfig().passesEligibilityCache?.[orgId],
    now = Date.now();
  if (!cachedEntry)
    return (
      logForDebugging(
        "Passes: No cache, fetching eligibility in background (command unavailable this session)",
      ),
      fetchAndStorePassesEligibility(e, n),
      null
    );
  if (Aw(cachedEntry.timestamp, now))
    (logForDebugging("Passes: Cache stale, returning cached data and refreshing in background"),
      fetchAndStorePassesEligibility(e, n));
  else logForDebugging("Passes: Using fresh cached eligibility data");
  let { timestamp: timestamp, ...w } = cachedEntry;
  return {
    ...w,
    referral_code_details: parseReferralCampaign(w.referral_code_details),
    referrer_reward: parseCreditAmount(w.referrer_reward),
  };
}
/**
 * 是否检查 Guest Passes（Max/Team 订阅、组织匹配等），返回组织 id。
 */
//@ chunk-ag5x7vhf.js:94515-94708 fingerprint = shouldCheckForPasses (0.644)
function shouldCheckForPasses() {
  let m = getSubscriptionType(),
    h = Vt(getOauthAccountInfo()?.organizationUuid) ?? void 0,
    CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  return (m === "max" || m === "team") &&
    getApiCreditLinkText() !== null &&
    Hm(getGlobalConfig()) < Fm &&
    arePromoOffersAllowed() &&
    hasProfileScope() &&
    isConsumerPlan_2() &&
    (!CLAUDE_CODE_ORGANIZATION_UUID || CLAUDE_CODE_ORGANIZATION_UUID === h)
    ? h
    : void 0;
}
/**
 * 构建远程会话请求描述（url、组织头、bearer 与恢复回调）。旧版名 fetchReferralEligibility 为错配。
 */
//@ chunk-e6aww6q8.js:1878148-1878366 callgraph-fingerprint = fetchReferralEligibility (0.319)
function fetchReferralEligibility_2(e, n, r, s, h, y) {
  let S = sessionsApiWire(e, getOauthConfig().BASE_API_URL, n);
  return {
    url: S.url,
    headers: { ...S.headers, "x-organization-uuid": r },
    bearer: n,
    readBearer: h,
    recoverBearer: y,
    profile: s,
    recovery: void 0,
    reenrolled: !1,
    reauthorized: !1,
  };
}

export {
  formatCurrency,
  getCurrencySymbol,
  fetchReferralEligibility_2,
  getCachedReferrerReward,
  formatMinorUnits,
  checkCachedPassesEligibility,
  getCachedOrFetchPassesEligibility,
  fetchReferralRedemptions,
  getCachedRemainingPasses,
  ReferralEligibilityUnavailableError,
  shouldCheckForPasses,
};
