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
import { hE } from "./proxyRequest.js";
import { DEFAULT_3P_OPUS_KEY, DEFAULT_3P_SONNET_KEY, DEFAULT_3P_HAIKU_KEY } from "../../utils/model/model.js";
import { No, getCatalogEntry } from "../../utils/model/modelCatalog.js";
import { toSdkUsage } from "../api/claude.js";
import {
  hasKnownModelCost,
  getModelCosts,
  DEFAULT_MODEL_COSTS,
  tokensToUSDCost,
  MODEL_COSTS,
} from "../../utils/modelCost.js";
import { firstPartyNameToCanonical } from "../../utils/model/modelFallback.js";
import { olt, isLegacyNo1mModel } from "../../utils/model/contextWindow1m.js";

/**
 * 在模型条目列表里按 id 查找（忽略大小写，或经 VD 规范化后相等）。
 */
//@ chunk-1ny7cxrt.js:1347664-1347778 placement
function findModelEntryById(modelId, entries) {
  let normalizedId = findModelConfigById(modelId),
    lower = modelId.toLowerCase();
  return entries.find(
    (r) =>
      r.id.toLowerCase() === lower || (normalizedId !== null && findModelConfigById(r.id) === normalizedId),
  );
}
/**
 * 生成“模型不在运营方白名单”提示。
 */
//@ chunk-1ny7cxrt.js:1347874-1347953 placement
function operatorModelNotAllowedMessage(modelId) {
  return `model ${sanitizeModelIdForMessage(modelId)} is not in the operator's model allowlist`;
}
/**
 * 按角色的 availableModels/deniedModels 判定，返回被拒或不在白名单的提示文字；无限制时 undefined。
 */
//@ chunk-1ny7cxrt.js:1347953-1348176 placement
function getRoleModelRestrictionMessage(modelId, role, models) {
  let verdict =
    role && modelRestriction(modelId, role, role.deniedModels && findModelEntryById(modelId, models));
  if (!verdict) return;
  return verdict === "denied"
    ? `model ${sanitizeModelIdForMessage(modelId)} is blocked by your role's deniedModels denylist`
    : `model ${sanitizeModelIdForMessage(modelId)} is not in your role's availableModels allowlist`;
}
/**
 * 上游的模型列表是否包含该模型（精确、单个 * 通配或同一模型族）。
 */
//@ chunk-1ny7cxrt.js:1348176-1348439 placement
function upstreamServesModel(e, t) {
  if (!e.models) return !0;
  let n = findModelConfigById(t),
    lower = t.toLowerCase();
  return e.models.some((model) => {
    let lower_2 = model.toLowerCase(),
      [a = "", l, c] = lower_2.split("*");
    return (
      lower_2 === lower ||
      (l !== void 0 &&
        c === void 0 &&
        lower.length >= a.length + l.length &&
        lower.startsWith(a) &&
        lower.endsWith(l)) ||
      (n !== null && findModelConfigById(model) === n)
    );
  });
}
/**
 * 把请求的模型解析为上游的模型 id（配置映射、内置映射，按区域选 Bedrock 型号），失败返回原因。
 */
//@ chunk-1ny7cxrt.js:1348439-1349195 placement
function resolveUpstreamModel(e, t, n, o = !0, r = !1) {
  let s = findModelConfigById(e);
  if (!upstreamServesModel(t, e))
    return {
      ok: !1,
      listSkip: !0,
      error: r
        ? `model ${sanitizeModelIdForMessage(e)} is not available on this upstream`
        : `model ${sanitizeModelIdForMessage(e)} is not served by upstream '${t.name}'`,
    };
  let a = findModelEntryById(e, n),
    l = a?.upstream_model[t.name];
  if (l) return { ok: !0, model: l };
  if (s && (o || a)) {
    let region = t.region,
      u = !region || bedrockRegionGroup(region) === "us" || region.startsWith("ca-"),
      f =
        t.provider === "anthropic"
          ? s.firstParty
          : t.provider === "bedrock" && s.bedrock && !u
            ? hE(s.bedrock)
            : s[t.provider];
    if (!f)
      return {
        ok: !1,
        error: r
          ? `model ${sanitizeModelIdForMessage(e)} is not available on this upstream`
          : `model ${sanitizeModelIdForMessage(e)} is not available on ${t.provider}`,
      };
    return { ok: !0, model: f };
  }
  if (a)
    return {
      ok: !1,
      error: r
        ? `model ${sanitizeModelIdForMessage(e)} is not configured for this upstream`
        : `model ${sanitizeModelIdForMessage(e)} has no upstream_model.${t.name} configured`,
    };
  return { ok: !1, error: operatorModelNotAllowedMessage(e) };
}
/**
 * 可自动加入列表的内置模型键。
 */
//@ chunk-1ny7cxrt.js:1375332-1375476 placement
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
/**
 * 网关 /v1/models 列表：配置的模型加上上游可服务的内置模型，过滤受限模型。
 */
//@ chunk-1ny7cxrt.js:1375476-1376027 placement
function listGatewayModels(e, t, n, o) {
  let r = new Map();
  for (let s of e)
    r.set(s.id, {
      type: "model",
      id: s.id,
      display_name: s.label ?? s.id,
      ...(s.description && { description: s.description }),
    });
  if (n) {
    let s = [DEFAULT_3P_OPUS_KEY, DEFAULT_3P_SONNET_KEY, DEFAULT_3P_HAIKU_KEY],
      reverse = BUILTIN_MODEL_KEYS.filter((l) => !s.includes(l)).reverse();
    for (let l of [...s, ...reverse]) {
      let c = No[l];
      if (r.has(c.firstParty)) continue;
      if (
        t.some(
          (f) =>
            (f.provider === "anthropic" || c[f.provider] !== null) && upstreamServesModel(f, c.firstParty),
        )
      )
        r.set(c.firstParty, { type: "model", id: c.firstParty, display_name: c.firstParty });
    }
  }
  return o
    ? [...r.values()].filter((s) => !modelRestriction(s.id, o, o.deniedModels && findModelEntryById(s.id, e)))
    : [...r.values()];
}
/**
 * /v1/models 响应。
 */
//@ chunk-1ny7cxrt.js:1376027-1376131 placement
function modelsResponse(e, t, n = !0, o) {
  return Response.json({ data: listGatewayModels(e, t, n, o), has_more: !1, first_id: null, last_id: null });
}
/**
 * 按定价覆盖或已知模型价格计算请求花费（分），乘以倍率。
 */
//@ chunk-1ny7cxrt.js:1376131-1376283 placement
function requestCostCents(e, t, n, o, r) {
  let s = toSdkUsage(t),
    a = findPricingOverride(o, r, e, n),
    l = hasKnownModelCost(e ?? "") ? e : hasKnownModelCost(n ?? "") ? n : null,
    c = a ? toModelCosts(a) : l != null ? getModelCosts(l, s) : DEFAULT_MODEL_COSTS;
  return tokensToUSDCost(c, s) * 100 * (o?.multiplier ?? 1);
}
/**
 * 价格覆盖转为模型成本结构。
 */
//@ chunk-1ny7cxrt.js:1376283-1376460 placement
function toModelCosts(e) {
  return {
    inputTokens: e.input,
    outputTokens: e.output,
    promptCacheReadTokens: e.cache_read,
    promptCacheWriteTokens: e.cache_write,
    webSearchRequests: DEFAULT_MODEL_COSTS.webSearchRequests,
  };
}
/**
 * 找某上游下匹配模型的价格覆盖。
 */
//@ chunk-1ny7cxrt.js:1376460-1376689 placement
function findPricingOverride(e, t, n, o) {
  if (!e || !t) return;
  let filtered = e.overrides.filter((override) => override.upstream === t);
  if (filtered.length === 0) return;
  let s = kE(n) ?? kE(o);
  return (
    filtered.find((a) => EE(a.model, n)) ??
    filtered.find((a) => EE(a.model, o)) ??
    (s ? filtered.find((a) => IE(a.model) === s) : void 0)
  );
}
//@ chunk-1ny7cxrt.js:1376689-1376727 placement
function AE(e, t) {
  return Kf(e) === Kf(t);
}
//@ chunk-1ny7cxrt.js:1376727-1376813 placement
function Kf(e) {
  let t = IE(e);
  return t !== null ? `builtin:${t}` : `string:${e.toLowerCase()}`;
}
//@ chunk-1ny7cxrt.js:1376813-1376871 placement
function IE(e) {
  let t = findModelConfigById(e);
  return t ? firstPartyNameToCanonical(t.firstParty) : null;
}
//@ chunk-1ny7cxrt.js:1376871-1376946 placement
function kE(e) {
  if (!e) return null;
  let t = firstPartyNameToCanonical(e);
  return MODEL_COSTS[t] !== void 0 ? t : null;
}
//@ chunk-1ny7cxrt.js:1376946-1377013 placement
function EE(e, t) {
  return t != null && e.toLowerCase() === t.toLowerCase();
}
//@ chunk-1ny7cxrt.js:1377628-1377686 placement
var TE = new Set(["claude-sonnet-4-0", "claude-sonnet-4-5"]);
/**
 * 网关上该模型是否支持 1M 上下文（所有可服务上游一致）。
 */
//@ chunk-1ny7cxrt.js:1377686-1377938 placement
function supports1mContext(e, t) {
  if (olt(e)) return !1;
  let n = TE.has(firstPartyNameToCanonical(e)) ? void 0 : modelSupports1m(e);
  if (n === !1) return !1;
  let flattened = t.upstreams.flatMap((upstream) => {
    let s = resolveUpstreamModel(e, upstream, t.models, t.auto_include_builtin_models);
    return s.ok ? [modelSupports1m(s.model)] : [];
  });
  return !flattened.includes(!1) && (n === !0 || flattened.includes(!0));
}
/**
 * 目录中模型是否支持 1M beta。
 */
//@ chunk-1ny7cxrt.js:1377938-1378065 placement
function modelSupports1m(e) {
  let t = firstPartyNameToCanonical(e);
  if (isLegacyNo1mModel(t) || TE.has(t)) return !1;
  let n = getCatalogEntry(t)?.context;
  return n === void 0 ? void 0 : n.supports_1m_beta === !0;
}

export {
  resolveUpstreamModel,
  getRoleModelRestrictionMessage,
  findModelEntryById,
  operatorModelNotAllowedMessage,
  listGatewayModels,
  supports1mContext,
  AE,
  findPricingOverride,
  Kf,
  requestCostCents,
  modelsResponse,
};
