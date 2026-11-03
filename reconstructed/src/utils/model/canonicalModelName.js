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

//@ chunk-aepeg2w5.js:458354-458375 placement
/**
 * claude-3 系列旧模型前缀集合。
 */
var PDF_SUPPORTED_MODELS = new Set(isPDFSupported());
//@ chunk-aepeg2w5.js:458375-458444 placement
function isRecognizedCanonical(e) {
  let n = strip1mSuffix(e);
  return getCatalogEntry(n) !== undefined || PDF_SUPPORTED_MODELS.has(n) || n === CLAUDE_MYTHOS_PREVIEW;
}
//@ chunk-aepeg2w5.js:458444-458490 placement
function isRecognizedModel(e, n = getCanonicalName(e)) {
  return isRecognizedCanonical(n) || neverRecognizedByOverride(e, n);
}
//@ chunk-aepeg2w5.js:458490-458516 placement
function neverRecognizedByOverride(e, n) {
  return false;
}
//@ chunk-aepeg2w5.js:458516-458656 placement
/**
 * 在模型覆盖表中查找值等于该模型的条目，返回其可识别的规范名。
 */
function findOverrideCanonicalName(e, n) {
  if (e === undefined) return;
  for (let [key, value] of Object.entries(e)) {
    if (!sameModelSpelling(value, n)) continue;
    let h = firstPartyNameToCanonical(key);
    if (isRecognizedModel(h, h) || hasDescribableCatalogModel(h)) return h;
  }
  return;
}
//@ chunk-aepeg2w5.js:458656-458715 placement = applyModelOverrides (1)
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
function getCanonicalName(e, n) {
  let canonicalModelName = resolveCanonicalModelName(e, n);
  if (n?.identity === true || isRecognizedCanonical(canonicalModelName)) return canonicalModelName;
  let mappedModel = resolveMappedModel(e);
  if (mappedModel === e) return canonicalModelName;
  return resolveCanonicalModelName(mappedModel, n);
}
//@ chunk-aepeg2w5.js:458827-459079 placement
function resolveCanonicalModelName(e, n) {
  let overrideCanonicalName = findOverrideCanonicalName(n?.overridesMap ?? getSettingsModelOverrides(), e);
  if (overrideCanonicalName === undefined && n?.overridesMap === undefined) {
    let pairedPolicyModelOverrides = getPairedPolicyModelOverrides();
    overrideCanonicalName = findOverrideCanonicalName(pairedPolicyModelOverrides, e);
  }
  if (overrideCanonicalName !== undefined) return overrideCanonicalName;
  if (!n?.deterministic && e.includes("application-inference-profile")) {
    let inferenceProfileBackingModel = getInferenceProfileBackingModelCached(stripAnyVersatileSuffix(e));
    if (inferenceProfileBackingModel) return firstPartyNameToCanonical(inferenceProfileBackingModel);
  }
  return firstPartyNameToCanonical(e);
}
//@ chunk-aepeg2w5.js:459079-459175 placement = resolveSkillModelOverride (0.834)
/**
 * 模型规范名（[1m] 变体时同时返回带 [1m] 的形式），默认用当前主模型。
 */
function mainModelOverrideKeys(skillModel, currentModel) {
  let r = skillModel ?? getMainLoopModel();
  let s = strip1mSuffix(
    getCanonicalName(r, {
      ...currentModel,
      identity: true,
    }),
  );
  return has1mSuffix(r) ? [`${s}[1m]`, s] : [s];
}
//@ chunk-aepeg2w5.js:459175-459221 placement
/**
 * 按身份规范化并去掉 [1m] 的模型 id（比较/计价/缓存键用）。
 */
function strippedCanonicalName(e) {
  return strip1mSuffix(
    getCanonicalName(e, {
      identity: true,
    }),
  );
}
//@ chunk-aepeg2w5.js:459221-459301 placement
/**
 * 规范化模型 id，原来带 [1m] 而规范名不带时补回 [1m]。
 */
function canonicalNameKeeping1m(model, n) {
  let canonicalName = getCanonicalName(model, {
    ...n,
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
function isRecognizedModelKey(e) {
  return isRecognizedCanonical(e);
}
//@ chunk-aepeg2w5.js:459400-459417 placement
/**
 * 注册当前主模型规范键的取值函数（顶层副作用语句）。
 */
setMainLoopCanonical(() => strippedCanonicalName(getMainLoopModel()));
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
