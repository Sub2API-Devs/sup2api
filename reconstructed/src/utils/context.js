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
import { ub, Fc } from "./model/modelCatalog/servedCatalog.js";
import { getCatalogEntry } from "./model/modelCatalog.js";
import { Qw, jG } from "./model/model.js";
import { getModelCapability } from "./model/modelCapabilities.js";
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "./model/providers.js";
import { env } from "./env.js";
import { is1mContextDisabled, Tmr } from "./model/contextWindow1m.js";
import { isUnrecognizedModelWindow } from "../services/compact/autoCompactWindow.js";

/**
 * 上下文已用/剩余百分比（输入+缓存 token / 窗口），夹在 0–100。
 */
//@ chunk-aepeg2w5.js:474021-474238 fingerprint = calculateContextPercentages (1)
function calculateContextPercentages(currentUsage, contextWindowSize) {
  if (!currentUsage) return { used: null, remaining: null };
  let totalInputTokens =
      currentUsage.input_tokens +
      currentUsage.cache_creation_input_tokens +
      currentUsage.cache_read_input_tokens,
    usedPercentage = Math.round((totalInputTokens / contextWindowSize) * 100),
    clampedUsed = Math.min(100, Math.max(0, usedPercentage));
  return { used: clampedUsed, remaining: 100 - clampedUsed };
}
/**
 * clientdata 的 heather_vale（全局或按模型）给出的默认输出 token。
 */
//@ chunk-aepeg2w5.js:474238-474509 layout
function getClientDataDefaultOutputTokens(e, n) {
  let r = getCachedClientData(e)?.heather_vale;
  if (typeof r !== "number") {
    let s = getCachedClientData()?.heather_vale,
      h = typeof s === "number" ? getFetchedClientData()?.heather_vale : s;
    r = typeof h === "object" && h !== null && !Array.isArray(h) ? h[n] : void 0;
  }
  if (typeof r !== "number" || !Number.isInteger(r) || r <= 0) return null;
  return r;
}
/**
 * 模型 max_output_tokens：{default, upperLimit}；来源依次为模型目录覆盖、目录 max_output_tokens、claude-3 老模型固定值、默认 32000/128000；再受 clientdata 默认值与能力表 max_tokens 约束。
 */
//@ chunk-aepeg2w5.js:474509-474942 fingerprint = getModelMaxOutputTokens (0.453)
function getModelMaxOutputTokens(model) {
  let n,
    r,
    antModel = getCanonicalName(model),
    h = ub(model, antModel),
    y = getCatalogEntry(antModel)?.max_output_tokens;
  if (h !== void 0) ((r = h), (n = Math.min(y?.default ?? Qw, h)));
  else if (y) ((n = y.default), (r = y.upper));
  else if (antModel === "claude-3-opus" || antModel === "claude-3-haiku") ((n = 4096), (r = 4096));
  else if (antModel === "claude-3-sonnet") ((n = 8192), (r = 8192));
  else ((n = Qw), (r = jG));
  let S = Fc(model, antModel) ?? getClientDataDefaultOutputTokens(model, antModel);
  if (S !== null) n = Math.min(S, r);
  let w = getModelCapability(model);
  if (w?.max_tokens && w.max_tokens >= 4096) ((r = w.max_tokens), (n = Math.min(n, r)));
  return { default: n, upperLimit: r };
}
/**
 * 第一方直连、未禁用 1M、窗口 <1M 等条件下是否对未知模型强制窗口。旧版名 getContextWindowForModel 为错配（返回布尔）。
 */
//@ chunk-e6aww6q8.js:1550371-1550615 callgraph-fingerprint = getContextWindowForModel (0.4)
function shouldEnforceUnknownModelWindow(e) {
  let { model: model, contextWindow: contextWindow } = e;
  if (
    getAPIProvider() !== "firstParty" ||
    isFirstPartyAnthropicBaseUrl() ||
    env.ANTHROPIC_UNIX_SOCKET !== void 0
  )
    return !1;
  if (is1mContextDisabled()) return !1;
  if (contextWindow >= 1e6) return !1;
  let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  if (CLAUDE_CODE_MAX_CONTEXT_TOKENS !== void 0 && CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0 && Tmr(model))
    return !1;
  return isUnrecognizedModelWindow(e);
}

export {
  calculateContextPercentages,
  getModelMaxOutputTokens,
  getClientDataDefaultOutputTokens,
  shouldEnforceUnknownModelWindow,
};
