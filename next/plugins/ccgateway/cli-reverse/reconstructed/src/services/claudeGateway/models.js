/**
 * services/claudeGateway/models.ts
 *
 * 2.1.316 新增：网关可用模型列表与映射
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (19)
 * attribution: placement 19
 */
import { findModelConfigById } from "../../utils/model/providerCaches.js";
import { sanitizeModelIdForMessage } from "../../utils/permissions/permissionExplainer.js";
import { modelRestriction } from "./bedrockGuardrails.js";
import { bedrockRegionGroup } from "../../utils/model/bedrock.js";
import { bedrockModelFromArnOrName } from "./proxyRequest.js";
import { DEFAULT_3P_OPUS_KEY, DEFAULT_3P_SONNET_KEY, DEFAULT_3P_HAIKU_KEY } from "../../utils/model/model.js";
import { catalogEntriesByFirstPartyId, getCatalogEntry } from "../../utils/model/modelCatalog.js";
import { toSdkUsage } from "../api/claude.js";
import {
  hasKnownModelCost,
  getModelCosts,
  DEFAULT_MODEL_COSTS,
  tokensToUSDCost,
  MODEL_COSTS,
} from "../../utils/modelCost.js";
import { firstPartyNameToCanonical } from "../../utils/model/modelFallback.js";
import { has1mSuffix, isLegacyNo1mModel } from "../../utils/model/contextWindow1m.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1hnjmk23.js:1348627-1348741 placement
/**
 * 在模型条目列表里按 id 查找（忽略大小写，或经 VD 规范化后相等）。
 */
function findModelEntryById(modelId, entries) {
  let normalizedId = findModelConfigById(modelId);
  let lower = modelId.toLowerCase();
  return entries.find(
    (entry) =>
      entry.id.toLowerCase() === lower ||
      (normalizedId !== null && findModelConfigById(entry.id) === normalizedId),
  );
}
//@ chunk-1hnjmk23.js:1348837-1348916 placement
/**
 * 生成“模型不在运营方白名单”提示。
 */
function operatorModelNotAllowedMessage(modelId) {
  return `model ${sanitizeModelIdForMessage(modelId)} is not in the operator's model allowlist`;
}
//@ chunk-1hnjmk23.js:1348916-1349139 placement
/**
 * 按角色的 availableModels/deniedModels 判定，返回被拒或不在白名单的提示文字；无限制时 undefined。
 */
function getRoleModelRestrictionMessage(modelId, role, models) {
  let verdict =
    role && modelRestriction(modelId, role, role.deniedModels && findModelEntryById(modelId, models));
  if (!verdict) return;
  return verdict === "denied"
    ? `model ${sanitizeModelIdForMessage(modelId)} is blocked by your role's deniedModels denylist`
    : `model ${sanitizeModelIdForMessage(modelId)} is not in your role's availableModels allowlist`;
}
//@ chunk-1hnjmk23.js:1349139-1349402 placement
/**
 * 上游的模型列表是否包含该模型（精确、单个 * 通配或同一模型族）。
 */
function upstreamServesModel(upstream, modelId) {
  if (!upstream.models) return true;
  let modelConfigById = findModelConfigById(modelId);
  let lower = modelId.toLowerCase();
  return upstream.models.some((model) => {
    let lower_2 = model.toLowerCase();
    let [pattern = "", suffixPart, prefixPart] = lower_2.split("*");
    return (
      lower_2 === lower ||
      (suffixPart !== undefined &&
        prefixPart === undefined &&
        lower.length >= pattern.length + suffixPart.length &&
        lower.startsWith(pattern) &&
        lower.endsWith(suffixPart)) ||
      (modelConfigById !== null && findModelConfigById(model) === modelConfigById)
    );
  });
}
//@ chunk-1hnjmk23.js:1349402-1350158 placement
/**
 * 把请求的模型解析为上游的模型 id（配置映射、内置映射，按区域选 Bedrock 型号），失败返回原因。
 */
function resolveUpstreamModel(modelId, upstream, models, autoIncludeBuiltinModels = true, brief = false) {
  let modelConfigById = findModelConfigById(modelId);
  if (!upstreamServesModel(upstream, modelId))
    return {
      ok: false,
      listSkip: true,
      error: brief
        ? `model ${sanitizeModelIdForMessage(modelId)} is not available on this upstream`
        : `model ${sanitizeModelIdForMessage(modelId)} is not served by upstream '${upstream.name}'`,
    };
  let modelEntryById = findModelEntryById(modelId, models);
  let mapped = modelEntryById?.upstream_model[upstream.name];
  if (mapped)
    return {
      ok: true,
      model: mapped,
    };
  if (modelConfigById && (autoIncludeBuiltinModels || modelEntryById)) {
    let region = upstream.region;
    let isUsRegion = !region || bedrockRegionGroup(region) === "us" || region.startsWith("ca-");
    let wireModel =
      upstream.provider === "anthropic"
        ? modelConfigById.firstParty
        : upstream.provider === "bedrock" && modelConfigById.bedrock && !isUsRegion
          ? bedrockModelFromArnOrName(modelConfigById.bedrock)
          : modelConfigById[upstream.provider];
    if (!wireModel)
      return {
        ok: false,
        error: brief
          ? `model ${sanitizeModelIdForMessage(modelId)} is not available on this upstream`
          : `model ${sanitizeModelIdForMessage(modelId)} is not available on ${upstream.provider}`,
      };
    return {
      ok: true,
      model: wireModel,
    };
  }
  if (modelEntryById)
    return {
      ok: false,
      error: brief
        ? `model ${sanitizeModelIdForMessage(modelId)} is not configured for this upstream`
        : `model ${sanitizeModelIdForMessage(modelId)} has no upstream_model.${upstream.name} configured`,
    };
  return {
    ok: false,
    error: operatorModelNotAllowedMessage(modelId),
  };
}
//@ chunk-1hnjmk23.js:1377163-1377307 placement
/**
 * 可自动加入列表的内置模型键。
 */
var BUILTIN_MODEL_KEYS = [
  "haiku45",
  "haiku55",
  "sonnet45",
  "sonnet46",
  "sonnet5",
  "sonnet55",
  "opus41",
  "opus46",
  "opus47",
  "opus48",
  "opus5",
  "opus55",
  "fable5",
  "fable51",
];
//@ chunk-1hnjmk23.js:1377307-1377858 placement
/**
 * 网关 /v1/models 列表：配置的模型加上上游可服务的内置模型，过滤受限模型。
 */
function listGatewayModels(gatewayModels, upstreams, includeBuiltin, restriction) {
  let byId = new Map();
  for (let modelConfig of gatewayModels)
    byId.set(modelConfig.id, {
      type: "model",
      id: modelConfig.id,
      display_name: modelConfig.label ?? modelConfig.id,
      ...(modelConfig.description && {
        description: modelConfig.description,
      }),
    });
  if (includeBuiltin) {
    let preferredKeys = [DEFAULT_3P_OPUS_KEY, DEFAULT_3P_SONNET_KEY, DEFAULT_3P_HAIKU_KEY];
    let otherKeys = BUILTIN_MODEL_KEYS.filter((key) => !preferredKeys.includes(key)).reverse();
    for (let key of [...preferredKeys, ...otherKeys]) {
      let catalogEntry = catalogEntriesByFirstPartyId[key];
      if (byId.has(catalogEntry.firstParty)) continue;
      if (
        upstreams.some(
          (upstream) =>
            (upstream.provider === "anthropic" || catalogEntry[upstream.provider] !== null) &&
            upstreamServesModel(upstream, catalogEntry.firstParty),
        )
      )
        byId.set(catalogEntry.firstParty, {
          type: "model",
          id: catalogEntry.firstParty,
          display_name: catalogEntry.firstParty,
        });
    }
  }
  return restriction
    ? [...byId.values()].filter(
        (modelEntry) =>
          !modelRestriction(
            modelEntry.id,
            restriction,
            restriction.deniedModels && findModelEntryById(modelEntry.id, gatewayModels),
          ),
      )
    : [...byId.values()];
}
//@ chunk-1hnjmk23.js:1377858-1377962 placement
/**
 * /v1/models 响应。
 */
function modelsResponse(models, upstreams, includeBuiltin = true, policy) {
  return Response.json({
    data: listGatewayModels(models, upstreams, includeBuiltin, policy),
    has_more: false,
    first_id: null,
    last_id: null,
  });
}
//@ chunk-1hnjmk23.js:1377962-1378114 placement
/**
 * 按定价覆盖或已知模型价格计算请求花费（分），乘以倍率。
 */
function requestCostCents(modelId, usage, body, pricing, upstreamName) {
  let sdkUsage = toSdkUsage(usage);
  let pricingOverride = findPricingOverride(pricing, upstreamName, modelId, body);
  let costModel = hasKnownModelCost(modelId ?? "") ? modelId : hasKnownModelCost(body ?? "") ? body : null;
  let costs = pricingOverride
    ? toModelCosts(pricingOverride)
    : costModel != null
      ? getModelCosts(costModel, sdkUsage)
      : DEFAULT_MODEL_COSTS;
  return tokensToUSDCost(costs, sdkUsage) * 100 * (pricing?.multiplier ?? 1);
}
//@ chunk-1hnjmk23.js:1378114-1378291 placement
/**
 * 价格覆盖转为模型成本结构。
 */
function toModelCosts(pricingOverride) {
  return {
    inputTokens: pricingOverride.input,
    outputTokens: pricingOverride.output,
    promptCacheReadTokens: pricingOverride.cache_read,
    promptCacheWriteTokens: pricingOverride.cache_write,
    webSearchRequests: DEFAULT_MODEL_COSTS.webSearchRequests,
  };
}
//@ chunk-1hnjmk23.js:1378291-1378520 placement
/**
 * 找某上游下匹配模型的价格覆盖。
 */
function findPricingOverride(pricing, upstreamName, modelId, body) {
  if (!pricing || !upstreamName) return;
  let filtered = pricing.overrides.filter((override) => override.upstream === upstreamName);
  if (filtered.length === 0) return;
  let canonical = pricedCanonicalModel(modelId) ?? pricedCanonicalModel(body);
  return (
    filtered.find((override) => modelIdEquals(override.model, modelId)) ??
    filtered.find((override) => modelIdEquals(override.model, body)) ??
    (canonical
      ? filtered.find((override) => builtinCanonicalModelId(override.model) === canonical)
      : undefined)
  );
}
//@ chunk-1hnjmk23.js:1378520-1378558 placement
/**
 * 判断两个模型名是否指同一个模型（规范化键相同）。
 */
function isSameModel(model, model_2) {
  return modelCanonicalKey(model) === modelCanonicalKey(model_2);
}
//@ chunk-1hnjmk23.js:1378558-1378644 placement
/**
 * 模型名的规范化键：内置模型用 builtin:<规范名>，否则 string:<小写名>。
 */
function modelCanonicalKey(model) {
  let canonical = builtinCanonicalModelId(model);
  return canonical !== null ? `builtin:${canonical}` : `string:${model.toLowerCase()}`;
}
//@ chunk-1hnjmk23.js:1378644-1378702 placement (2.1.88 match: MODEL_COSTS, 1)
/**
 * 把模型名解析成内置规范名（非内置返回 null）。
 */
function builtinCanonicalModelId(model) {
  let modelConfigById = findModelConfigById(model);
  return modelConfigById ? firstPartyNameToCanonical(modelConfigById.firstParty) : null;
}
//@ chunk-1hnjmk23.js:1378702-1378777 placement
/**
 * 把模型名解析成有价格配置的规范名（不在 MODEL_COSTS 里返回 null）。
 */
function pricedCanonicalModel(name) {
  if (!name) return null;
  let canonical = firstPartyNameToCanonical(name);
  return MODEL_COSTS[canonical] !== undefined ? canonical : null;
}
//@ chunk-1hnjmk23.js:1378777-1378844 placement
/**
 * 忽略大小写比较两个模型名。
 */
function modelIdEquals(model, other) {
  return other != null && model.toLowerCase() === other.toLowerCase();
}
//@ chunk-1hnjmk23.js:1379459-1379517 placement
/**
 * 不支持 1M 上下文的旧模型集合（claude-sonnet-4-0、claude-sonnet-4-5）。
 */
var NO_1M_CONTEXT_MODELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:1379459", () => {
  NO_1M_CONTEXT_MODELS = new Set(["claude-sonnet-4-0", "claude-sonnet-4-5"]);
});
//@ chunk-1hnjmk23.js:1379517-1379769 placement
/**
 * 网关上该模型是否支持 1M 上下文（所有可服务上游一致）。
 */
function supports1mContext(name, config) {
  if (has1mSuffix(name)) return false;
  let directSupport = NO_1M_CONTEXT_MODELS.has(firstPartyNameToCanonical(name))
    ? undefined
    : modelSupports1m(name);
  if (directSupport === false) return false;
  let flattened = config.upstreams.flatMap((upstream) => {
    let upstreamModel = resolveUpstreamModel(
      name,
      upstream,
      config.models,
      config.auto_include_builtin_models,
    );
    return upstreamModel.ok ? [modelSupports1m(upstreamModel.model)] : [];
  });
  return !flattened.includes(false) && (directSupport === true || flattened.includes(true));
}
//@ chunk-1hnjmk23.js:1379769-1379896 placement
/**
 * 目录中模型是否支持 1M beta。
 */
function modelSupports1m(name) {
  let canonical = firstPartyNameToCanonical(name);
  if (isLegacyNo1mModel(canonical) || NO_1M_CONTEXT_MODELS.has(canonical)) return false;
  let context = getCatalogEntry(canonical)?.context;
  return context === undefined ? undefined : context.supports_1m_beta === true;
}
export {
  resolveUpstreamModel,
  getRoleModelRestrictionMessage,
  findModelEntryById,
  operatorModelNotAllowedMessage,
  listGatewayModels,
  supports1mContext,
  isSameModel,
  findPricingOverride,
  modelCanonicalKey,
  requestCostCents,
  modelsResponse,
};
