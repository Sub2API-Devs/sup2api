/**
 * utils/permissions/classifierModel.ts
 *
 * 2.1.316 新增：分类器模型选择
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { antEnv, env } from "../env.js";
import { hSn, zM, getOwnProperty } from "./yoloClassifier.js";
import {
  getPermissionClassifierFlagshipRerouteTarget,
  getPermissionClassifierExternalDefault,
  isAllowedAutoModeClassifierPin,
} from "../model/classifierModel.js";
import { getMainLoopModel } from "../model/model.js";
import { getAutoModeConfigOrDefault } from "./permissionSetup.js";
import { logForDebugging } from "../debug.js";
import { isPermittedByOrgModelPolicy } from "../model/defaultModel.js";
import { getModelStrings } from "../model/modelStrings.js";
import { mainModelOverrideKeys, strippedCanonicalName } from "../model/canonicalModelName.js";
import { resolveClassifierMaxRetries } from "../../services/api/withRetry.js";

/**
 * 分类器温度：环境变量 CLAUDE_CODE_AUTO_MODE_TEMPERATURE（有限数），默认 1。
 */
//@ chunk-e6aww6q8.js:2943344-2943440 placement
function getClassifierTemperature() {
  let e = Number(antEnv.CLAUDE_CODE_AUTO_MODE_TEMPERATURE);
  return Number.isFinite(e) ? e : 1;
}
//@ chunk-e6aww6q8.js:2943440-2943520 placement
function isOutcomeCodesEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_OUTCOME_CODES === void 0);
  return hSn();
}
//@ chunk-e6aww6q8.js:2943520-2943554 placement
function getClassifierModel() {
  return resolveClassifierModel().value;
}
//@ chunk-e6aww6q8.js:2943554-2943584 placement
function getDefaultClassifierModelFor(mainModel) {
  return getPermissionClassifierFlagshipRerouteTarget(mainModel);
}
/**
 * 选分类器模型：tengu_auto_mode_config.modelByMainModel / model（经组织模型策略校验）优先，且会忽略 CLAUDE_CODE_AUTO_MODE_MODEL 并告警；其次环境变量；再次外部默认 Sonnet 5（探测未降级时，externalDefault=true）；最后按主模型推导默认。返回 {value, src, externalDefault?}。
 */
//@ chunk-e6aww6q8.js:2943584-2944275 placement
function resolveClassifierModel() {
  let mainModel = getMainLoopModel(),
    config = getAutoModeConfigOrDefault(),
    serverModel =
      lookupModelMapping(config?.modelByMainModel, {
        vet: (s) => vetClassifierModel(s, "modelByMainModel"),
      }) ?? vetClassifierModel(config?.model, "model");
  if (serverModel) {
    if (env.CLAUDE_CODE_AUTO_MODE_MODEL) {
      let { loggedPolicySkips: loggedPolicySkips } = zM();
      if (!loggedPolicySkips.has("env:shadowed"))
        (loggedPolicySkips.add("env:shadowed"),
          logForDebugging(
            `Auto mode classifier: ignoring CLAUDE_CODE_AUTO_MODE_MODEL=${env.CLAUDE_CODE_AUTO_MODE_MODEL} because a server-configured classifier model (${serverModel}) takes priority; using that model instead`,
            { level: "warn" },
          ));
    }
    return { value: serverModel, src: "gb" };
  }
  {
    let s = vetClassifierModel(env.CLAUDE_CODE_AUTO_MODE_MODEL, "env");
    if (s) return { value: s, src: "env" };
  }
  if (zM().externalSonnet5Probe !== "demoted") {
    let s = getPermissionClassifierExternalDefault(mainModel);
    if (s) return { value: s, src: "default", externalDefault: !0 };
  }
  return { value: getDefaultClassifierModelFor(mainModel), src: "default" };
}
/**
 * 校验候选分类器模型：组织策略不允许、或来自 env 但安全防护会拒绝升级检查时，记一次日志并返回 undefined。
 */
//@ chunk-e6aww6q8.js:2944275-2945012 placement
function vetClassifierModel(model, source) {
  if (!model) return;
  let rejection = !isPermittedByOrgModelPolicy(model)
    ? {
        why: "your organization's model policy does not allow it",
        next: "Unset it or pin a model your organization's policy allows.",
      }
    : source === "env" && !isAllowedAutoModeClassifierPin(model)
      ? {
          why: "the API's safeguards refuse the classifier's escalated check on it",
          next: `Unset it or pin a different model, such as ${getModelStrings().sonnet5}.`,
        }
      : void 0;
  if (rejection === void 0) return model;
  let s = `${source}:${model}`,
    { loggedPolicySkips: loggedPolicySkips } = zM();
  if (!loggedPolicySkips.has(s))
    (loggedPolicySkips.add(s),
      logForDebugging(
        source === "env"
          ? `Auto mode classifier: ignoring CLAUDE_CODE_AUTO_MODE_MODEL=${model} because ${rejection.why}; using the default classifier model instead. ${rejection.next}`
          : `Auto mode classifier: skipping server-configured classifier model ${model} (tengu_auto_mode_config.${source}) because ${rejection.why}`,
        { level: source === "env" ? "warn" : "info" },
      ));
  return;
}
//@ chunk-e6aww6q8.js:2945012-2945409 placement
function lookupModelMapping(mapping, options) {
  if (mapping == null || typeof mapping !== "object") return;
  let r = options?.vet ?? ((h) => h),
    s = mainModelOverrideKeys();
  for (let h of s) {
    let y = getOwnProperty(mapping, h),
      S = y ? r(y) : void 0;
    if (S) return S;
  }
  if (!options?.prefixPatterns) return;
  for (let h of s) {
    let y,
      S = 0;
    for (let [w, L] of Object.entries(mapping)) {
      if (!L || w.length <= 1 || !w.endsWith("*")) continue;
      let sliced = w.slice(0, -1);
      if (!h.startsWith(sliced) || sliced.length <= S) continue;
      let q = r(L);
      if (q) ((y = q), (S = sliced.length));
    }
    if (y) return y;
  }
  return;
}
//@ chunk-e6aww6q8.js:2945409-2945445 placement
function getFallbackClassifierModel(e) {
  return resolveFallbackClassifierModel(e).value;
}
//@ chunk-e6aww6q8.js:2945445-2945496 placement
function resolveFallbackClassifierModel(e) {
  return { value: void 0, src: "default" };
}
//@ chunk-e6aww6q8.js:2945496-2945568 placement
function getProbeDemotionFallbackModel(probedModel) {
  let n = getDefaultClassifierModelFor(getMainLoopModel());
  if (strippedCanonicalName(n) !== strippedCanonicalName(probedModel) && isPermittedByOrgModelPolicy(n))
    return n;
  return;
}
/**
 * 取分类器的备用模型：外部默认模型走探测降级的备用，其他走配置的备用；与主模型相同则不返回。
 */
//@ chunk-e6aww6q8.js:2945568-2945682 placement
function getClassifierFallbackModel(resolved) {
  let n = resolved.externalDefault
    ? getProbeDemotionFallbackModel(resolved.value)
    : getFallbackClassifierModel(resolved.value);
  return n !== void 0 && strippedCanonicalName(n) !== strippedCanonicalName(resolved.value) ? n : void 0;
}
//@ chunk-e6aww6q8.js:2945682-2945716 placement
function getClassifierMaxRetries() {
  return resolveClassifierMaxRetries().value;
}

export {
  resolveClassifierModel,
  isOutcomeCodesEnabled,
  getClassifierModel,
  getClassifierTemperature,
  getClassifierMaxRetries,
  getDefaultClassifierModelFor,
  getProbeDemotionFallbackModel,
  getFallbackClassifierModel,
  getClassifierFallbackModel,
};
