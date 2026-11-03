/**
 * services/api/refusalFallbackHeaders.ts
 *
 * 2.1.316 新增：备用模型相关请求头与锁定状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (14)
 * attribution: placement 14
 */
import {
  markSilentRefusalFallbackServerArmed,
  isSilentRefusalFallbackServerArmed,
  hasRefusalFallbackOccurred,
} from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { getCachedClientData } from "../../utils/config.js";
import { hasRefusalFallbackTarget } from "./refusalFallback.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { getDefaultOpusModel, getDefaultSonnetModel } from "../../utils/model/model.js";

//@ chunk-hwmsct5x.js:236067-236118 placement
var CONVOLUTE_ARCADES_FLAG = "convolute_arcades";
var X_CC_TENDER_QUILT = "x-cc-tender-quilt";
//@ chunk-hwmsct5x.js:236118-236194 placement
function markArmedFromResponse(headers, n) {
  if (headers.get(X_CC_TENDER_QUILT) !== "1") return;
  try {
    if (n()) markSilentRefusalFallbackServerArmed();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-hwmsct5x.js:236194-236235 placement
function hasTenderQuiltHeader(headers) {
  return headers?.get(X_CC_TENDER_QUILT) === "1";
}
//@ chunk-hwmsct5x.js:236235-236273 placement
/**
 * 导出函数 `hasConvoluteArcadesFlag`：返回 getCachedClientData()?.[CONVOLUTE_ARCADES_FLAG] === !0。
 */
function hasConvoluteArcadesFlag() {
  return getCachedClientData()?.[CONVOLUTE_ARCADES_FLAG] === true;
}
//@ chunk-hwmsct5x.js:236273-236391 placement
function getFallbackLatchKind() {
  if (hasConvoluteArcadesFlag()) return "convolute_arcades";
  try {
    return isSilentRefusalFallbackServerArmed() ? "tender_quilt" : "none";
  } catch (error) {
    logError(error);
    return "none";
  }
}
//@ chunk-hwmsct5x.js:236391-236428 placement
/**
 * 导出函数 `hasFallbackLatch`：返回 getFallbackLatchKind() !== "none"。
 */
function hasFallbackLatch() {
  return getFallbackLatchKind() !== "none";
}
//@ chunk-hwmsct5x.js:236428-236469 placement
var SILENT_FALLBACK_CATEGORIES = new Set(["cyber", "frontier_llm"]);
//@ chunk-hwmsct5x.js:236469-236728 placement
function resolveLatchedFallbackModel(
  e,
  { visibleRouteDeclined: n = false, apiRefusalCategory: r, responseSwapped: s = false } = {},
) {
  if (!n && hasRefusalFallbackTarget(e)) return;
  if (!hasFallbackLatch()) return;
  let h = stripAnyVersatileSuffix(e);
  if (h === stripAnyVersatileSuffix(getDefaultOpusModel())) return e;
  return h === stripAnyVersatileSuffix(getDefaultSonnetModel()) &&
    typeof r === "string" &&
    SILENT_FALLBACK_CATEGORIES.has(r) &&
    (getCachedClientData(e)?.[CONVOLUTE_ARCADES_FLAG] === true || isServerArmedSafely(s)) &&
    !hasRefusalFallbackOccurred()
    ? e
    : undefined;
}
//@ chunk-hwmsct5x.js:236728-236800 placement
function isServerArmedSafely(e) {
  if (!e) return false;
  try {
    return isSilentRefusalFallbackServerArmed();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-hwmsct5x.js:236800-236920 placement
/**
 * 判断模型是默认 Sonnet 且客户端数据未开启 arcades 标志（出错时视为 true）。
 */
function isSonnetWithoutArcades(latchedFallbackModel) {
  try {
    let n = stripAnyVersatileSuffix(latchedFallbackModel);
    if (n === stripAnyVersatileSuffix(getDefaultOpusModel())) return false;
    return (
      n === stripAnyVersatileSuffix(getDefaultSonnetModel()) &&
      getCachedClientData(latchedFallbackModel)?.[CONVOLUTE_ARCADES_FLAG] !== true
    );
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-hwmsct5x.js:236920-237100 placement
var REFUSAL_FALLBACK_HEADERS = "x-is-refusal-fallback";
var X_CC_FALLBACK_LATCHED_BY = "x-cc-fallback-latched-by";
var X_CC_FALLBACK_FROM_MODEL = "x-cc-fallback-from-model";
var X_CC_FALLBACK_CATEGORY = "x-cc-fallback-category";
var X_CC_FALLBACK_TRIGGER = "x-cc-fallback-trigger";
var X_CC_ORIGINAL_REQUEST_ID = "x-cc-original-request-id";
//@ chunk-hwmsct5x.js:237100-237204 placement
function sanitizeHeaderValue(e) {
  if (e === null || e === undefined) return;
  return /^[\x21-\x7e][\x20-\x7e]{0,254}$/.test(e) ? e : undefined;
}
//@ chunk-hwmsct5x.js:237204-237231 placement
function isSilentFallbackArmed() {
  return hasFallbackLatch();
}
//@ chunk-hwmsct5x.js:237231-237248 placement
/**
 * 静默回退请求头相关的长度上限（头值 80 / 10000）。
 */
var X_CC_TENDER_QUILT_LIMIT = 80;
var FALLBACK_HEADER_VALUE_LIMIT = 1e4;
export {
  hasFallbackLatch,
  hasConvoluteArcadesFlag,
  getFallbackLatchKind,
  X_CC_FALLBACK_FROM_MODEL,
  X_CC_FALLBACK_CATEGORY,
  X_CC_FALLBACK_TRIGGER,
  X_CC_ORIGINAL_REQUEST_ID,
  sanitizeHeaderValue,
  hasTenderQuiltHeader,
  resolveLatchedFallbackModel,
  isSonnetWithoutArcades,
  isSilentFallbackArmed,
  REFUSAL_FALLBACK_HEADERS,
  X_CC_FALLBACK_LATCHED_BY,
  markArmedFromResponse,
  X_CC_TENDER_QUILT,
  X_CC_TENDER_QUILT_LIMIT,
  FALLBACK_HEADER_VALUE_LIMIT,
};
