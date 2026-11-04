/**
 * utils/model/canonicalModelName.ts
 *
 * 2.1.316 新增：规范模型名（推理配置 ARN、[1m] 后缀、区域前缀）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (14)
 * attribution: placement 14
 */
import { isPDFSupported } from "../pdfUtils.js";
import {
  strip1mSuffix,
  CLAUDE_MYTHOS_PREVIEW,
  sameModelSpelling,
  stripAnyVersatileSuffix,
} from "./modelIds.js";
import { getCatalogEntry } from "./modelCatalog.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { hasDescribableCatalogModel, resolveMappedModel } from "./modelCatalog/catalogCapabilities.js";
import { getInitialSettings_2, getPairedPolicyModelOverrides } from "../settings/settings.js";
import { getInferenceProfileBackingModelCached } from "../../bootstrap/state.js";
import { getMainLoopModel } from "./model.js";
import { has1mSuffix } from "./contextWindow1m.js";
import { append1mSuffixIfMissing } from "./planModeModel.js";
import { setMainLoopCanonical } from "./telemetryModelName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:458354-458375 placement
/**
 * claude-3 系列旧模型前缀集合。
 */
var PDF_SUPPORTED_MODELS; // deferred: uses isPDFSupported (../pdfUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:458354", () => {
  PDF_SUPPORTED_MODELS = new Set(isPDFSupported());
});
//@ chunk-aepeg2w5.js:458375-458444 placement
function isRecognizedCanonical(modelId) {
  let stripped = strip1mSuffix(modelId);
  return (
    getCatalogEntry(stripped) !== undefined ||
    PDF_SUPPORTED_MODELS.has(stripped) ||
    stripped === CLAUDE_MYTHOS_PREVIEW
  );
}
//@ chunk-aepeg2w5.js:458444-458490 placement
function isRecognizedModel(modelId, canonical = getCanonicalName(modelId)) {
  return isRecognizedCanonical(canonical) || neverRecognizedByOverride(modelId, canonical);
}
//@ chunk-aepeg2w5.js:458490-458516 placement
function neverRecognizedByOverride(modelId, canonical) {
  return false;
}
//@ chunk-aepeg2w5.js:458516-458656 placement
/**
 * 在模型覆盖表中查找值等于该模型的条目，返回其可识别的规范名。
 */
function findOverrideCanonicalName(overrides, modelId) {
  if (overrides === undefined) return;
  for (let [key, value] of Object.entries(overrides)) {
    if (!sameModelSpelling(value, modelId)) continue;
    let canonical = firstPartyNameToCanonical(key);
    if (isRecognizedModel(canonical, canonical) || hasDescribableCatalogModel(canonical)) return canonical;
  }
  return;
}
//@ chunk-aepeg2w5.js:458656-458715 placement (2.1.88 match: applyModelOverrides, 1)
/**
 * settings.modelOverrides（读取失败为 undefined）。
 */
function getSettingsModelOverrides() {
  try {
    return getInitialSettings_2().modelOverrides;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:458715-458827 placement
function getCanonicalName(modelId, options) {
  let canonicalModelName = resolveCanonicalModelName(modelId, options);
  if (options?.identity === true || isRecognizedCanonical(canonicalModelName)) return canonicalModelName;
  let modelId_2 = resolveMappedModel(modelId);
  if (modelId_2 === modelId) return canonicalModelName;
  return resolveCanonicalModelName(modelId_2, options);
}
//@ chunk-aepeg2w5.js:458827-459079 placement
function resolveCanonicalModelName(modelId, options) {
  let overrideCanonicalName = findOverrideCanonicalName(
    options?.overridesMap ?? getSettingsModelOverrides(),
    modelId,
  );
  if (overrideCanonicalName === undefined && options?.overridesMap === undefined) {
    let pairedPolicyModelOverrides = getPairedPolicyModelOverrides();
    overrideCanonicalName = findOverrideCanonicalName(pairedPolicyModelOverrides, modelId);
  }
  if (overrideCanonicalName !== undefined) return overrideCanonicalName;
  if (!options?.deterministic && modelId.includes("application-inference-profile")) {
    let inferenceProfileBackingModel = getInferenceProfileBackingModelCached(
      stripAnyVersatileSuffix(modelId),
    );
    if (inferenceProfileBackingModel) return firstPartyNameToCanonical(inferenceProfileBackingModel);
  }
  return firstPartyNameToCanonical(modelId);
}
//@ chunk-aepeg2w5.js:459079-459175 placement (2.1.88 match: resolveSkillModelOverride, 0.834)
/**
 * 模型规范名（[1m] 变体时同时返回带 [1m] 的形式），默认用当前主模型。
 */
function mainModelOverrideKeys(skillModel, currentModel) {
  let baseModel = skillModel ?? getMainLoopModel();
  let canonical = strip1mSuffix(
    getCanonicalName(baseModel, {
      ...currentModel,
      identity: true,
    }),
  );
  return has1mSuffix(baseModel) ? [`${canonical}[1m]`, canonical] : [canonical];
}
//@ chunk-aepeg2w5.js:459175-459221 placement
/**
 * 按身份规范化并去掉 [1m] 的模型 id（比较/计价/缓存键用）。
 */
function strippedCanonicalName(modelId) {
  return strip1mSuffix(
    getCanonicalName(modelId, {
      identity: true,
    }),
  );
}
//@ chunk-aepeg2w5.js:459221-459301 placement
/**
 * 规范化模型 id，原来带 [1m] 而规范名不带时补回 [1m]。
 */
function canonicalNameKeeping1m(model, options) {
  let canonicalName = getCanonicalName(model, {
    ...options,
    identity: true,
  });
  return has1mSuffix(model) && !has1mSuffix(canonicalName)
    ? append1mSuffixIfMissing(canonicalName)
    : canonicalName;
}
//@ chunk-aepeg2w5.js:459301-459371 placement
/**
 * 用托管配对覆盖映射规范化后去 [1m]。
 */
function hookModelMatchKey(toModel) {
  return strip1mSuffix(
    getCanonicalName(toModel, {
      overridesMap: getPairedPolicyModelOverrides() ?? {},
      identity: true,
    }),
  );
}
//@ chunk-aepeg2w5.js:459371-459400 placement
/**
 * 是否 catalog 已知模型。
 */
function isRecognizedModelKey(key) {
  return isRecognizedCanonical(key);
}
//@ chunk-aepeg2w5.js:459400-459417 placement
/**
 * 注册当前主模型规范键的取值函数（顶层副作用语句）。
 */
// deferred: uses setMainLoopCanonical (./telemetryModelName.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:459400", () => {
  setMainLoopCanonical(() => strippedCanonicalName(getMainLoopModel()));
});
export {
  getCanonicalName,
  getSettingsModelOverrides,
  findOverrideCanonicalName,
  isRecognizedCanonical,
  mainModelOverrideKeys,
  strippedCanonicalName,
  isRecognizedModel,
  hookModelMatchKey,
  isRecognizedModelKey,
  canonicalNameKeeping1m,
};
