/**
 * services/api/refusalFallbackHeaders.ts
 *
 * 2.1.316 新增：备用模型相关请求头与锁定状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (14)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:239620-239671 placement
var CONVOLUTE_ARCADES_FLAG = "convolute_arcades";
var X_CC_TENDER_QUILT = "x-cc-tender-quilt";
//@ chunk-vn3g7zt8.js:239671-239747 placement
function markArmedFromResponse(headers, responseHeaders) {
  if (headers.get(X_CC_TENDER_QUILT) !== "1") return;
  try {
    if (responseHeaders()) markSilentRefusalFallbackServerArmed();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-vn3g7zt8.js:239747-239788 placement
function hasTenderQuiltHeader(headers) {
  return headers?.get(X_CC_TENDER_QUILT) === "1";
}
//@ chunk-vn3g7zt8.js:239788-239826 placement
/**
 * 导出函数 `hasConvoluteArcadesFlag`：返回 getCachedClientData()?.[CONVOLUTE_ARCADES_FLAG] === !0。
 */
function hasConvoluteArcadesFlag() {
  return getCachedClientData()?.[CONVOLUTE_ARCADES_FLAG] === true;
}
//@ chunk-vn3g7zt8.js:239826-239944 placement
function getFallbackLatchKind() {
  if (hasConvoluteArcadesFlag()) return "convolute_arcades";
  try {
    return isSilentRefusalFallbackServerArmed() ? "tender_quilt" : "none";
  } catch (error) {
    logError(error);
    return "none";
  }
}
//@ chunk-vn3g7zt8.js:239944-239981 placement
/**
 * 导出函数 `hasFallbackLatch`：返回 getFallbackLatchKind() !== "none"。
 */
function hasFallbackLatch() {
  return getFallbackLatchKind() !== "none";
}
//@ chunk-vn3g7zt8.js:239981-240022 placement
var SILENT_FALLBACK_CATEGORIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vn3g7zt8.js:239981", () => {
  SILENT_FALLBACK_CATEGORIES = new Set(["cyber", "frontier_llm"]);
});
//@ chunk-vn3g7zt8.js:240022-240281 placement
function resolveLatchedFallbackModel(
  model,
  {
    visibleRouteDeclined: routeDeclinedVisible = false,
    apiRefusalCategory: category,
    responseSwapped = false,
  } = {},
) {
  if (!routeDeclinedVisible && hasRefusalFallbackTarget(model)) return;
  if (!hasFallbackLatch()) return;
  let stripped = stripAnyVersatileSuffix(model);
  if (stripped === stripAnyVersatileSuffix(getDefaultOpusModel())) return model;
  return stripped === stripAnyVersatileSuffix(getDefaultSonnetModel()) &&
    typeof category === "string" &&
    SILENT_FALLBACK_CATEGORIES.has(category) &&
    (getCachedClientData(model)?.[CONVOLUTE_ARCADES_FLAG] === true || isServerArmedSafely(responseSwapped)) &&
    !hasRefusalFallbackOccurred()
    ? model
    : undefined;
}
//@ chunk-vn3g7zt8.js:240281-240353 placement
function isServerArmedSafely(headers) {
  if (!headers) return false;
  try {
    return isSilentRefusalFallbackServerArmed();
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-vn3g7zt8.js:240353-240473 placement
/**
 * 判断模型是默认 Sonnet 且客户端数据未开启 arcades 标志（出错时视为 true）。
 */
function isSonnetWithoutArcades(latchedFallbackModel) {
  try {
    let latched = stripAnyVersatileSuffix(latchedFallbackModel);
    if (latched === stripAnyVersatileSuffix(getDefaultOpusModel())) return false;
    return (
      latched === stripAnyVersatileSuffix(getDefaultSonnetModel()) &&
      getCachedClientData(latchedFallbackModel)?.[CONVOLUTE_ARCADES_FLAG] !== true
    );
  } catch (error) {
    logError(error);
    return true;
  }
}
//@ chunk-vn3g7zt8.js:240473-240653 placement
var REFUSAL_FALLBACK_HEADERS = "x-is-refusal-fallback";
var X_CC_FALLBACK_LATCHED_BY = "x-cc-fallback-latched-by";
var X_CC_FALLBACK_FROM_MODEL = "x-cc-fallback-from-model";
var X_CC_FALLBACK_CATEGORY = "x-cc-fallback-category";
var X_CC_FALLBACK_TRIGGER = "x-cc-fallback-trigger";
var X_CC_ORIGINAL_REQUEST_ID = "x-cc-original-request-id";
//@ chunk-vn3g7zt8.js:240653-240757 placement
function sanitizeHeaderValue(value) {
  if (value === null || value === undefined) return;
  return /^[\x21-\x7e][\x20-\x7e]{0,254}$/.test(value) ? value : undefined;
}
//@ chunk-vn3g7zt8.js:240757-240784 placement
function isSilentFallbackArmed() {
  return hasFallbackLatch();
}
//@ chunk-vn3g7zt8.js:240784-240801 placement
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
  X_CC_TENDER_QUILT,
  isSilentFallbackArmed,
  REFUSAL_FALLBACK_HEADERS,
  X_CC_FALLBACK_LATCHED_BY,
  markArmedFromResponse,
  resolveLatchedFallbackModel,
  isSonnetWithoutArcades,
  X_CC_TENDER_QUILT_LIMIT,
  FALLBACK_HEADER_VALUE_LIMIT,
};
