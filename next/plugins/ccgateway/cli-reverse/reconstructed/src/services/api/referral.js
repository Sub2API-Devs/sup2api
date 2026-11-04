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
import { objectSchema, numberSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { INVALID } from "../../../vendor/zod/v4/core/core.js";
import { logForDebugging } from "../../utils/debug.js";
import { fetchUserSettingsOnce } from "../settingsSync/index.js";
import { sessionsApiWire } from "../../utils/teleport/api.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { env } from "../../utils/env.js";
import {
  getApiCreditLinkText,
  apiCreditLinkImpressionCount,
  API_CREDIT_MAX_ASKS,
} from "../../components/LogoV2/ApiCreditLinkNotice.js";
import { arePromoOffersAllowed, isConsumerPlan as isConsumerPlan_2 } from "../../utils/planTiers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:499888-500019 fingerprint (2.1.88 match: CURRENCY_SYMBOLS, 0.783)
/**
 * 货币符号表；JPY/KRW/VND 为零小数位货币。
 */
var CURRENCY_SYMBOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ZERO_DECIMAL_CURRENCIES;
deferInit("chunk-s61vbvea.js:499888", () => {
  CURRENCY_SYMBOLS = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\xA3",
    JPY: "\xA5",
    BRL: "R$",
    CAD: "CA$",
    AUD: "A$",
    NZD: "NZ$",
    SGD: "S$",
  };
  ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND"]);
});
//@ chunk-s61vbvea.js:500019-500079 layout
/**
 * 货币符号，未知时 "<CODE> "。
 */
function getCurrencySymbol(currency) {
  let upper = currency.toUpperCase();
  return CURRENCY_SYMBOLS[upper] ?? `${upper} `;
}
//@ chunk-s61vbvea.js:500079-500439 placement
function formatCurrency(amount, currency, precision = "precise") {
  let upper = currency.toUpperCase();
  let currencySymbol = getCurrencySymbol(upper);
  if (ZERO_DECIMAL_CURRENCIES.has(upper))
    return `${currencySymbol}${Math.round(amount).toLocaleString("en-US")}`;
  let units = amount / 100;
  if (precision === "whole") return `${currencySymbol}${Math.round(units).toLocaleString("en-US")}`;
  if (precision === "fit" && units % 1 === 0) return `${currencySymbol}${units.toLocaleString("en-US")}`;
  return `${currencySymbol}${units.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
//@ chunk-s61vbvea.js:500439-500455 placement
var REFERRAL_CACHE_TTL_MS = 86400000;
//@ chunk-s61vbvea.js:500455-500539 placement
function isStaleTimestamp(timestamp, now) {
  return typeof timestamp === "number" && Number.isFinite(timestamp)
    ? Math.abs(now - timestamp) > REFERRAL_CACHE_TTL_MS
    : true;
}
//@ chunk-s61vbvea.js:500539-500562 placement
class ReferralState {
  inFlight = null;
}
//@ chunk-s61vbvea.js:500562-500587 placement
var referralStateSlot; // deferred: uses ReferralState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:500562", () => {
  referralStateSlot = new HostScoped(() => new ReferralState());
});
//@ chunk-s61vbvea.js:500587-500624 placement
function referralState() {
  return referralStateSlot.of(getRootSession().host);
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
  constructor(message, errorCode) {
    super(message);
    this.name = "ReferralEligibilityUnavailableError";
    this.errorCode = errorCode;
  }
}
//@ chunk-s61vbvea.js:501122-501433 placement
/**
 * 请求组织推荐活动资格接口，失败抛带原因分类的 ReferralEligibilityUnavailableError。
 */
async function fetchReferralEligibility(credentials, credentials_2) {
  let response = await apiClient.get(
    `/api/oauth/organizations/:orgUUID/referral/eligibility?campaign=${encodeURIComponent(credentials)}`,
    {
      auth: "teleport-org",
      timeout: 5000,
      credentials: credentials_2,
    },
  );
  if (!response.ok)
    throw new ReferralEligibilityUnavailableError(
      response.reason === "no-auth"
        ? response.detail
        : `Referral eligibility unavailable: ${response.reason}`,
      REFERRAL_REASON_CODES[response.reason],
    );
  return response.data;
}
//@ chunk-s61vbvea.js:501433-501785 placement
async function fetchReferralRedemptions(campaign, credentials) {
  return withFeatureTelemetry("api_referral_redemptions_fetch", async () => {
    let response = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/referral/redemptions?campaign=${encodeURIComponent(campaign)}`,
      {
        auth: "teleport-org",
        timeout: 1e4,
        credentials,
      },
    );
    if (!response.ok)
      throw Error(
        response.reason === "no-auth"
          ? response.detail
          : `Referral redemptions unavailable: ${response.reason}`,
      );
    return response.data;
  });
}
//@ chunk-s61vbvea.js:501785-501879 placement (2.1.88 match: isConsumerPlan, 0.894)
function isConsumerPlan() {
  let plan = getSubscriptionType();
  return !!(
    getOauthAccountInfo()?.organizationUuid &&
    isClaudeAISubscriber() &&
    hasProfileScope() &&
    (plan === "max" || plan === "pro")
  );
}
//@ chunk-s61vbvea.js:501879-502222 fingerprint (2.1.88 match: checkCachedPassesEligibility, 1)
/**
 * 读缓存的 Passes 资格 {eligible, needsRefresh, hasCache}。
 */
function checkCachedPassesEligibility() {
  if (!isConsumerPlan())
    return {
      eligible: false,
      needsRefresh: false,
      hasCache: false,
    };
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId)
    return {
      eligible: false,
      needsRefresh: false,
      hasCache: false,
    };
  let cachedEntry = getGlobalConfig().passesEligibilityCache?.[orgId];
  if (!cachedEntry)
    return {
      eligible: false,
      needsRefresh: true,
      hasCache: false,
    };
  let { eligible, timestamp } = cachedEntry;
  let needsRefresh = isStaleTimestamp(timestamp, Date.now());
  return {
    eligible,
    needsRefresh,
    hasCache: true,
  };
}
//@ chunk-s61vbvea.js:502222-502287 layout
/**
 * 按货币格式化最小单位金额。
 */
function formatMinorUnits(amount) {
  return formatCurrency(amount.amount_minor_units, amount.currency, "fit");
}
//@ chunk-s61vbvea.js:502287-502365 fingerprint (2.1.88 match: formatCreditAmount, 0.734)
/**
 * {amount_minor_units, currency}。旧版名 formatCreditAmount 为错配。
 */
var creditAmountSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:502287", () => {
  creditAmountSchema = DoctorLazy(() =>
    objectSchema({
      amount_minor_units: numberSchema(),
      currency: stringSchema().regex(/^[A-Za-z]{3}$/),
    }),
  );
});
//@ chunk-s61vbvea.js:502365-502433 layout
/**
 * 校验并解析 {amount_minor_units, currency}。
 */
function parseCreditAmount(referrerReward) {
  let parsed = creditAmountSchema().safeParse(referrerReward);
  return parsed.success ? parsed.data : null;
}
//@ chunk-s61vbvea.js:502433-502668 layout
/**
 * 推荐活动 schema：campaign、code、referral_link（只接受 http/https）。
 */
var referralCampaignSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:502433", () => {
  referralCampaignSchema = DoctorLazy(() =>
    objectSchema({
      campaign: stringSchema(),
      code: stringSchema(),
      referral_link: stringSchema().transform((link, index) => {
        try {
          let parsed = new URL(link);
          if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
        } catch {}
        index.addIssue({
          code: "custom",
          message: "not an http(s) URL",
        });
        return INVALID;
      }),
    }),
  );
});
//@ chunk-s61vbvea.js:502668-502738 layout
/**
 * 解析推荐活动。
 */
function parseReferralCampaign(referralCodeDetails) {
  let parsed = referralCampaignSchema().safeParse(referralCodeDetails);
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-s61vbvea.js:502738-502869 fingerprint (2.1.88 match: getCachedReferrerReward, 1)
/**
 * 缓存中的推荐奖励金额。
 */
function getCachedReferrerReward() {
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  let cachedEntry = getGlobalConfig().passesEligibilityCache?.[orgId];
  return parseCreditAmount(cachedEntry?.referrer_reward);
}
//@ chunk-s61vbvea.js:502869-503022 fingerprint (2.1.88 match: getCachedRemainingPasses, 1)
/**
 * 缓存中的剩余 Pass 数。
 */
function getCachedRemainingPasses() {
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  let config = getGlobalConfig().passesEligibilityCache?.[orgId]?.remaining_passes;
  return typeof config === "number" ? config : null;
}
//@ chunk-s61vbvea.js:503022-503691 fingerprint (2.1.88 match: fetchAndStorePassesEligibility, 0.681)
/**
 * 拉取并保存 Passes 资格（复用进行中请求）。
 */
async function fetchAndStorePassesEligibility(credentials, fetchCredentials) {
  let state = referralState();
  if (state.inFlight) {
    logForDebugging("Passes: Reusing in-flight eligibility fetch");
    return state.inFlight;
  }
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  state.inFlight = (async () => {
    try {
      let response = await fetchReferralEligibility("claude_code_guest_pass", credentials);
      let cacheEntry = {
        ...response,
        timestamp: Date.now(),
      };
      await saveGlobalConfig(
        (current) => ({
          ...current,
          passesEligibilityCache: {
            ...current.passesEligibilityCache,
            [orgId]: cacheEntry,
          },
        }),
        fetchCredentials,
      );
      logForDebugging(`Passes eligibility cached for org ${orgId}: ${response.eligible}`);
      logFeatureOk("api_referral_eligibility_fetch");
      return response;
    } catch (error) {
      logForDebugging(
        `Failed to fetch and cache passes eligibility: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      logFeatureSad("api_referral_eligibility_fetch", fetchUserSettingsOnce(error));
      return null;
    } finally {
      state.inFlight = null;
    }
  })();
  return state.inFlight;
}
//@ chunk-s61vbvea.js:503691-504239 fingerprint (2.1.88 match: getCachedOrFetchPassesEligibility, 0.889)
/**
 * 读缓存，无缓存时后台拉取。
 */
async function getCachedOrFetchPassesEligibility(credentials, key) {
  if (!isConsumerPlan()) return null;
  let orgId = getOauthAccountInfo()?.organizationUuid;
  if (!orgId) return null;
  let cachedEntry = getGlobalConfig().passesEligibilityCache?.[orgId];
  let now = Date.now();
  if (!cachedEntry) {
    logForDebugging(
      "Passes: No cache, fetching eligibility in background (command unavailable this session)",
    );
    fetchAndStorePassesEligibility(credentials, key);
    return null;
  }
  if (isStaleTimestamp(cachedEntry.timestamp, now)) {
    logForDebugging("Passes: Cache stale, returning cached data and refreshing in background");
    fetchAndStorePassesEligibility(credentials, key);
  } else logForDebugging("Passes: Using fresh cached eligibility data");
  let { timestamp, ...rest } = cachedEntry;
  return {
    ...rest,
    referral_code_details: parseReferralCampaign(rest.referral_code_details),
    referrer_reward: parseCreditAmount(rest.referrer_reward),
  };
}
//@ chunk-e6aww6q8.js:1878148-1878366 callgraph-fingerprint (2.1.88 match: fetchReferralEligibility, 0.319)
/**
 * 构建远程会话请求描述（url、组织头、bearer 与恢复回调）。旧版名 fetchReferralEligibility 为错配。
 */
function fetchReferralEligibility_2(credentials, storageV5, sessionId, profile, readBearer, recoverBearer) {
  let url = sessionsApiWire(credentials, getOauthConfig().BASE_API_URL, storageV5);
  return {
    url: url.url,
    headers: {
      ...url.headers,
      "x-organization-uuid": sessionId,
    },
    bearer: storageV5,
    readBearer,
    recoverBearer,
    profile,
    recovery: undefined,
    reenrolled: false,
    reauthorized: false,
  };
}
//@ chunk-ag5x7vhf.js:94515-94708 fingerprint (2.1.88 match: shouldCheckForPasses, 0.644)
/**
 * 是否检查 Guest Passes（Max/Team 订阅、组织匹配等），返回组织 id。
 */
function shouldCheckForPasses() {
  let subscriptionType = getSubscriptionType();
  let orgUuid = normalizeUuidOrNull(getOauthAccountInfo()?.organizationUuid) ?? undefined;
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  return (subscriptionType === "max" || subscriptionType === "team") &&
    getApiCreditLinkText() !== null &&
    apiCreditLinkImpressionCount(getGlobalConfig()) < API_CREDIT_MAX_ASKS &&
    arePromoOffersAllowed() &&
    hasProfileScope() &&
    isConsumerPlan_2() &&
    (!CLAUDE_CODE_ORGANIZATION_UUID || CLAUDE_CODE_ORGANIZATION_UUID === orgUuid)
    ? orgUuid
    : undefined;
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
