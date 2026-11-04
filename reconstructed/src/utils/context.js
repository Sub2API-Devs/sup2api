/**
 * utils/context.ts
 *
 * 上下文窗口与输出上限：上下文百分比、模型 max_output_tokens 默认值与上限（目录 + clientdata 覆盖）、未知模型窗口判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/context.ts
 * pieces: chunk-aepeg2w5.js (3), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 2, layout 1, callgraph-fingerprint 1
 */
import { getCachedClientData, getFetchedClientData } from "./config.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { servedMaxOutputTokens, servedDefaultOutputTokens } from "./model/modelCatalog/servedCatalog.js";
import { getCatalogEntry } from "./model/modelCatalog.js";
import { SMALL_FAST_MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS_LIMIT } from "./model/model.js";
import { getModelCapability } from "./model/modelCapabilities.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "./model/providers.js";
import { env } from "./env.js";
import { is1mContextDisabled, isCompactDisabledOrCustom } from "./model/contextWindow1m.js";
import { isUnrecognizedModelWindow } from "../services/compact/autoCompactWindow.js";

//@ chunk-aepeg2w5.js:474021-474238 fingerprint = calculateContextPercentages (1)
/**
 * 上下文已用/剩余百分比（输入+缓存 token / 窗口），夹在 0–100。
 */
function calculateContextPercentages(currentUsage, contextWindowSize) {
  if (!currentUsage)
    return {
      used: null,
      remaining: null,
    };
  let totalInputTokens =
    currentUsage.input_tokens +
    currentUsage.cache_creation_input_tokens +
    currentUsage.cache_read_input_tokens;
  let usedPercentage = Math.round((totalInputTokens / contextWindowSize) * 100);
  let clampedUsed = Math.min(100, Math.max(0, usedPercentage));
  return {
    used: clampedUsed,
    remaining: 100 - clampedUsed,
  };
}
//@ chunk-aepeg2w5.js:474238-474509 layout
/**
 * clientdata 的 heather_vale（全局或按模型）给出的默认输出 token。
 */
function getClientDataDefaultOutputTokens(model, antModel) {
  let heatherVale = getCachedClientData(model)?.heather_vale;
  if (typeof heatherVale !== "number") {
    let heatherVale_2 = getCachedClientData()?.heather_vale;
    let override = typeof heatherVale_2 === "number" ? getFetchedClientData()?.heather_vale : heatherVale_2;
    heatherVale =
      typeof override === "object" && override !== null && !Array.isArray(override)
        ? override[antModel]
        : undefined;
  }
  if (typeof heatherVale !== "number" || !Number.isInteger(heatherVale) || heatherVale <= 0) return null;
  return heatherVale;
}
//@ chunk-aepeg2w5.js:474509-474942 fingerprint = getModelMaxOutputTokens (0.453)
/**
 * 模型 max_output_tokens：{default, upperLimit}；来源依次为模型目录覆盖、目录 max_output_tokens、claude-3 老模型固定值、默认 32000/128000；再受 clientdata 默认值与能力表 max_tokens 约束。
 */
function getModelMaxOutputTokens(model) {
  let defaultTokens;
  let maxTokens;
  let antModel = getCanonicalName(model);
  let servedMax = servedMaxOutputTokens(model, antModel);
  let maxOutputTokens = getCatalogEntry(antModel)?.max_output_tokens;
  if (servedMax !== undefined) {
    maxTokens = servedMax;
    defaultTokens = Math.min(maxOutputTokens?.default ?? SMALL_FAST_MAX_OUTPUT_TOKENS, servedMax);
  } else if (maxOutputTokens) {
    defaultTokens = maxOutputTokens.default;
    maxTokens = maxOutputTokens.upper;
  } else if (antModel === "claude-3-opus" || antModel === "claude-3-haiku") {
    defaultTokens = 4096;
    maxTokens = 4096;
  } else if (antModel === "claude-3-sonnet") {
    defaultTokens = 8192;
    maxTokens = 8192;
  } else {
    defaultTokens = SMALL_FAST_MAX_OUTPUT_TOKENS;
    maxTokens = MAX_OUTPUT_TOKENS_LIMIT;
  }
  let result =
    servedDefaultOutputTokens(model, antModel) ?? getClientDataDefaultOutputTokens(model, antModel);
  if (result !== null) defaultTokens = Math.min(result, maxTokens);
  let cap = getModelCapability(model);
  if (cap?.max_tokens && cap.max_tokens >= 4096) {
    maxTokens = cap.max_tokens;
    defaultTokens = Math.min(defaultTokens, maxTokens);
  }
  return {
    default: defaultTokens,
    upperLimit: maxTokens,
  };
}
//@ chunk-e6aww6q8.js:1550371-1550615 callgraph-fingerprint = getContextWindowForModel (0.4)
/**
 * 第一方直连、未禁用 1M、窗口 <1M 等条件下是否对未知模型强制窗口。旧版名 getContextWindowForModel 为错配（返回布尔）。
 */
function shouldEnforceUnknownModelWindow(model) {
  let { model: model_2, contextWindow } = model;
  if (
    getAPIProvider() !== "firstParty" ||
    isFirstPartyAnthropicBaseUrl() ||
    env.ANTHROPIC_UNIX_SOCKET !== undefined
  )
    return false;
  if (is1mContextDisabled()) return false;
  if (contextWindow >= 1e6) return false;
  let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  if (
    CLAUDE_CODE_MAX_CONTEXT_TOKENS !== undefined &&
    CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0 &&
    isCompactDisabledOrCustom(model_2)
  )
    return false;
  return isUnrecognizedModelWindow(model);
}
export {
  calculateContextPercentages,
  getModelMaxOutputTokens,
  getClientDataDefaultOutputTokens,
  shouldEnforceUnknownModelWindow,
};
