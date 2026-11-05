/**
 * utils/model/telemetryModelName.ts
 *
 * 2.1.316 新增：模型名合规时原样返回，否则记为 nonconforming；主循环模型的规范名。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2), chunk-exfmq47h.js (9)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getCatalogState } from "./modelCatalog.js";
import { clampNumber_2 } from "../../../vendor/lodash-es/clamp.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../../services/analytics/safeMetadata.js";
import { isMaskIdListKnown } from "./modelCatalog/maskedIds.js";
import {
  CONFIDENTIAL_MODEL_ID,
  maskModelIdForTelemetry,
  isPublicModelId,
} from "./modelCatalog/catalogEntries.js";

//@ chunk-exfmq47h.js:352742-352782 placement
/**
 * 记录主循环模型的规范名（供遥测）。
 */
function setMainLoopCanonical(mainLoopCanonical) {
  getCatalogState().mainLoopCanonical = mainLoopCanonical;
}
//@ chunk-exfmq47h.js:352782-352831 placement
/**
 * 主循环模型的规范名。
 */
function mainLoopCanonicalModel() {
  return getCatalogState().mainLoopCanonical?.();
}
//@ chunk-exfmq47h.js:352831-352919 placement
function clampNumber(value, min, max) {
  if (value === value) {
    if (max !== undefined) value = value <= max ? value : max;
    if (min !== undefined) value = value >= min ? value : min;
  }
  return value;
}
//@ chunk-exfmq47h.js:352919-352929 placement
/**
 * 数值夹取的别名。
 */
var clampNumberAlias = clampNumber;
//@ chunk-exfmq47h.js:353067-353078 placement
/**
 * 整数清洗的别名。
 */
var sanitizeInt = clampNumber_2;
//@ chunk-exfmq47h.js:353078-353172 placement
/**
 * 遥测安全的模型名正则（普通与带日期形式）。
 */
var SAFE_MODEL_NAME_RE = /^[A-Za-z0-9._:[\]-]{1,100}$/;
var DATED_MODEL_NAME_RE = /^[A-Za-z0-9._:[\]-]{1,91}@\d{8}(\[\d{1,3}[mM]\])?$/;
//@ chunk-exfmq47h.js:353172-353261 placement
/**
 * 模型名合规时原样返回，否则记为 nonconforming。
 */
function telemetrySafeModelName(modelId) {
  if (modelId == null) return;
  return SAFE_MODEL_NAME_RE.test(modelId) || DATED_MODEL_NAME_RE.test(modelId)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(modelId)
    : lit("nonconforming");
}
//@ chunk-exfmq47h.js:353261-353329 placement
/**
 * 把模型列表截断、逐个做遥测安全化并拼接。
 */
function telemetrySafeModelList(modelIds, limit) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    modelIds
      .slice(0, limit)
      .map((modelId) => telemetrySafeModelName(modelId))
      .join(","),
  );
}
//@ chunk-exfmq47h.js:353329-353478 placement
/**
 * 把模型名转换为遥测用短名（去掉 claude- 与 [1m]，不合规记为 nonconforming）。
 */
function toTelemetryModelSlug(modelName) {
  let replaced = modelName
    .replace(/\[1m\]$/i, "")
    .replace(/^claude-/, "")
    .replaceAll("-", "_");
  return /^[a-z0-9_]{1,40}$/.test(replaced)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(replaced)
    : lit("nonconforming");
}
//@ chunk-5xgkngpb.js:593856-593949 placement
function telemetryBucketForModelPair(canonicalName, modelName) {
  if (!isMaskIdListKnown()) return toTelemetryModelSlug(CONFIDENTIAL_MODEL_ID);
  let isConfidential =
    maskModelIdForTelemetry(modelName) === CONFIDENTIAL_MODEL_ID ||
    maskModelIdForTelemetry(canonicalName) === CONFIDENTIAL_MODEL_ID;
  return toTelemetryModelSlug(isConfidential ? CONFIDENTIAL_MODEL_ID : canonicalName);
}
//@ chunk-5xgkngpb.js:593949-593989 placement
function telemetryBucketForCallerModel(modelId) {
  return toTelemetryModelSlug(isPublicModelId(modelId) ? modelId : CONFIDENTIAL_MODEL_ID);
}
export {
  mainLoopCanonicalModel,
  telemetrySafeModelName,
  sanitizeInt,
  SAFE_MODEL_NAME_RE,
  telemetryBucketForModelPair,
  telemetryBucketForCallerModel,
  telemetrySafeModelList,
  clampNumberAlias,
  setMainLoopCanonical,
};
