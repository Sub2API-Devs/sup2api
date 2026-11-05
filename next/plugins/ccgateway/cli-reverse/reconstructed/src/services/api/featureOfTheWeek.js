/**
 * services/api/featureOfTheWeek.ts
 *
 * 2.1.316 新增。“本周功能”活动与赠送额度资格。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a76zrsb5.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { create_2, create, create_6, create_15, create_26 } from "../../../vendor/zod/lib/index.mjs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getDynamicConfig_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  isClaudeAISubscriber,
  getSubscriptionType,
  isConsumerSubscriber,
  getOauthAccountInfo,
} from "../../utils/auth.js";
import { isConsumerPlan } from "../../utils/planTiers.js";
import {
  hasClaimedFeature,
  getCachedOverageCreditGrant,
  isUpsellFulfilled,
  markFeatureClaimed,
  refreshOverageCreditGrantCache,
} from "./overageCreditGrant.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a76zrsb5.js:511-1331 placement
/**
 * Feature of the Week 活动配置：开关名、命令与时间窗、标题/说明/提示文案、公告行与领取期限的 zod schema。
 */
var FOTW_EXPERIMENT_FLAG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var FEATURE_OF_THE_WEEK;
var FOTW_DAY_MS;
var isoTimestampSchema;
var optionalNonEmptyString;
var fotwCampaignSchema;
deferInit("chunk-a76zrsb5.js:511", () => {
  FOTW_EXPERIMENT_FLAG = "tengu_lilac_loom";
  FEATURE_OF_THE_WEEK = "feature_of_the_week";
  FOTW_DAY_MS = 86400000;
  isoTimestampSchema = () =>
    create_2().refine(
      (rawValue) => !Number.isNaN(Date.parse(rawValue)) && /(z|[+-]\d{2}:?\d{2})$/i.test(rawValue),
      "must be ISO 8601 with timezone, e.g. 2026-06-04T16:00:00Z",
    );
  optionalNonEmptyString = () =>
    create_2()
      .optional()
      .transform((rawValue) => (rawValue === "" ? undefined : rawValue));
  fotwCampaignSchema = DoctorLazy(() =>
    create({
      feature: create_2().min(1),
      command: create_2()
        .optional()
        .transform((rawValue) => (rawValue === "" ? undefined : rawValue)),
      startsAt: isoTimestampSchema(),
      endsAt: isoTimestampSchema(),
      hideCommandChip: create_6().optional(),
      creditless: create_6().optional(),
      titleLabel: optionalNonEmptyString(),
      commandBlurb: optionalNonEmptyString(),
      tipBlurb: optionalNonEmptyString(),
      isTopPriorityAnnouncement: create_6().optional(),
      announcementLines: create_15(
        create({
          text: create_2(),
          style: create_26(["bold", "dim"]).optional(),
        }),
      )
        .optional()
        .transform((lines) => {
          let filtered = lines?.filter((line) => line.text !== "");
          return filtered?.length ? filtered : undefined;
        })
        .catch(undefined),
      tips: create_15(create_2())
        .optional()
        .transform((tips) => {
          let filtered = tips?.filter(Boolean);
          return filtered?.length ? filtered : undefined;
        })
        .catch(undefined),
      redeemBy: optionalNonEmptyString(),
    }),
  );
});
//@ chunk-a76zrsb5.js:1331-1391 placement
class FotwState {
  parsedCampaign = null;
  inFlightEligibilityRefresh = null;
}
//@ chunk-a76zrsb5.js:1391-1414 placement
var fotwStateSlot; // deferred: uses FotwState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a76zrsb5.js:1391", () => {
  fotwStateSlot = new HostScoped(() => new FotwState());
});
//@ chunk-a76zrsb5.js:1414-1449 placement
function fotwState() {
  return fotwStateSlot.of(getRootSession().host);
}
//@ chunk-a76zrsb5.js:1449-2056 placement
function parsePromoCampaign() {
  let dynamicConfig_CACHED_MAY_BE_STALE = getDynamicConfig_CACHED_MAY_BE_STALE(FOTW_EXPERIMENT_FLAG, null);
  if (dynamicConfig_CACHED_MAY_BE_STALE === null || dynamicConfig_CACHED_MAY_BE_STALE === undefined)
    return null;
  let state = fotwState();
  if (state.parsedCampaign === null || state.parsedCampaign.raw !== dynamicConfig_CACHED_MAY_BE_STALE) {
    let parsed = fotwCampaignSchema().safeParse(dynamicConfig_CACHED_MAY_BE_STALE);
    if (!parsed.success)
      logForDebugging(`Promo campaign payload failed validation: ${parsed.error.message}`, {
        level: "warn",
      });
    state.parsedCampaign = parsed.success
      ? {
          raw: dynamicConfig_CACHED_MAY_BE_STALE,
          campaign: parsed.data,
          startsAtMs: Date.parse(parsed.data.startsAt),
          endsAtMs: Date.parse(parsed.data.endsAt),
        }
      : {
          raw: dynamicConfig_CACHED_MAY_BE_STALE,
          campaign: null,
          startsAtMs: 0,
          endsAtMs: 0,
        };
  }
  if (state.parsedCampaign.campaign === null) return null;
  let now = Date.now();
  if (now < state.parsedCampaign.startsAtMs) return null;
  if (now > state.parsedCampaign.endsAtMs) return null;
  return state.parsedCampaign.campaign;
}
//@ chunk-a76zrsb5.js:2056-2099 placement
/**
 * 导出函数 `promoCommand`：返回 parsePromoCampaign()?.command ?? null。
 */
function promoCommand() {
  return parsePromoCampaign()?.command ?? null;
}
//@ chunk-a76zrsb5.js:2099-2337 placement
function promoAudience(campaign) {
  if (!isClaudeAISubscriber()) return "excluded";
  let subscriptionType = getSubscriptionType();
  if (!subscriptionType) return "excluded";
  if (campaign.creditless) return "viewer";
  if (isConsumerSubscriber()) return "claimant";
  if (subscriptionType === "team") {
    if (!getOauthAccountInfo()?.organizationRole) return "excluded";
    return isConsumerPlan() ? "claimant" : "viewer";
  }
  return "excluded";
}
//@ chunk-a76zrsb5.js:2337-2552 placement
function activePromo() {
  let campaign = parsePromoCampaign();
  if (!campaign) return null;
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  if (!organizationUuid) return null;
  let audience = promoAudience(campaign);
  if (audience === "excluded") return null;
  if (audience === "claimant" && hasClaimedFeature(organizationUuid, campaign.feature)) return null;
  return {
    campaign,
    orgId: organizationUuid,
    audience,
  };
}
//@ chunk-a76zrsb5.js:2552-2603 placement
/**
 * 导出函数 `isPromoCommand`：参数 e，返回 n !== null && e === n。
 */
function isPromoCommand(command) {
  let commandName = promoCommand();
  return commandName !== null && command === commandName;
}
//@ chunk-a76zrsb5.js:2603-2640 placement
/**
 * 导出函数 `canClaimPromoCreditFor`：参数 e，返回 jDr(e) && canClaimPromoCredit()。
 */
function canClaimPromoCreditFor(command) {
  return isPromoCommand(command) && canClaimPromoCredit();
}
//@ chunk-a76zrsb5.js:2640-2814 placement
/**
 * 当前组织作为领取方（claimant）且活动配置了命令时，判断缓存的超额额度赠送是否符合条件且仍可领取。
 */
function canClaimPromoCredit() {
  let promo = activePromo();
  if (!promo || promo.audience !== "claimant") return false;
  if (!promo.campaign.command) return false;
  let cachedOverageCreditGrant = getCachedOverageCreditGrant(promo.orgId, promo.campaign.feature);
  return (
    cachedOverageCreditGrant !== null &&
    cachedOverageCreditGrant.eligible &&
    cachedOverageCreditGrant.available
  );
}
//@ chunk-a76zrsb5.js:2814-2946 placement
/**
 * 当前组织作为观看方（viewer）且活动配置了命令时，判断升级推广是否尚未完成，用于决定是否展示推广。
 */
function shouldShowPromoUpsell() {
  let promo = activePromo();
  if (!promo || promo.audience !== "viewer") return false;
  if (!promo.campaign.command) return false;
  return !isUpsellFulfilled(promo.orgId, promo.campaign.feature);
}
//@ chunk-a76zrsb5.js:2946-3167 placement
/**
 * 读取当前组织在本次推广活动中可领取的额度金额（最小货币单位与币种），没有缓存或数据不全时返回 null。
 */
function promoCreditAmount() {
  let promoCampaign = parsePromoCampaign();
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  if (!promoCampaign || !organizationUuid) return null;
  let cachedOverageCreditGrant = getCachedOverageCreditGrant(organizationUuid, promoCampaign.feature);
  if (
    !cachedOverageCreditGrant ||
    cachedOverageCreditGrant.amount_minor_units === null ||
    !cachedOverageCreditGrant.currency
  )
    return null;
  return {
    amountMinorUnits: cachedOverageCreditGrant.amount_minor_units,
    currency: cachedOverageCreditGrant.currency,
  };
}
//@ chunk-a76zrsb5.js:3167-3391 placement
/**
 * 刷新推广资格：合并同一时刻的并发请求，失败只记调试日志并返回 null。
 */
function refreshPromoEligibility(credentials) {
  let state = fotwState();
  state.inFlightEligibilityRefresh ??= fetchOverageCreditGrant(credentials)
    .catch((error) => {
      logForDebugging(`FotW eligibility refresh failed: ${error}`, {
        level: "warn",
      });
      return null;
    })
    .finally(() => {
      state.inFlightEligibilityRefresh = null;
    });
  return state.inFlightEligibilityRefresh;
}
//@ chunk-a76zrsb5.js:3391-4406 placement
/**
 * GET overage_credit_grant?campaign=… 查询领取资格并缓存。
 */
async function fetchOverageCreditGrant(credentials) {
  let promo = activePromo();
  if (!promo || promo.audience !== "claimant") return null;
  let { campaign, orgId } = promo;
  if (getCachedOverageCreditGrant(orgId, campaign.feature) !== null) return null;
  let response;
  try {
    response = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/overage_credit_grant?campaign=${FEATURE_OF_THE_WEEK}`,
      {
        auth: "teleport-org",
        timeout: 1e4,
        validateStatus: (status) => status < 500,
        credentials,
      },
    );
  } catch (error) {
    logFeatureSad("api_fotw_eligibility_fetch", "request_failed");
    logForDebugging(`FotW eligibility fetch failed: ${error}`, {
      level: "warn",
    });
    return null;
  }
  if (!response.ok || response.status >= 400) {
    logFeatureSad("api_fotw_eligibility_fetch", "unavailable");
    return null;
  }
  logFeatureOk("api_fotw_eligibility_fetch");
  if (response.data.granted) markFeatureClaimed(orgId, campaign.feature);
  if (response.data.eligible && response.data.needs_payment_setup === true) {
    if (response.data.amount_minor_units == null || !response.data.currency) return null;
    return {
      amountMinorUnits: response.data.amount_minor_units,
      currency: response.data.currency,
    };
  }
  if (getCachedOverageCreditGrant(orgId, campaign.feature) !== null) return null;
  refreshOverageCreditGrantCache(
    orgId,
    campaign.feature,
    {
      available: response.data.available,
      eligible: response.data.eligible,
      granted: response.data.granted,
      amount_minor_units: response.data.amount_minor_units ?? null,
      currency: response.data.currency ?? null,
    },
    {
      onlyIfAbsent: true,
    },
  );
  return null;
}
export {
  FOTW_DAY_MS,
  canClaimPromoCreditFor,
  activePromo,
  promoCreditAmount,
  FEATURE_OF_THE_WEEK,
  isPromoCommand,
  refreshPromoEligibility,
  promoCommand,
  parsePromoCampaign,
  canClaimPromoCredit,
  shouldShowPromoUpsell,
};
