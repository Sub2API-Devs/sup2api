/**
 * services/analytics/featureTelemetry.ts
 *
 * 2.1.316 新增。功能遥测 tengu_feature_ok/bad/sad 记录函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8nhse09v.js (13)
 * attribution: placement 13
 */
import { i } from "../../../vendor/lodash-es/_deburrLetter.js";
import { M, ye } from "../../../vendor/lodash-es/_unicodeWords.js";
import { deburr_default } from "../../../vendor/lodash-es/_asciiWords.js";
import { logEvent, logEventAsync } from "./index.js";
import { fromEnum } from "./safeMetadata.js";
import { sanitizedFeatureErrorCodeForTelemetry } from "../../utils/errors.js";

//@ chunk-8nhse09v.js:4731-4804 placement
function featureNameFactory(e) {
  return function (r) {
    return i(M(deburr_default(r).replace(ye, "")), e, "");
  };
}
//@ chunk-8nhse09v.js:4804-4813 placement
var featureNameBuilderFactory = featureNameFactory;
//@ chunk-8nhse09v.js:4813-4883 placement
/**
 * 导出常量或表 `toSnakeFeatureName`：值为 W(function (e, r, u) { return e + (u ? "_" : "") + r.toLowerCase(); }), IDn = ke。
 */
var toSnakeFeatureName = featureNameBuilderFactory(function (e, r, u) {
  return e + (u ? "_" : "") + r.toLowerCase();
});
var featureBadNameBuilder = toSnakeFeatureName;
//@ chunk-8nhse09v.js:4883-4922 placement
function toolFeature(e) {
  return `tool_${featureBadNameBuilder(e)}`;
}
//@ chunk-8nhse09v.js:4922-4960 placement
function cmdFeature(name) {
  return `cmd_${featureBadNameBuilder(name)}`;
}
//@ chunk-8nhse09v.js:4960-4998 placement
function hookFeature(hookEvent) {
  return `hook_${featureBadNameBuilder(hookEvent)}`;
}
//@ chunk-8nhse09v.js:4998-5061 placement
function logFeatureOk(e, r) {
  logEvent("tengu_feature_ok", {
    ...r,
    feature_name: fromEnum(e),
  });
}
//@ chunk-8nhse09v.js:5061-5144 placement
function logFeatureBad(e, r, u) {
  logEvent("tengu_feature_bad", {
    ...u,
    feature_name: fromEnum(e),
    error_code: sanitizedFeatureErrorCodeForTelemetry(r),
  });
}
//@ chunk-8nhse09v.js:5144-5227 placement
function logFeatureSad(e, r, u) {
  logEvent("tengu_feature_sad", {
    ...u,
    feature_name: fromEnum(e),
    error_code: sanitizedFeatureErrorCodeForTelemetry(r),
  });
}
//@ chunk-8nhse09v.js:5227-5316 placement
async function logFeatureOkAsync(e, r) {
  try {
    await logEventAsync("tengu_feature_ok", {
      ...r,
      feature_name: fromEnum(e),
    });
  } catch {}
}
//@ chunk-8nhse09v.js:5316-5425 placement
/**
 * 功能遥测 tengu_feature_ok/bad/sad 的记录函数，按 tool_/cmd_/hook_ 前缀归类。
 */
async function logFeatureBadAsync(e, r, u) {
  try {
    await logEventAsync("tengu_feature_bad", {
      ...u,
      feature_name: fromEnum(e),
      error_code: sanitizedFeatureErrorCodeForTelemetry(r),
    });
  } catch {}
}
//@ chunk-8nhse09v.js:5425-5534 placement
async function logFeatureSadAsync(e, r, u) {
  try {
    await logEventAsync("tengu_feature_sad", {
      ...u,
      feature_name: fromEnum(e),
      error_code: sanitizedFeatureErrorCodeForTelemetry(r),
    });
  } catch {}
}
//@ chunk-8nhse09v.js:5534-5632 placement
async function withFeatureTelemetry(e, r, u) {
  try {
    let o = await r();
    logFeatureOk(e);
    return o;
  } catch (error) {
    logFeatureBad(e, u?.(error) ?? "error");
    throw error;
  }
}
export {
  logFeatureBad,
  logFeatureSad,
  logFeatureOk,
  withFeatureTelemetry,
  logFeatureBadAsync,
  logFeatureSadAsync,
  logFeatureOkAsync,
  cmdFeature,
  hookFeature,
  toolFeature,
  featureBadNameBuilder,
};
