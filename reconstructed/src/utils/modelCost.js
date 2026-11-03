/**
 * utils/modelCost.ts
 *
 * 模型价格与成本计算：内置价格表（来自 model-catalog 的 pricing_tiers）、fast mode 价格、促销定价、组织托管价格（policySettings.modelPricing），以及按 usage 计算美元成本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/modelCost.ts
 * pieces: chunk-18hwfzwa.js (3), chunk-aepeg2w5.js (39), chunk-e6aww6q8.js (1)
 * attribution: placement 3, fingerprint 7, layout 32, file-local 1
 */
import { isFastModeEnabled } from "./fastMode.js";
import { getCatalogEntry, resolvePricing, WK, catalogIdForProviderModelId } from "./model/modelCatalog.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { LEGACY_MODEL_IDS, Bn, Lt } from "./model/modelIds.js";
import { firstPartyNameToCanonical, getDefaultMainLoopModel } from "./model/modelFallback.js";
import { CLAUDE_FABLE_5_CONFIG, CLAUDE_MYTHOS_5_CONFIG, CLAUDE_FABLE_5_1_CONFIG } from "./model/configs.js";
import { qpr, telemetrySafeModelName } from "./model/telemetryModelName.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { E, u, pe, o } from "../../vendor/zod/v4/classic/schemas.js";
import { usesFirstPartyPricing, getAPIProvider } from "./model/providers.js";
import { getCachedClientData, getGlobalConfig } from "./config.js";
import { getOwn } from "./objectSafety.js";
import { getCanonicalName, strippedCanonicalName } from "./model/canonicalModelName.js";
import {
  jat,
  anyModelDescribed,
  fn,
  Bc,
  matchesCatalogBase,
} from "./model/modelCatalog/catalogCapabilities.js";
import { dn } from "./model/modelCatalog/servedCatalog.js";
import { logEvent } from "../services/analytics/index.js";
import { setHasUnknownModelCost, getInferenceProfileBackingModelCached } from "../bootstrap/state.js";
import { is } from "./settings/commandSyncNames.js";
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
import { j } from "../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { ave } from "../services/api/modelFallback.js";

/**
 * 价格档 $5/$25 每百万 token（缓存写 5m 6.25、1h 10，读 0.5，web 搜索 $0.01/次）；也是未知模型的默认价（DEFAULT_MODEL_COSTS）。
 */
//@ chunk-aepeg2w5.js:367398-367966 fingerprint = COST_TIER_3_15 (0.897)
var COST_TIER_5_25 = {
    inputTokens: 5,
    outputTokens: 25,
    promptCacheWriteTokens: 6.25,
    promptCacheWrite1hTokens: 10,
    promptCacheReadTokens: 0.5,
    webSearchRequests: 0.01,
  },
  COST_TIER_30_150 = {
    inputTokens: 30,
    outputTokens: 150,
    promptCacheWriteTokens: 37.5,
    promptCacheWrite1hTokens: 60,
    promptCacheReadTokens: 3,
    webSearchRequests: 0.01,
  },
  COST_TIER_10_50 = {
    inputTokens: 10,
    outputTokens: 50,
    promptCacheWriteTokens: 12.5,
    promptCacheWrite1hTokens: 20,
    promptCacheReadTokens: 1,
    webSearchRequests: 0.01,
  },
  COST_TIER_8_40 = {
    inputTokens: 8,
    outputTokens: 40,
    promptCacheWriteTokens: 10,
    promptCacheWrite1hTokens: 16,
    promptCacheReadTokens: 0.4,
    webSearchRequests: 0.01,
  },
  DEFAULT_MODEL_COSTS = COST_TIER_5_25;
/**
 * fast mode 价格：fast mode 未启用时用普通价；opus-5-5 → $8/$40，opus-4-8/opus-5 → $10/$50，其他（4.6/4.7）→ $30/$150。
 */
//@ chunk-aepeg2w5.js:367966-368111 layout
function getFastModeCosts(e) {
  if (!isFastModeEnabled()) return MODEL_COSTS[e] ?? DEFAULT_MODEL_COSTS;
  if (e === "claude-opus-5-5") return COST_TIER_8_40;
  if (e === "claude-opus-4-8" || e === "claude-opus-5") return COST_TIER_10_50;
  return COST_TIER_30_150;
}
/**
 * 模型价格展示串：促销价优先，否则 catalog 价格，交给 formatModelPricing。
 */
//@ chunk-aepeg2w5.js:368111-368234 layout
function getModelPricingDisplay(e) {
  let n = getPromotionalModelCosts(e);
  if (n) return formatModelPricing(n);
  let r = getCatalogEntry(e),
    s = r === void 0 ? void 0 : resolvePricing(r);
  return s === void 0 ? void 0 : formatModelPricing(toModelCosts(e, s));
}
/**
 * catalog 的 pricing 对象（input/output/cache_write_5m/cache_write_1h/cache_read/web_search/long_prompt）转内部 ModelCosts；缺字段抛错。
 */
//@ chunk-aepeg2w5.js:368234-368798 layout
function toModelCosts(e, n) {
  let {
    input: input,
    output: output,
    cache_write_5m: cache_write_5m,
    cache_write_1h: cache_write_1h,
    cache_read: cache_read,
    web_search: web_search,
    long_prompt: long_prompt,
  } = n;
  if (cache_write_5m === void 0 || cache_read === void 0 || web_search === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `model catalog entry '${e}' has incomplete pricing \u2014 baked entries need the full ModelCosts shape`,
      "model catalog entry has incomplete pricing",
    );
  return {
    inputTokens: input,
    outputTokens: output,
    promptCacheWriteTokens: cache_write_5m,
    ...(cache_write_1h !== void 0 && { promptCacheWrite1hTokens: cache_write_1h }),
    promptCacheReadTokens: cache_read,
    webSearchRequests: web_search,
    ...(long_prompt !== void 0 && {
      longPrompt: {
        abovePromptTokens: long_prompt.above_prompt_tokens,
        ...toModelCosts(e, { ...long_prompt, web_search: web_search }),
      },
    }),
  };
}
/**
 * 所有 catalog 模型 id 的集合（CATALOG_MODEL_IDS）。
 */
//@ chunk-aepeg2w5.js:368798-368818 layout
var CATALOG_MODEL_ID_SET = new Set(LEGACY_MODEL_IDS);
/**
 * id 是否在内置 catalog 模型 id 列表里。
 */
//@ chunk-aepeg2w5.js:368818-368850 layout
function isCatalogModelId(e) {
  return CATALOG_MODEL_ID_SET.has(e);
}
/**
 * 遍历 catalog models，按 pricing（档名或内联对象）生成 模型 id → ModelCosts。
 */
//@ chunk-aepeg2w5.js:368850-369155 layout
function buildCatalogModelCosts() {
  let e = {};
  for (let model of WK().models) {
    let r = resolvePricing(model);
    if (r === void 0) continue;
    if (!isCatalogModelId(model.id))
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `model catalog id '${model.id}' missing from CATALOG_MODEL_IDS \u2014 regenerate with 'bun run generate:model-catalog'`,
        "model catalog id missing from CATALOG_MODEL_IDS",
      );
    e[model.id] = toModelCosts(model.id, r);
  }
  return e;
}
/**
 * 内置价格表：catalog 价格，外加 fable-5 与 mythos-5 显式为 $10/$50。覆盖错配旧名 MODEL_COSTS_2。
 */
//@ chunk-aepeg2w5.js:369155-369256 layout = MODEL_COSTS (1)
var MODEL_COSTS = Object.assign(Object.create(null), {
  [firstPartyNameToCanonical(CLAUDE_FABLE_5_CONFIG.firstParty)]: COST_TIER_10_50,
  [firstPartyNameToCanonical(CLAUDE_MYTHOS_5_CONFIG.firstParty)]: COST_TIER_10_50,
  ...buildCatalogModelCosts(),
});
/**
 * 把 cache_creation_input_tokens 拆成 5 分钟与 1 小时两部分（以 cache_creation 细分为准并夹在总数内）。
 */
//@ chunk-aepeg2w5.js:369256-369456 layout
function splitCacheCreationTokens(e) {
  let n = e.cache_creation_input_tokens ?? 0,
    r = qpr(e.cache_creation?.ephemeral_1h_input_tokens ?? 0, 0, n);
  return { fiveMinute: qpr(e.cache_creation?.ephemeral_5m_input_tokens ?? 0, 0, n - r), oneHour: r };
}
/**
 * 缓存写成本：1h 部分按 promptCacheWrite1hTokens 价，其余按 5m 价。
 */
//@ chunk-aepeg2w5.js:369456-369666 layout
function calculateCacheWriteCost(e, n) {
  let r = n.cache_creation_input_tokens ?? 0,
    promptCacheWrite1hTokens = e.promptCacheWrite1hTokens,
    oneHour = splitCacheCreationTokens(n).oneHour;
  if (promptCacheWrite1hTokens === void 0 || oneHour <= 0) return (r / 1e6) * e.promptCacheWriteTokens;
  return (oneHour / 1e6) * promptCacheWrite1hTokens + ((r - oneHour) / 1e6) * e.promptCacheWriteTokens;
}
/**
 * 1.1：inference_geo=us 时的价格倍率。
 */
//@ chunk-aepeg2w5.js:369666-369677 layout
var US_INFERENCE_GEO_MULTIPLIER = 1.1;
/**
 * usage.inference_geo 为 us 时 1.1，否则 1。 |
 */
//@ chunk-aepeg2w5.js:369677-369727 layout
function getInferenceGeoMultiplier(e) {
  return e.inference_geo === "us" ? US_INFERENCE_GEO_MULTIPLIER : 1;
}
/**
 * 输入总 token 超过 longPrompt.abovePromptTokens 时换用长提示词价格（haiku-5-5 超过 10 万）。
 */
//@ chunk-aepeg2w5.js:369727-369898 layout
function selectLongPromptCosts(e, n) {
  let longPrompt = e.longPrompt;
  if (longPrompt === void 0) return e;
  return n.input_tokens + (n.cache_read_input_tokens ?? 0) + (n.cache_creation_input_tokens ?? 0) >
    longPrompt.abovePromptTokens
    ? longPrompt
    : e;
}
/**
 * 按价格表算一次请求的美元成本：输入/输出/缓存读/缓存写（5m 与 1h 分价）/web 搜索，乘以 inference_geo 倍率；超长提示词换长提示词价。
 */
//@ chunk-aepeg2w5.js:369898-370150 fingerprint = tokensToUSDCost (0.896)
function tokensToUSDCost(modelCosts, usage) {
  let r = selectLongPromptCosts(modelCosts, usage),
    s =
      (usage.input_tokens / 1e6) * r.inputTokens +
      (usage.output_tokens / 1e6) * r.outputTokens +
      ((usage.cache_read_input_tokens ?? 0) / 1e6) * r.promptCacheReadTokens +
      calculateCacheWriteCost(r, usage),
    h = (usage.server_tool_use?.web_search_requests ?? 0) * r.webSearchRequests;
  return s * getInferenceGeoMultiplier(usage) + h;
}
/**
 * 对象自有属性取值（防原型污染）。
 */
//@ chunk-aepeg2w5.js:370150-370214 layout
function getOwnProperty(e, n) {
  return e != null && Object.hasOwn(e, n) ? e[n] : void 0;
}
/**
 * 从附加价格缓存里取并按 ModelCosts schema 校验。
 */
//@ chunk-aepeg2w5.js:370214-370299 layout
function getValidatedExtraModelCosts(e, n) {
  let r = getOwnProperty(e, n);
  return r !== void 0 && MODEL_COSTS_SCHEMA().safeParse(r).success ? r : void 0;
}
/**
 * GrowthBook alder_ford：模型 → {as: 按哪个模型计价, ends_at: 截止秒}。
 */
//@ chunk-aepeg2w5.js:370299-370598 file-local
var MODEL_COSTS_SCHEMA = DoctorLazy(() => {
    let nonnegative = E().nonnegative();
    return u({
      inputTokens: nonnegative,
      outputTokens: nonnegative,
      promptCacheWriteTokens: nonnegative,
      promptCacheWrite1hTokens: nonnegative.optional(),
      promptCacheReadTokens: nonnegative,
      webSearchRequests: nonnegative,
    });
  }),
  ALDER_FORD = "alder_ford",
  PRICING_PROMOTION_SCHEMA = DoctorLazy(() =>
    pe(
      o(),
      u({ as: o(), ends_at: E().positive().lt(100000000000) })
        .optional()
        .catch(void 0),
    ),
  );
/**
 * 促销期内（GrowthBook alder_ford，ends_at 之前）返回该模型借用价格的模型 id。
 */
//@ chunk-aepeg2w5.js:370598-370775 layout
function getPromotionalPricingModel(e) {
  if (!usesFirstPartyPricing()) return;
  let safeParse = PRICING_PROMOTION_SCHEMA().safeParse(getCachedClientData()?.[ALDER_FORD]),
    r = safeParse.success ? getOwn(safeParse.data, e) : void 0;
  return r !== void 0 && Date.now() < r.ends_at * 1000 && getOwnProperty(MODEL_COSTS, r.as) !== void 0
    ? r.as
    : void 0;
}
/**
 * 促销期内按借用模型返回内置价格。
 */
//@ chunk-aepeg2w5.js:370775-370837 layout
function getPromotionalModelCosts(e) {
  let n = getPromotionalPricingModel(e);
  return n === void 0 ? void 0 : getOwnProperty(MODEL_COSTS, n);
}
/**
 * 去掉 [1m]/[2m] 后按身份归一的模型 id（计价用）。
 */
//@ chunk-aepeg2w5.js:370837-370883 layout
function getCanonicalPricingModel(e) {
  return getCanonicalName(Bn(e), { identity: !0 });
}
/**
 * 非 fast 时返回促销借用的计价模型 id。旧版名 getModelCosts 为错配（真正的 getModelCosts 是 #e8t）。
 */
//@ chunk-aepeg2w5.js:370883-370942 fingerprint = getModelCosts (0.859)
function getPricingAliasModel(model, usage) {
  return usage?.speed === "fast" ? void 0 : getPromotionalPricingModel(getCanonicalPricingModel(model));
}
/**
 * 去掉上下文后缀后的规范模型名。
 */
//@ chunk-aepeg2w5.js:370942-370975 layout
function getCanonicalModelId(e) {
  return getCanonicalName(Bn(e));
}
/**
 * Bedrock/Vertex/Foundry/Mantle 时取 catalog runtime 里的 pricing（服务端下发的模型目录）。
 */
//@ chunk-aepeg2w5.js:370975-371077 layout
function getProviderCatalogPricing(e) {
  if (!jat(getAPIProvider())) return;
  let n = strippedCanonicalName(e),
    r = dn(n)?.pricing;
  return r != null && anyModelDescribed(n) ? toModelCosts(n, r) : void 0;
}
/**
 * 取模型价格：非 fast 时促销价 → 附加模型价格缓存 → fast 时 fast 价 → 内置 MODEL_COSTS → 提供商目录价 → 附加缓存；都没有则记 tengu_unknown_model_cost 并用默认主模型价或 $5/$25。
 */
//@ chunk-aepeg2w5.js:371077-371623 layout
function getModelCosts(model, usage) {
  let r = getCanonicalName(model);
  if (usage.speed !== "fast") {
    let x = getPromotionalModelCosts(getCanonicalPricingModel(model));
    if (x) return x;
  }
  let s = getCanonicalName(model, { identity: !0 });
  if (s !== r) {
    let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache,
      P =
        getValidatedExtraModelCosts(additionalModelCostsCache, Lt(model)) ??
        getValidatedExtraModelCosts(additionalModelCostsCache, Lt(s));
    if (P) return P;
  }
  if (usage.speed === "fast") {
    if (r === "claude-opus-5-5") return COST_TIER_8_40;
    if (r === "claude-opus-4-8" || r === "claude-opus-5") return COST_TIER_10_50;
    if (r === "claude-opus-4-6" || r === "claude-opus-4-7") return COST_TIER_30_150;
  }
  let h = MODEL_COSTS[r];
  if (h) return h;
  let y = getProviderCatalogPricing(model);
  if (y) return y;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache,
    w = additionalModelCostsCache
      ? (getOwn(additionalModelCostsCache, model) ?? getOwn(additionalModelCostsCache, r))
      : void 0;
  if (w) return w;
  trackUnknownModelCost(model, r);
  let R = getDefaultMainLoopModel();
  return MODEL_COSTS[getCanonicalName(R)] ?? getProviderCatalogPricing(R) ?? DEFAULT_MODEL_COSTS;
}
/**
 * 未知模型成本：记 tengu_unknown_model_cost 并标记“成本可能不准”（formatTotalCost 显示提示）。
 */
//@ chunk-aepeg2w5.js:371623-371706 fingerprint = trackUnknownModelCost (1)
function trackUnknownModelCost(model, shortName) {
  (logEvent("tengu_unknown_model_cost", {
    model: telemetrySafeModelName(model),
    shortName: telemetrySafeModelName(shortName),
  }),
    setHasUnknownModelCost());
}
/**
 * 读托管设置 policySettings.modelPricing（只信任 helper/plist/hklm/file 或已验证的远程来源）编译成组织价格表，缓存在进程策略状态里。
 */
//@ chunk-aepeg2w5.js:371706-372493 layout
function getOrgModelPricing() {
  let e = !1;
  try {
    let orgPricing = is().policy.orgPricing;
    if (orgPricing !== void 0) return orgPricing.value;
    let r = getSettingsForSource("policySettings"),
      policy = is().policy;
    if (policy.orgPricing === void 0) {
      let h = { value: void 0 };
      policy.orgPricing = h;
      let y = getPolicySettingsOrigin(),
        S =
          isAdminPolicyOrigin(y) ||
          (y === "remote" &&
            (isRemoteManagedSettingsVerified() || getRemoteSettingsPathOverride() !== void 0)),
        w = S ? r?.modelPricing : void 0,
        R = adminPolicyLoadFailureRefusesLaunch(),
        x = r?.modelPricing !== void 0 ? w : R ? void 0 : getHostManagedModelPricing();
      if (((e = !0), (h.value = x && compileModelPricing(x, r?.modelOverrides)), h.value))
        logFeatureOk("settings_model_pricing", {
          rows: h.value.exact.size,
          multiplier: h.value.multiplier,
          host: r?.modelPricing === void 0,
        });
      else if (!S && r?.modelPricing)
        logFeatureSad(
          "settings_model_pricing",
          y === "remote" ? "unverified_remote_cache" : "untrusted_origin",
        );
    }
    return policy.orgPricing.value;
  } catch (error) {
    if (
      (logForDebugging(
        `modelPricing: ${error instanceof Error ? error.message : String(error)}; pricing at list`,
        { level: "error" },
      ),
      e)
    )
      logFeatureBad("settings_model_pricing", "compile_threw");
    return;
  }
}
/**
 * modelPricing.overrides（input/output/cacheRead/cacheWrite）编译成 exact 与 builtin 两张表，带 multiplier；空表且倍率 1 时返回 undefined。
 */
//@ chunk-aepeg2w5.js:372493-373252 layout
function compileModelPricing(e, n) {
  let r = new Map(),
    s = new Map();
  for (let [h, y] of Object.entries(e.overrides ?? {})) {
    let S = {
        inputTokens: y.input,
        outputTokens: y.output,
        promptCacheReadTokens: y.cacheRead,
        promptCacheWriteTokens: y.cacheWrite,
        webSearchRequests: DEFAULT_MODEL_COSTS.webSearchRequests,
      },
      lower = Bn(h).toLowerCase();
    if (r.has(lower)) {
      logForDebugging(`modelPricing: override '${h}' repeats an earlier row's key; the earlier row is used`, {
        level: "warn",
      });
      continue;
    }
    r.set(lower, S);
    let R = toBuiltinCatalogModelId(lower);
    if (R === null) continue;
    if (s.has(R)) {
      logForDebugging(
        `modelPricing: override '${h}' spells the same built-in model as an earlier row; it prices only its exact spelling, other spellings use the earlier row`,
        { level: "warn" },
      );
      continue;
    }
    s.set(R, S);
  }
  if (r.size === 0 && (e.multiplier ?? 1) === 1) return;
  return { multiplier: e.multiplier ?? 1, exact: r, builtin: s, adminOverrides: n };
}
/**
 * 把 Bedrock 区域前缀模型 id（eu./apac. 等）归一成 catalog id，找不到返回 null。
 */
//@ chunk-aepeg2w5.js:373252-373465 layout
function toBuiltinCatalogModelId(e) {
  if (isCatalogModelId(e)) return e;
  let found = BEDROCK_REGION_PREFIXES.find((s) => s !== "us" && e.startsWith(`${s}.anthropic.`)),
    r =
      catalogIdForProviderModelId(found ? `us${e.slice(found.length)}` : e) ??
      (e.startsWith("anthropic.") ? catalogIdForProviderModelId(`us.${e}`) : void 0);
  return r !== void 0 && isCatalogModelId(r) ? r : null;
}
/**
 * 在组织价格表里按精确拼写、内置 id、覆盖映射查模型价格。
 */
//@ chunk-aepeg2w5.js:373465-373890 layout
function findOrgPricingForModel(e, n) {
  if (e.exact.size === 0) return;
  let r = e.exact.get(Bn(n).toLowerCase());
  if (!jat(getAPIProvider()) && (r !== void 0 || e.builtin.size === 0)) return r;
  let s = getCanonicalName(n, {
      overridesMap: e.adminOverrides ?? getPairedPolicyModelOverrides() ?? {},
      identity: !0,
    }),
    h = Lt(s);
  if (isCatalogModelId(h) || !fn(h)) return r ?? e.builtin.get(s);
  let values = Object.values(Bc),
    S = r ?? [...e.exact].find(([w]) => values.some((R) => matchesCatalogBase(w, h, R)))?.[1];
  return S && { ...S, webSearchRequests: dn(h)?.pricing?.web_search ?? S.webSearchRequests };
}
/**
 * 是否配置了组织托管价格（formatTotalCost 据此提示“按组织费率”）。
 */
//@ chunk-aepeg2w5.js:373890-373926 layout
function hasOrgModelPricing() {
  return getOrgModelPricing() !== void 0;
}
/**
 * 计算成本并返回来源：configured（组织价格/倍率）、catalog、default。
 */
//@ chunk-aepeg2w5.js:373926-374186 layout
function calculateCostWithPricingSource(e, n) {
  let r = getOrgModelPricing(),
    s = r?.multiplier ?? 1,
    h = r ? findOrgPricingForModel(r, e) : void 0;
  if (h) return { usd: tokensToUSDCost(h, { ...n, inference_geo: null }) * s, pricing: "configured" };
  let y = lookupModelCosts(e);
  if (y) return { usd: tokensToUSDCost(y, n) * s, pricing: s !== 1 ? "configured" : "catalog" };
  return { usd: tokensToUSDCost(DEFAULT_MODEL_COSTS, n) * s, pricing: "default" };
}
/**
 * 内置表、提供商目录或附加价格缓存里有该模型价格。
 */
//@ chunk-aepeg2w5.js:374186-374343 layout
function hasKnownModelCost(e) {
  let n = getCanonicalName(e);
  if (MODEL_COSTS[n] !== void 0 || getProviderCatalogPricing(e) !== void 0) return !0;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  return (
    !!additionalModelCostsCache &&
    (getOwn(additionalModelCostsCache, e) !== void 0 || getOwn(additionalModelCostsCache, n) !== void 0)
  );
}
/**
 * 成本依据：managed（组织价格）、unknown（未知模型）、list（标价）。
 */
//@ chunk-aepeg2w5.js:374343-374562 layout
function getCostBasis(e, n) {
  let r = getOrgModelPricing(),
    s = e.includes("application-inference-profile") ? (getInferenceProfileBackingModelCached(Bn(e)) ?? e) : e;
  if (r && findOrgPricingForModel(r, s) !== void 0) return "managed";
  if (!hasKnownModelCost(s) && getPricingAliasModel(e, n) === void 0) return "unknown";
  return r && r.multiplier !== 1 ? "managed" : "list";
}
/**
 * 记录到 modelUsage.canonicalModel 的模型：组织价格命中时为规范名，否则促销借用模型或规范名。
 */
//@ chunk-aepeg2w5.js:374562-374641 layout
function getCanonicalModelForCost(e, n) {
  let r = getOrgModelPricing();
  return (
    (r && findOrgPricingForModel(r, e) !== void 0 ? void 0 : getPricingAliasModel(e, n)) ??
    getCanonicalName(e)
  );
}
/**
 * 一次请求的美元成本：有组织价格时用组织价格×倍率，否则 getModelCosts。cost-tracker 与 advisor 用量都走这里。
 */
//@ chunk-aepeg2w5.js:374641-374785 layout
function calculateUSDCost(model, usage) {
  let r = getOrgModelPricing();
  if (!r) return tokensToUSDCost(getModelCosts(model, usage), usage);
  let s = findOrgPricingForModel(r, model);
  return (
    (s
      ? tokensToUSDCost(s, { ...usage, inference_geo: null })
      : tokensToUSDCost(getModelCosts(model, usage), usage)) * r.multiplier
  );
}
/**
 * 用 camelCase 的 token 计数（inputTokens 等）构造 usage 再算成本。
 */
//@ chunk-aepeg2w5.js:374785-375149 layout
function calculateCostFromTokenCounts(e, n, r) {
  let s = {
    input_tokens: n.inputTokens,
    output_tokens: n.outputTokens,
    cache_read_input_tokens: n.cacheReadInputTokens,
    cache_creation_input_tokens: n.cacheCreationInputTokens,
    ...(r?.speed !== void 0 && { speed: r.speed }),
    ...(r?.inferenceGeo !== void 0 && { inference_geo: r.inferenceGeo }),
    ...(r?.serverToolUse !== void 0 && { server_tool_use: r.serverToolUse }),
  };
  return calculateUSDCost(e, s);
}
/**
 * 整数 $N，否则保留两位小数。
 */
//@ chunk-aepeg2w5.js:375149-375226 layout = formatPrice (1)
function formatPriceUSD(price) {
  if (Number.isInteger(price)) return `$${price}`;
  return `$${price.toFixed(2)}`;
}
/**
 * 价格串 "$in/$out per Mtok"，有长提示词价时追加 "(… for prompts over N)"。
 */
//@ chunk-aepeg2w5.js:375226-375442 fingerprint = formatModelPricing (0.622)
function formatModelPricing(costs) {
  let n = `${formatPriceUSD(costs.inputTokens)}/${formatPriceUSD(costs.outputTokens)} per Mtok`,
    longPrompt = costs.longPrompt;
  if (longPrompt === void 0) return n;
  return `${n} (${formatPriceUSD(longPrompt.inputTokens)}/${formatPriceUSD(longPrompt.outputTokens)} for prompts over ${formatTokens(longPrompt.abovePromptTokens)})`;
}
//@ chunk-aepeg2w5.js:375866-376032 placement
function lookupModelCosts(e) {
  let n = getPromotionalModelCosts(getCanonicalPricingModel(e));
  if (n) return n;
  let r = getCanonicalName(e),
    s = MODEL_COSTS[r] ?? getProviderCatalogPricing(e);
  if (s) return s;
  let additionalModelCostsCache = getGlobalConfig().additionalModelCostsCache;
  return (
    (additionalModelCostsCache
      ? (getOwn(additionalModelCostsCache, e) ?? getOwn(additionalModelCostsCache, r))
      : void 0) || void 0
  );
}
//@ chunk-18hwfzwa.js:1101521-1101525 placement
j();
//@ chunk-18hwfzwa.js:1101525-1101574 placement
function isEffortCostShown() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_marbled_teal", !1);
}
/**
 * 模型（去掉 [1m]、按身份归一）是否 claude-fable-5-1。旧版名 MODEL_COSTS 为错配。
 */
//@ chunk-18hwfzwa.js:1744468-1744518 fingerprint = MODEL_COSTS (1)
function isFable51Model(h) {
  return strippedCanonicalName(h) === strippedCanonicalName(CLAUDE_FABLE_5_1_CONFIG.firstParty);
}
/**
 * 解析 usage.iterations：每项 {type, model, 各 token 数}，type=fallback_message 的 model 记为 servedFallbackModel。旧版名 calculateCostFromTokens 为错配。
 */
//@ chunk-e6aww6q8.js:2400901-2401522 fingerprint = calculateCostFromTokens (0.755)
function parseUsageIterations(e) {
  let n = { servedFallbackModel: void 0, entries: [] };
  if (typeof e !== "object" || e === null) return n;
  let iterations = e.iterations;
  if (!Array.isArray(iterations)) return n;
  let s = [],
    h;
  for (let y of iterations) {
    if (typeof y !== "object" || y === null) continue;
    let S = y;
    if (typeof S.type !== "string") continue;
    let w = {
      type: S.type,
      model: typeof S.model === "string" ? S.model : void 0,
      inputTokens: ave(S.input_tokens),
      outputTokens: ave(S.output_tokens),
      cacheReadInputTokens: ave(S.cache_read_input_tokens),
      cacheCreationInputTokens: ave(S.cache_creation_input_tokens),
    };
    if ((s.push(w), S.type === "fallback_message" && w.model !== void 0)) h = w.model;
  }
  return { servedFallbackModel: h, entries: s };
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
  getModelPricingDisplay,
  hasOrgModelPricing,
  splitCacheCreationTokens,
  getCanonicalModelForCost,
  getCostBasis,
  calculateCostWithPricingSource,
  getCanonicalModelId,
};
