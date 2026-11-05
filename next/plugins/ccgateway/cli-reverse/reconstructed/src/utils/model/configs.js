/**
 * utils/model/configs.ts
 *
 * 模型配置：由内置 model-catalog（chunk-v9tcvh08 的 uio）生成每个模型在各提供商（firstParty/bedrock/vertex/foundry/anthropicAws/anthropicGoogleCloud/mantle/gateway）的 id 表，以及 1M 上下文、图片尺寸等常量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/configs.ts
 * pieces: chunk-5m8x0kb6.js (1), chunk-exfmq47h.js (14)
 * attribution: fingerprint 2, placement 12, layout 1
 */
import { PROVIDER_KEYS, catalogEntriesByFirstPartyId } from "./modelCatalog.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5m8x0kb6.js:27315-28099 fingerprint (2.1.88 match: ALL_MODEL_CONFIGS, 0.424)
/**
 * 按模型代号的模型配置表（haiku35 … sonnet46/5、opus40 … 5.5、fable5/5.1 等，外加 mythos 的多提供者 id）。
 */
var MODEL_CONFIGS; // deferred: uses PROVIDER_KEYS (./modelCatalog.js) of its import cycle while loading; runs once the cycle is complete
var CLAUDE_HAIKU_4_5_CONFIG;
var CLAUDE_3_5_SONNET_CONFIG;
var CLAUDE_3_7_SONNET_CONFIG;
var CLAUDE_SONNET_4_CONFIG;
var CLAUDE_SONNET_4_5_CONFIG;
var CLAUDE_SONNET_4_6_CONFIG;
var CLAUDE_SONNET_5_CONFIG;
var CLAUDE_OPUS_4_CONFIG;
var CLAUDE_OPUS_4_1_CONFIG;
var CLAUDE_OPUS_4_5_CONFIG;
var CLAUDE_OPUS_4_6_CONFIG;
var CLAUDE_OPUS_4_7_CONFIG;
var CLAUDE_OPUS_4_8_CONFIG;
var CLAUDE_OPUS_5_CONFIG;
var CLAUDE_OPUS_5_5_CONFIG;
var CLAUDE_FABLE_5_CONFIG;
var CLAUDE_FABLE_5_1_CONFIG;
var CLAUDE_MYTHOS_5_CONFIG;
var OPUS_FALLBACK_ORDER;
var FIRST_PARTY_MODEL_IDS;
var MODEL_KEY_BY_FIRST_PARTY_ID;
deferInit("chunk-5m8x0kb6.js:27315", () => {
  MODEL_CONFIGS = PROVIDER_KEYS(catalogEntriesByFirstPartyId.haiku35);
  CLAUDE_HAIKU_4_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.haiku45);
  CLAUDE_3_5_SONNET_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet35);
  CLAUDE_3_7_SONNET_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet37);
  CLAUDE_SONNET_4_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet40);
  CLAUDE_SONNET_4_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet45);
  CLAUDE_SONNET_4_6_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet46);
  CLAUDE_SONNET_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.sonnet5);
  CLAUDE_OPUS_4_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus40);
  CLAUDE_OPUS_4_1_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus41);
  CLAUDE_OPUS_4_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus45);
  CLAUDE_OPUS_4_6_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus46);
  CLAUDE_OPUS_4_7_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus47);
  CLAUDE_OPUS_4_8_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus48);
  CLAUDE_OPUS_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus5);
  CLAUDE_OPUS_5_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.opus55);
  CLAUDE_FABLE_5_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.fable5);
  CLAUDE_FABLE_5_1_CONFIG = PROVIDER_KEYS(catalogEntriesByFirstPartyId.fable51);
  CLAUDE_MYTHOS_5_CONFIG = {
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
  OPUS_FALLBACK_ORDER = ["opus55", "opus5", "opus48", "opus47", "opus46", "opus45"];
  FIRST_PARTY_MODEL_IDS = Object.values(catalogEntriesByFirstPartyId).map((entry) => entry.firstParty);
  MODEL_KEY_BY_FIRST_PARTY_ID = Object.fromEntries(
    Object.entries(catalogEntriesByFirstPartyId).map(([key, value]) => [value.firstParty, key]),
  );
});
//@ chunk-exfmq47h.js:483668-483756 placement
/**
 * 模型的上下文窗口（覆盖、1M）。
 */
function getContextWindow(model, betas) {
  let noCompactMaxContextTokens = getNoCompactMaxContextTokens();
  if (noCompactMaxContextTokens !== undefined) return noCompactMaxContextTokens;
  if (isOver1mThreshold(model, betas)) return SECONDARY_CONTEXT_WINDOW;
  return getModelContextWindow(model, betas);
}
//@ chunk-exfmq47h.js:483756-483932 placement
function getMinWindowWithoutOptIn(model) {
  let stripped = strip1mSuffix(model);
  return Math.min(
    ...[
      getCanonicalName(stripped, {
        identity: true,
      }),
      getCanonicalName(stripped, {
        identity: true,
        overridesMap: {},
      }),
    ].map((canonical) => {
      let context = catalogContext(canonical);
      return context?.maximum_window === undefined ? 1 / 0 : context.window;
    }),
  );
}
//@ chunk-exfmq47h.js:483932-484060 placement
/**
 * 返回目录条目允许的最大上下文窗口（需 beta 才能长上下文的取基础窗口）。
 */
function getMaxContextWindowForEntry(entry) {
  let context = catalogContext(entry);
  if (context === undefined) return 0;
  return context.clamp_long_context_without_beta
    ? context.window
    : (context.maximum_window ?? context.window);
}
//@ chunk-exfmq47h.js:484060-484274 placement
/**
 * 计算模型的上下文窗口信息：声明值、无需选用时的值与实际采信值（受 1M 禁用影响）。
 */
function getContextWindowInfo(model, canonical = getCanonicalName(model)) {
  let effectiveServedEntry = findEffectiveServedEntry(model, canonical);
  let declared = clampInputTokens(effectiveServedEntry);
  if (effectiveServedEntry === undefined || declared === undefined) return;
  let min = Math.min(
    declared,
    getMinWindowWithoutOptIn(model),
    isPublishedCatalogInUse() &&
      getCanonicalName(model, {
        identity: true,
      }) === canonical
      ? 1 / 0
      : getMinWindowWithoutOptIn(effectiveServedEntry.id),
  );
  return {
    declared,
    withoutOptIn: min,
    believed: is1mContextDisabled() ? Math.min(min, DEFAULT_CONTEXT_WINDOW) : min,
  };
}
//@ chunk-exfmq47h.js:484274-484370 placement
/**
 * 计算可信上下文窗口：取目录窗口与已知窗口中的较大者。
 */
function believedContextWindow(model, canonical, servedWindow) {
  let believed = servedWindow?.believed ?? 0;
  let catalogWindow = catalogContext(canonical)?.window ?? CONTEXT_WINDOW_THRESHOLD;
  return Math.max(legacyNo1mWindow(model) ?? 0, believed > catalogWindow ? believed : 0);
}
//@ chunk-exfmq47h.js:484370-484422 placement
/**
 * 判断可信上下文窗口是否达到 1M。
 */
function isContextWindow1m(model, canonical) {
  return (getContextWindowInfo(model, canonical)?.believed ?? 0) >= 1e6;
}
//@ chunk-exfmq47h.js:484422-484546 placement
function getNoCompactMaxContextTokens() {
  if (isEnvTruthy(process.env.DISABLE_COMPACT)) {
    let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
    if (CLAUDE_CODE_MAX_CONTEXT_TOKENS !== undefined && CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0)
      return CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  }
  return;
}
//@ chunk-exfmq47h.js:484546-484604 placement
/**
 * 是否超出默认窗口需要 1M。
 */
function isOver1mThreshold(model, betas) {
  return (
    isLongContext1mCreditsBlocked() &&
    getNoCompactMaxContextTokens() === undefined &&
    getModelContextWindow(model, betas) > SECONDARY_CONTEXT_WINDOW
  );
}
//@ chunk-exfmq47h.js:484604-484799 placement
function getModelContextWindow(model, betas) {
  if (uses1mContext(model, betas)) {
    let context = catalogContext(getCanonicalName(strip1mSuffix(model)));
    return Math.max(
      getBaseContextWindow(model),
      context?.maximum_window ?? context?.window ?? 0,
      MAX_CONTEXT_WINDOW_1M,
    );
  }
  let flagContextWindow = getFlagContextWindow(model);
  if (flagContextWindow !== null) return flagContextWindow;
  let baseContextWindow = getBaseContextWindow(model);
  return getSonnet46ContextWindowOverride(model) === null
    ? Math.min(baseContextWindow, getMinWindowWithoutOptIn(model))
    : baseContextWindow;
}
//@ chunk-exfmq47h.js:484799-485021 placement
function getBaseContextWindow(model) {
  let contextWindowInfo = getContextWindowInfo(model);
  if (contextWindowInfo !== undefined)
    return getSonnet46ContextWindowOverride(model) ?? contextWindowInfo.believed;
  let legacyWindow = legacyNo1mWindow(model);
  if (legacyWindow !== undefined) return legacyWindow;
  let overrideWindow = getSonnet46ContextWindowOverride(model);
  if (overrideWindow !== null) return overrideWindow;
  let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  if (
    CLAUDE_CODE_MAX_CONTEXT_TOKENS !== undefined &&
    CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0 &&
    isUnknownCustomModelSpelling(model)
  )
    return CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  return CONTEXT_WINDOW_THRESHOLD;
}
//@ chunk-exfmq47h.js:485021-485049 placement
/**
 * 取上下文档用的客户端数据缓存。
 */
function cachedClientDataForContext() {
  return getCachedClientDataForContextWindow();
}
//@ chunk-exfmq47h.js:485049-485141 placement
/**
 * 取自动压缩窗口缓存（仅第一方后端）。
 */
function autoCompactWindowsCache() {
  if (getAPIProvider() !== "firstParty") return null;
  return getGlobalConfig().autoCompactWindowsCache ?? null;
}
//@ chunk-exfmq47h.js:485141-485152 layout
/**
 * 1e6。
 */
var ONE_MILLION_TOKENS = 1e6;
//@ chunk-exfmq47h.js:485152-485419 fingerprint (2.1.88 match: CLAUDE_SONNET_4_6_CONFIG, 0.318)
/**
 * claude-sonnet-4-6（非 1M 变体）时读客户端数据 kelp_forest_sonnet 作为上下文窗口覆盖（200k 到 1M 之间）。旧版名 CLAUDE_SONNET_4_6_CONFIG 为错配。
 */
function getSonnet46ContextWindowOverride(model) {
  if (is1mContextDisabled()) return null;
  if (has1mSuffix_2(model)) return null;
  if (getCanonicalName(model) !== "claude-sonnet-4-6") return null;
  if (isContextBetaRefused(model)) return null;
  let kelpForestSonnet = getCachedClientDataForContextWindow()?.kelp_forest_sonnet;
  if (typeof kelpForestSonnet !== "string") return null;
  let kelpForestFlag = parseInt(kelpForestSonnet, 10);
  if (
    !Number.isFinite(kelpForestFlag) ||
    kelpForestFlag <= CONTEXT_WINDOW_THRESHOLD ||
    kelpForestFlag > ONE_MILLION_TOKENS
  )
    return null;
  return kelpForestFlag;
}
export {
  getContextWindow,
  getSonnet46ContextWindowOverride,
  CLAUDE_FABLE_5_CONFIG,
  MODEL_KEY_BY_FIRST_PARTY_ID,
  CLAUDE_OPUS_5_5_CONFIG,
  FIRST_PARTY_MODEL_IDS,
  isOver1mThreshold,
  cachedClientDataForContext,
  autoCompactWindowsCache,
  getContextWindowInfo,
  believedContextWindow,
  getMaxContextWindowForEntry,
  OPUS_FALLBACK_ORDER,
  isContextWindow1m,
  CLAUDE_FABLE_5_1_CONFIG,
  CLAUDE_MYTHOS_5_CONFIG,
};
