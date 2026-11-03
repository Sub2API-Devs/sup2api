/**
 * utils/modelCost.ts
 *
 * 模型价格与成本计算：内置价格表（来自 model-catalog 的 pricing_tiers）、fast mode 价格、促销定价、组织托管价格（policySettings.modelPricing），以及按 usage 计算美元成本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/modelCost.ts
 * pieces: chunk-18hwfzwa.js (3), chunk-aepeg2w5.js (40), chunk-e6aww6q8.js (1)
 * attribution: placement 4, fingerprint 7, layout 32, file-local 1
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
import { CLAUDE_FABLE_5_CONFIG, CLAUDE_MYTHOS_5_CONFIG, CLAUDE_FABLE_5_1_CONFIG } from "./model/configs.js";
import { sanitizeInt, telemetrySafeModelName } from "./model/telemetryModelName.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { E, u, record, string } from "../../vendor/zod/v4/classic/schemas.js";
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
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { finiteNonNegative } from "../services/api/modelFallback.js";

//@ chunk-aepeg2w5.js:367398-367966 fingerprint = COST_TIER_3_15 (0.897)
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
//@ chunk-aepeg2w5.js:367966-368111 layout
/**
 * fast mode 价格：fast mode 未启用时用普通价；opus-5-5 → $8/$40，opus-4-8/opus-5 → $10/$50，其他（4.6/4.7）→ $30/$150。
 */
function getFastModeCosts(canonicalName) {
  if (!isFastModeEnabled()) return MODEL_COSTS[canonicalName] ?? DEFAULT_MODEL_COSTS;
  if (canonicalName === "claude-opus-5-5") return COST_TIER_8_40;
  if (canonicalName === "claude-opus-4-8" || canonicalName === "claude-opus-5") return COST_TIER_10_50;
  return COST_TIER_30_150;
}
//@ chunk-aepeg2w5.js:368111-368234 layout
/**
 * 模型价格展示串：促销价优先，否则 catalog 价格，交给 formatModelPricing。
 */
function getModelPricingDisplay(model) {
  let promotionalModelCosts = getPromotionalModelCosts(model);
  if (promotionalModelCosts) return formatModelPricing(promotionalModelCosts);
  let catalogEntry = getCatalogEntry(model);
  let s = catalogEntry === undefined ? undefined : resolvePricing(catalogEntry);
  return s === undefined ? undefined : formatModelPricing(toModelCosts(model, s));
}
//@ chunk-aepeg2w5.js:368234-368798 layout
/**
 * catalog 的 pricing 对象（input/output/cache_write_5m/cache_write_1h/cache_read/web_search/long_prompt）转内部 ModelCosts；缺字段抛错。
 */
function toModelCosts(e, pricing) {
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
      `model catalog entry '${e}' has incomplete pricing \u2014 baked entries need the full ModelCosts shape`,
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
        ...toModelCosts(e, {
          ...longPrompt,
          web_search: webSearch,
        }),
      },
    }),
  };
}
//@ chunk-aepeg2w5.js:368798-368818 layout
/**
 * 所有 catalog 模型 id 的集合（CATALOG_MODEL_IDS）。
 */
var CATALOG_MODEL_ID_SET = new Set(LEGACY_MODEL_IDS_2);
//@ chunk-aepeg2w5.js:368818-368850 layout
/**
 * id 是否在内置 catalog 模型 id 列表里。
 */
function isCatalogModelId(e) {
  return CATALOG_MODEL_ID_SET.has(e);
}
//@ chunk-aepeg2w5.js:368850-369155 layout
/**
 * 遍历 catalog models，按 pricing（档名或内联对象）生成 模型 id → ModelCosts。
 */
function buildCatalogModelCosts() {
  let e = {};
  for (let model of getModelCatalog().models) {
    let pricing = resolvePricing(model);
    if (pricing === undefined) continue;
    if (!isCatalogModelId(model.id))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `model catalog id '${model.id}' missing from CATALOG_MODEL_IDS \u2014 regenerate with 'bun run generate:model-catalog'`,
        "model catalog id missing from CATALOG_MODEL_IDS",
      );
    e[model.id] = toModelCosts(model.id, pricing);
  }
  return e;
}
//@ chunk-aepeg2w5.js:369155-369256 layout = MODEL_COSTS (1)
/**
 * 内置价格表：catalog 价格，外加 fable-5 与 mythos-5 显式为 $10/$50。覆盖错配旧名 MODEL_COSTS_2。
 */
var MODEL_COSTS = Object.assign(Object.create(null), {
  [firstPartyNameToCanonical(CLAUDE_FABLE_5_CONFIG.firstParty)]: COST_TIER_10_50,
  [firstPartyNameToCanonical(CLAUDE_MYTHOS_5_CONFIG.firstParty)]: COST_TIER_10_50,
  ...buildCatalogModelCosts(),
});
//@ chunk-aepeg2w5.js:369256-369456 layout
/**
 * 把 cache_creation_input_tokens 拆成 5 分钟与 1 小时两部分（以 cache_creation 细分为准并夹在总数内）。
 */
function splitCacheCreationTokens(e) {
  let cacheCreationInputTokens = e.cache_creation_input_tokens ?? 0;
  let r = sanitizeInt(e.cache_creation?.ephemeral_1h_input_tokens ?? 0, 0, cacheCreationInputTokens);
  return {
    fiveMinute: sanitizeInt(
      e.cache_creation?.ephemeral_5m_input_tokens ?? 0,
      0,
      cacheCreationInputTokens - r,
    ),
    oneHour: r,
  };
}
//@ chunk-aepeg2w5.js:369456-369666 layout
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
//@ chunk-aepeg2w5.js:369666-369677 layout
/**
 * 1.1：inference_geo=us 时的价格倍率。
 */
var US_INFERENCE_GEO_MULTIPLIER = 1.1;
//@ chunk-aepeg2w5.js:369677-369727 layout
/**
 * usage.inference_geo 为 us 时 1.1，否则 1。 |
 */
function getInferenceGeoMultiplier(usage) {
  return usage.inference_geo === "us" ? US_INFERENCE_GEO_MULTIPLIER : 1;
}
//@ chunk-aepeg2w5.js:369727-369898 layout
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
//@ chunk-aepeg2w5.js:369898-370150 fingerprint = tokensToUSDCost (0.896)
/**
 * 按价格表算一次请求的美元成本：输入/输出/缓存读/缓存写（5m 与 1h 分价）/web 搜索，乘以 inference_geo 倍率；超长提示词换长提示词价。
 */
function tokensToUSDCost(modelCosts, usage) {
  let longPromptCosts = selectLongPromptCosts(modelCosts, usage);
  let s =
    (usage.input_tokens / 1e6) * longPromptCosts.inputTokens +
    (usage.output_tokens / 1e6) * longPromptCosts.outputTokens +
    ((usage.cache_read_input_tokens ?? 0) / 1e6) * longPromptCosts.promptCacheReadTokens +
    calculateCacheWriteCost(longPromptCosts, usage);
  let h = (usage.server_tool_use?.web_search_requests ?? 0) * longPromptCosts.webSearchRequests;
  return s * getInferenceGeoMultiplier(usage) + h;
}
//@ chunk-aepeg2w5.js:370150-370214 layout
/**
 * 对象自有属性取值（防原型污染）。
 */
function getOwnProperty(e, n) {
  return e != null && Object.hasOwn(e, n) ? e[n] : undefined;
}
//@ chunk-aepeg2w5.js:370214-370299 layout
/**
 * 从附加价格缓存里取并按 ModelCosts schema 校验。
 */
function getValidatedExtraModelCosts(additionalModelCostsCache, n) {
  let ownProperty = getOwnProperty(additionalModelCostsCache, n);
  return ownProperty !== undefined && MODEL_COSTS_SCHEMA().safeParse(ownProperty).success
    ? ownProperty
    : undefined;
}
//@ chunk-aepeg2w5.js:370299-370598 file-local
/**
 * GrowthBook alder_ford：模型 → {as: 按哪个模型计价, ends_at: 截止秒}。
 */
var MODEL_COSTS_SCHEMA = DoctorLazy(() => {
  let e = E().nonnegative();
  return u({
    inputTokens: e,
    outputTokens: e,
    promptCacheWriteTokens: e,
    promptCacheWrite1hTokens: e.optional(),
    promptCacheReadTokens: e,
    webSearchRequests: e,
  });
});
var ALDER_FORD = "alder_ford";
var PRICING_PROMOTION_SCHEMA = DoctorLazy(() =>
  record(
    string(),
    u({
      as: string(),
      ends_at: E().positive().lt(100000000000),
    })
      .optional()
      .catch(undefined),
  ),
);
//@ chunk-aepeg2w5.js:370598-370775 layout
/**
 * 促销期内（GrowthBook alder_ford，ends_at 之前）返回该模型借用价格的模型 id。
 */
function getPromotionalPricingModel(e) {
  if (!usesFirstPartyPricing()) return;
  let n = PRICING_PROMOTION_SCHEMA().safeParse(getCachedClientData()?.[ALDER_FORD]);
  let r = n.success ? getOwn(n.data, e) : undefined;
  return r !== undefined && Date.now() < r.ends_at * 1000 && getOwnProperty(MODEL_COSTS, r.as) !== undefined
    ? r.as
    : undefined;
}
//@ chunk-aepeg2w5.js:370775-370837 layout
/**
 * 促销期内按借用模型返回内置价格。
 */
function getPromotionalModelCosts(model) {
  let promotionalPricingModel = getPromotionalPricingModel(model);
  return promotionalPricingModel === undefined
    ? undefined
    : getOwnProperty(MODEL_COSTS, promotionalPricingModel);
}
//@ chunk-aepeg2w5.js:370837-370883 layout
/**
 * 去掉 [1m]/[2m] 后按身份归一的模型 id（计价用）。
 */
function getCanonicalPricingModel(model) {
  return getCanonicalName(stripAnyVersatileSuffix(model), {
    identity: true,
  });
}
//@ chunk-aepeg2w5.js:370883-370942 fingerprint = getModelCosts (0.859)
/**
 * 非 fast 时返回促销借用的计价模型 id。旧版名 getModelCosts 为错配（真正的 getModelCosts 是 #e8t）。
 */
function getPricingAliasModel(model, usage) {
  return usage?.speed === "fast" ? undefined : getPromotionalPricingModel(getCanonicalPricingModel(model));
}
//@ chunk-aepeg2w5.js:370942-370975 layout
/**
 * 去掉上下文后缀后的规范模型名。
 */
function getCanonicalModelId(model) {
  return getCanonicalName(stripAnyVersatileSuffix(model));
}
//@ chunk-aepeg2w5.js:370975-371077 layout
/**
 * Bedrock/Vertex/Foundry/Mantle 时取 catalog runtime 里的 pricing（服务端下发的模型目录）。
 */
function getProviderCatalogPricing(e) {
  if (!isThirdPartyBackend(getAPIProvider())) return;
  let n = strippedCanonicalName(e);
  let pricing = servedRuntime(n)?.pricing;
  return pricing != null && anyModelDescribed(n) ? toModelCosts(n, pricing) : undefined;
}
//@ chunk-aepeg2w5.js:371077-371623 layout
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
    let P =
      getValidatedExtraModelCosts(additionalModelCostsCache, strip1mSuffix(model)) ??
      getValidatedExtraModelCosts(additionalModelCostsCache, strip1mSuffix(canonicalName));
    if (P) return P;
  }
  if (usage.speed === "fast") {
    if (shortName === "claude-opus-5-5") return COST_TIER_8_40;
    if (shortName === "claude-opus-4-8" || shortName === "claude-opus-5") return COST_TIER_10_50;
    if (shortName === "claude-opus-4-6" || shortName === "claude-opus-4-7") return COST_TIER_30_150;
  }
  let h = MODEL_COSTS[shortName];
  if (h) return h;
  let providerCatalogPricing = getProviderCatalogPricing(model);
  if (providerCatalogPricing) return providerCatalogPricing;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  let w = additionalModelCostsCache
    ? (getOwn(additionalModelCostsCache, model) ?? getOwn(additionalModelCostsCache, shortName))
    : undefined;
  if (w) return w;
  trackUnknownModelCost(model, shortName);
  let defaultMainLoopModel = getDefaultMainLoopModel();
  return (
    MODEL_COSTS[getCanonicalName(defaultMainLoopModel)] ??
    getProviderCatalogPricing(defaultMainLoopModel) ??
    DEFAULT_MODEL_COSTS
  );
}
//@ chunk-aepeg2w5.js:371623-371706 fingerprint = trackUnknownModelCost (1)
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
//@ chunk-aepeg2w5.js:371706-372493 layout
/**
 * 读托管设置 policySettings.modelPricing（只信任 helper/plist/hklm/file 或已验证的远程来源）编译成组织价格表，缓存在进程策略状态里。
 */
function getOrgModelPricing() {
  let e = false;
  try {
    let orgPricing = commandSyncNameState().policy.orgPricing;
    if (orgPricing !== undefined) return orgPricing.value;
    let settingsForSource = getSettingsForSource("policySettings");
    let policy = commandSyncNameState().policy;
    if (policy.orgPricing === undefined) {
      let h = {
        value: undefined,
      };
      policy.orgPricing = h;
      let policySettingsOrigin = getPolicySettingsOrigin();
      let S =
        isAdminPolicyOrigin(policySettingsOrigin) ||
        (policySettingsOrigin === "remote" &&
          (isRemoteManagedSettingsVerified() || getRemoteSettingsPathOverride() !== undefined));
      let modelPricing = S ? settingsForSource?.modelPricing : undefined;
      let R = adminPolicyLoadFailureRefusesLaunch();
      let x =
        settingsForSource?.modelPricing !== undefined
          ? modelPricing
          : R
            ? undefined
            : getHostManagedModelPricing();
      e = true;
      h.value = x && compileModelPricing(x, settingsForSource?.modelOverrides);
      if (h.value)
        logFeatureOk("settings_model_pricing", {
          rows: h.value.exact.size,
          multiplier: h.value.multiplier,
          host: settingsForSource?.modelPricing === undefined,
        });
      else if (!S && settingsForSource?.modelPricing)
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
    if (e) logFeatureBad("settings_model_pricing", "compile_threw");
    return;
  }
}
//@ chunk-aepeg2w5.js:372493-373252 layout
/**
 * modelPricing.overrides（input/output/cacheRead/cacheWrite）编译成 exact 与 builtin 两张表，带 multiplier；空表且倍率 1 时返回 undefined。
 */
function compileModelPricing(e, adminOverrides) {
  let r = new Map();
  let s = new Map();
  for (let [key, value] of Object.entries(e.overrides ?? {})) {
    let S = {
      inputTokens: value.input,
      outputTokens: value.output,
      promptCacheReadTokens: value.cacheRead,
      promptCacheWriteTokens: value.cacheWrite,
      webSearchRequests: DEFAULT_MODEL_COSTS.webSearchRequests,
    };
    let lower = stripAnyVersatileSuffix(key).toLowerCase();
    if (r.has(lower)) {
      logForDebugging(
        `modelPricing: override '${key}' repeats an earlier row's key; the earlier row is used`,
        {
          level: "warn",
        },
      );
      continue;
    }
    r.set(lower, S);
    let builtinCatalogModelId = toBuiltinCatalogModelId(lower);
    if (builtinCatalogModelId === null) continue;
    if (s.has(builtinCatalogModelId)) {
      logForDebugging(
        `modelPricing: override '${key}' spells the same built-in model as an earlier row; it prices only its exact spelling, other spellings use the earlier row`,
        {
          level: "warn",
        },
      );
      continue;
    }
    s.set(builtinCatalogModelId, S);
  }
  if (r.size === 0 && (e.multiplier ?? 1) === 1) return;
  return {
    multiplier: e.multiplier ?? 1,
    exact: r,
    builtin: s,
    adminOverrides,
  };
}
//@ chunk-aepeg2w5.js:373252-373465 layout
/**
 * 把 Bedrock 区域前缀模型 id（eu./apac. 等）归一成 catalog id，找不到返回 null。
 */
function toBuiltinCatalogModelId(e) {
  if (isCatalogModelId(e)) return e;
  let found = BEDROCK_REGION_PREFIXES.find((s) => s !== "us" && e.startsWith(`${s}.anthropic.`));
  let r =
    catalogIdForProviderModelId(found ? `us${e.slice(found.length)}` : e) ??
    (e.startsWith("anthropic.") ? catalogIdForProviderModelId(`us.${e}`) : undefined);
  return r !== undefined && isCatalogModelId(r) ? r : null;
}
//@ chunk-aepeg2w5.js:373465-373890 layout
/**
 * 在组织价格表里按精确拼写、内置 id、覆盖映射查模型价格。
 */
function findOrgPricingForModel(orgModelPricing, n) {
  if (orgModelPricing.exact.size === 0) return;
  let r = orgModelPricing.exact.get(stripAnyVersatileSuffix(n).toLowerCase());
  if (!isThirdPartyBackend(getAPIProvider()) && (r !== undefined || orgModelPricing.builtin.size === 0))
    return r;
  let canonicalName = getCanonicalName(n, {
    overridesMap: orgModelPricing.adminOverrides ?? getPairedPolicyModelOverrides() ?? {},
    identity: true,
  });
  let h = strip1mSuffix(canonicalName);
  if (isCatalogModelId(h) || !hasDescribableCatalogModel(h))
    return r ?? orgModelPricing.builtin.get(canonicalName);
  let values = Object.values(PROVIDER_MODEL_ID_PATTERNS);
  let S = r ?? [...orgModelPricing.exact].find(([w]) => values.some((R) => matchesCatalogBase(w, h, R)))?.[1];
  return (
    S && {
      ...S,
      webSearchRequests: servedRuntime(h)?.pricing?.web_search ?? S.webSearchRequests,
    }
  );
}
//@ chunk-aepeg2w5.js:373890-373926 layout
/**
 * 是否配置了组织托管价格（formatTotalCost 据此提示“按组织费率”）。
 */
function hasOrgModelPricing() {
  return getOrgModelPricing() !== undefined;
}
//@ chunk-aepeg2w5.js:373926-374186 layout
/**
 * 计算成本并返回来源：configured（组织价格/倍率）、catalog、default。
 */
function calculateCostWithPricingSource(e, n) {
  let orgModelPricing = getOrgModelPricing();
  let multiplier = orgModelPricing?.multiplier ?? 1;
  let h = orgModelPricing ? findOrgPricingForModel(orgModelPricing, e) : undefined;
  if (h)
    return {
      usd:
        tokensToUSDCost(h, {
          ...n,
          inference_geo: null,
        }) * multiplier,
      pricing: "configured",
    };
  let modelCosts = lookupModelCosts(e);
  if (modelCosts)
    return {
      usd: tokensToUSDCost(modelCosts, n) * multiplier,
      pricing: multiplier !== 1 ? "configured" : "catalog",
    };
  return {
    usd: tokensToUSDCost(DEFAULT_MODEL_COSTS, n) * multiplier,
    pricing: "default",
  };
}
//@ chunk-aepeg2w5.js:374186-374343 layout
/**
 * 内置表、提供商目录或附加价格缓存里有该模型价格。
 */
function hasKnownModelCost(e) {
  let canonicalName = getCanonicalName(e);
  if (MODEL_COSTS[canonicalName] !== undefined || getProviderCatalogPricing(e) !== undefined) return true;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  return (
    !!additionalModelCostsCache &&
    (getOwn(additionalModelCostsCache, e) !== undefined ||
      getOwn(additionalModelCostsCache, canonicalName) !== undefined)
  );
}
//@ chunk-aepeg2w5.js:374343-374562 layout
/**
 * 成本依据：managed（组织价格）、unknown（未知模型）、list（标价）。
 */
function getCostBasis(model, usage) {
  let orgModelPricing = getOrgModelPricing();
  let s = model.includes("application-inference-profile")
    ? (getInferenceProfileBackingModelCached(stripAnyVersatileSuffix(model)) ?? model)
    : model;
  if (orgModelPricing && findOrgPricingForModel(orgModelPricing, s) !== undefined) return "managed";
  if (!hasKnownModelCost(s) && getPricingAliasModel(model, usage) === undefined) return "unknown";
  return orgModelPricing && orgModelPricing.multiplier !== 1 ? "managed" : "list";
}
//@ chunk-aepeg2w5.js:374562-374641 layout
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
//@ chunk-aepeg2w5.js:374641-374785 layout
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
//@ chunk-aepeg2w5.js:374785-375149 layout
/**
 * 用 camelCase 的 token 计数（inputTokens 等）构造 usage 再算成本。
 */
function calculateCostFromTokenCounts(model, tokens, r) {
  let usage = {
    input_tokens: tokens.inputTokens,
    output_tokens: tokens.outputTokens,
    cache_read_input_tokens: tokens.cacheReadInputTokens,
    cache_creation_input_tokens: tokens.cacheCreationInputTokens,
    ...(r?.speed !== undefined && {
      speed: r.speed,
    }),
    ...(r?.inferenceGeo !== undefined && {
      inference_geo: r.inferenceGeo,
    }),
    ...(r?.serverToolUse !== undefined && {
      server_tool_use: r.serverToolUse,
    }),
  };
  return calculateUSDCost(model, usage);
}
//@ chunk-aepeg2w5.js:375149-375226 layout = formatPrice (1)
/**
 * 整数 $N，否则保留两位小数。
 */
function formatPriceUSD(price) {
  if (Number.isInteger(price)) return `$${price}`;
  return `$${price.toFixed(2)}`;
}
//@ chunk-aepeg2w5.js:375226-375442 fingerprint = formatModelPricing (0.622)
/**
 * 价格串 "$in/$out per Mtok"，有长提示词价时追加 "(… for prompts over N)"。
 */
function formatModelPricing(costs) {
  let n = `${formatPriceUSD(costs.inputTokens)}/${formatPriceUSD(costs.outputTokens)} per Mtok`;
  let longPrompt = costs.longPrompt;
  if (longPrompt === undefined) return n;
  return `${n} (${formatPriceUSD(longPrompt.inputTokens)}/${formatPriceUSD(longPrompt.outputTokens)} for prompts over ${formatTokens(longPrompt.abovePromptTokens)})`;
}
//@ chunk-aepeg2w5.js:375442-375506 placement
/**
 * 内置价格表中该模型的价格展示串，没有则 undefined。
 */
function getModelPricingString(model) {
  let canonicalName = getCanonicalName(model);
  let r = MODEL_COSTS[canonicalName];
  if (!r) return;
  return formatModelPricing(r);
}
//@ chunk-aepeg2w5.js:375866-376032 placement
function lookupModelCosts(e) {
  let promotionalModelCosts = getPromotionalModelCosts(getCanonicalPricingModel(e));
  if (promotionalModelCosts) return promotionalModelCosts;
  let canonicalName = getCanonicalName(e);
  let s = MODEL_COSTS[canonicalName] ?? getProviderCatalogPricing(e);
  if (s) return s;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  return (
    (additionalModelCostsCache
      ? (getOwn(additionalModelCostsCache, e) ?? getOwn(additionalModelCostsCache, canonicalName))
      : undefined) || undefined
  );
}
//@ chunk-18hwfzwa.js:1101521-1101525 placement
init_react_production();
//@ chunk-18hwfzwa.js:1101525-1101574 placement
function isEffortCostShown() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_marbled_teal", false);
}
//@ chunk-18hwfzwa.js:1744468-1744518 fingerprint = MODEL_COSTS (1)
/**
 * 模型（去掉 [1m]、按身份归一）是否 claude-fable-5-1。旧版名 MODEL_COSTS 为错配。
 */
function isFable51Model(mainLoopModel) {
  return strippedCanonicalName(mainLoopModel) === strippedCanonicalName(CLAUDE_FABLE_5_1_CONFIG.firstParty);
}
//@ chunk-e6aww6q8.js:2400901-2401522 fingerprint = calculateCostFromTokens (0.755)
/**
 * 解析 usage.iterations：每项 {type, model, 各 token 数}，type=fallback_message 的 model 记为 servedFallbackModel。旧版名 calculateCostFromTokens 为错配。
 */
function parseUsageIterations(usage) {
  let n = {
    servedFallbackModel: undefined,
    entries: [],
  };
  if (typeof usage !== "object" || usage === null) return n;
  let iterations = usage.iterations;
  if (!Array.isArray(iterations)) return n;
  let s = [];
  let servedFallbackModel;
  for (let iteration of iterations) {
    if (typeof iteration !== "object" || iteration === null) continue;
    let S = iteration;
    if (typeof S.type !== "string") continue;
    let w = {
      type: S.type,
      model: typeof S.model === "string" ? S.model : undefined,
      inputTokens: finiteNonNegative(S.input_tokens),
      outputTokens: finiteNonNegative(S.output_tokens),
      cacheReadInputTokens: finiteNonNegative(S.cache_read_input_tokens),
      cacheCreationInputTokens: finiteNonNegative(S.cache_creation_input_tokens),
    };
    s.push(w);
    if (S.type === "fallback_message" && w.model !== undefined) servedFallbackModel = w.model;
  }
  return {
    servedFallbackModel,
    entries: s,
  };
}
export {
  calculateCostFromTokenCounts,
  MODEL_COSTS,
  getModelCosts,
  formatModelPricing,
  getFastModeCosts,
  parseUsageIterations,
  isFable51Model,
  hasKnownModelCost,
  DEFAULT_MODEL_COSTS,
  tokensToUSDCost,
  calculateUSDCost,
  isEffortCostShown,
  getModelPricingString,
  getModelPricingDisplay,
  hasOrgModelPricing,
  splitCacheCreationTokens,
  getCanonicalModelForCost,
  getCostBasis,
  calculateCostWithPricingSource,
  getCanonicalModelId,
};
