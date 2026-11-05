/**
 * utils/model/canonicalModelName.ts
 *
 * 2.1.316 新增：规范模型名（推理配置 ARN、[1m] 后缀、区域前缀）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (15)
 * attribution: affinity 1, placement 14
 */
import {
  strip1mSuffix,
  CLAUDE_MYTHOS_PREVIEW,
  sameModelSpelling,
  stripAnyVersatileSuffix,
} from "./modelIds.js";
import { getCatalogEntry } from "./modelCatalog.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { hasDescribableCatalogModel, resolveMappedModel } from "./modelCatalog/catalogCapabilities.js";
import { getInitialSettings, getPairedPolicyModelOverrides } from "../settings/settings.js";
import { getInferenceProfileBackingModelCached } from "../../bootstrap/state.js";
import { getMainLoopModel } from "./model.js";
import { has1mSuffix } from "./contextWindow1m.js";
import { append1mSuffixIfMissing } from "./planModeModel.js";
import { setMainLoopCanonical } from "./telemetryModelName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:469677-469750 affinity
function modelClassName() {
  return ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
}
//@ chunk-exfmq47h.js:469750-469771 placement
/**
 * claude-3 系列旧模型前缀集合。
 */
var PDF_SUPPORTED_MODELS; // deferred: uses modelClassName of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:469750", () => {
  PDF_SUPPORTED_MODELS = new Set(modelClassName());
});
//@ chunk-exfmq47h.js:469771-469840 placement
function isRecognizedCanonical(modelId) {
  let stripped = strip1mSuffix(modelId);
  return (
    getCatalogEntry(stripped) !== undefined ||
    PDF_SUPPORTED_MODELS.has(stripped) ||
    stripped === CLAUDE_MYTHOS_PREVIEW
  );
}
//@ chunk-exfmq47h.js:469840-469886 placement
function isRecognizedModel(modelId, canonical = getCanonicalName(modelId)) {
  return isRecognizedCanonical(canonical) || neverRecognizedByOverride(modelId, canonical);
}
//@ chunk-exfmq47h.js:469886-469912 placement
function neverRecognizedByOverride(modelId, canonical) {
  return false;
}
//@ chunk-exfmq47h.js:469912-470052 placement
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
//@ chunk-exfmq47h.js:470052-470111 placement (2.1.88 match: applyModelOverrides, 1)
/**
 * settings.modelOverrides（读取失败为 undefined）。
 */
function getSettingsModelOverrides() {
  try {
    return getInitialSettings().modelOverrides;
  } catch {
    return;
  }
}
//@ chunk-exfmq47h.js:470111-470223 placement
/**
 * 规范化模型名（先按别名再回退原文），恒等模式或已是规范名时直接返回；被 model* 与请求路径大量使用。
 */
function getCanonicalName(modelId, options) {
  let canonicalModelName = resolveCanonicalModelName(modelId, options);
  if (options?.identity === true || isRecognizedCanonical(canonicalModelName)) return canonicalModelName;
  let modelId_2 = resolveMappedModel(modelId);
  if (modelId_2 === modelId) return canonicalModelName;
  return resolveCanonicalModelName(modelId_2, options);
}
//@ chunk-exfmq47h.js:470223-470475 placement
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
//@ chunk-exfmq47h.js:470475-470571 placement (2.1.88 match: resolveSkillModelOverride, 0.834)
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
//@ chunk-exfmq47h.js:470571-470617 placement
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
//@ chunk-exfmq47h.js:470617-470697 placement
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
//@ chunk-exfmq47h.js:470697-470767 placement
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
//@ chunk-exfmq47h.js:470767-470796 placement
/**
 * 是否 catalog 已知模型。
 */
function isRecognizedModelKey(key) {
  return isRecognizedCanonical(key);
}
//@ chunk-exfmq47h.js:470796-470813 placement
/**
 * 注册当前主模型规范键的取值函数（顶层副作用语句）。
 */
// deferred: uses setMainLoopCanonical (./telemetryModelName.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:470796", () => {
  setMainLoopCanonical(() => strippedCanonicalName(getMainLoopModel()));
});
export {
  getCanonicalName,
  mainModelOverrideKeys,
  isRecognizedModel,
  strippedCanonicalName,
  isRecognizedCanonical,
  hookModelMatchKey,
  isRecognizedModelKey,
  getSettingsModelOverrides,
  findOverrideCanonicalName,
  canonicalNameKeeping1m,
  modelClassName,
};
