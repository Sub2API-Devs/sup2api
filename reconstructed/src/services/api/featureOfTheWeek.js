/**
 * services/api/featureOfTheWeek.ts
 *
 * 2.1.316 新增。“本周功能”活动与赠送额度资格。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0ba63vr9.js (15)
 * attribution: placement 15
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

//@ chunk-0ba63vr9.js:511-1331 placement
/**
 * Feature of the Week 活动配置：开关名、命令与时间窗、标题/说明/提示文案、公告行与领取期限的 zod schema。
 */
var FOTW_CAMPAIGN_SCHEMA = "tengu_lilac_loom";
var FEATURE_OF_THE_WEEK = "feature_of_the_week";
var FOTW_DAY_MS = 86400000;
var isoTimestampSchema = () =>
  create_2().refine(
    (e) => !Number.isNaN(Date.parse(e)) && /(z|[+-]\d{2}:?\d{2})$/i.test(e),
    "must be ISO 8601 with timezone, e.g. 2026-06-04T16:00:00Z",
  );
var optionalNonEmptyString = () =>
  create_2()
    .optional()
    .transform((e) => (e === "" ? undefined : e));
var fotwCampaignSchema = DoctorLazy(() =>
  create({
    feature: create_2().min(1),
    command: create_2()
      .optional()
      .transform((e) => (e === "" ? undefined : e)),
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
      .transform((e) => {
        let filtered = e?.filter((i) => i.text !== "");
        return filtered?.length ? filtered : undefined;
      })
      .catch(undefined),
    tips: create_15(create_2())
      .optional()
      .transform((e) => {
        let filtered = e?.filter(Boolean);
        return filtered?.length ? filtered : undefined;
      })
      .catch(undefined),
    redeemBy: optionalNonEmptyString(),
  }),
);
//@ chunk-0ba63vr9.js:1331-1391 placement
class FotwState {
  parsedCampaign = null;
  inFlightEligibilityRefresh = null;
}
//@ chunk-0ba63vr9.js:1391-1414 placement
var fotwStateSlot = new HostScoped(() => new FotwState());
//@ chunk-0ba63vr9.js:1414-1449 placement
function fotwState() {
  return fotwStateSlot.of(getRootSession().host);
}
//@ chunk-0ba63vr9.js:1449-2056 placement
function parsePromoCampaign() {
  let dynamicConfig_CACHED_MAY_BE_STALE = getDynamicConfig_CACHED_MAY_BE_STALE(FOTW_CAMPAIGN_SCHEMA, null);
  if (dynamicConfig_CACHED_MAY_BE_STALE === null || dynamicConfig_CACHED_MAY_BE_STALE === undefined)
    return null;
  let n = fotwState();
  if (n.parsedCampaign === null || n.parsedCampaign.raw !== dynamicConfig_CACHED_MAY_BE_STALE) {
    let r = fotwCampaignSchema().safeParse(dynamicConfig_CACHED_MAY_BE_STALE);
    if (!r.success)
      logForDebugging(`Promo campaign payload failed validation: ${r.error.message}`, {
        level: "warn",
      });
    n.parsedCampaign = r.success
      ? {
          raw: dynamicConfig_CACHED_MAY_BE_STALE,
          campaign: r.data,
          startsAtMs: Date.parse(r.data.startsAt),
          endsAtMs: Date.parse(r.data.endsAt),
        }
      : {
          raw: dynamicConfig_CACHED_MAY_BE_STALE,
          campaign: null,
          startsAtMs: 0,
          endsAtMs: 0,
        };
  }
  if (n.parsedCampaign.campaign === null) return null;
  let now = Date.now();
  if (now < n.parsedCampaign.startsAtMs) return null;
  if (now > n.parsedCampaign.endsAtMs) return null;
  return n.parsedCampaign.campaign;
}
//@ chunk-0ba63vr9.js:2056-2099 placement
/**
 * 导出函数 `promoCommand`：返回 parsePromoCampaign()?.command ?? null。
 */
function promoCommand() {
  return parsePromoCampaign()?.command ?? null;
}
//@ chunk-0ba63vr9.js:2099-2337 placement
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
//@ chunk-0ba63vr9.js:2337-2552 placement
function activePromo() {
  let campaign = parsePromoCampaign();
  if (!campaign) return null;
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  if (!organizationUuid) return null;
  let i = promoAudience(campaign);
  if (i === "excluded") return null;
  if (i === "claimant" && hasClaimedFeature(organizationUuid, campaign.feature)) return null;
  return {
    campaign,
    orgId: organizationUuid,
    audience: i,
  };
}
//@ chunk-0ba63vr9.js:2552-2603 placement
/**
 * 导出函数 `isPromoCommand`：参数 e，返回 n !== null && e === n。
 */
function isPromoCommand(e) {
  let n = promoCommand();
  return n !== null && e === n;
}
//@ chunk-0ba63vr9.js:2603-2640 placement
/**
 * 导出函数 `canClaimPromoCreditFor`：参数 e，返回 jDr(e) && canClaimPromoCredit()。
 */
function canClaimPromoCreditFor(commandName) {
  return isPromoCommand(commandName) && canClaimPromoCredit();
}
//@ chunk-0ba63vr9.js:2640-2814 placement
/**
 * 当前组织作为领取方（claimant）且活动配置了命令时，判断缓存的超额额度赠送是否符合条件且仍可领取。
 */
function canClaimPromoCredit() {
  let e = activePromo();
  if (!e || e.audience !== "claimant") return false;
  if (!e.campaign.command) return false;
  let cachedOverageCreditGrant = getCachedOverageCreditGrant(e.orgId, e.campaign.feature);
  return (
    cachedOverageCreditGrant !== null &&
    cachedOverageCreditGrant.eligible &&
    cachedOverageCreditGrant.available
  );
}
//@ chunk-0ba63vr9.js:2814-2946 placement
/**
 * 当前组织作为观看方（viewer）且活动配置了命令时，判断升级推广是否尚未完成，用于决定是否展示推广。
 */
function shouldShowPromoUpsell() {
  let e = activePromo();
  if (!e || e.audience !== "viewer") return false;
  if (!e.campaign.command) return false;
  return !isUpsellFulfilled(e.orgId, e.campaign.feature);
}
//@ chunk-0ba63vr9.js:2946-3167 placement
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
//@ chunk-0ba63vr9.js:3167-3391 placement
/**
 * 刷新推广资格：合并同一时刻的并发请求，失败只记调试日志并返回 null。
 */
function refreshPromoEligibility(credentials) {
  let n = fotwState();
  n.inFlightEligibilityRefresh ??= fetchOverageCreditGrant(credentials)
    .catch((error) => {
      logForDebugging(`FotW eligibility refresh failed: ${error}`, {
        level: "warn",
      });
      return null;
    })
    .finally(() => {
      n.inFlightEligibilityRefresh = null;
    });
  return n.inFlightEligibilityRefresh;
}
//@ chunk-0ba63vr9.js:3391-4406 placement
/**
 * GET overage_credit_grant?campaign=… 查询领取资格并缓存。
 */
async function fetchOverageCreditGrant(credentials) {
  let n = activePromo();
  if (!n || n.audience !== "claimant") return null;
  let { campaign, orgId } = n;
  if (getCachedOverageCreditGrant(orgId, campaign.feature) !== null) return null;
  let a;
  try {
    a = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/overage_credit_grant?campaign=${FEATURE_OF_THE_WEEK}`,
      {
        auth: "teleport-org",
        timeout: 1e4,
        validateStatus: (o) => o < 500,
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
  if (!a.ok || a.status >= 400) {
    logFeatureSad("api_fotw_eligibility_fetch", "unavailable");
    return null;
  }
  logFeatureOk("api_fotw_eligibility_fetch");
  if (a.data.granted) markFeatureClaimed(orgId, campaign.feature);
  if (a.data.eligible && a.data.needs_payment_setup === true) {
    if (a.data.amount_minor_units == null || !a.data.currency) return null;
    return {
      amountMinorUnits: a.data.amount_minor_units,
      currency: a.data.currency,
    };
  }
  if (getCachedOverageCreditGrant(orgId, campaign.feature) !== null) return null;
  refreshOverageCreditGrantCache(
    orgId,
    campaign.feature,
    {
      available: a.data.available,
      eligible: a.data.eligible,
      granted: a.data.granted,
      amount_minor_units: a.data.amount_minor_units ?? null,
      currency: a.data.currency ?? null,
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
