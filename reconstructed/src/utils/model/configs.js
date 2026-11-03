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
import { CK, rlt, zG, getFlagContextWindow } from "./model.js";
import { Lt } from "./modelIds.js";
import { getCanonicalName } from "./canonicalModelName.js";
import {
  Fr,
  is1mContextDisabled,
  Qxt,
  um,
  kmr,
  isUnknownCustomModelSpelling,
  has1mSuffix,
} from "./contextWindow1m.js";
import { UUe, Nc, isPublishedCatalogInUse } from "./modelCatalog/servedCatalog.js";
import { isEnvTruthy } from "../envUtils.js";
import { env } from "../env.js";
import { isLongContext1mCreditsBlocked } from "../../bootstrap/state.js";
import { getCachedClientDataForContextWindow, getGlobalConfig } from "../config.js";
import { getAPIProvider } from "./providers.js";
import { vo } from "../betas.js";
import { PROVIDER_KEYS, No } from "./modelCatalog.js";

/**
 * 模型的上下文窗口（覆盖、1M）。
 */
//@ chunk-aepeg2w5.js:472270-472358 placement
function getContextWindow(e, n) {
  let r = getNoCompactMaxContextTokens();
  if (r !== void 0) return r;
  if (isOver1mThreshold(e, n)) return CK;
  return getModelContextWindow(e, n);
}
//@ chunk-aepeg2w5.js:472358-472534 placement
function getMinWindowWithoutOptIn(e) {
  let n = Lt(e);
  return Math.min(
    ...[getCanonicalName(n, { identity: !0 }), getCanonicalName(n, { identity: !0, overridesMap: {} })].map(
      (r) => {
        let s = Fr(r);
        return s?.maximum_window === void 0 ? 1 / 0 : s.window;
      },
    ),
  );
}
/**
 * 返回目录条目允许的最大上下文窗口（需 beta 才能长上下文的取基础窗口）。
 */
//@ chunk-aepeg2w5.js:472534-472662 placement
function getMaxContextWindowForEntry(e) {
  let n = Fr(e);
  if (n === void 0) return 0;
  return n.clamp_long_context_without_beta ? n.window : (n.maximum_window ?? n.window);
}
/**
 * 计算模型的上下文窗口信息：声明值、无需选用时的值与实际采信值（受 1M 禁用影响）。
 */
//@ chunk-aepeg2w5.js:472662-472876 placement
function getContextWindowInfo(e, n = getCanonicalName(e)) {
  let r = UUe(e, n),
    s = Nc(r);
  if (r === void 0 || s === void 0) return;
  let min = Math.min(
    s,
    getMinWindowWithoutOptIn(e),
    isPublishedCatalogInUse() && getCanonicalName(e, { identity: !0 }) === n
      ? 1 / 0
      : getMinWindowWithoutOptIn(r.id),
  );
  return { declared: s, withoutOptIn: min, believed: is1mContextDisabled() ? Math.min(min, Qxt) : min };
}
//@ chunk-aepeg2w5.js:472876-472972 placement
function cvi(e, n, r) {
  let s = r?.believed ?? 0,
    h = Fr(n)?.window ?? rlt;
  return Math.max(um(e) ?? 0, s > h ? s : 0);
}
//@ chunk-aepeg2w5.js:472972-473024 placement
function Bp(e, n) {
  return (getContextWindowInfo(e, n)?.believed ?? 0) >= 1e6;
}
//@ chunk-aepeg2w5.js:473024-473148 placement
function getNoCompactMaxContextTokens() {
  if (isEnvTruthy(process.env.DISABLE_COMPACT)) {
    let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
    if (CLAUDE_CODE_MAX_CONTEXT_TOKENS !== void 0 && CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0)
      return CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  }
  return;
}
/**
 * 是否超出默认窗口需要 1M。
 */
//@ chunk-aepeg2w5.js:473148-473206 placement
function isOver1mThreshold(e, n) {
  return (
    isLongContext1mCreditsBlocked() &&
    getNoCompactMaxContextTokens() === void 0 &&
    getModelContextWindow(e, n) > CK
  );
}
//@ chunk-aepeg2w5.js:473206-473401 placement
function getModelContextWindow(e, n) {
  if (kmr(e, n)) {
    let h = Fr(getCanonicalName(Lt(e)));
    return Math.max(getBaseContextWindow(e), h?.maximum_window ?? h?.window ?? 0, zG);
  }
  let r = getFlagContextWindow(e);
  if (r !== null) return r;
  let s = getBaseContextWindow(e);
  return getSonnet46ContextWindowOverride(e) === null ? Math.min(s, getMinWindowWithoutOptIn(e)) : s;
}
//@ chunk-aepeg2w5.js:473401-473623 placement
function getBaseContextWindow(e) {
  let n = getContextWindowInfo(e);
  if (n !== void 0) return getSonnet46ContextWindowOverride(e) ?? n.believed;
  let r = um(e);
  if (r !== void 0) return r;
  let s = getSonnet46ContextWindowOverride(e);
  if (s !== null) return s;
  let CLAUDE_CODE_MAX_CONTEXT_TOKENS = env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  if (
    CLAUDE_CODE_MAX_CONTEXT_TOKENS !== void 0 &&
    CLAUDE_CODE_MAX_CONTEXT_TOKENS > 0 &&
    isUnknownCustomModelSpelling(e)
  )
    return CLAUDE_CODE_MAX_CONTEXT_TOKENS;
  return rlt;
}
//@ chunk-aepeg2w5.js:473623-473651 placement
function uvi() {
  return getCachedClientDataForContextWindow();
}
//@ chunk-aepeg2w5.js:473651-473743 placement
function fvi() {
  if (getAPIProvider() !== "firstParty") return null;
  return getGlobalConfig().autoCompactWindowsCache ?? null;
}
/**
 * 1e6。
 */
//@ chunk-aepeg2w5.js:473743-473754 layout
var ONE_MILLION_TOKENS = 1e6;
/**
 * claude-sonnet-4-6（非 1M 变体）时读客户端数据 kelp_forest_sonnet 作为上下文窗口覆盖（200k 到 1M 之间）。旧版名 CLAUDE_SONNET_4_6_CONFIG 为错配。
 */
//@ chunk-aepeg2w5.js:473754-474021 fingerprint = CLAUDE_SONNET_4_6_CONFIG (0.301)
function getSonnet46ContextWindowOverride(e) {
  if (is1mContextDisabled()) return null;
  if (has1mSuffix(e)) return null;
  if (getCanonicalName(e) !== "claude-sonnet-4-6") return null;
  if (vo(e)) return null;
  let n = getCachedClientDataForContextWindow()?.kelp_forest_sonnet;
  if (typeof n !== "string") return null;
  let r = parseInt(n, 10);
  if (!Number.isFinite(r) || r <= rlt || r > ONE_MILLION_TOKENS) return null;
  return r;
}
/**
 * 第一方 id 到 catalog 键（如 claude-opus-5-5 对应 opus55）。
 */
//@ chunk-v9tcvh08.js:27281-28064 fingerprint = ALL_MODEL_CONFIGS (0.424)
var CLAUDE_3_5_HAIKU_CONFIG = PROVIDER_KEYS(No.haiku35),
  CLAUDE_HAIKU_4_5_CONFIG = PROVIDER_KEYS(No.haiku45),
  CLAUDE_3_5_SONNET_CONFIG = PROVIDER_KEYS(No.sonnet35),
  CLAUDE_3_7_SONNET_CONFIG = PROVIDER_KEYS(No.sonnet37),
  CLAUDE_SONNET_4_CONFIG = PROVIDER_KEYS(No.sonnet40),
  CLAUDE_SONNET_4_5_CONFIG = PROVIDER_KEYS(No.sonnet45),
  CLAUDE_SONNET_4_6_CONFIG = PROVIDER_KEYS(No.sonnet46),
  CLAUDE_SONNET_5_CONFIG = PROVIDER_KEYS(No.sonnet5),
  CLAUDE_OPUS_4_CONFIG = PROVIDER_KEYS(No.opus40),
  CLAUDE_OPUS_4_1_CONFIG = PROVIDER_KEYS(No.opus41),
  CLAUDE_OPUS_4_5_CONFIG = PROVIDER_KEYS(No.opus45),
  CLAUDE_OPUS_4_6_CONFIG = PROVIDER_KEYS(No.opus46),
  CLAUDE_OPUS_4_7_CONFIG = PROVIDER_KEYS(No.opus47),
  CLAUDE_OPUS_4_8_CONFIG = PROVIDER_KEYS(No.opus48),
  CLAUDE_OPUS_5_CONFIG = PROVIDER_KEYS(No.opus5),
  CLAUDE_OPUS_5_5_CONFIG = PROVIDER_KEYS(No.opus55),
  CLAUDE_FABLE_5_CONFIG = PROVIDER_KEYS(No.fable5),
  CLAUDE_FABLE_5_1_CONFIG = PROVIDER_KEYS(No.fable51),
  CLAUDE_MYTHOS_5_CONFIG = {
    firstParty: "claude-mythos-5",
    bedrock: "us.anthropic.claude-mythos-5",
    vertex: "claude-mythos-5",
    foundry: "claude-mythos-5",
    anthropicAws: "claude-mythos-5",
    anthropicGoogleCloud: "claude-mythos-5",
    mantle: "anthropic.claude-mythos-5",
    gateway: "claude-mythos-5",
    eagerInputStreaming: { bedrock: !0, vertex: !0 },
  },
  OPUS_FALLBACK_ORDER = ["opus55", "opus5", "opus48", "opus47", "opus46", "opus45"],
  FIRST_PARTY_MODEL_IDS = Object.values(No).map((e) => e.firstParty),
  MODEL_KEY_BY_FIRST_PARTY_ID = Object.fromEntries(Object.entries(No).map(([e, t]) => [t.firstParty, e]));

export {
  getContextWindow,
  FIRST_PARTY_MODEL_IDS,
  OPUS_FALLBACK_ORDER,
  MODEL_KEY_BY_FIRST_PARTY_ID,
  Bp,
  getSonnet46ContextWindowOverride,
  CLAUDE_FABLE_5_CONFIG,
  CLAUDE_MYTHOS_5_CONFIG,
  CLAUDE_FABLE_5_1_CONFIG,
  isOver1mThreshold,
  uvi,
  fvi,
  getContextWindowInfo,
  cvi,
  getMaxContextWindowForEntry,
};
