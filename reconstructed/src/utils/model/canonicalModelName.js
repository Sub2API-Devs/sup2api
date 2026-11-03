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
import { Lt, CLAUDE_MYTHOS_PREVIEW, Sv, Bn } from "./modelIds.js";
import { getCatalogEntry } from "./modelCatalog.js";
import { firstPartyNameToCanonical } from "./modelFallback.js";
import { fn, resolveMappedModel } from "./modelCatalog/catalogCapabilities.js";
import { getInitialSettings_2, getPairedPolicyModelOverrides } from "../settings/settings.js";
import { getInferenceProfileBackingModelCached } from "../../bootstrap/state.js";
import { getMainLoopModel } from "./model.js";
import { olt } from "./contextWindow1m.js";
import { append1mSuffixIfMissing } from "./planModeModel.js";
import { hE } from "./telemetryModelName.js";

/**
 * claude-3 系列旧模型前缀集合。
 */
//@ chunk-aepeg2w5.js:458354-458375 placement
var sG = new Set(isPDFSupported());
//@ chunk-aepeg2w5.js:458375-458444 placement
function isRecognizedCanonical(e) {
  let n = Lt(e);
  return getCatalogEntry(n) !== void 0 || sG.has(n) || n === CLAUDE_MYTHOS_PREVIEW;
}
//@ chunk-aepeg2w5.js:458444-458490 placement
function isRecognizedModel(e, n = getCanonicalName(e)) {
  return isRecognizedCanonical(n) || aG(e, n);
}
//@ chunk-aepeg2w5.js:458490-458516 placement
function aG(e, n) {
  return !1;
}
/**
 * 在模型覆盖表中查找值等于该模型的条目，返回其可识别的规范名。
 */
//@ chunk-aepeg2w5.js:458516-458656 placement
function findOverrideCanonicalName(e, n) {
  if (e === void 0) return;
  for (let [r, s] of Object.entries(e)) {
    if (!Sv(s, n)) continue;
    let h = firstPartyNameToCanonical(r);
    if (isRecognizedModel(h, h) || fn(h)) return h;
  }
  return;
}
/**
 * settings.modelOverrides（读取失败为 undefined）。
 */
//@ chunk-aepeg2w5.js:458656-458715 placement = applyModelOverrides (1)
function getSettingsModelOverrides() {
  try {
    return getInitialSettings_2().modelOverrides;
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:458715-458827 placement
function getCanonicalName(e, n) {
  let r = resolveCanonicalModelName(e, n);
  if (n?.identity === !0 || isRecognizedCanonical(r)) return r;
  let s = resolveMappedModel(e);
  if (s === e) return r;
  return resolveCanonicalModelName(s, n);
}
//@ chunk-aepeg2w5.js:458827-459079 placement
function resolveCanonicalModelName(e, n) {
  let r = findOverrideCanonicalName(n?.overridesMap ?? getSettingsModelOverrides(), e);
  if (r === void 0 && n?.overridesMap === void 0) {
    let s = getPairedPolicyModelOverrides();
    r = findOverrideCanonicalName(s, e);
  }
  if (r !== void 0) return r;
  if (!n?.deterministic && e.includes("application-inference-profile")) {
    let s = getInferenceProfileBackingModelCached(Bn(e));
    if (s) return firstPartyNameToCanonical(s);
  }
  return firstPartyNameToCanonical(e);
}
/**
 * 模型规范名（[1m] 变体时同时返回带 [1m] 的形式），默认用当前主模型。
 */
//@ chunk-aepeg2w5.js:459079-459175 placement = resolveSkillModelOverride (0.834)
function mainModelOverrideKeys(skillModel, currentModel) {
  let r = skillModel ?? getMainLoopModel(),
    s = Lt(getCanonicalName(r, { ...currentModel, identity: !0 }));
  return olt(r) ? [`${s}[1m]`, s] : [s];
}
/**
 * 按身份规范化并去掉 [1m] 的模型 id（比较/计价/缓存键用）。
 */
//@ chunk-aepeg2w5.js:459175-459221 placement
function strippedCanonicalName(e) {
  return Lt(getCanonicalName(e, { identity: !0 }));
}
/**
 * 规范化模型 id，原来带 [1m] 而规范名不带时补回 [1m]。
 */
//@ chunk-aepeg2w5.js:459221-459301 placement
function canonicalNameKeeping1m(e, n) {
  let r = getCanonicalName(e, { ...n, identity: !0 });
  return olt(e) && !olt(r) ? append1mSuffixIfMissing(r) : r;
}
/**
 * 用托管配对覆盖映射规范化后去 [1m]。
 */
//@ chunk-aepeg2w5.js:459301-459371 placement
function hookModelMatchKey(e) {
  return Lt(getCanonicalName(e, { overridesMap: getPairedPolicyModelOverrides() ?? {}, identity: !0 }));
}
/**
 * 是否 catalog 已知模型。
 */
//@ chunk-aepeg2w5.js:459371-459400 placement
function isRecognizedModelKey(e) {
  return isRecognizedCanonical(e);
}
/**
 * 注册当前主模型规范键的取值函数（顶层副作用语句）。
 */
//@ chunk-aepeg2w5.js:459400-459417 placement
hE(() => strippedCanonicalName(getMainLoopModel()));

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
