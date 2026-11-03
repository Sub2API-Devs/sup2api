/**
 * utils/model/telemetryModelName.ts
 *
 * 2.1.316 新增：模型名合规时原样返回，否则记为 nonconforming；主循环模型的规范名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (9)
 * attribution: placement 9
 */
import { getCatalogState } from "./modelCatalog.js";
import { clampNumber_2 } from "../../../vendor/lodash-es/clamp.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-aepeg2w5.js:342255-342295 placement
/**
 * 记录主循环模型的规范名（供遥测）。
 */
function setMainLoopCanonical(mainLoopCanonical) {
  getCatalogState().mainLoopCanonical = mainLoopCanonical;
}
//@ chunk-aepeg2w5.js:342295-342344 placement
/**
 * 主循环模型的规范名。
 */
function mainLoopCanonicalModel() {
  return getCatalogState().mainLoopCanonical?.();
}
//@ chunk-aepeg2w5.js:342344-342432 placement
function clampNumber(e, n, r) {
  if (e === e) {
    if (r !== undefined) e = e <= r ? e : r;
    if (n !== undefined) e = e >= n ? e : n;
  }
  return e;
}
//@ chunk-aepeg2w5.js:342432-342442 placement
/**
 * 数值夹取的别名。
 */
var clampNumberAlias = clampNumber;
//@ chunk-aepeg2w5.js:342580-342591 placement
/**
 * 整数清洗的别名。
 */
var sanitizeInt = clampNumber_2;
//@ chunk-aepeg2w5.js:342591-342685 placement
/**
 * 遥测安全的模型名正则（普通与带日期形式）。
 */
var SAFE_MODEL_NAME_RE = /^[A-Za-z0-9._:[\]-]{1,100}$/;
var DATED_MODEL_NAME_RE = /^[A-Za-z0-9._:[\]-]{1,91}@\d{8}(\[\d{1,3}[mM]\])?$/;
//@ chunk-aepeg2w5.js:342685-342774 placement
/**
 * 模型名合规时原样返回，否则记为 nonconforming。
 */
function telemetrySafeModelName(e) {
  if (e == null) return;
  return SAFE_MODEL_NAME_RE.test(e) || DATED_MODEL_NAME_RE.test(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : lit("nonconforming");
}
//@ chunk-aepeg2w5.js:342774-342842 placement
/**
 * 把模型列表截断、逐个做遥测安全化并拼接。
 */
function telemetrySafeModelList(e, n) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    e
      .slice(0, n)
      .map((r) => telemetrySafeModelName(r))
      .join(","),
  );
}
//@ chunk-aepeg2w5.js:342842-342991 placement
/**
 * 把模型名转换为遥测用短名（去掉 claude- 与 [1m]，不合规记为 nonconforming）。
 */
function toTelemetryModelSlug(model) {
  let replaced = model
    .replace(/\[1m\]$/i, "")
    .replace(/^claude-/, "")
    .replaceAll("-", "_");
  return /^[a-z0-9_]{1,40}$/.test(replaced)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(replaced)
    : lit("nonconforming");
}
export {
  mainLoopCanonicalModel,
  telemetrySafeModelName,
  sanitizeInt,
  telemetrySafeModelList,
  clampNumberAlias,
  setMainLoopCanonical,
  SAFE_MODEL_NAME_RE,
  toTelemetryModelSlug,
};
