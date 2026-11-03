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
import { clampNumber } from "../../../vendor/lodash-es/clamp.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-aepeg2w5.js:342255-342295 placement
function hE(e) {
  getCatalogState().mainLoopCanonical = e;
}
/**
 * 主循环模型的规范名。
 */
//@ chunk-aepeg2w5.js:342295-342344 placement
function mainLoopCanonicalModel() {
  return getCatalogState().mainLoopCanonical?.();
}
//@ chunk-aepeg2w5.js:342344-342432 placement
function FU(e, n, r) {
  if (e === e) {
    if (r !== void 0) e = e <= r ? e : r;
    if (n !== void 0) e = e >= n ? e : n;
  }
  return e;
}
//@ chunk-aepeg2w5.js:342432-342442 placement
var yE = FU;
//@ chunk-aepeg2w5.js:342580-342591 placement
var qpr = clampNumber;
//@ chunk-aepeg2w5.js:342591-342685 placement
var tss = /^[A-Za-z0-9._:[\]-]{1,100}$/,
  UU = /^[A-Za-z0-9._:[\]-]{1,91}@\d{8}(\[\d{1,3}[mM]\])?$/;
/**
 * 模型名合规时原样返回，否则记为 nonconforming。
 */
//@ chunk-aepeg2w5.js:342685-342774 placement
function telemetrySafeModelName(e) {
  if (e == null) return;
  return tss.test(e) || UU.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit("nonconforming");
}
//@ chunk-aepeg2w5.js:342774-342842 placement
function Bwi(e, n) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    e
      .slice(0, n)
      .map((r) => telemetrySafeModelName(r))
      .join(","),
  );
}
/**
 * 把模型名转换为遥测用短名（去掉 claude- 与 [1m]，不合规记为 nonconforming）。
 */
//@ chunk-aepeg2w5.js:342842-342991 placement
function toTelemetryModelSlug(e) {
  let replaced = e
    .replace(/\[1m\]$/i, "")
    .replace(/^claude-/, "")
    .replaceAll("-", "_");
  return /^[a-z0-9_]{1,40}$/.test(replaced)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(replaced)
    : lit("nonconforming");
}

export { mainLoopCanonicalModel, telemetrySafeModelName, qpr, Bwi, yE, hE, tss, toTelemetryModelSlug };
