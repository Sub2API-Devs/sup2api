/**
 * utils/model/contextWindow1m.ts
 *
 * 2.1.316 新增：是否为不支持 1M 的旧模型；模型是否支持 1M beta等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (17)
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

//@ chunk-exfmq47h.js:482197-482251 placement (2.1.88 match: is1mContextDisabled, 1)
function is1mContextDisabled() {
  return env.CLAUDE_CODE_DISABLE_1M_CONTEXT;
}
//@ chunk-exfmq47h.js:482251-482266 placement
/**
 * 默认上下文窗口大小（200k）。
 */
var DEFAULT_CONTEXT_WINDOW = 200000;
//@ chunk-exfmq47h.js:482266-482312 placement
/**
 * 模型名是否带 [1m]（未禁用时）。
 */
function has1mSuffix_2(model) {
  if (is1mContextDisabled()) return false;
  return has1mSuffix(model);
}
//@ chunk-exfmq47h.js:482312-482352 placement
/**
 * 判断模型名是否带 [1m] 后缀。
 */
function has1mSuffix(model) {
  return /\[1m\]/i.test(model);
}
//@ chunk-exfmq47h.js:482352-482434 placement
/**
 * 判断是否应使用 1M 上下文（[1m] 后缀或 1m beta 支持，且未禁用）。
 */
function uses1mContext(model, betas) {
  return (
    (has1mSuffix_2(model) ||
      (unlessHipaa(betas)?.includes(BETA_LONG_CONTEXT.header) === true && supports1mBeta(model))) &&
    !isContextBetaRefused(model)
  );
}
//@ chunk-exfmq47h.js:482434-482577 placement
function findLegacyNo1mCanonicalName(model, byItsOwnName) {
  let options = {
    identity: byItsOwnName,
    deterministic: byItsOwnName,
  };
  let stripped = strip1mSuffix(model);
  let canonicalName = getCanonicalName(stripped, options);
  if (hasNative1mContext(canonicalName)) return canonicalName;
  if (stripped === model) return;
  let canonicalName_2 = getCanonicalName(model, options);
  if (hasNative1mContext(canonicalName_2)) return canonicalName_2;
  return;
}
//@ chunk-exfmq47h.js:482577-482610 placement
var MYTHOS_PREVIEW_CONTEXT = {
  window: 1e6,
  native_1m: true,
};
//@ chunk-exfmq47h.js:482610-482670 placement
/**
 * 取模型在目录中的上下文信息。
 */
function catalogContext(model) {
  let stripped = strip1mSuffix(model);
  return stripped === CLAUDE_MYTHOS_PREVIEW ? MYTHOS_PREVIEW_CONTEXT : getCatalogEntry(stripped)?.context;
}
//@ chunk-exfmq47h.js:482670-482730 placement
function hasNative1mContext(model) {
  return catalogContext(model)?.native_1m === true || catalogNative1mWindow(model) !== undefined;
}
//@ chunk-exfmq47h.js:482730-482809 placement
function catalogNative1mWindow(model) {
  let stripped = strip1mSuffix(model);
  return isThirdPartyBackend(getAPIProvider()) &&
    matchesCatalogList(CATALOG_CAPABILITY_NAMES_2, stripped) === true &&
    anyModelDescribed(stripped)
    ? servedMaxInputTokens(stripped)
    : undefined;
}
//@ chunk-exfmq47h.js:482809-482882 placement
/**
 * 判断压缩是否被禁用或模型是未知自定义拼写。
 */
function isCompactDisabledOrCustom(model) {
  if (isEnvTruthy(process.env.DISABLE_COMPACT)) return true;
  return isUnknownCustomModelSpelling(model);
}
//@ chunk-exfmq47h.js:482882-483026 placement (2.1.88 match: modelMatchesVersionPrefix, 1)
/**
 * 解析后不是已知模型、且规范化与原拼写不一致或非 claude- 前缀（自定义拼写）。
 */
function isUnknownCustomModelSpelling(model) {
  let userSpecifiedModel = parseUserSpecifiedModel(model);
  let stripped = stripAnyVersatileSuffix(userSpecifiedModel);
  let canonicalName = getCanonicalName(stripped);
  if (
    isRecognizedCanonical(canonicalName) ||
    (stripped !== userSpecifiedModel && isRecognizedCanonical(getCanonicalName(userSpecifiedModel)))
  )
    return false;
  let normalized = normalizeDottedVersion(stripped.toLowerCase());
  return !normalized.startsWith("claude-") || normalized !== canonicalName;
}
//@ chunk-exfmq47h.js:483026-483088 placement
function modelHasNative1MContext(model, { byItsOwnName = false } = {}) {
  return legacyNo1mWindow(model, byItsOwnName) !== undefined;
}
//@ chunk-exfmq47h.js:483088-483186 placement
/**
 * 取旧版不支持 1M 的模型应有的上下文窗口。
 */
function legacyNo1mWindow(model, byItsOwnName = false) {
  if (is1mContextDisabled()) return;
  let model_2 = findLegacyNo1mCanonicalName(model, byItsOwnName);
  if (model_2 === undefined) return;
  return catalogContext(model_2)?.window ?? catalogNative1mWindow(model_2);
}
//@ chunk-exfmq47h.js:483186-483326 placement
/**
 * 是否为不支持 1M 的旧模型。
 */
function isLegacyNo1mModel(modelName) {
  return (
    modelName.includes("claude-3-") ||
    modelName === "claude-opus-4-0" ||
    modelName === "claude-opus-4-1" ||
    modelName === "claude-opus-4-5" ||
    modelName === "claude-haiku-4-5"
  );
}
//@ chunk-exfmq47h.js:483326-483459 placement
/**
 * 模型是否支持 1M beta。
 */
function supports1mBeta(model, canonicalName = getCanonicalName(model)) {
  if (is1mContextDisabled()) return false;
  if (isLegacyNo1mModel(canonicalName)) return false;
  if (catalogContext(canonicalName)?.supports_1m_beta) return true;
  if (anyModelDescribed(model, canonicalName)) return false;
  return hasFirstPartyCapabilities(getProviderForModel(model));
}
//@ chunk-exfmq47h.js:483459-483668 placement
/**
 * 判断模型的 1M 上下文支持：never、native 或 optIn。
 */
function get1mContextSupport(model) {
  if (is1mContextDisabled()) return "never";
  let canonicalName = getCanonicalName(model);
  let servedMax = servedMaxInputTokens(model, canonicalName);
  if (servedMax !== undefined && servedMax < 1e6) return "never";
  if (modelHasNative1MContext(model)) return "native";
  let renamed =
    getCanonicalName(model, {
      identity: true,
    }) !== canonicalName;
  if (servedMax !== undefined && renamed) return "optIn";
  return supports1mBeta(model) ? "optIn" : "never";
}
export {
  has1mSuffix_2,
  modelHasNative1MContext,
  uses1mContext,
  has1mSuffix,
  isLegacyNo1mModel,
  supports1mBeta,
  catalogContext,
  is1mContextDisabled,
  DEFAULT_CONTEXT_WINDOW,
  legacyNo1mWindow,
  isUnknownCustomModelSpelling,
  isCompactDisabledOrCustom,
  get1mContextSupport,
};
