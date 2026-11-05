/**
 * services/analytics/featureTelemetry.ts
 *
 * 2.1.316 新增。功能遥测 tengu_feature_ok/bad/sad 记录函数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-47b8txen.js (13)
 * attribution: placement 13
 */
import { import_baseReduce } from "../../../vendor/lodash-es/_deburrLetter.js";
import { import_words, reAposGlobal } from "../../../vendor/lodash-es/_unicodeWords.js";
import { deburr_default } from "../../../vendor/lodash-es/_asciiWords.js";
import { logEvent, logEventAsync } from "./index.js";
import { fromEnum } from "./safeMetadata.js";
import { sanitizedFeatureErrorCodeForTelemetry } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-47b8txen.js:4731-4804 placement
function featureNameFactory(suffix) {
  return function (text) {
    return import_baseReduce(import_words(deburr_default(text).replace(reAposGlobal, "")), suffix, "");
  };
}
//@ chunk-47b8txen.js:4804-4813 placement
var featureNameBuilderFactory = featureNameFactory;
//@ chunk-47b8txen.js:4813-4883 placement
/**
 * 导出常量或表 `toSnakeFeatureName`：值为 W(function (e, r, u) { return e + (u ? "_" : "") + r.toLowerCase(); }), IDn = ke。
 */
var toSnakeFeatureName; // deferred: uses featureNameBuilderFactory of its import cycle while loading; runs once the cycle is complete
var featureBadNameBuilder;
deferInit("chunk-47b8txen.js:4813", () => {
  toSnakeFeatureName = featureNameBuilderFactory(function (name, a, b) {
    return name + (b ? "_" : "") + a.toLowerCase();
  });
  featureBadNameBuilder = toSnakeFeatureName;
});
//@ chunk-47b8txen.js:4883-4922 placement
function toolFeature(toolName) {
  return `tool_${featureBadNameBuilder(toolName)}`;
}
//@ chunk-47b8txen.js:4922-4960 placement
function cmdFeature(name) {
  return `cmd_${featureBadNameBuilder(name)}`;
}
//@ chunk-47b8txen.js:4960-4998 placement
function hookFeature(hookEvent) {
  return `hook_${featureBadNameBuilder(hookEvent)}`;
}
//@ chunk-47b8txen.js:4998-5061 placement
/**
 * 记 tengu_feature_ok（成功）遥测，附 feature_name。
 */
function logFeatureOk(feature, props) {
  logEvent("tengu_feature_ok", {
    ...props,
    feature_name: fromEnum(feature),
  });
}
//@ chunk-47b8txen.js:5061-5144 placement
/**
 * 记 tengu_feature_bad（失败）遥测，附 feature_name 与 error_code。
 */
function logFeatureBad(feature, reason, props) {
  logEvent("tengu_feature_bad", {
    ...props,
    feature_name: fromEnum(feature),
    error_code: sanitizedFeatureErrorCodeForTelemetry(reason),
  });
}
//@ chunk-47b8txen.js:5144-5227 placement
function logFeatureSad(feature, reason, props) {
  logEvent("tengu_feature_sad", {
    ...props,
    feature_name: fromEnum(feature),
    error_code: sanitizedFeatureErrorCodeForTelemetry(reason),
  });
}
//@ chunk-47b8txen.js:5227-5316 placement
async function logFeatureOkAsync(feature, props) {
  try {
    await logEventAsync("tengu_feature_ok", {
      ...props,
      feature_name: fromEnum(feature),
    });
  } catch {}
}
//@ chunk-47b8txen.js:5316-5425 placement
/**
 * 功能遥测 tengu_feature_ok/bad/sad 的记录函数，按 tool_/cmd_/hook_ 前缀归类。
 */
async function logFeatureBadAsync(feature, reason, props) {
  try {
    await logEventAsync("tengu_feature_bad", {
      ...props,
      feature_name: fromEnum(feature),
      error_code: sanitizedFeatureErrorCodeForTelemetry(reason),
    });
  } catch {}
}
//@ chunk-47b8txen.js:5425-5534 placement
async function logFeatureSadAsync(feature, reason, props) {
  try {
    await logEventAsync("tengu_feature_sad", {
      ...props,
      feature_name: fromEnum(feature),
      error_code: sanitizedFeatureErrorCodeForTelemetry(reason),
    });
  } catch {}
}
//@ chunk-47b8txen.js:5534-5632 placement
async function withFeatureTelemetry(feature, fn, classifyError) {
  try {
    let result = await fn();
    logFeatureOk(feature);
    return result;
  } catch (error) {
    logFeatureBad(feature, classifyError?.(error) ?? "error");
    throw error;
  }
}
export {
  logFeatureSad,
  logFeatureOk,
  logFeatureBad,
  withFeatureTelemetry,
  logFeatureBadAsync,
  logFeatureOkAsync,
  featureBadNameBuilder,
  logFeatureSadAsync,
  cmdFeature,
  hookFeature,
  toolFeature,
};
