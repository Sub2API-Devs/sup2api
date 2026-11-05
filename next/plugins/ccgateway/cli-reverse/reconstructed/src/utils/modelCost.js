/**
 * utils/modelCost.ts
 *
 * 模型价格与成本计算：内置价格表（来自 model-catalog 的 pricing_tiers）、fast mode 价格、促销定价、组织托管价格（policySettings.modelPricing），以及按 usage 计算美元成本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/modelCost.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (2), chunk-exfmq47h.js (40)
 * attribution: fingerprint 6, placement 4, layout 32, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isFastModeEnabled } from "./fastMode.js";
import {
  getCatalogEntry,
  resolvePricing,
  getModelCatalog,
  catalogIdForProviderModelId,
} from "./model/modelCatalog.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { LEGACY_MODEL_IDS_2, stripAnyVersatileSuffix, strip1mSuffix } from "./model/modelIds.js";
import { firstPartyNameToCanonical, getDefaultMainLoopModel } from "./model/modelFallback.js";
import { CLAUDE_FABLE_5_CONFIG, CLAUDE_MYTHOS_5_CONFIG } from "./model/configs.js";
import { sanitizeInt, telemetrySafeModelName } from "./model/telemetryModelName.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { numberSchema, objectSchema, record, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { usesFirstPartyPricing, getAPIProvider } from "./model/providers.js";
import { getCachedClientData, getGlobalConfig } from "./config.js";
import { getOwn } from "./objectSafety.js";
import { getCanonicalName, strippedCanonicalName } from "./model/canonicalModelName.js";
import {
  isThirdPartyBackend,
  anyModelDescribed,
  hasDescribableCatalogModel,
  PROVIDER_MODEL_ID_PATTERNS,
  matchesCatalogBase,
} from "./model/modelCatalog/catalogCapabilities.js";
import { servedRuntime } from "./model/modelCatalog/servedCatalog.js";
import { logEvent } from "../services/analytics/index.js";
import { setHasUnknownModelCost, getInferenceProfileBackingModelCached } from "../bootstrap/state.js";
import { commandSyncNameState } from "./settings/commandSyncNames.js";
import {
  getSettingsForSource,
  getPolicySettingsOrigin,
  isAdminPolicyOrigin,
  adminPolicyLoadFailureRefusesLaunch,
  getHostManagedModelPricing,
  getPairedPolicyModelOverrides,
} from "./settings/settings.js";
import {
  isRemoteManagedSettingsVerified,
  getRemoteSettingsPathOverride,
} from "../services/remoteManagedSettings/remoteSettingsState.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "./debug.js";
import { BEDROCK_REGION_PREFIXES } from "./model/bedrock.js";
import { formatTokens } from "./format.js";
import { finiteNonNegative } from "../services/api/modelFallback.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:378016-378584 fingerprint (2.1.88 match: COST_TIER_3_15, 0.896)
/**
 * 价格档 $5/$25 每百万 token（缓存写 5m 6.25、1h 10，读 0.5，web 搜索 $0.01/次）；也是未知模型的默认价（DEFAULT_MODEL_COSTS）。
 */
var COST_TIER_5_25 = {
  inputTokens: 5,
  outputTokens: 25,
  promptCacheWriteTokens: 6.25,
  promptCacheWrite1hTokens: 10,
  promptCacheReadTokens: 0.5,
  webSearchRequests: 0.01,
};
var COST_TIER_30_150 = {
  inputTokens: 30,
  outputTokens: 150,
  promptCacheWriteTokens: 37.5,
  promptCacheWrite1hTokens: 60,
  promptCacheReadTokens: 3,
  webSearchRequests: 0.01,
};
var COST_TIER_10_50 = {
  inputTokens: 10,
  outputTokens: 50,
  promptCacheWriteTokens: 12.5,
  promptCacheWrite1hTokens: 20,
  promptCacheReadTokens: 1,
  webSearchRequests: 0.01,
};
var COST_TIER_8_40 = {
  inputTokens: 8,
  outputTokens: 40,
  promptCacheWriteTokens: 10,
  promptCacheWrite1hTokens: 16,
  promptCacheReadTokens: 0.4,
  webSearchRequests: 0.01,
};
var DEFAULT_MODEL_COSTS = COST_TIER_5_25;
//@ chunk-exfmq47h.js:378584-378729 layout
/**
 * fast mode 价格：fast mode 未启用时用普通价；opus-5-5 → $8/$40，opus-4-8/opus-5 → $10/$50，其他（4.6/4.7）→ $30/$150。
 */
function getFastModeCosts(modelName) {
  if (!isFastModeEnabled()) return MODEL_COSTS[modelName] ?? DEFAULT_MODEL_COSTS;
  if (modelName === "claude-opus-5-5") return COST_TIER_8_40;
  if (modelName === "claude-opus-4-8" || modelName === "claude-opus-5") return COST_TIER_10_50;
  return COST_TIER_30_150;
}
//@ chunk-exfmq47h.js:378729-378852 layout
/**
 * 模型价格展示串：促销价优先，否则 catalog 价格，交给 formatModelPricing。
 */
function getModelPricingDisplay(model) {
  let promotionalModelCosts = getPromotionalModelCosts(model);
  if (promotionalModelCosts) return formatModelPricing(promotionalModelCosts);
  let entry = getCatalogEntry(model);
  let pricing = entry === undefined ? undefined : resolvePricing(entry);
  return pricing === undefined ? undefined : formatModelPricing(toModelCosts(model, pricing));
}
//@ chunk-exfmq47h.js:378852-379416 layout
/**
 * catalog 的 pricing 对象（input/output/cache_write_5m/cache_write_1h/cache_read/web_search/long_prompt）转内部 ModelCosts；缺字段抛错。
 */
function toModelCosts(model, pricing) {
  let {
    input,
    output,
    cache_write_5m: cacheWrite5m,
    cache_write_1h: cacheWrite1h,
    cache_read: cacheRead,
    web_search: webSearch,
    long_prompt: longPrompt,
  } = pricing;
  if (cacheWrite5m === undefined || cacheRead === undefined || webSearch === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `model catalog entry '${model}' has incomplete pricing \u2014 baked entries need the full ModelCosts shape`,
      "model catalog entry has incomplete pricing",
    );
  return {
    inputTokens: input,
    outputTokens: output,
    promptCacheWriteTokens: cacheWrite5m,
    ...(cacheWrite1h !== undefined && {
      promptCacheWrite1hTokens: cacheWrite1h,
    }),
    promptCacheReadTokens: cacheRead,
    webSearchRequests: webSearch,
    ...(longPrompt !== undefined && {
      longPrompt: {
        abovePromptTokens: longPrompt.above_prompt_tokens,
        ...toModelCosts(model, {
          ...longPrompt,
          web_search: webSearch,
        }),
      },
    }),
  };
}
//@ chunk-exfmq47h.js:379416-379436 layout
/**
 * 所有 catalog 模型 id 的集合（CATALOG_MODEL_IDS）。
 */
var CATALOG_MODEL_ID_SET; // deferred: uses LEGACY_MODEL_IDS_2 (./model/modelIds.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:379416", () => {
  CATALOG_MODEL_ID_SET = new Set(LEGACY_MODEL_IDS_2);
});
//@ chunk-exfmq47h.js:379436-379468 layout
/**
 * id 是否在内置 catalog 模型 id 列表里。
 */
function isCatalogModelId(modelId) {
  return CATALOG_MODEL_ID_SET.has(modelId);
}
//@ chunk-exfmq47h.js:379468-379773 layout
/**
 * 遍历 catalog models，按 pricing（档名或内联对象）生成 模型 id → ModelCosts。
 */
function buildCatalogModelCosts() {
  let costsById = {};
  for (let model of getModelCatalog().models) {
    let pricing = resolvePricing(model);
    if (pricing === undefined) continue;
    if (!isCatalogModelId(model.id))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `model catalog id '${model.id}' missing from CATALOG_MODEL_IDS \u2014 regenerate with 'bun run generate:model-catalog'`,
        "model catalog id missing from CATALOG_MODEL_IDS",
      );
    costsById[model.id] = toModelCosts(model.id, pricing);
  }
  return costsById;
}
//@ chunk-exfmq47h.js:379773-379874 layout (2.1.88 match: MODEL_COSTS, 1)
/**
 * 内置价格表：catalog 价格，外加 fable-5 与 mythos-5 显式为 $10/$50。覆盖错配旧名 MODEL_COSTS_2。
 */
var MODEL_COSTS; // deferred: uses firstPartyNameToCanonical (./model/modelFallback.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:379773", () => {
  MODEL_COSTS = Object.assign(Object.create(null), {
    [firstPartyNameToCanonical(CLAUDE_FABLE_5_CONFIG.firstParty)]: COST_TIER_10_50,
    [firstPartyNameToCanonical(CLAUDE_MYTHOS_5_CONFIG.firstParty)]: COST_TIER_10_50,
    ...buildCatalogModelCosts(),
  });
});
//@ chunk-exfmq47h.js:379874-380074 layout
/**
 * 把 cache_creation_input_tokens 拆成 5 分钟与 1 小时两部分（以 cache_creation 细分为准并夹在总数内）。
 */
function splitCacheCreationTokens(usage) {
  let cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
  let oneHourTokens = sanitizeInt(
    usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
    0,
    cacheCreationInputTokens,
  );
  return {
    fiveMinute: sanitizeInt(
      usage.cache_creation?.ephemeral_5m_input_tokens ?? 0,
      0,
      cacheCreationInputTokens - oneHourTokens,
    ),
    oneHour: oneHourTokens,
  };
}
//@ chunk-exfmq47h.js:380074-380284 layout
/**
 * 缓存写成本：1h 部分按 promptCacheWrite1hTokens 价，其余按 5m 价。
 */
function calculateCacheWriteCost(longPromptCosts, usage) {
  let cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
  let promptCacheWrite1hTokens = longPromptCosts.promptCacheWrite1hTokens;
  let oneHour = splitCacheCreationTokens(usage).oneHour;
  if (promptCacheWrite1hTokens === undefined || oneHour <= 0)
    return (cacheCreationInputTokens / 1e6) * longPromptCosts.promptCacheWriteTokens;
  return (
    (oneHour / 1e6) * promptCacheWrite1hTokens +
    ((cacheCreationInputTokens - oneHour) / 1e6) * longPromptCosts.promptCacheWriteTokens
  );
}
//@ chunk-exfmq47h.js:380284-380295 layout
/**
 * 1.1：inference_geo=us 时的价格倍率。
 */
var US_INFERENCE_GEO_MULTIPLIER = 1.1;
//@ chunk-exfmq47h.js:380295-380345 layout
/**
 * usage.inference_geo 为 us 时 1.1，否则 1。 |
 */
function getInferenceGeoMultiplier(usage) {
  return usage.inference_geo === "us" ? US_INFERENCE_GEO_MULTIPLIER : 1;
}
//@ chunk-exfmq47h.js:380345-380516 layout
/**
 * 输入总 token 超过 longPrompt.abovePromptTokens 时换用长提示词价格（haiku-5-5 超过 10 万）。
 */
function selectLongPromptCosts(modelCosts, usage) {
  let longPrompt = modelCosts.longPrompt;
  if (longPrompt === undefined) return modelCosts;
  return usage.input_tokens +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) >
    longPrompt.abovePromptTokens
    ? longPrompt
    : modelCosts;
}
//@ chunk-exfmq47h.js:380516-380768 fingerprint (2.1.88 match: tokensToUSDCost, 0.896)
/**
 * 按价格表算一次请求的美元成本：输入/输出/缓存读/缓存写（5m 与 1h 分价）/web 搜索，乘以 inference_geo 倍率；超长提示词换长提示词价。
 */
function tokensToUSDCost(modelCosts, usage) {
  let longPromptCosts = selectLongPromptCosts(modelCosts, usage);
  let tokenCost =
    (usage.input_tokens / 1e6) * longPromptCosts.inputTokens +
    (usage.output_tokens / 1e6) * longPromptCosts.outputTokens +
    ((usage.cache_read_input_tokens ?? 0) / 1e6) * longPromptCosts.promptCacheReadTokens +
    calculateCacheWriteCost(longPromptCosts, usage);
  let webSearchCost = (usage.server_tool_use?.web_search_requests ?? 0) * longPromptCosts.webSearchRequests;
  return tokenCost * getInferenceGeoMultiplier(usage) + webSearchCost;
}
//@ chunk-exfmq47h.js:380768-380832 layout
/**
 * 对象自有属性取值（防原型污染）。
 */
function getOwnProperty(object, key) {
  return object != null && Object.hasOwn(object, key) ? object[key] : undefined;
}
//@ chunk-exfmq47h.js:380832-380917 layout
/**
 * 从附加价格缓存里取并按 ModelCosts schema 校验。
 */
function getValidatedExtraModelCosts(additionalModelCostsCache, modelId) {
  let ownProperty = getOwnProperty(additionalModelCostsCache, modelId);
  return ownProperty !== undefined && MODEL_COSTS_SCHEMA().safeParse(ownProperty).success
    ? ownProperty
    : undefined;
}
//@ chunk-exfmq47h.js:380917-381216 file-local
/**
 * GrowthBook alder_ford：模型 → {as: 按哪个模型计价, ends_at: 截止秒}。
 */
var MODEL_COSTS_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ALDER_FORD;
var PRICING_PROMOTION_SCHEMA;
deferInit("chunk-exfmq47h.js:380917", () => {
  MODEL_COSTS_SCHEMA = DoctorLazy(() => {
    let nonNegativeNumber = numberSchema().nonnegative();
    return objectSchema({
      inputTokens: nonNegativeNumber,
      outputTokens: nonNegativeNumber,
      promptCacheWriteTokens: nonNegativeNumber,
      promptCacheWrite1hTokens: nonNegativeNumber.optional(),
      promptCacheReadTokens: nonNegativeNumber,
      webSearchRequests: nonNegativeNumber,
    });
  });
  ALDER_FORD = "alder_ford";
  PRICING_PROMOTION_SCHEMA = DoctorLazy(() =>
    record(
      stringSchema(),
      objectSchema({
        as: stringSchema(),
        ends_at: numberSchema().positive().lt(100000000000),
      })
        .optional()
        .catch(undefined),
    ),
  );
});
//@ chunk-exfmq47h.js:381216-381393 layout
/**
 * 促销期内（GrowthBook alder_ford，ends_at 之前）返回该模型借用价格的模型 id。
 */
function getPromotionalPricingModel(modelId) {
  if (!usesFirstPartyPricing()) return;
  let parsed = PRICING_PROMOTION_SCHEMA().safeParse(getCachedClientData()?.[ALDER_FORD]);
  let promotion = parsed.success ? getOwn(parsed.data, modelId) : undefined;
  return promotion !== undefined &&
    Date.now() < promotion.ends_at * 1000 &&
    getOwnProperty(MODEL_COSTS, promotion.as) !== undefined
    ? promotion.as
    : undefined;
}
//@ chunk-exfmq47h.js:381393-381455 layout
/**
 * 促销期内按借用模型返回内置价格。
 */
function getPromotionalModelCosts(model) {
  let key = getPromotionalPricingModel(model);
  return key === undefined ? undefined : getOwnProperty(MODEL_COSTS, key);
}
//@ chunk-exfmq47h.js:381455-381501 layout
/**
 * 去掉 [1m]/[2m] 后按身份归一的模型 id（计价用）。
 */
function getCanonicalPricingModel(model) {
  return getCanonicalName(stripAnyVersatileSuffix(model), {
    identity: true,
  });
}
//@ chunk-exfmq47h.js:381501-381560 fingerprint (2.1.88 match: getModelCosts, 0.859)
/**
 * 非 fast 时返回促销借用的计价模型 id。旧版名 getModelCosts 为错配（真正的 getModelCosts 是 #e8t）。
 */
function getPricingAliasModel(model, usage) {
  return usage?.speed === "fast" ? undefined : getPromotionalPricingModel(getCanonicalPricingModel(model));
}
//@ chunk-exfmq47h.js:381560-381593 layout
/**
 * 去掉上下文后缀后的规范模型名。
 */
function getCanonicalModelId(model) {
  return getCanonicalName(stripAnyVersatileSuffix(model));
}
//@ chunk-exfmq47h.js:381593-381695 layout
/**
 * Bedrock/Vertex/Foundry/Mantle 时取 catalog runtime 里的 pricing（服务端下发的模型目录）。
 */
function getProviderCatalogPricing(model) {
  if (!isThirdPartyBackend(getAPIProvider())) return;
  let canonicalModel = strippedCanonicalName(model);
  let pricing = servedRuntime(canonicalModel)?.pricing;
  return pricing != null && anyModelDescribed(canonicalModel)
    ? toModelCosts(canonicalModel, pricing)
    : undefined;
}
//@ chunk-exfmq47h.js:381695-382241 layout
/**
 * 取模型价格：非 fast 时促销价 → 附加模型价格缓存 → fast 时 fast 价 → 内置 MODEL_COSTS → 提供商目录价 → 附加缓存；都没有则记 tengu_unknown_model_cost 并用默认主模型价或 $5/$25。
 */
function getModelCosts(model, usage) {
  let shortName = getCanonicalName(model);
  if (usage.speed !== "fast") {
    let promotionalModelCosts = getPromotionalModelCosts(getCanonicalPricingModel(model));
    if (promotionalModelCosts) return promotionalModelCosts;
  }
  let canonicalName = getCanonicalName(model, {
    identity: true,
  });
  if (canonicalName !== shortName) {
    let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
    let overrideCosts =
      getValidatedExtraModelCosts(additionalModelCostsCache, strip1mSuffix(model)) ??
      getValidatedExtraModelCosts(additionalModelCostsCache, strip1mSuffix(canonicalName));
    if (overrideCosts) return overrideCosts;
  }
  if (usage.speed === "fast") {
    if (shortName === "claude-opus-5-5") return COST_TIER_8_40;
    if (shortName === "claude-opus-4-8" || shortName === "claude-opus-5") return COST_TIER_10_50;
    if (shortName === "claude-opus-4-6" || shortName === "claude-opus-4-7") return COST_TIER_30_150;
  }
  let catalogCosts = MODEL_COSTS[shortName];
  if (catalogCosts) return catalogCosts;
  let providerCatalogPricing = getProviderCatalogPricing(model);
  if (providerCatalogPricing) return providerCatalogPricing;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  let extraCosts = additionalModelCostsCache
    ? (getOwn(additionalModelCostsCache, model) ?? getOwn(additionalModelCostsCache, shortName))
    : undefined;
  if (extraCosts) return extraCosts;
  trackUnknownModelCost(model, shortName);
  let defaultMainLoopModel = getDefaultMainLoopModel();
  return (
    MODEL_COSTS[getCanonicalName(defaultMainLoopModel)] ??
    getProviderCatalogPricing(defaultMainLoopModel) ??
    DEFAULT_MODEL_COSTS
  );
}
//@ chunk-exfmq47h.js:382241-382324 fingerprint (2.1.88 match: trackUnknownModelCost, 1)
/**
 * 未知模型成本：记 tengu_unknown_model_cost 并标记“成本可能不准”（formatTotalCost 显示提示）。
 */
function trackUnknownModelCost(model, shortName) {
  logEvent("tengu_unknown_model_cost", {
    model: telemetrySafeModelName(model),
    shortName: telemetrySafeModelName(shortName),
  });
  setHasUnknownModelCost();
}
//@ chunk-exfmq47h.js:382324-383111 layout
/**
 * 读托管设置 policySettings.modelPricing（只信任 helper/plist/hklm/file 或已验证的远程来源）编译成组织价格表，缓存在进程策略状态里。
 */
function getOrgModelPricing() {
  let didCompute = false;
  try {
    let orgPricing = commandSyncNameState().policy.orgPricing;
    if (orgPricing !== undefined) return orgPricing.value;
    let settingsForSource = getSettingsForSource("policySettings");
    let policy = commandSyncNameState().policy;
    if (policy.orgPricing === undefined) {
      let cacheEntry = {
        value: undefined,
      };
      policy.orgPricing = cacheEntry;
      let policySettingsOrigin = getPolicySettingsOrigin();
      let isTrustedOrigin =
        isAdminPolicyOrigin(policySettingsOrigin) ||
        (policySettingsOrigin === "remote" &&
          (isRemoteManagedSettingsVerified() || getRemoteSettingsPathOverride() !== undefined));
      let modelPricing = isTrustedOrigin ? settingsForSource?.modelPricing : undefined;
      let refusesLaunch = adminPolicyLoadFailureRefusesLaunch();
      let pricingInput =
        settingsForSource?.modelPricing !== undefined
          ? modelPricing
          : refusesLaunch
            ? undefined
            : getHostManagedModelPricing();
      didCompute = true;
      cacheEntry.value = pricingInput && compileModelPricing(pricingInput, settingsForSource?.modelOverrides);
      if (cacheEntry.value)
        logFeatureOk("settings_model_pricing", {
          rows: cacheEntry.value.exact.size,
          multiplier: cacheEntry.value.multiplier,
          host: settingsForSource?.modelPricing === undefined,
        });
      else if (!isTrustedOrigin && settingsForSource?.modelPricing)
        logFeatureSad(
          "settings_model_pricing",
          policySettingsOrigin === "remote" ? "unverified_remote_cache" : "untrusted_origin",
        );
    }
    return policy.orgPricing.value;
  } catch (error) {
    logForDebugging(
      `modelPricing: ${error instanceof Error ? error.message : String(error)}; pricing at list`,
      {
        level: "error",
      },
    );
    if (didCompute) logFeatureBad("settings_model_pricing", "compile_threw");
    return;
  }
}
//@ chunk-exfmq47h.js:383111-383870 layout
/**
 * modelPricing.overrides（input/output/cacheRead/cacheWrite）编译成 exact 与 builtin 两张表，带 multiplier；空表且倍率 1 时返回 undefined。
 */
function compileModelPricing(orgPricing, adminOverrides) {
  let exact = new Map();
  let builtin = new Map();
  for (let [key, value] of Object.entries(orgPricing.overrides ?? {})) {
    let costs = {
      inputTokens: value.input,
      outputTokens: value.output,
      promptCacheReadTokens: value.cacheRead,
      promptCacheWriteTokens: value.cacheWrite,
      webSearchRequests: DEFAULT_MODEL_COSTS.webSearchRequests,
    };
    let key_2 = stripAnyVersatileSuffix(key).toLowerCase();
    if (exact.has(key_2)) {
      logForDebugging(
        `modelPricing: override '${key}' repeats an earlier row's key; the earlier row is used`,
        {
          level: "warn",
        },
      );
      continue;
    }
    exact.set(key_2, costs);
    let builtinCatalogModelId = toBuiltinCatalogModelId(key_2);
    if (builtinCatalogModelId === null) continue;
    if (builtin.has(builtinCatalogModelId)) {
      logForDebugging(
        `modelPricing: override '${key}' spells the same built-in model as an earlier row; it prices only its exact spelling, other spellings use the earlier row`,
        {
          level: "warn",
        },
      );
      continue;
    }
    builtin.set(builtinCatalogModelId, costs);
  }
  if (exact.size === 0 && (orgPricing.multiplier ?? 1) === 1) return;
  return {
    multiplier: orgPricing.multiplier ?? 1,
    exact,
    builtin,
    adminOverrides,
  };
}
//@ chunk-exfmq47h.js:383870-384085 layout
/**
 * 把 Bedrock 区域前缀模型 id（eu./apac. 等）归一成 catalog id，找不到返回 null。
 */
function toBuiltinCatalogModelId(key) {
  if (isCatalogModelId(key)) return key;
  let found = BEDROCK_REGION_PREFIXES.find(
    (regionPrefix) => regionPrefix !== "us" && key.startsWith(`${regionPrefix}.anthropic.`),
  );
  let catalogId =
    catalogIdForProviderModelId(found ? `us${key.slice(found.length)}` : key) ??
    (key.startsWith("anthropic.") ? catalogIdForProviderModelId(`us.${key}`) : undefined);
  return catalogId !== undefined && isCatalogModelId(catalogId) ? catalogId : null;
}
//@ chunk-exfmq47h.js:384085-384510 layout
/**
 * 在组织价格表里按精确拼写、内置 id、覆盖映射查模型价格。
 */
function findOrgPricingForModel(orgModelPricing, model) {
  if (orgModelPricing.exact.size === 0) return;
  let exactCosts = orgModelPricing.exact.get(stripAnyVersatileSuffix(model).toLowerCase());
  if (
    !isThirdPartyBackend(getAPIProvider()) &&
    (exactCosts !== undefined || orgModelPricing.builtin.size === 0)
  )
    return exactCosts;
  let canonicalName = getCanonicalName(model, {
    overridesMap: orgModelPricing.adminOverrides ?? getPairedPolicyModelOverrides() ?? {},
    identity: true,
  });
  let baseModel = strip1mSuffix(canonicalName);
  if (isCatalogModelId(baseModel) || !hasDescribableCatalogModel(baseModel))
    return exactCosts ?? orgModelPricing.builtin.get(canonicalName);
  let values = Object.values(PROVIDER_MODEL_ID_PATTERNS);
  let matched =
    exactCosts ??
    [...orgModelPricing.exact].find(([pattern]) =>
      values.some((modelPattern) => matchesCatalogBase(pattern, baseModel, modelPattern)),
    )?.[1];
  return (
    matched && {
      ...matched,
      webSearchRequests: servedRuntime(baseModel)?.pricing?.web_search ?? matched.webSearchRequests,
    }
  );
}
//@ chunk-exfmq47h.js:384510-384546 layout
/**
 * 是否配置了组织托管价格（formatTotalCost 据此提示“按组织费率”）。
 */
function hasOrgModelPricing() {
  return getOrgModelPricing() !== undefined;
}
//@ chunk-exfmq47h.js:384546-384806 layout
/**
 * 计算成本并返回来源：configured（组织价格/倍率）、catalog、default。
 */
function calculateCostWithPricingSource(model, usage) {
  let orgModelPricing = getOrgModelPricing();
  let multiplier = orgModelPricing?.multiplier ?? 1;
  let orgCosts = orgModelPricing ? findOrgPricingForModel(orgModelPricing, model) : undefined;
  if (orgCosts)
    return {
      usd:
        tokensToUSDCost(orgCosts, {
          ...usage,
          inference_geo: null,
        }) * multiplier,
      pricing: "configured",
    };
  let modelCosts = lookupModelCosts(model);
  if (modelCosts)
    return {
      usd: tokensToUSDCost(modelCosts, usage) * multiplier,
      pricing: multiplier !== 1 ? "configured" : "catalog",
    };
  return {
    usd: tokensToUSDCost(DEFAULT_MODEL_COSTS, usage) * multiplier,
    pricing: "default",
  };
}
//@ chunk-exfmq47h.js:384806-384963 layout
/**
 * 内置表、提供商目录或附加价格缓存里有该模型价格。
 */
function hasKnownModelCost(model) {
  let canonicalName = getCanonicalName(model);
  if (MODEL_COSTS[canonicalName] !== undefined || getProviderCatalogPricing(model) !== undefined) return true;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  return (
    !!additionalModelCostsCache &&
    (getOwn(additionalModelCostsCache, model) !== undefined ||
      getOwn(additionalModelCostsCache, canonicalName) !== undefined)
  );
}
//@ chunk-exfmq47h.js:384963-385182 layout
/**
 * 成本依据：managed（组织价格）、unknown（未知模型）、list（标价）。
 */
function getCostBasis(model, usage) {
  let orgModelPricing = getOrgModelPricing();
  let pricedModel = model.includes("application-inference-profile")
    ? (getInferenceProfileBackingModelCached(stripAnyVersatileSuffix(model)) ?? model)
    : model;
  if (orgModelPricing && findOrgPricingForModel(orgModelPricing, pricedModel) !== undefined) return "managed";
  if (!hasKnownModelCost(pricedModel) && getPricingAliasModel(model, usage) === undefined) return "unknown";
  return orgModelPricing && orgModelPricing.multiplier !== 1 ? "managed" : "list";
}
//@ chunk-exfmq47h.js:385182-385261 layout
/**
 * 记录到 modelUsage.canonicalModel 的模型：组织价格命中时为规范名，否则促销借用模型或规范名。
 */
function getCanonicalModelForCost(model, usage) {
  let orgModelPricing = getOrgModelPricing();
  return (
    (orgModelPricing && findOrgPricingForModel(orgModelPricing, model) !== undefined
      ? undefined
      : getPricingAliasModel(model, usage)) ?? getCanonicalName(model)
  );
}
//@ chunk-exfmq47h.js:385261-385405 layout
/**
 * 一次请求的美元成本：有组织价格时用组织价格×倍率，否则 getModelCosts。cost-tracker 与 advisor 用量都走这里。
 */
function calculateUSDCost(model, usage) {
  let orgModelPricing = getOrgModelPricing();
  if (!orgModelPricing) return tokensToUSDCost(getModelCosts(model, usage), usage);
  let orgPricingForModel = findOrgPricingForModel(orgModelPricing, model);
  return (
    (orgPricingForModel
      ? tokensToUSDCost(orgPricingForModel, {
          ...usage,
          inference_geo: null,
        })
      : tokensToUSDCost(getModelCosts(model, usage), usage)) * orgModelPricing.multiplier
  );
}
//@ chunk-exfmq47h.js:385405-385769 layout
/**
 * 用 camelCase 的 token 计数（inputTokens 等）构造 usage 再算成本。
 */
function calculateCostFromTokenCounts(model, tokens, options) {
  let usage = {
    input_tokens: tokens.inputTokens,
    output_tokens: tokens.outputTokens,
    cache_read_input_tokens: tokens.cacheReadInputTokens,
    cache_creation_input_tokens: tokens.cacheCreationInputTokens,
    ...(options?.speed !== undefined && {
      speed: options.speed,
    }),
    ...(options?.inferenceGeo !== undefined && {
      inference_geo: options.inferenceGeo,
    }),
    ...(options?.serverToolUse !== undefined && {
      server_tool_use: options.serverToolUse,
    }),
  };
  return calculateUSDCost(model, usage);
}
//@ chunk-exfmq47h.js:385769-385846 layout (2.1.88 match: formatPrice, 1)
/**
 * 整数 $N，否则保留两位小数。
 */
function formatPriceUSD(price) {
  if (Number.isInteger(price)) return `$${price}`;
  return `$${price.toFixed(2)}`;
}
//@ chunk-exfmq47h.js:385846-386062 fingerprint (2.1.88 match: formatModelPricing, 0.621)
/**
 * 价格串 "$in/$out per Mtok"，有长提示词价时追加 "(… for prompts over N)"。
 */
function formatModelPricing(costs) {
  let baseText = `${formatPriceUSD(costs.inputTokens)}/${formatPriceUSD(costs.outputTokens)} per Mtok`;
  let longPrompt = costs.longPrompt;
  if (longPrompt === undefined) return baseText;
  return `${baseText} (${formatPriceUSD(longPrompt.inputTokens)}/${formatPriceUSD(longPrompt.outputTokens)} for prompts over ${formatTokens(longPrompt.abovePromptTokens)})`;
}
//@ chunk-exfmq47h.js:386062-386126 placement
/**
 * 内置价格表中该模型的价格展示串，没有则 undefined。
 */
function getModelPricingString(model) {
  let canonicalName = getCanonicalName(model);
  let costs = MODEL_COSTS[canonicalName];
  if (!costs) return;
  return formatModelPricing(costs);
}
//@ chunk-exfmq47h.js:386486-386652 placement
function lookupModelCosts(model) {
  let promotionalModelCosts = getPromotionalModelCosts(getCanonicalPricingModel(model));
  if (promotionalModelCosts) return promotionalModelCosts;
  let canonicalName = getCanonicalName(model);
  let resolvedCosts = MODEL_COSTS[canonicalName] ?? getProviderCatalogPricing(model);
  if (resolvedCosts) return resolvedCosts;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  return (
    (additionalModelCostsCache
      ? (getOwn(additionalModelCostsCache, model) ?? getOwn(additionalModelCostsCache, canonicalName))
      : undefined) || undefined
  );
}
//@ chunk-5xgkngpb.js:2456478-2457099 fingerprint (2.1.88 match: calculateCostFromTokens, 0.758)
/**
 * 解析 usage.iterations：每项 {type, model, 各 token 数}，type=fallback_message 的 model 记为 servedFallbackModel。旧版名 calculateCostFromTokens 为错配。
 */
function parseUsageIterations(usage) {
  let result = {
    servedFallbackModel: undefined,
    entries: [],
  };
  if (typeof usage !== "object" || usage === null) return result;
  let iterations = usage.iterations;
  if (!Array.isArray(iterations)) return result;
  let entries = [];
  let servedFallbackModel;
  for (let iteration of iterations) {
    if (typeof iteration !== "object" || iteration === null) continue;
    let iterationEntry = iteration;
    if (typeof iterationEntry.type !== "string") continue;
    let entry = {
      type: iterationEntry.type,
      model: typeof iterationEntry.model === "string" ? iterationEntry.model : undefined,
      inputTokens: finiteNonNegative(iterationEntry.input_tokens),
      outputTokens: finiteNonNegative(iterationEntry.output_tokens),
      cacheReadInputTokens: finiteNonNegative(iterationEntry.cache_read_input_tokens),
      cacheCreationInputTokens: finiteNonNegative(iterationEntry.cache_creation_input_tokens),
    };
    entries.push(entry);
    if (iterationEntry.type === "fallback_message" && entry.model !== undefined)
      servedFallbackModel = entry.model;
  }
  return {
    servedFallbackModel,
    entries,
  };
}
//@ chunk-czq1j3j2.js:1128855-1128859 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1128855", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1135498-1135547 placement
function isEffortCostShown() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_marbled_teal", false);
}
export {
  calculateCostFromTokenCounts,
  calculateUSDCost,
  parseUsageIterations,
  formatModelPricing,
  getFastModeCosts,
  hasKnownModelCost,
  getModelCosts,
  DEFAULT_MODEL_COSTS,
  tokensToUSDCost,
  MODEL_COSTS,
  hasOrgModelPricing,
  splitCacheCreationTokens,
  getCanonicalModelForCost,
  getCostBasis,
  calculateCostWithPricingSource,
  getCanonicalModelId,
  getModelPricingString,
  getModelPricingDisplay,
  isEffortCostShown,
};
