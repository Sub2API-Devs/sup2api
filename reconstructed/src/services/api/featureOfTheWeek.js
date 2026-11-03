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
var FOTW_CAMPAIGN_SCHEMA = "tengu_lilac_loom",
  FEATURE_OF_THE_WEEK = "feature_of_the_week",
  _ = 86400000,
  b = () =>
    create_2().refine(
      (e) => !Number.isNaN(Date.parse(e)) && /(z|[+-]\d{2}:?\d{2})$/i.test(e),
      "must be ISO 8601 with timezone, e.g. 2026-06-04T16:00:00Z",
    ),
  c = () =>
    create_2()
      .optional()
      .transform((e) => (e === "" ? void 0 : e)),
  v = DoctorLazy(() =>
    create({
      feature: create_2().min(1),
      command: create_2()
        .optional()
        .transform((e) => (e === "" ? void 0 : e)),
      startsAt: b(),
      endsAt: b(),
      hideCommandChip: create_6().optional(),
      creditless: create_6().optional(),
      titleLabel: c(),
      commandBlurb: c(),
      tipBlurb: c(),
      isTopPriorityAnnouncement: create_6().optional(),
      announcementLines: create_15(create({ text: create_2(), style: create_26(["bold", "dim"]).optional() }))
        .optional()
        .transform((e) => {
          let n = e?.filter((i) => i.text !== "");
          return n?.length ? n : void 0;
        })
        .catch(void 0),
      tips: create_15(create_2())
        .optional()
        .transform((e) => {
          let n = e?.filter(Boolean);
          return n?.length ? n : void 0;
        })
        .catch(void 0),
      redeemBy: c(),
    }),
  );
//@ chunk-0ba63vr9.js:1331-1391 placement
class w {
  parsedCampaign = null;
  inFlightEligibilityRefresh = null;
}
//@ chunk-0ba63vr9.js:1391-1414 placement
var x = new HostScoped(() => new w());
//@ chunk-0ba63vr9.js:1414-1449 placement
function C() {
  return x.of(getRootSession().host);
}
//@ chunk-0ba63vr9.js:1449-2056 placement
function parsePromoCampaign() {
  let e = getDynamicConfig_CACHED_MAY_BE_STALE(FOTW_CAMPAIGN_SCHEMA, null);
  if (e === null || e === void 0) return null;
  let n = C();
  if (n.parsedCampaign === null || n.parsedCampaign.raw !== e) {
    let safeParse = v().safeParse(e);
    if (!safeParse.success)
      logForDebugging(`Promo campaign payload failed validation: ${safeParse.error.message}`, {
        level: "warn",
      });
    n.parsedCampaign = safeParse.success
      ? {
          raw: e,
          campaign: safeParse.data,
          startsAtMs: Date.parse(safeParse.data.startsAt),
          endsAtMs: Date.parse(safeParse.data.endsAt),
        }
      : { raw: e, campaign: null, startsAtMs: 0, endsAtMs: 0 };
  }
  if (n.parsedCampaign.campaign === null) return null;
  let now = Date.now();
  if (now < n.parsedCampaign.startsAtMs) return null;
  if (now > n.parsedCampaign.endsAtMs) return null;
  return n.parsedCampaign.campaign;
}
//@ chunk-0ba63vr9.js:2056-2099 placement
function BDr() {
  return parsePromoCampaign()?.command ?? null;
}
//@ chunk-0ba63vr9.js:2099-2337 placement
function promoAudience(campaign) {
  if (!isClaudeAISubscriber()) return "excluded";
  let n = getSubscriptionType();
  if (!n) return "excluded";
  if (campaign.creditless) return "viewer";
  if (isConsumerSubscriber()) return "claimant";
  if (n === "team") {
    if (!getOauthAccountInfo()?.organizationRole) return "excluded";
    return isConsumerPlan() ? "claimant" : "viewer";
  }
  return "excluded";
}
//@ chunk-0ba63vr9.js:2337-2552 placement
function activePromo() {
  let e = parsePromoCampaign();
  if (!e) return null;
  let n = getOauthAccountInfo()?.organizationUuid;
  if (!n) return null;
  let i = promoAudience(e);
  if (i === "excluded") return null;
  if (i === "claimant" && hasClaimedFeature(n, e.feature)) return null;
  return { campaign: e, orgId: n, audience: i };
}
//@ chunk-0ba63vr9.js:2552-2603 placement
function jDr(e) {
  let n = BDr();
  return n !== null && e === n;
}
//@ chunk-0ba63vr9.js:2603-2640 placement
function WDr(e) {
  return jDr(e) && canClaimPromoCredit();
}
/**
 * 当前组织作为领取方（claimant）且活动配置了命令时，判断缓存的超额额度赠送是否符合条件且仍可领取。
 */
//@ chunk-0ba63vr9.js:2640-2814 placement
function canClaimPromoCredit() {
  let e = activePromo();
  if (!e || e.audience !== "claimant") return !1;
  if (!e.campaign.command) return !1;
  let n = getCachedOverageCreditGrant(e.orgId, e.campaign.feature);
  return n !== null && n.eligible && n.available;
}
/**
 * 当前组织作为观看方（viewer）且活动配置了命令时，判断升级推广是否尚未完成，用于决定是否展示推广。
 */
//@ chunk-0ba63vr9.js:2814-2946 placement
function shouldShowPromoUpsell() {
  let e = activePromo();
  if (!e || e.audience !== "viewer") return !1;
  if (!e.campaign.command) return !1;
  return !isUpsellFulfilled(e.orgId, e.campaign.feature);
}
/**
 * 读取当前组织在本次推广活动中可领取的额度金额（最小货币单位与币种），没有缓存或数据不全时返回 null。
 */
//@ chunk-0ba63vr9.js:2946-3167 placement
function promoCreditAmount() {
  let e = parsePromoCampaign(),
    n = getOauthAccountInfo()?.organizationUuid;
  if (!e || !n) return null;
  let i = getCachedOverageCreditGrant(n, e.feature);
  if (!i || i.amount_minor_units === null || !i.currency) return null;
  return { amountMinorUnits: i.amount_minor_units, currency: i.currency };
}
/**
 * 刷新推广资格：合并同一时刻的并发请求，失败只记调试日志并返回 null。
 */
//@ chunk-0ba63vr9.js:3167-3391 placement
function refreshPromoEligibility(e) {
  let n = C();
  return (
    (n.inFlightEligibilityRefresh ??= fetchOverageCreditGrant(e)
      .catch((i) => (logForDebugging(`FotW eligibility refresh failed: ${i}`, { level: "warn" }), null))
      .finally(() => {
        n.inFlightEligibilityRefresh = null;
      })),
    n.inFlightEligibilityRefresh
  );
}
/**
 * GET overage_credit_grant?campaign=… 查询领取资格并缓存。
 */
//@ chunk-0ba63vr9.js:3391-4406 placement
async function fetchOverageCreditGrant(e) {
  let n = activePromo();
  if (!n || n.audience !== "claimant") return null;
  let { campaign: campaign, orgId: orgId } = n;
  if (getCachedOverageCreditGrant(orgId, campaign.feature) !== null) return null;
  let a;
  try {
    a = await apiClient.get(
      `/api/oauth/organizations/:orgUUID/overage_credit_grant?campaign=${FEATURE_OF_THE_WEEK}`,
      { auth: "teleport-org", timeout: 1e4, validateStatus: (o) => o < 500, credentials: e },
    );
  } catch (error) {
    return (
      logFeatureSad("api_fotw_eligibility_fetch", "request_failed"),
      logForDebugging(`FotW eligibility fetch failed: ${error}`, { level: "warn" }),
      null
    );
  }
  if (!a.ok || a.status >= 400) return (logFeatureSad("api_fotw_eligibility_fetch", "unavailable"), null);
  if ((logFeatureOk("api_fotw_eligibility_fetch"), a.data.granted))
    markFeatureClaimed(orgId, campaign.feature);
  if (a.data.eligible && a.data.needs_payment_setup === !0) {
    if (a.data.amount_minor_units == null || !a.data.currency) return null;
    return { amountMinorUnits: a.data.amount_minor_units, currency: a.data.currency };
  }
  if (getCachedOverageCreditGrant(orgId, campaign.feature) !== null) return null;
  return (
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
      { onlyIfAbsent: !0 },
    ),
    null
  );
}

export {
  _,
  WDr,
  activePromo,
  promoCreditAmount,
  FEATURE_OF_THE_WEEK,
  jDr,
  refreshPromoEligibility,
  BDr,
  parsePromoCampaign,
  canClaimPromoCredit,
  shouldShowPromoUpsell,
};
