/**
 * utils/planTiers.ts
 *
 * 2.1.316 新增：订阅套餐等级
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (37), chunk-xjtrt16x.js (2)
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
import { parseModelId, isStandardVersion, strip1mSuffix } from "./model/modelIds.js";
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
import { DEFAULT_MODEL_FAMILY_NAMES } from "./model/thirdPartyModelDefaults.js";
import { isOutOfCreditsReason } from "./fastMode.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:178425-178547 placement (2.1.88 match: isConsumerPlan, 1)
function isConsumerPlan() {
  let rateLimitTierOverride = getRateLimitTierOverride();
  if (rateLimitTierOverride !== null) return rateLimitTierOverride;
  if (!isClaudeAISubscriber()) return false;
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "max" || subscriptionType === "pro") return true;
  return hasClaudeAiBillingRole();
}
//@ chunk-vn3g7zt8.js:178547-178602 placement
/**
 * isUsageBasedBilling：账号按用量计费。
 */
function isUsageBasedBilling() {
  return getOauthAccountInfo()?.billingType === "usage_based";
}
//@ chunk-vn3g7zt8.js:178602-178657 placement (2.1.88 match: logEventTo1P, 1)
function isPromoOffersBlocked() {
  return isEnterpriseSubscriber_2() || getAPIProvider() !== "firstParty" || isEssentialTrafficOnly();
}
//@ chunk-vn3g7zt8.js:178657-178710 placement
/**
 * idleAmberFinchOn：开关 tengu_idle_amber_finch。
 */
function idleAmberFinchOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_idle_amber_finch", false);
}
//@ chunk-vn3g7zt8.js:178710-178763 placement
/**
 * quietSlateWrenOn：开关 tengu_quiet_slate_wren。
 */
function quietSlateWrenOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_slate_wren", false);
}
//@ chunk-vn3g7zt8.js:178763-178840 placement
/**
 * canShowUpgradeCommand：可显示升级命令。
 */
function canShowUpgradeCommand() {
  return !idleAmberFinchOn() && !env.DISABLE_UPGRADE_COMMAND && getSubscriptionType() !== "enterprise";
}
//@ chunk-vn3g7zt8.js:178840-179129 placement
var FableBillingSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PerModelEntrySchema;
deferInit("chunk-vn3g7zt8.js:178840", () => {
  FableBillingSchema = DoctorLazy(() =>
    create({
      enabled: create_6().optional(),
      planLimitsEndDate: create_2().optional(),
      overageConsentRequired: create_6().optional(),
      perModel: create_20(create_2(), create_12())
        .optional()
        .catch(() => {
          logSaffronLatticeIgnored(
            "perModel, which is not an object keyed by model id; the plan-wide keys still apply",
          );
          return;
        }),
    }),
  );
  PerModelEntrySchema = DoctorLazy(() =>
    create({
      enabled: create_6(),
    }),
  );
});
//@ chunk-vn3g7zt8.js:179129-179217 placement
function logSaffronLatticeIgnored(flagValue) {
  logForDebugging(`GrowthBook flag tengu_saffron_lattice: ignoring ${flagValue}`, {
    level: "warn",
  });
}
//@ chunk-vn3g7zt8.js:179217-179852 placement
/**
 * 解析按模型计费开关（同模型不同拼写冲突时按计费处理）。
 */
function parsePerModelBilling(perModel) {
  if (perModel === undefined) return;
  let perModelMap = new Map();
  let invalidCount = 0;
  for (let [key, value] of Object.entries(perModel)) {
    let parseResult = PerModelEntrySchema().safeParse(value);
    if (!parseResult.success) {
      invalidCount++;
      continue;
    }
    let { enabled } = parseResult.data;
    let billingKey = modelBillingKey(key);
    let existingEntry = perModelMap.get(billingKey);
    if (existingEntry !== undefined && existingEntry.enabled !== enabled) {
      logForDebugging(
        `GrowthBook flag tengu_saffron_lattice: perModel lists "${key}" and another spelling of the same model with different "enabled" values; treating that model as billed to usage credits`,
        {
          level: "warn",
        },
      );
      perModelMap.set(billingKey, {
        enabled: true,
      });
      continue;
    }
    perModelMap.set(billingKey, {
      enabled,
    });
  }
  if (invalidCount > 0)
    logSaffronLatticeIgnored(
      `${invalidCount} perModel entr${invalidCount === 1 ? "y" : "ies"} whose value is not {"enabled": true|false}; the other entries and the plan-wide keys still apply`,
    );
  return perModelMap.size > 0 ? perModelMap : undefined;
}
//@ chunk-vn3g7zt8.js:179852-180068 placement
function modelBillingKey(modelId) {
  let modelId_2 = parseModelId(modelId);
  if (isStandardVersion(modelId_2)) {
    let versionLayout = modelId_2.legacyVersionFirst ? "version-first" : "family-first";
    return `version:${modelId_2.family}/${modelId_2.major}.${modelId_2.minor ?? 0}/${versionLayout}`;
  }
  return `id:${strip1mSuffix(modelId.trim().toLowerCase()).replace(/-\d{8}$/, "")}`;
}
//@ chunk-vn3g7zt8.js:180068-180121 placement
function usageCreditsOnlyModelFlags() {
  return getProviderState().usageCreditsOnlyModelFlags;
}
//@ chunk-vn3g7zt8.js:180121-180131 placement
var EMPTY_BILLING_FLAGS = {};
//@ chunk-vn3g7zt8.js:180131-180375 placement
function getFableBillingConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_saffron_lattice",
    EMPTY_BILLING_FLAGS,
  );
  let cachedFlags = usageCreditsOnlyModelFlags();
  if (
    cachedFlags.fableBilling === null ||
    cachedFlags.fableBilling.raw !== featureValue_CACHED_MAY_BE_STALE
  ) {
    let parseResult = FableBillingSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
    cachedFlags.fableBilling = {
      raw: featureValue_CACHED_MAY_BE_STALE,
      parsed: parseResult.success
        ? {
            ...parseResult.data,
            perModel: parsePerModelBilling(parseResult.data.perModel),
          }
        : EMPTY_BILLING_FLAGS,
    };
  }
  return cachedFlags.fableBilling.parsed;
}
//@ chunk-vn3g7zt8.js:180375-180463 placement
function perModelBillingEntry(fableBillingConfig, modelId) {
  if (fableBillingConfig.perModel === undefined || modelId === undefined) return;
  return fableBillingConfig.perModel.get(modelBillingKey(modelId));
}
//@ chunk-vn3g7zt8.js:180463-180625 placement
/**
 * 模型是否按用量额度计费。
 */
function isUsageCreditsModelBilled(modelId) {
  let fableBillingConfig = getFableBillingConfig();
  let entry = perModelBillingEntry(fableBillingConfig, modelId);
  if (entry !== undefined) return entry.enabled;
  if (fableBillingConfig.enabled === false) return false;
  return (
    fableBillingConfig.overageConsentRequired === true || fableBillingConfig.planLimitsEndDate !== undefined
  );
}
//@ chunk-vn3g7zt8.js:180625-180662 placement
/**
 * isModelBilledOrRequired：模型按额度计费或必须用额度。
 */
function isModelBilledOrRequired(modelId) {
  return isUsageCreditsModelBilled(modelId) || isUsageCreditsRequired();
}
//@ chunk-vn3g7zt8.js:180662-180747 placement
/**
 * usesPayAsYouGo：非第一方/非订阅/企业按量/零额度档。
 */
function usesPayAsYouGo() {
  return (
    getAPIProvider() !== "firstParty" ||
    !isClaudeAISubscriber() ||
    isEnterprisePAYGSubscriber() ||
    getRateLimitTier() === "default_claude_zero"
  );
}
//@ chunk-vn3g7zt8.js:180747-180816 placement
function hasKnownPlanTier() {
  return !(
    usesPayAsYouGo() ||
    isUsageBasedBilling() ||
    (isEnterpriseSubscriber_2() && getSeatTier() === null && getRateLimitTier() === null)
  );
}
//@ chunk-vn3g7zt8.js:180816-180857 placement (2.1.88 match: isEnterpriseSubscriber, 1)
var CreditsOnlyTiersSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_CREDITS_ONLY_TIERS;
deferInit("chunk-vn3g7zt8.js:180816", () => {
  CreditsOnlyTiersSchema = DoctorLazy(() => create_15(create_2()));
  DEFAULT_CREDITS_ONLY_TIERS = ["enterprise"];
});
//@ chunk-vn3g7zt8.js:180857-181195 placement
/**
 * GrowthBook tengu_saffron_credits_only_tiers：只用额度（credits-only）的 seat tier 列表，默认 ['enterprise']。
 */
function getCreditsOnlyTiers() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_saffron_credits_only_tiers",
    DEFAULT_CREDITS_ONLY_TIERS,
  );
  let cachedFlags = usageCreditsOnlyModelFlags();
  if (
    cachedFlags.creditsOnlyTiers === null ||
    cachedFlags.creditsOnlyTiers.raw !== featureValue_CACHED_MAY_BE_STALE
  ) {
    let parseResult = CreditsOnlyTiersSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
    if (!parseResult.success)
      logForDebugging("tengu_saffron_credits_only_tiers: unparseable value, using default", {
        level: "warn",
      });
    cachedFlags.creditsOnlyTiers = {
      raw: featureValue_CACHED_MAY_BE_STALE,
      parsed: parseResult.success ? parseResult.data : DEFAULT_CREDITS_ONLY_TIERS,
    };
  }
  return cachedFlags.creditsOnlyTiers.parsed;
}
//@ chunk-vn3g7zt8.js:181195-181292 placement (2.1.88 match: isEnterpriseSubscriber, 1)
function isEnterpriseSubscriber() {
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "enterprise" && !isEnterprisePAYGSubscriber()) return true;
  return subscriptionType !== null && getCreditsOnlyTiers().includes(subscriptionType);
}
//@ chunk-vn3g7zt8.js:181292-181346 placement
/**
 * saffronPickerDimOn：开关 tengu_saffron_picker_dim。
 */
function saffronPickerDimOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_picker_dim", false);
}
//@ chunk-vn3g7zt8.js:181346-181409 placement
/**
 * saffronLadderOn：开关 tengu_saffron_ladder。
 */
function saffronLadderOn() {
  return (
    canShowUpgradeCommand() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_ladder", false) === true
  );
}
//@ chunk-vn3g7zt8.js:181409-181528 placement
function isExtraUsageOrgDisabled() {
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason;
  return (
    cachedExtraUsageDisabledReason === "org_level_disabled" ||
    cachedExtraUsageDisabledReason === "overage_not_provisioned"
  );
}
//@ chunk-vn3g7zt8.js:181528-181669 placement
function consentOwnerKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo) return null;
  if (oauthAccountInfo.organizationUuid) return oauthAccountInfo.organizationUuid;
  return oauthAccountInfo.accountUuid ? `acct:${oauthAccountInfo.accountUuid}` : null;
}
//@ chunk-vn3g7zt8.js:181669-181765 placement
function usageCreditsConsentFor(config, modelId) {
  return modelId === "Fable" ? config.fableOverageConsentV2 : config.usageCreditsOnlyModelConsent?.[modelId];
}
//@ chunk-vn3g7zt8.js:181765-182062 placement
/**
 * 当前组织/账号是否已同意用量额度模型计费。
 */
function hasUsageCreditsConsent(model) {
  let ownerKey = consentOwnerKey();
  if (ownerKey === null) return hasUsageCreditsOnlyModelConsentSessionFallback(model);
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo) return hasUsageCreditsOnlyModelConsentSessionFallback(model);
  let accountKey =
    oauthAccountInfo.accountUuid !== undefined ? `acct:${oauthAccountInfo.accountUuid}` : undefined;
  let usageCreditsOnlyModelSessionConsentKey = getUsageCreditsOnlyModelSessionConsentKey(model);
  if (
    usageCreditsOnlyModelSessionConsentKey !== null &&
    (usageCreditsOnlyModelSessionConsentKey === ownerKey ||
      usageCreditsOnlyModelSessionConsentKey === accountKey)
  )
    return true;
  let consentByOrg = usageCreditsConsentFor(getGlobalConfig(), model);
  return (
    (oauthAccountInfo.organizationUuid !== undefined &&
      consentByOrg?.[oauthAccountInfo.organizationUuid] === true) ||
    (accountKey !== undefined && consentByOrg?.[accountKey] === true)
  );
}
//@ chunk-vn3g7zt8.js:182062-182279 placement
function saveUsageCreditsConsent(modelId, ownerKey, storageV5) {
  if (usageCreditsConsentFor(getGlobalConfig(), modelId)?.[ownerKey] === true) return;
  saveGlobalConfig((config) => {
    let nextConsent = {
      ...usageCreditsConsentFor(config, modelId),
      [ownerKey]: true,
    };
    return modelId === "Fable"
      ? {
          ...config,
          fableOverageConsentV2: nextConsent,
        }
      : {
          ...config,
          usageCreditsOnlyModelConsent: {
            ...config.usageCreditsOnlyModelConsent,
            [modelId]: nextConsent,
          },
        };
  }, storageV5);
}
//@ chunk-vn3g7zt8.js:182279-182348 placement
/**
 * saveModelConsent：保存模型计费同意。
 */
function saveModelConsent(modelId, storageV5) {
  let ownerKey = consentOwnerKey();
  if (ownerKey === null) {
    setUsageCreditsOnlyModelConsentSessionFallback(modelId, true);
    return;
  }
  saveUsageCreditsConsent(modelId, ownerKey, storageV5);
}
//@ chunk-vn3g7zt8.js:182348-182424 placement
/**
 * setModelFamilyConsent：按模型族保存同意。
 */
function setModelFamilyConsent(mainLoopModel, storageV5) {
  let family = usageCreditsOnlyFamily(mainLoopModel);
  if (family === undefined || isEnterpriseSubscriber() || !isUsageCreditsModelBilled(mainLoopModel)) return;
  saveModelConsent(family, storageV5);
}
//@ chunk-vn3g7zt8.js:182424-182490 placement
/**
 * setSessionConsentKey：设置会话级同意键。
 */
function setSessionConsentKey(family) {
  let ownerKey = consentOwnerKey();
  if (ownerKey === null) {
    setUsageCreditsOnlyModelConsentSessionFallback(family, true);
    return;
  }
  setUsageCreditsOnlyModelSessionConsentKey(family, ownerKey);
}
//@ chunk-vn3g7zt8.js:182490-182534 placement
/**
 * clearSessionConsentKeys：清空所有会话级同意键。
 */
function clearSessionConsentKeys() {
  for (let family of DEFAULT_MODEL_FAMILY_NAMES) setUsageCreditsOnlyModelSessionConsentKey(family, null);
}
//@ chunk-vn3g7zt8.js:182534-182649 placement
/**
 * 额外用量已开通（或只是余额不足）。
 */
function hasExtraUsageProvisioned() {
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason;
  if (cachedExtraUsageDisabledReason === undefined) return false;
  if (cachedExtraUsageDisabledReason === null) return true;
  return isOutOfCreditsReason(cachedExtraUsageDisabledReason);
}
//@ chunk-vn3g7zt8.js:182649-182877 placement
/**
 * tengu-model-error-overrides 是否阻止该模型。
 */
function isModelBlockedByOverride(canonicalName) {
  if (!hasFreshGrowthBookFeatures()) return false;
  let dynamicConfig_CACHED_MAY_BE_STALE = getDynamicConfig_CACHED_MAY_BE_STALE(
    "tengu-model-error-overrides",
    {},
  );
  if (typeof dynamicConfig_CACHED_MAY_BE_STALE !== "object" || dynamicConfig_CACHED_MAY_BE_STALE === null)
    return false;
  let modelOverride = dynamicConfig_CACHED_MAY_BE_STALE[canonicalName];
  if (typeof modelOverride !== "object" || modelOverride === null) return false;
  let block = modelOverride.block;
  return typeof block === "string" && block.trim() !== "";
}
//@ chunk-vn3g7zt8.js:182877-183206 placement
/**
 * 模型计费状态（计划内/按请求/管理员/需同意/需额度/已同意）。
 */
function usageCreditsBillingState(modelName) {
  let family = usageCreditsOnlyFamily(modelName);
  if (family === undefined) return "included_in_plan";
  if (usesPayAsYouGo()) return "pay_per_request";
  if (isEnterpriseSubscriber()) return "admin_billed";
  if (!isModelBilledOrRequired(modelName)) return "included_in_plan";
  if (!hasUsageCreditsConsent(family)) return "needs_consent";
  if (!hasExtraUsageProvisioned()) return "needs_credits";
  if (getGlobalConfig().cachedExtraUsageDisabledReason === "out_of_credits") return "out_of_credits";
  return "consented";
}
//@ chunk-vn3g7zt8.js:183206-183283 placement
/**
 * needsConsentOrCredits：需要同意或需要额度。
 */
function needsConsentOrCredits(session) {
  let state = usageCreditsBillingState(session);
  return state === "needs_consent" || state === "needs_credits";
}
//@ chunk-vn3g7zt8.js:183283-183382 placement
/**
 * needsConsentCreditsOrOut：需要同意、额度不足或用尽。
 */
function needsConsentCreditsOrOut(userSpecifiedModel) {
  let state = usageCreditsBillingState(userSpecifiedModel);
  return state === "needs_consent" || state === "needs_credits" || state === "out_of_credits";
}
//@ chunk-xjtrt16x.js:336-365 placement
var ALLOW_PROMO_OFFERS = "allow_promo_offers";
//@ chunk-xjtrt16x.js:365-429 placement (2.1.88 match: logEventTo1P, 1)
function arePromoOffersAllowed() {
  return (
    !isPromoOffersBlocked() &&
    getAPIProvider() === "firstParty" &&
    isClaudeAISubscriber() &&
    isPolicyAllowed(ALLOW_PROMO_OFFERS)
  );
}
export {
  arePromoOffersAllowed,
  isUsageBasedBilling,
  isConsumerPlan,
  isModelBilledOrRequired,
  usesPayAsYouGo,
  needsConsentOrCredits,
  idleAmberFinchOn,
  canShowUpgradeCommand,
  isEnterpriseSubscriber,
  hasUsageCreditsConsent,
  hasExtraUsageProvisioned,
  isModelBlockedByOverride,
  setSessionConsentKey,
  saveModelConsent,
  isPromoOffersBlocked,
  hasKnownPlanTier,
  setModelFamilyConsent,
  isUsageCreditsModelBilled,
  saffronLadderOn,
  ALLOW_PROMO_OFFERS,
  needsConsentCreditsOrOut,
  saffronPickerDimOn,
  isExtraUsageOrgDisabled,
  usageCreditsBillingState,
  quietSlateWrenOn,
  clearSessionConsentKeys,
};
