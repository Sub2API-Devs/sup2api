/**
 * utils/model/configs.ts
 *
 * 模型配置：由内置 model-catalog（chunk-v9tcvh08 的 uio）生成每个模型在各提供商（firstParty/bedrock/vertex/foundry/anthropicAws/anthropicGoogleCloud/mantle/gateway）的 id 表，以及 1M 上下文、图片尺寸等常量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/configs.ts
 * pieces: chunk-aepeg2w5.js (14), chunk-v9tcvh08.js (1)
 * attribution: placement 12, layout 1, fingerprint 2
 */
import {
  SECONDARY_CONTEXT_WINDOW,
  CONTEXT_WINDOW_THRESHOLD,
  MAX_CONTEXT_WINDOW_1M,
  getFlagContextWindow,
} from "./model.js";
import { strip1mSuffix } from "./modelIds.js";
import { getCanonicalName } from "./canonicalModelName.js";
import {
  catalogContext,
  is1mContextDisabled,
  DEFAULT_CONTEXT_WINDOW,
  legacyNo1mWindow,
  uses1mContext,
  isUnknownCustomModelSpelling,
  has1mSuffix_2,
} from "./contextWindow1m.js";
import {
  findEffectiveServedEntry,
  clampInputTokens,
  isPublishedCatalogInUse,
} from "./modelCatalog/servedCatalog.js";
import { isEnvTruthy } from "../envUtils.js";
import { env } from "../env.js";
import { isLongContext1mCreditsBlocked } from "../../bootstrap/state.js";
import { getCachedClientDataForContextWindow, getGlobalConfig } from "../config.js";
import { getAPIProvider } from "./providers.js";
import { isContextBetaRefused } from "../betas.js";
import { PROVIDER_KEYS, catalogEntriesByFirstPartyId } from "./modelCatalog.js";

//@ chunk-aepeg2w5.js:472270-472358 placement
/**
 * 模型的上下文窗口（覆盖、1M）。
 */
function getContextWindow(e, sdkBetas) {
  let noCompactMaxContextTokens = getNoCompactMaxContextTokens();
  if (noCompactMaxContextTokens !== undefined) return noCompactMaxContextTokens;
  if (isOver1mThreshold(e, sdkBetas)) return SECONDARY_CONTEXT_WINDOW;
  return getModelContextWindow(e, sdkBetas);
}
//@ chunk-aepeg2w5.js:472358-472534 placement
function getMinWindowWithoutOptIn(e) {
  let n = strip1mSuffix(e);
  return Math.min(
    ...[
      getCanonicalName(n, {
        identity: true,
      }),
      getCanonicalName(n, {
        identity: true,
        overridesMap: {},
      }),
    ].map((r) => {
      let s = catalogContext(r);
      return s?.maximum_window === undefined ? 1 / 0 : s.window;
    }),
  );
}
//@ chunk-aepeg2w5.js:472534-472662 placement
/**
 * 返回目录条目允许的最大上下文窗口（需 beta 才能长上下文的取基础窗口）。
 */
function getMaxContextWindowForEntry(e) {
  let n = catalogContext(e);
  if (n === undefined) return 0;
  return n.clamp_long_context_without_beta ? n.window : (n.maximum_window ?? n.window);
}
//@ chunk-aepeg2w5.js:472662-472876 placement
/**
 * 计算模型的上下文窗口信息：声明值、无需选用时的值与实际采信值（受 1M 禁用影响）。
 */
function getContextWindowInfo(e, n = getCanonicalName(e)) {
  let effectiveServedEntry = findEffectiveServedEntry(e, n);
  let s = clampInputTokens(effectiveServedEntry);
  if (effectiveServedEntry === undefined || s === undefined) return;
  let min = Math.min(
    s,
    getMinWindowWithoutOptIn(e),
    isPublishedCatalogInUse() &&
      getCanonicalName(e, {
        identity: true,
      }) === n
      ? 1 / 0
      : getMinWindowWithoutOptIn(effectiveServedEntry.id),
  );
  return {
    declared: s,
    withoutOptIn: min,
    believed: is1mContextDisabled() ? Math.min(min, DEFAULT_CONTEXT_WINDOW) : min,
  };
}
//@ chunk-aepeg2w5.js:472876-472972 placement
/**
 * 计算可信上下文窗口：取目录窗口与已知窗口中的较大者。
 */
function believedContextWindow(model, canonical, servedWindow) {
  let believed = servedWindow?.believed ?? 0;
  let h = catalogContext(canonical)?.window ?? CONTEXT_WINDOW_THRESHOLD;
  return Math.max(legacyNo1mWindow(model) ?? 0, believed > h ? believed : 0);
}
//@ chunk-aepeg2w5.js:472972-473024 placement
/**
 * 判断可信上下文窗口是否达到 1M。
 */
function isContextWindow1m(e, n) {
  return (getContextWindowInfo(e, n)?.believed ?? 0) >= 1e6;
}
//@ chunk-aepeg2w5.js:473024-473148 placement
function getNoCompactMaxContextTokens() {
  if (isEnvTruthy(process.env.DISABLE_COMPACT)) {
    let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
    if (CLAUDE_CODE_MAX_CONTEXT_TOKENS !== undefined && CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0)
      return CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  }
  return;
}
//@ chunk-aepeg2w5.js:473148-473206 placement
/**
 * 是否超出默认窗口需要 1M。
 */
function isOver1mThreshold(model, sdkBetas) {
  return (
    isLongContext1mCreditsBlocked() &&
    getNoCompactMaxContextTokens() === undefined &&
    getModelContextWindow(model, sdkBetas) > SECONDARY_CONTEXT_WINDOW
  );
}
//@ chunk-aepeg2w5.js:473206-473401 placement
function getModelContextWindow(e, n) {
  if (uses1mContext(e, n)) {
    let h = catalogContext(getCanonicalName(strip1mSuffix(e)));
    return Math.max(getBaseContextWindow(e), h?.maximum_window ?? h?.window ?? 0, MAX_CONTEXT_WINDOW_1M);
  }
  let flagContextWindow = getFlagContextWindow(e);
  if (flagContextWindow !== null) return flagContextWindow;
  let baseContextWindow = getBaseContextWindow(e);
  return getSonnet46ContextWindowOverride(e) === null
    ? Math.min(baseContextWindow, getMinWindowWithoutOptIn(e))
    : baseContextWindow;
}
//@ chunk-aepeg2w5.js:473401-473623 placement
function getBaseContextWindow(e) {
  let contextWindowInfo = getContextWindowInfo(e);
  if (contextWindowInfo !== undefined)
    return getSonnet46ContextWindowOverride(e) ?? contextWindowInfo.believed;
  let r = legacyNo1mWindow(e);
  if (r !== undefined) return r;
  let s = getSonnet46ContextWindowOverride(e);
  if (s !== null) return s;
  let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  if (
    CLAUDE_CODE_MAX_CONTEXT_TOKENS !== undefined &&
    CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0 &&
    isUnknownCustomModelSpelling(e)
  )
    return CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  return CONTEXT_WINDOW_THRESHOLD;
}
//@ chunk-aepeg2w5.js:473623-473651 placement
/**
 * 取上下文档用的客户端数据缓存。
 */
function cachedClientDataForContext() {
  return getCachedClientDataForContextWindow();
}
//@ chunk-aepeg2w5.js:473651-473743 placement
/**
 * 取自动压缩窗口缓存（仅第一方后端）。
 */
function autoCompactWindowsCache() {
  if (getAPIProvider() !== "firstParty") return null;
  return getGlobalConfig().autoCompactWindowsCache ?? null;
}
//@ chunk-aepeg2w5.js:473743-473754 layout
/**
 * 1e6。
 */
var ONE_MILLION_TOKENS = 1e6;
//@ chunk-aepeg2w5.js:473754-474021 fingerprint = CLAUDE_SONNET_4_6_CONFIG (0.301)
/**
 * claude-sonnet-4-6（非 1M 变体）时读客户端数据 kelp_forest_sonnet 作为上下文窗口覆盖（200k 到 1M 之间）。旧版名 CLAUDE_SONNET_4_6_CONFIG 为错配。
 */
function getSonnet46ContextWindowOverride(e) {
  if (is1mContextDisabled()) return null;
  if (has1mSuffix_2(e)) return null;
  if (getCanonicalName(e) !== "claude-sonnet-4-6") return null;
  if (isContextBetaRefused(e)) return null;
  let kelpForestSonnet = getCachedClientDataForContextWindow()?.kelp_forest_sonnet;
  if (typeof kelpForestSonnet !== "string") return null;
  let r = parseInt(kelpForestSonnet, 10);
  if (!Number.isFinite(r) || r <= CONTEXT_WINDOW_THRESHOLD || r > ONE_MILLION_TOKENS) return null;
  return r;
}
//@ chunk-v9tcvh08.js:27281-28064 fingerprint = ALL_MODEL_CONFIGS (0.424)
/**
 * 第一方 id 到 catalog 键（如 claude-opus-5-5 对应 opus55）。
 */
var CLAUDE_3_5_HAIKU_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.haiku35);
var CLAUDE_HAIKU_4_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.haiku45);
var CLAUDE_3_5_SONNET_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet35);
var CLAUDE_3_7_SONNET_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet37);
var CLAUDE_SONNET_4_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet40);
var CLAUDE_SONNET_4_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet45);
var CLAUDE_SONNET_4_6_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet46);
var CLAUDE_SONNET_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet5);
var CLAUDE_OPUS_4_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus40);
var CLAUDE_OPUS_4_1_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus41);
var CLAUDE_OPUS_4_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus45);
var CLAUDE_OPUS_4_6_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus46);
var CLAUDE_OPUS_4_7_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus47);
var CLAUDE_OPUS_4_8_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus48);
var CLAUDE_OPUS_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus5);
var CLAUDE_OPUS_5_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus55);
var CLAUDE_FABLE_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.fable5);
var CLAUDE_FABLE_5_1_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.fable51);
var CLAUDE_MYTHOS_5_CONFIG = {
  firstParty: "claude-mythos-5",
  bedrock: "us.anthropic.claude-mythos-5",
  vertex: "claude-mythos-5",
  foundry: "claude-mythos-5",
  anthropicAws: "claude-mythos-5",
  anthropicGoogleCloud: "claude-mythos-5",
  mantle: "anthropic.claude-mythos-5",
  gateway: "claude-mythos-5",
  eagerInputStreaming: {
    bedrock: true,
    vertex: true,
  },
};
var OPUS_FALLBACK_ORDER = ["opus55", "opus5", "opus48", "opus47", "opus46", "opus45"];
var FIRST_PARTY_MODEL_IDS = Object.values(catalogEntriesByFirstPartyId).map((e) => e.firstParty);
var MODEL_KEY_BY_FIRST_PARTY_ID = Object.fromEntries(
  Object.entries(catalogEntriesByFirstPartyId).map(([key, value]) => [value.firstParty, key]),
);
export {
  getContextWindow,
  FIRST_PARTY_MODEL_IDS,
  OPUS_FALLBACK_ORDER,
  MODEL_KEY_BY_FIRST_PARTY_ID,
  isContextWindow1m,
  getSonnet46ContextWindowOverride,
  CLAUDE_FABLE_5_CONFIG,
  CLAUDE_MYTHOS_5_CONFIG,
  CLAUDE_FABLE_5_1_CONFIG,
  isOver1mThreshold,
  cachedClientDataForContext,
  autoCompactWindowsCache,
  getContextWindowInfo,
  believedContextWindow,
  getMaxContextWindowForEntry,
};
