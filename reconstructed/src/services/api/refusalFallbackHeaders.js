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
import { Bn } from "../../utils/model/modelIds.js";
import { getDefaultOpusModel, getDefaultSonnetModel } from "../../utils/model/model.js";

//@ chunk-hwmsct5x.js:236067-236118 placement
var CONVOLUTE_ARCADES_FLAG = "convolute_arcades",
  X_CC_TENDER_QUILT = "x-cc-tender-quilt";
//@ chunk-hwmsct5x.js:236118-236194 placement
function Gc(e, n) {
  if (e.get(X_CC_TENDER_QUILT) !== "1") return;
  try {
    if (n()) markSilentRefusalFallbackServerArmed();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-hwmsct5x.js:236194-236235 placement
function hasTenderQuiltHeader(e) {
  return e?.get(X_CC_TENDER_QUILT) === "1";
}
//@ chunk-hwmsct5x.js:236235-236273 placement
function AEn() {
  return getCachedClientData()?.[CONVOLUTE_ARCADES_FLAG] === !0;
}
//@ chunk-hwmsct5x.js:236273-236391 placement
function getFallbackLatchKind() {
  if (AEn()) return "convolute_arcades";
  try {
    return isSilentRefusalFallbackServerArmed() ? "tender_quilt" : "none";
  } catch (error) {
    return (logError(error), "none");
  }
}
//@ chunk-hwmsct5x.js:236391-236428 placement
function CEn() {
  return getFallbackLatchKind() !== "none";
}
//@ chunk-hwmsct5x.js:236428-236469 placement
var xb = new Set(["cyber", "frontier_llm"]);
//@ chunk-hwmsct5x.js:236469-236728 placement
function resolveLatchedFallbackModel(
  e,
  { visibleRouteDeclined: n = !1, apiRefusalCategory: r, responseSwapped: s = !1 } = {},
) {
  if (!n && hasRefusalFallbackTarget(e)) return;
  if (!CEn()) return;
  let h = Bn(e);
  if (h === Bn(getDefaultOpusModel())) return e;
  return h === Bn(getDefaultSonnetModel()) &&
    typeof r === "string" &&
    xb.has(r) &&
    (getCachedClientData(e)?.[CONVOLUTE_ARCADES_FLAG] === !0 || Mb(s)) &&
    !hasRefusalFallbackOccurred()
    ? e
    : void 0;
}
//@ chunk-hwmsct5x.js:236728-236800 placement
function Mb(e) {
  if (!e) return !1;
  try {
    return isSilentRefusalFallbackServerArmed();
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 判断模型是默认 Sonnet 且客户端数据未开启 arcades 标志（出错时视为 true）。
 */
//@ chunk-hwmsct5x.js:236800-236920 placement
function isSonnetWithoutArcades(e) {
  try {
    let n = Bn(e);
    if (n === Bn(getDefaultOpusModel())) return !1;
    return n === Bn(getDefaultSonnetModel()) && getCachedClientData(e)?.[CONVOLUTE_ARCADES_FLAG] !== !0;
  } catch (error) {
    return (logError(error), !0);
  }
}
//@ chunk-hwmsct5x.js:236920-237100 placement
var REFUSAL_FALLBACK_HEADERS = "x-is-refusal-fallback",
  X_CC_FALLBACK_LATCHED_BY = "x-cc-fallback-latched-by",
  X_CC_FALLBACK_FROM_MODEL = "x-cc-fallback-from-model",
  X_CC_FALLBACK_CATEGORY = "x-cc-fallback-category",
  X_CC_FALLBACK_TRIGGER = "x-cc-fallback-trigger",
  X_CC_ORIGINAL_REQUEST_ID = "x-cc-original-request-id";
//@ chunk-hwmsct5x.js:237100-237204 placement
function sanitizeHeaderValue(e) {
  if (e === null || e === void 0) return;
  return /^[\x21-\x7e][\x20-\x7e]{0,254}$/.test(e) ? e : void 0;
}
//@ chunk-hwmsct5x.js:237204-237231 placement
function Kc() {
  return CEn();
}
//@ chunk-hwmsct5x.js:237231-237248 placement
var Ob = 80,
  Lc = 1e4;

export {
  CEn,
  AEn,
  getFallbackLatchKind,
  X_CC_FALLBACK_FROM_MODEL,
  X_CC_FALLBACK_CATEGORY,
  X_CC_FALLBACK_TRIGGER,
  X_CC_ORIGINAL_REQUEST_ID,
  sanitizeHeaderValue,
  hasTenderQuiltHeader,
  resolveLatchedFallbackModel,
  isSonnetWithoutArcades,
  Kc,
  REFUSAL_FALLBACK_HEADERS,
  X_CC_FALLBACK_LATCHED_BY,
  Gc,
  X_CC_TENDER_QUILT,
  Ob,
  Lc,
};
