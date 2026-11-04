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

//@ chunk-hwmsct5x.js:178037-178159 placement (2.1.88 match: isConsumerPlan, 1)
function isConsumerPlan() {
  let rateLimitTierOverride = getRateLimitTierOverride();
  if (rateLimitTierOverride !== null) return rateLimitTierOverride;
  if (!isClaudeAISubscriber()) return false;
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "max" || subscriptionType === "pro") return true;
  return hasClaudeAiBillingRole();
}
//@ chunk-hwmsct5x.js:178159-178214 placement
/**
 * isUsageBasedBilling：账号按用量计费。
 */
function isUsageBasedBilling() {
  return getOauthAccountInfo()?.billingType === "usage_based";
}
//@ chunk-hwmsct5x.js:178214-178269 placement (2.1.88 match: logEventTo1P, 1)
function isPromoOffersBlocked() {
  return isEnterpriseSubscriber_2() || getAPIProvider() !== "firstParty" || isEssentialTrafficOnly();
}
//@ chunk-hwmsct5x.js:178269-178322 placement
/**
 * idleAmberFinchOn：开关 tengu_idle_amber_finch。
 */
function idleAmberFinchOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_idle_amber_finch", false);
}
//@ chunk-hwmsct5x.js:178322-178375 placement
/**
 * quietSlateWrenOn：开关 tengu_quiet_slate_wren。
 */
function quietSlateWrenOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_slate_wren", false);
}
//@ chunk-hwmsct5x.js:178375-178452 placement
/**
 * canShowUpgradeCommand：可显示升级命令。
 */
function canShowUpgradeCommand() {
  return !idleAmberFinchOn() && !env.DISABLE_UPGRADE_COMMAND && getSubscriptionType() !== "enterprise";
}
//@ chunk-hwmsct5x.js:178452-178741 placement
var FableBillingSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PerModelEntrySchema;
deferInit("chunk-hwmsct5x.js:178452", () => {
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
//@ chunk-hwmsct5x.js:178741-178829 placement
function logSaffronLatticeIgnored(flagValue) {
  logForDebugging(`GrowthBook flag tengu_saffron_lattice: ignoring ${flagValue}`, {
    level: "warn",
  });
}
//@ chunk-hwmsct5x.js:178829-179464 placement
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
//@ chunk-hwmsct5x.js:179464-179680 placement
function modelBillingKey(modelId) {
  let modelId_2 = parseModelId(modelId);
  if (isStandardVersion(modelId_2)) {
    let versionLayout = modelId_2.legacyVersionFirst ? "version-first" : "family-first";
    return `version:${modelId_2.family}/${modelId_2.major}.${modelId_2.minor ?? 0}/${versionLayout}`;
  }
  return `id:${strip1mSuffix(modelId.trim().toLowerCase()).replace(/-\d{8}$/, "")}`;
}
//@ chunk-hwmsct5x.js:179680-179733 placement
function usageCreditsOnlyModelFlags() {
  return getProviderState().usageCreditsOnlyModelFlags;
}
//@ chunk-hwmsct5x.js:179733-179743 placement
var EMPTY_BILLING_FLAGS = {};
//@ chunk-hwmsct5x.js:179743-179987 placement
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
//@ chunk-hwmsct5x.js:179987-180075 placement
function perModelBillingEntry(fableBillingConfig, modelId) {
  if (fableBillingConfig.perModel === undefined || modelId === undefined) return;
  return fableBillingConfig.perModel.get(modelBillingKey(modelId));
}
//@ chunk-hwmsct5x.js:180075-180237 placement
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
//@ chunk-hwmsct5x.js:180237-180274 placement
/**
 * isModelBilledOrRequired：模型按额度计费或必须用额度。
 */
function isModelBilledOrRequired(modelId) {
  return isUsageCreditsModelBilled(modelId) || isUsageCreditsRequired();
}
//@ chunk-hwmsct5x.js:180274-180359 placement
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
//@ chunk-hwmsct5x.js:180359-180428 placement
function hasKnownPlanTier() {
  return !(
    usesPayAsYouGo() ||
    isUsageBasedBilling() ||
    (isEnterpriseSubscriber_2() && getSeatTier() === null && getRateLimitTier() === null)
  );
}
//@ chunk-hwmsct5x.js:180428-180469 placement (2.1.88 match: isEnterpriseSubscriber, 1)
var CreditsOnlyTiersSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_CREDITS_ONLY_TIERS;
deferInit("chunk-hwmsct5x.js:180428", () => {
  CreditsOnlyTiersSchema = DoctorLazy(() => create_15(create_2()));
  DEFAULT_CREDITS_ONLY_TIERS = ["enterprise"];
});
//@ chunk-hwmsct5x.js:180469-180807 placement
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
//@ chunk-hwmsct5x.js:180807-180904 placement (2.1.88 match: isEnterpriseSubscriber, 1)
function isEnterpriseSubscriber() {
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "enterprise" && !isEnterprisePAYGSubscriber()) return true;
  return subscriptionType !== null && getCreditsOnlyTiers().includes(subscriptionType);
}
//@ chunk-hwmsct5x.js:180904-180958 placement
/**
 * saffronPickerDimOn：开关 tengu_saffron_picker_dim。
 */
function saffronPickerDimOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_picker_dim", false);
}
//@ chunk-hwmsct5x.js:180958-181021 placement
/**
 * saffronLadderOn：开关 tengu_saffron_ladder。
 */
function saffronLadderOn() {
  return (
    canShowUpgradeCommand() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_saffron_ladder", false) === true
  );
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
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo) return null;
  if (oauthAccountInfo.organizationUuid) return oauthAccountInfo.organizationUuid;
  return oauthAccountInfo.accountUuid ? `acct:${oauthAccountInfo.accountUuid}` : null;
}
//@ chunk-hwmsct5x.js:181281-181377 placement
function usageCreditsConsentFor(config, modelId) {
  return modelId === "Fable" ? config.fableOverageConsentV2 : config.usageCreditsOnlyModelConsent?.[modelId];
}
//@ chunk-hwmsct5x.js:181377-181674 placement
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
//@ chunk-hwmsct5x.js:181674-181891 placement
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
//@ chunk-hwmsct5x.js:181891-181960 placement
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
//@ chunk-hwmsct5x.js:181960-182036 placement
/**
 * setModelFamilyConsent：按模型族保存同意。
 */
function setModelFamilyConsent(mainLoopModel, storageV5) {
  let family = usageCreditsOnlyFamily(mainLoopModel);
  if (family === undefined || isEnterpriseSubscriber() || !isUsageCreditsModelBilled(mainLoopModel)) return;
  saveModelConsent(family, storageV5);
}
//@ chunk-hwmsct5x.js:182036-182102 placement
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
//@ chunk-hwmsct5x.js:182102-182146 placement
/**
 * clearSessionConsentKeys：清空所有会话级同意键。
 */
function clearSessionConsentKeys() {
  for (let family of DEFAULT_MODEL_FAMILY_NAMES) setUsageCreditsOnlyModelSessionConsentKey(family, null);
}
//@ chunk-hwmsct5x.js:182146-182261 placement
/**
 * 额外用量已开通（或只是余额不足）。
 */
function hasExtraUsageProvisioned() {
  let cachedExtraUsageDisabledReason = getGlobalConfig().cachedExtraUsageDisabledReason;
  if (cachedExtraUsageDisabledReason === undefined) return false;
  if (cachedExtraUsageDisabledReason === null) return true;
  return isOutOfCreditsReason(cachedExtraUsageDisabledReason);
}
//@ chunk-hwmsct5x.js:182261-182489 placement
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
//@ chunk-hwmsct5x.js:182489-182818 placement
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
//@ chunk-hwmsct5x.js:182818-182895 placement
/**
 * needsConsentOrCredits：需要同意或需要额度。
 */
function needsConsentOrCredits(userSpecifiedModel) {
  let state = usageCreditsBillingState(userSpecifiedModel);
  return state === "needs_consent" || state === "needs_credits";
}
//@ chunk-hwmsct5x.js:182895-182994 placement
/**
 * needsConsentCreditsOrOut：需要同意、额度不足或用尽。
 */
function needsConsentCreditsOrOut(userSpecifiedModel) {
  let state = usageCreditsBillingState(userSpecifiedModel);
  return state === "needs_consent" || state === "needs_credits" || state === "out_of_credits";
}
//@ chunk-m024s3ph.js:336-365 placement
var ALLOW_PROMO_OFFERS = "allow_promo_offers";
//@ chunk-m024s3ph.js:365-429 placement (2.1.88 match: logEventTo1P, 1)
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
  isUsageBasedBilling,
  isModelBilledOrRequired,
  usesPayAsYouGo,
  isEnterpriseSubscriber,
  hasUsageCreditsConsent,
  arePromoOffersAllowed,
  idleAmberFinchOn,
  setModelFamilyConsent,
  hasExtraUsageProvisioned,
  saveModelConsent,
  isUsageCreditsModelBilled,
  saffronLadderOn,
  isPromoOffersBlocked,
  ALLOW_PROMO_OFFERS,
  hasKnownPlanTier,
  canShowUpgradeCommand,
  needsConsentOrCredits,
  isModelBlockedByOverride,
  needsConsentCreditsOrOut,
  saffronPickerDimOn,
  isExtraUsageOrgDisabled,
  usageCreditsBillingState,
  quietSlateWrenOn,
  setSessionConsentKey,
  clearSessionConsentKeys,
};
