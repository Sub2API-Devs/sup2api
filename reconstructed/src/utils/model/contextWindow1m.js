/**
 * utils/model/contextWindow1m.ts
 *
 * 2.1.316 新增：是否为不支持 1M 的旧模型；模型是否支持 1M beta等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (17)
 * attribution: placement 17
 */
import { env } from "../env.js";
import { unlessHipaa, BETA_LONG_CONTEXT, isContextBetaRefused } from "../betas.js";
import {
  strip1mSuffix,
  CLAUDE_MYTHOS_PREVIEW,
  stripAnyVersatileSuffix,
  normalizeDottedVersion,
} from "./modelIds.js";
import { getCanonicalName, isRecognizedCanonical } from "./canonicalModelName.js";
import { getCatalogEntry } from "./modelCatalog.js";
import {
  isThirdPartyBackend,
  CATALOG_CAPABILITY_NAMES_2,
  anyModelDescribed,
} from "./modelCatalog/catalogCapabilities.js";
import { getAPIProvider, hasFirstPartyCapabilities, getProviderForModel } from "./providers.js";
import { matchesCatalogList, servedMaxInputTokens } from "./modelCatalog/servedCatalog.js";
import { isEnvTruthy } from "../envUtils.js";
import { parseUserSpecifiedModel } from "./modelDisplay.js";

//@ chunk-aepeg2w5.js:470799-470853 placement = is1mContextDisabled (1)
function is1mContextDisabled() {
  return env.CLAUDE_CODE_DISABLE_1M_CONTEXT;
}
//@ chunk-aepeg2w5.js:470853-470868 placement
/**
 * 默认上下文窗口大小（200k）。
 */
var DEFAULT_CONTEXT_WINDOW = 200000;
//@ chunk-aepeg2w5.js:470868-470914 placement
/**
 * 模型名是否带 [1m]（未禁用时）。
 */
function has1mSuffix_2(e) {
  if (is1mContextDisabled()) return false;
  return has1mSuffix(e);
}
//@ chunk-aepeg2w5.js:470914-470954 placement
/**
 * 判断模型名是否带 [1m] 后缀。
 */
function has1mSuffix(e) {
  return /\[1m\]/i.test(e);
}
//@ chunk-aepeg2w5.js:470954-471036 placement
/**
 * 判断是否应使用 1M 上下文（[1m] 后缀或 1m beta 支持，且未禁用）。
 */
function uses1mContext(e, n) {
  return (
    (has1mSuffix_2(e) ||
      (unlessHipaa(n)?.includes(BETA_LONG_CONTEXT.header) === true && supports1mBeta(e))) &&
    !isContextBetaRefused(e)
  );
}
//@ chunk-aepeg2w5.js:471036-471179 placement
function findLegacyNo1mCanonicalName(e, n) {
  let r = {
    identity: n,
    deterministic: n,
  };
  let s = strip1mSuffix(e);
  let canonicalName = getCanonicalName(s, r);
  if (hasNative1mContext(canonicalName)) return canonicalName;
  if (s === e) return;
  let canonicalName_2 = getCanonicalName(e, r);
  if (hasNative1mContext(canonicalName_2)) return canonicalName_2;
  return;
}
//@ chunk-aepeg2w5.js:471179-471212 placement
var MYTHOS_PREVIEW_CONTEXT = {
  window: 1e6,
  native_1m: true,
};
//@ chunk-aepeg2w5.js:471212-471272 placement
/**
 * 取模型在目录中的上下文信息。
 */
function catalogContext(e) {
  let n = strip1mSuffix(e);
  return n === CLAUDE_MYTHOS_PREVIEW ? MYTHOS_PREVIEW_CONTEXT : getCatalogEntry(n)?.context;
}
//@ chunk-aepeg2w5.js:471272-471332 placement
function hasNative1mContext(canonicalName) {
  return (
    catalogContext(canonicalName)?.native_1m === true || catalogNative1mWindow(canonicalName) !== undefined
  );
}
//@ chunk-aepeg2w5.js:471332-471411 placement
function catalogNative1mWindow(e) {
  let n = strip1mSuffix(e);
  return isThirdPartyBackend(getAPIProvider()) &&
    matchesCatalogList(CATALOG_CAPABILITY_NAMES_2, n) === true &&
    anyModelDescribed(n)
    ? servedMaxInputTokens(n)
    : undefined;
}
//@ chunk-aepeg2w5.js:471411-471484 placement
/**
 * 判断压缩是否被禁用或模型是未知自定义拼写。
 */
function isCompactDisabledOrCustom(e) {
  if (isEnvTruthy(process.env.DISABLE_COMPACT)) return true;
  return isUnknownCustomModelSpelling(e);
}
//@ chunk-aepeg2w5.js:471484-471628 placement = modelMatchesVersionPrefix (1)
/**
 * 解析后不是已知模型、且规范化与原拼写不一致或非 claude- 前缀（自定义拼写）。
 */
function isUnknownCustomModelSpelling(e) {
  let userSpecifiedModel = parseUserSpecifiedModel(e);
  let r = stripAnyVersatileSuffix(userSpecifiedModel);
  let canonicalName = getCanonicalName(r);
  if (
    isRecognizedCanonical(canonicalName) ||
    (r !== userSpecifiedModel && isRecognizedCanonical(getCanonicalName(userSpecifiedModel)))
  )
    return false;
  let h = normalizeDottedVersion(r.toLowerCase());
  return !h.startsWith("claude-") || h !== canonicalName;
}
//@ chunk-aepeg2w5.js:471628-471690 placement
function modelHasNative1MContext(e, { byItsOwnName: n = false } = {}) {
  return legacyNo1mWindow(e, n) !== undefined;
}
//@ chunk-aepeg2w5.js:471690-471788 placement
/**
 * 取旧版不支持 1M 的模型应有的上下文窗口。
 */
function legacyNo1mWindow(e, n = false) {
  if (is1mContextDisabled()) return;
  let legacyNo1mCanonicalName = findLegacyNo1mCanonicalName(e, n);
  if (legacyNo1mCanonicalName === undefined) return;
  return catalogContext(legacyNo1mCanonicalName)?.window ?? catalogNative1mWindow(legacyNo1mCanonicalName);
}
//@ chunk-aepeg2w5.js:471788-471928 placement
/**
 * 是否为不支持 1M 的旧模型。
 */
function isLegacyNo1mModel(canonicalName) {
  return (
    canonicalName.includes("claude-3-") ||
    canonicalName === "claude-opus-4-0" ||
    canonicalName === "claude-opus-4-1" ||
    canonicalName === "claude-opus-4-5" ||
    canonicalName === "claude-haiku-4-5"
  );
}
//@ chunk-aepeg2w5.js:471928-472061 placement
/**
 * 模型是否支持 1M beta。
 */
function supports1mBeta(e, canonicalName = getCanonicalName(e)) {
  if (is1mContextDisabled()) return false;
  if (isLegacyNo1mModel(canonicalName)) return false;
  if (catalogContext(canonicalName)?.supports_1m_beta) return true;
  if (anyModelDescribed(e, canonicalName)) return false;
  return hasFirstPartyCapabilities(getProviderForModel(e));
}
//@ chunk-aepeg2w5.js:472061-472270 placement
/**
 * 判断模型的 1M 上下文支持：never、native 或 optIn。
 */
function get1mContextSupport(e) {
  if (is1mContextDisabled()) return "never";
  let canonicalName = getCanonicalName(e);
  let r = servedMaxInputTokens(e, canonicalName);
  if (r !== undefined && r < 1e6) return "never";
  if (modelHasNative1MContext(e)) return "native";
  let s =
    getCanonicalName(e, {
      identity: true,
    }) !== canonicalName;
  if (r !== undefined && s) return "optIn";
  return supports1mBeta(e) ? "optIn" : "never";
}
export {
  has1mSuffix_2,
  supports1mBeta,
  modelHasNative1MContext,
  has1mSuffix,
  is1mContextDisabled,
  isLegacyNo1mModel,
  uses1mContext,
  DEFAULT_CONTEXT_WINDOW,
  get1mContextSupport,
  catalogContext,
  legacyNo1mWindow,
  isUnknownCustomModelSpelling,
  isCompactDisabledOrCustom,
};
