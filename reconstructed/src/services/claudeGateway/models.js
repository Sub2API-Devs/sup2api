/**
 * services/claudeGateway/models.ts
 *
 * 2.1.316 新增：网关可用模型列表与映射
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (19)
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

//@ chunk-1ny7cxrt.js:1347664-1347778 placement
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
//@ chunk-1ny7cxrt.js:1347874-1347953 placement
/**
 * 生成“模型不在运营方白名单”提示。
 */
function operatorModelNotAllowedMessage(modelId) {
  return `model ${sanitizeModelIdForMessage(modelId)} is not in the operator's model allowlist`;
}
//@ chunk-1ny7cxrt.js:1347953-1348176 placement
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
//@ chunk-1ny7cxrt.js:1348176-1348439 placement
/**
 * 上游的模型列表是否包含该模型（精确、单个 * 通配或同一模型族）。
 */
function upstreamServesModel(e, t) {
  if (!e.models) return true;
  let modelConfigById = findModelConfigById(t);
  let lower = t.toLowerCase();
  return e.models.some((model) => {
    let lower_2 = model.toLowerCase();
    let [a = "", l, c] = lower_2.split("*");
    return (
      lower_2 === lower ||
      (l !== undefined &&
        c === undefined &&
        lower.length >= a.length + l.length &&
        lower.startsWith(a) &&
        lower.endsWith(l)) ||
      (modelConfigById !== null && findModelConfigById(model) === modelConfigById)
    );
  });
}
//@ chunk-1ny7cxrt.js:1348439-1349195 placement
/**
 * 把请求的模型解析为上游的模型 id（配置映射、内置映射，按区域选 Bedrock 型号），失败返回原因。
 */
function resolveUpstreamModel(modelId, upstream, models, autoIncludeBuiltinModels = true, r = false) {
  let modelConfigById = findModelConfigById(modelId);
  if (!upstreamServesModel(upstream, modelId))
    return {
      ok: false,
      listSkip: true,
      error: r
        ? `model ${sanitizeModelIdForMessage(modelId)} is not available on this upstream`
        : `model ${sanitizeModelIdForMessage(modelId)} is not served by upstream '${upstream.name}'`,
    };
  let modelEntryById = findModelEntryById(modelId, models);
  let l = modelEntryById?.upstream_model[upstream.name];
  if (l)
    return {
      ok: true,
      model: l,
    };
  if (modelConfigById && (autoIncludeBuiltinModels || modelEntryById)) {
    let region = upstream.region;
    let u = !region || bedrockRegionGroup(region) === "us" || region.startsWith("ca-");
    let f =
      upstream.provider === "anthropic"
        ? modelConfigById.firstParty
        : upstream.provider === "bedrock" && modelConfigById.bedrock && !u
          ? bedrockModelFromArnOrName(modelConfigById.bedrock)
          : modelConfigById[upstream.provider];
    if (!f)
      return {
        ok: false,
        error: r
          ? `model ${sanitizeModelIdForMessage(modelId)} is not available on this upstream`
          : `model ${sanitizeModelIdForMessage(modelId)} is not available on ${upstream.provider}`,
      };
    return {
      ok: true,
      model: f,
    };
  }
  if (modelEntryById)
    return {
      ok: false,
      error: r
        ? `model ${sanitizeModelIdForMessage(modelId)} is not configured for this upstream`
        : `model ${sanitizeModelIdForMessage(modelId)} has no upstream_model.${upstream.name} configured`,
    };
  return {
    ok: false,
    error: operatorModelNotAllowedMessage(modelId),
  };
}
//@ chunk-1ny7cxrt.js:1375332-1375476 placement
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
//@ chunk-1ny7cxrt.js:1375476-1376027 placement
/**
 * 网关 /v1/models 列表：配置的模型加上上游可服务的内置模型，过滤受限模型。
 */
function listGatewayModels(e, t, n, o) {
  let r = new Map();
  for (let s of e)
    r.set(s.id, {
      type: "model",
      id: s.id,
      display_name: s.label ?? s.id,
      ...(s.description && {
        description: s.description,
      }),
    });
  if (n) {
    let s = [DEFAULT_3P_OPUS_KEY, DEFAULT_3P_SONNET_KEY, DEFAULT_3P_HAIKU_KEY];
    let a = BUILTIN_MODEL_KEYS.filter((l) => !s.includes(l)).reverse();
    for (let l of [...s, ...a]) {
      let c = catalogEntriesByFirstPartyId[l];
      if (r.has(c.firstParty)) continue;
      if (
        t.some(
          (f) =>
            (f.provider === "anthropic" || c[f.provider] !== null) && upstreamServesModel(f, c.firstParty),
        )
      )
        r.set(c.firstParty, {
          type: "model",
          id: c.firstParty,
          display_name: c.firstParty,
        });
    }
  }
  return o
    ? [...r.values()].filter((s) => !modelRestriction(s.id, o, o.deniedModels && findModelEntryById(s.id, e)))
    : [...r.values()];
}
//@ chunk-1ny7cxrt.js:1376027-1376131 placement
/**
 * /v1/models 响应。
 */
function modelsResponse(e, t, autoIncludeBuiltinModels = true, o) {
  return Response.json({
    data: listGatewayModels(e, t, autoIncludeBuiltinModels, o),
    has_more: false,
    first_id: null,
    last_id: null,
  });
}
//@ chunk-1ny7cxrt.js:1376131-1376283 placement
/**
 * 按定价覆盖或已知模型价格计算请求花费（分），乘以倍率。
 */
function requestCostCents(e, t, n, pricing, r) {
  let sdkUsage = toSdkUsage(t);
  let pricingOverride = findPricingOverride(pricing, r, e, n);
  let l = hasKnownModelCost(e ?? "") ? e : hasKnownModelCost(n ?? "") ? n : null;
  let c = pricingOverride
    ? toModelCosts(pricingOverride)
    : l != null
      ? getModelCosts(l, sdkUsage)
      : DEFAULT_MODEL_COSTS;
  return tokensToUSDCost(c, sdkUsage) * 100 * (pricing?.multiplier ?? 1);
}
//@ chunk-1ny7cxrt.js:1376283-1376460 placement
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
//@ chunk-1ny7cxrt.js:1376460-1376689 placement
/**
 * 找某上游下匹配模型的价格覆盖。
 */
function findPricingOverride(pricing, t, n, o) {
  if (!pricing || !t) return;
  let filtered = pricing.overrides.filter((override) => override.upstream === t);
  if (filtered.length === 0) return;
  let s = pricedCanonicalModel(n) ?? pricedCanonicalModel(o);
  return (
    filtered.find((a) => modelIdEquals(a.model, n)) ??
    filtered.find((a) => modelIdEquals(a.model, o)) ??
    (s ? filtered.find((a) => builtinCanonicalModelId(a.model) === s) : undefined)
  );
}
//@ chunk-1ny7cxrt.js:1376689-1376727 placement
/**
 * 判断两个模型名是否指同一个模型（规范化键相同）。
 */
function isSameModel(model, model_2) {
  return modelCanonicalKey(model) === modelCanonicalKey(model_2);
}
//@ chunk-1ny7cxrt.js:1376727-1376813 placement
/**
 * 模型名的规范化键：内置模型用 builtin:<规范名>，否则 string:<小写名>。
 */
function modelCanonicalKey(e) {
  let t = builtinCanonicalModelId(e);
  return t !== null ? `builtin:${t}` : `string:${e.toLowerCase()}`;
}
//@ chunk-1ny7cxrt.js:1376813-1376871 placement
/**
 * 把模型名解析成内置规范名（非内置返回 null）。
 */
function builtinCanonicalModelId(e) {
  let modelConfigById = findModelConfigById(e);
  return modelConfigById ? firstPartyNameToCanonical(modelConfigById.firstParty) : null;
}
//@ chunk-1ny7cxrt.js:1376871-1376946 placement
/**
 * 把模型名解析成有价格配置的规范名（不在 MODEL_COSTS 里返回 null）。
 */
function pricedCanonicalModel(e) {
  if (!e) return null;
  let t = firstPartyNameToCanonical(e);
  return MODEL_COSTS[t] !== undefined ? t : null;
}
//@ chunk-1ny7cxrt.js:1376946-1377013 placement
/**
 * 忽略大小写比较两个模型名。
 */
function modelIdEquals(model, t) {
  return t != null && model.toLowerCase() === t.toLowerCase();
}
//@ chunk-1ny7cxrt.js:1377628-1377686 placement
/**
 * 不支持 1M 上下文的旧模型集合（claude-sonnet-4-0、claude-sonnet-4-5）。
 */
var NO_1M_CONTEXT_MODELS = new Set(["claude-sonnet-4-0", "claude-sonnet-4-5"]);
//@ chunk-1ny7cxrt.js:1377686-1377938 placement
/**
 * 网关上该模型是否支持 1M 上下文（所有可服务上游一致）。
 */
function supports1mContext(id, t) {
  if (has1mSuffix(id)) return false;
  let n = NO_1M_CONTEXT_MODELS.has(firstPartyNameToCanonical(id)) ? undefined : modelSupports1m(id);
  if (n === false) return false;
  let flattened = t.upstreams.flatMap((upstream) => {
    let upstreamModel = resolveUpstreamModel(id, upstream, t.models, t.auto_include_builtin_models);
    return upstreamModel.ok ? [modelSupports1m(upstreamModel.model)] : [];
  });
  return !flattened.includes(false) && (n === true || flattened.includes(true));
}
//@ chunk-1ny7cxrt.js:1377938-1378065 placement
/**
 * 目录中模型是否支持 1M beta。
 */
function modelSupports1m(e) {
  let t = firstPartyNameToCanonical(e);
  if (isLegacyNo1mModel(t) || NO_1M_CONTEXT_MODELS.has(t)) return false;
  let context = getCatalogEntry(t)?.context;
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
