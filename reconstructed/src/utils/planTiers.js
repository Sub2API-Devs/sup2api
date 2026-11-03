/**
 * utils/planTiers.ts
 *
 * 2.1.316 新增：订阅套餐等级
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (37), chunk-m024s3ph.js (2)
 * attribution: placement 39
 */
import {
  getRateLimitTierOverride,
  isClaudeAISubscriber,
  getSubscriptionType,
  hasClaudeAiBillingRole,
  getOauthAccountInfo,
  isEnterpriseSubscriber as isEnterpriseSubscriber_2,
  isEnterprisePAYGSubscriber,
  getRateLimitTier,
  getSeatTier,
} from "./auth.js";
import { getAPIProvider } from "./model/providers.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  getDynamicConfig_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import { env } from "./env.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { create, create_6, create_2, create_20, create_12, create_15 } from "../../vendor/zod/lib/index.mjs";
import { logForDebugging } from "./debug.js";
import { parseModelId, wR, Lt } from "./model/modelIds.js";
import { getProviderState } from "./model/providerCaches.js";
import {
  isUsageCreditsRequired,
  hasUsageCreditsOnlyModelConsentSessionFallback,
  getUsageCreditsOnlyModelSessionConsentKey,
  setUsageCreditsOnlyModelConsentSessionFallback,
  setUsageCreditsOnlyModelSessionConsentKey,
} from "../bootstrap/state.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { usageCreditsOnlyFamily } from "./model/modelDisplay.js";
import { dmr } from "./model/thirdPartyModelDefaults.js";
import { isOutOfCreditsReason } from "./fastMode.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";

//@ chunk-hwmsct5x.js:178037-178159 placement = isConsumerPlan (1)
function isConsumerPlan() {
  let e = getRateLimitTierOverride();
  if (e !== null) return e;
  if (!isClaudeAISubscriber()) return !1;
  let n = getSubscriptionType();
  if (n === "max" || n === "pro") return !0;
  return hasClaudeAiBillingRole();
}
//@ chunk-hwmsct5x.js:178159-178214 placement
function lD() {
  return getOauthAccountInfo()?.billingType === "usage_based";
}
//@ chunk-hwmsct5x.js:178214-178269 placement = logEventTo1P (1)
function isPromoOffersBlocked() {
  return isEnterpriseSubscriber_2() || getAPIProvider() !== "firstParty" || isEssentialTrafficOnly();
}
//@ chunk-hwmsct5x.js:178269-178322 placement
function oAt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_idle_amber_finch", !1);
}
//@ chunk-hwmsct5x.js:178322-178375 placement
function Udi() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_slate_wren", !1);
}
//@ chunk-hwmsct5x.js:178375-178452 placement
function Gpe() {
  return !oAt() && !env.DISABLE_UPGRADE_COMMAND && getSubscriptionType() !== "enterprise";
}
//@ chunk-hwmsct5x.js:178452-178741 placement
var FableBillingSchema = DoctorLazy(() =>
    create({
      enabled: create_6().optional(),
      planLimitsEndDate: create_2().optional(),
      overageConsentRequired: create_6().optional(),
      perModel: create_20(create_2(), create_12())
        .optional()
        .catch(() => {
          xd("perModel, which is not an object keyed by model id; the plan-wide keys still apply");
          return;
        }),
    }),
  ),
  PerModelEntrySchema = DoctorLazy(() => create({ enabled: create_6() }));
//@ chunk-hwmsct5x.js:178741-178829 placement
function xd(e) {
  logForDebugging(`GrowthBook flag tengu_saffron_lattice: ignoring ${e}`, { level: "warn" });
}
/**
 * 解析按模型计费开关（同模型不同拼写冲突时按计费处理）。
 */
//@ chunk-hwmsct5x.js:178829-179464 placement
function parsePerModelBilling(e) {
  if (e === void 0) return;
  let n = new Map(),
    r = 0;
  for (let [s, h] of Object.entries(e)) {
    let safeParse = PerModelEntrySchema().safeParse(h);
    if (!safeParse.success) {
      r++;
      continue;
    }
    let { enabled: enabled } = safeParse.data,
      S = modelBillingKey(s),
      E = n.get(S);
    if (E !== void 0 && E.enabled !== enabled) {
      (logForDebugging(
        `GrowthBook flag tengu_saffron_lattice: perModel lists "${s}" and another spelling of the same model with different "enabled" values; treating that model as billed to usage credits`,
        { level: "warn" },
      ),
        n.set(S, { enabled: !0 }));
      continue;
    }
    n.set(S, { enabled: enabled });
  }
  if (r > 0)
    xd(
      `${r} perModel entr${r === 1 ? "y" : "ies"} whose value is not {"enabled": true|false}; the other entries and the plan-wide keys still apply`,
    );
  return n.size > 0 ? n : void 0;
}
//@ chunk-hwmsct5x.js:179464-179680 placement
function modelBillingKey(e) {
  let n = parseModelId(e);
  if (wR(n)) {
    let r = n.legacyVersionFirst ? "version-first" : "family-first";
    return `version:${n.family}/${n.major}.${n.minor ?? 0}/${r}`;
  }
  return `id:${Lt(e.trim().toLowerCase()).replace(/-\d{8}$/, "")}`;
}
//@ chunk-hwmsct5x.js:179680-179733 placement
function Md() {
  return getProviderState().usageCreditsOnlyModelFlags;
}
//@ chunk-hwmsct5x.js:179733-179743 placement
var Ad = {};
//@ chunk-hwmsct5x.js:179743-179987 placement
function getFableBillingConfig() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_lattice", Ad),
    n = Md();
  if (n.fableBilling === null || n.fableBilling.raw !== e) {
    let safeParse = FableBillingSchema().safeParse(e);
    n.fableBilling = {
      raw: e,
      parsed: safeParse.success
        ? { ...safeParse.data, perModel: parsePerModelBilling(safeParse.data.perModel) }
        : Ad,
    };
  }
  return n.fableBilling.parsed;
}
//@ chunk-hwmsct5x.js:179987-180075 placement
function jg(e, n) {
  if (e.perModel === void 0 || n === void 0) return;
  return e.perModel.get(modelBillingKey(n));
}
/**
 * 模型是否按用量额度计费。
 */
//@ chunk-hwmsct5x.js:180075-180237 placement
function isUsageCreditsModelBilled(e) {
  let n = getFableBillingConfig(),
    r = jg(n, e);
  if (r !== void 0) return r.enabled;
  if (n.enabled === !1) return !1;
  return n.overageConsentRequired === !0 || n.planLimitsEndDate !== void 0;
}
//@ chunk-hwmsct5x.js:180237-180274 placement
function L8r(e) {
  return isUsageCreditsModelBilled(e) || isUsageCreditsRequired();
}
//@ chunk-hwmsct5x.js:180274-180359 placement
function D2() {
  return (
    getAPIProvider() !== "firstParty" ||
    !isClaudeAISubscriber() ||
    isEnterprisePAYGSubscriber() ||
    getRateLimitTier() === "default_claude_zero"
  );
}
//@ chunk-hwmsct5x.js:180359-180428 placement
function hasKnownPlanTier() {
  return !(
    D2() ||
    lD() ||
    (isEnterpriseSubscriber_2() && getSeatTier() === null && getRateLimitTier() === null)
  );
}
//@ chunk-hwmsct5x.js:180428-180469 placement = isEnterpriseSubscriber (1)
var CreditsOnlyTiersSchema = DoctorLazy(() => create_15(create_2())),
  kd = ["enterprise"];
/**
 * GrowthBook tengu_saffron_credits_only_tiers：只用额度（credits-only）的 seat tier 列表，默认 ['enterprise']。
 */
//@ chunk-hwmsct5x.js:180469-180807 placement
function getCreditsOnlyTiers() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_credits_only_tiers", kd),
    n = Md();
  if (n.creditsOnlyTiers === null || n.creditsOnlyTiers.raw !== e) {
    let safeParse = CreditsOnlyTiersSchema().safeParse(e);
    if (!safeParse.success)
      logForDebugging("tengu_saffron_credits_only_tiers: unparseable value, using default", {
        level: "warn",
      });
    n.creditsOnlyTiers = { raw: e, parsed: safeParse.success ? safeParse.data : kd };
  }
  return n.creditsOnlyTiers.parsed;
}
//@ chunk-hwmsct5x.js:180807-180904 placement = isEnterpriseSubscriber (1)
function isEnterpriseSubscriber() {
  let e = getSubscriptionType();
  if (e === "enterprise" && !isEnterprisePAYGSubscriber()) return !0;
  return e !== null && getCreditsOnlyTiers().includes(e);
}
//@ chunk-hwmsct5x.js:180904-180958 placement
function Cd() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_picker_dim", !1);
}
//@ chunk-hwmsct5x.js:180958-181021 placement
function Bdi() {
  return Gpe() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_ladder", !1) === !0;
}
//@ chunk-hwmsct5x.js:181021-181140 placement
function isExtraUsageOrgDisabled() {
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason;
  return (
    cachedExtraUsageDisabledReason === "org_level_disabled" ||
    cachedExtraUsageDisabledReason === "overage_not_provisioned"
  );
}
//@ chunk-hwmsct5x.js:181140-181281 placement
function consentOwnerKey() {
  let e = getOauthAccountInfo();
  if (!e) return null;
  if (e.organizationUuid) return e.organizationUuid;
  return e.accountUuid ? `acct:${e.accountUuid}` : null;
}
//@ chunk-hwmsct5x.js:181281-181377 placement
function za(e, n) {
  return n === "Fable" ? e.fableOverageConsentV2 : e.usageCreditsOnlyModelConsent?.[n];
}
/**
 * 当前组织/账号是否已同意用量额度模型计费。
 */
//@ chunk-hwmsct5x.js:181377-181674 placement
function hasUsageCreditsConsent(e) {
  let n = consentOwnerKey();
  if (n === null) return hasUsageCreditsOnlyModelConsentSessionFallback(e);
  let r = getOauthAccountInfo();
  if (!r) return hasUsageCreditsOnlyModelConsentSessionFallback(e);
  let s = r.accountUuid !== void 0 ? `acct:${r.accountUuid}` : void 0,
    h = getUsageCreditsOnlyModelSessionConsentKey(e);
  if (h !== null && (h === n || h === s)) return !0;
  let y = za(getGlobalConfig(), e);
  return (r.organizationUuid !== void 0 && y?.[r.organizationUuid] === !0) || (s !== void 0 && y?.[s] === !0);
}
//@ chunk-hwmsct5x.js:181674-181891 placement
function saveUsageCreditsConsent(e, n, r) {
  if (za(getGlobalConfig(), e)?.[n] === !0) return;
  saveGlobalConfig((s) => {
    let h = { ...za(s, e), [n]: !0 };
    return e === "Fable"
      ? { ...s, fableOverageConsentV2: h }
      : { ...s, usageCreditsOnlyModelConsent: { ...s.usageCreditsOnlyModelConsent, [e]: h } };
  }, r);
}
//@ chunk-hwmsct5x.js:181891-181960 placement
function yst(e, n) {
  let r = consentOwnerKey();
  if (r === null) {
    setUsageCreditsOnlyModelConsentSessionFallback(e, !0);
    return;
  }
  saveUsageCreditsConsent(e, r, n);
}
//@ chunk-hwmsct5x.js:181960-182036 placement
function jdi(e, n) {
  let r = usageCreditsOnlyFamily(e);
  if (r === void 0 || isEnterpriseSubscriber() || !isUsageCreditsModelBilled(e)) return;
  yst(r, n);
}
//@ chunk-hwmsct5x.js:182036-182102 placement
function Wdi(e) {
  let n = consentOwnerKey();
  if (n === null) {
    setUsageCreditsOnlyModelConsentSessionFallback(e, !0);
    return;
  }
  setUsageCreditsOnlyModelSessionConsentKey(e, n);
}
//@ chunk-hwmsct5x.js:182102-182146 placement
function Gdi() {
  for (let e of dmr) setUsageCreditsOnlyModelSessionConsentKey(e, null);
}
/**
 * 额外用量已开通（或只是余额不足）。
 */
//@ chunk-hwmsct5x.js:182146-182261 placement
function hasExtraUsageProvisioned() {
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason;
  if (cachedExtraUsageDisabledReason === void 0) return !1;
  if (cachedExtraUsageDisabledReason === null) return !0;
  return isOutOfCreditsReason(cachedExtraUsageDisabledReason);
}
/**
 * tengu-model-error-overrides 是否阻止该模型。
 */
//@ chunk-hwmsct5x.js:182261-182489 placement
function isModelBlockedByOverride(e) {
  if (!hasFreshGrowthBookFeatures()) return !1;
  let n = getDynamicConfig_CACHED_MAY_BE_STALE("tengu-model-error-overrides", {});
  if (typeof n !== "object" || n === null) return !1;
  let r = n[e];
  if (typeof r !== "object" || r === null) return !1;
  let block = r.block;
  return typeof block === "string" && block.trim() !== "";
}
/**
 * 模型计费状态（计划内/按请求/管理员/需同意/需额度/已同意）。
 */
//@ chunk-hwmsct5x.js:182489-182818 placement
function usageCreditsBillingState(e) {
  let n = usageCreditsOnlyFamily(e);
  if (n === void 0) return "included_in_plan";
  if (D2()) return "pay_per_request";
  if (isEnterpriseSubscriber()) return "admin_billed";
  if (!L8r(e)) return "included_in_plan";
  if (!hasUsageCreditsConsent(n)) return "needs_consent";
  if (!hasExtraUsageProvisioned()) return "needs_credits";
  if (getGlobalConfig().cachedExtraUsageDisabledReason === "out_of_credits") return "out_of_credits";
  return "consented";
}
//@ chunk-hwmsct5x.js:182818-182895 placement
function fPe(e) {
  let n = usageCreditsBillingState(e);
  return n === "needs_consent" || n === "needs_credits";
}
//@ chunk-hwmsct5x.js:182895-182994 placement
function zdi(e) {
  let n = usageCreditsBillingState(e);
  return n === "needs_consent" || n === "needs_credits" || n === "out_of_credits";
}
//@ chunk-m024s3ph.js:336-365 placement
var ALLOW_PROMO_OFFERS = "allow_promo_offers";
//@ chunk-m024s3ph.js:365-429 placement = logEventTo1P (1)
function arePromoOffersAllowed() {
  return (
    !isPromoOffersBlocked() &&
    getAPIProvider() === "firstParty" &&
    isClaudeAISubscriber() &&
    isPolicyAllowed(ALLOW_PROMO_OFFERS)
  );
}

export {
  isConsumerPlan,
  lD,
  L8r,
  D2,
  isEnterpriseSubscriber,
  hasUsageCreditsConsent,
  arePromoOffersAllowed,
  oAt,
  jdi,
  hasExtraUsageProvisioned,
  yst,
  isUsageCreditsModelBilled,
  Bdi,
  isPromoOffersBlocked,
  ALLOW_PROMO_OFFERS,
  hasKnownPlanTier,
  Gpe,
  fPe,
  isModelBlockedByOverride,
  zdi,
  Cd,
  isExtraUsageOrgDisabled,
  usageCreditsBillingState,
  Udi,
  Wdi,
  Gdi,
};
