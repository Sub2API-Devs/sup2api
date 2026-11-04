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
import { outcomeCodesEnabled, classifierSessionState, getOwnProperty } from "./yoloClassifier.js";
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

//@ chunk-e6aww6q8.js:2943344-2943440 placement
/**
 * 分类器温度：环境变量 CLAUDE_CODE_AUTO_MODE_TEMPERATURE（有限数），默认 1。
 */
function getClassifierTemperature() {
  let configuredTemperature = Number(antEnv.CLAUDE_CODE_AUTO_MODE_TEMPERATURE);
  return Number.isFinite(configuredTemperature) ? configuredTemperature : 1;
}
//@ chunk-e6aww6q8.js:2943440-2943520 placement
function isOutcomeCodesEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_OUTCOME_CODES === undefined);
  return outcomeCodesEnabled();
}
//@ chunk-e6aww6q8.js:2943520-2943554 placement
function getClassifierModel() {
  return resolveClassifierModel().value;
}
//@ chunk-e6aww6q8.js:2943554-2943584 placement
function getDefaultClassifierModelFor(mainModel) {
  return getPermissionClassifierFlagshipRerouteTarget(mainModel);
}
//@ chunk-e6aww6q8.js:2943584-2944275 placement
/**
 * 选分类器模型：tengu_auto_mode_config.modelByMainModel / model（经组织模型策略校验）优先，且会忽略 CLAUDE_CODE_AUTO_MODE_MODEL 并告警；其次环境变量；再次外部默认 Sonnet 5（探测未降级时，externalDefault=true）；最后按主模型推导默认。返回 {value, src, externalDefault?}。
 */
function resolveClassifierModel() {
  let mainModel = getMainLoopModel();
  let config = getAutoModeConfigOrDefault();
  let serverModel =
    lookupModelMapping(config?.modelByMainModel, {
      vet: (model) => vetClassifierModel(model, "modelByMainModel"),
    }) ?? vetClassifierModel(config?.model, "model");
  if (serverModel) {
    if (env.CLAUDE_CODE_AUTO_MODE_MODEL) {
      let { loggedPolicySkips } = classifierSessionState();
      if (!loggedPolicySkips.has("env:shadowed")) {
        loggedPolicySkips.add("env:shadowed");
        logForDebugging(
          `Auto mode classifier: ignoring CLAUDE_CODE_AUTO_MODE_MODEL=${env.CLAUDE_CODE_AUTO_MODE_MODEL} because a server-configured classifier model (${serverModel}) takes priority; using that model instead`,
          {
            level: "warn",
          },
        );
      }
    }
    return {
      value: serverModel,
      src: "gb",
    };
  }
  {
    let envModel = vetClassifierModel(env.CLAUDE_CODE_AUTO_MODE_MODEL, "env");
    if (envModel)
      return {
        value: envModel,
        src: "env",
      };
  }
  if (classifierSessionState().externalSonnet5Probe !== "demoted") {
    let permissionClassifierExternalDefault = getPermissionClassifierExternalDefault(mainModel);
    if (permissionClassifierExternalDefault)
      return {
        value: permissionClassifierExternalDefault,
        src: "default",
        externalDefault: true,
      };
  }
  return {
    value: getDefaultClassifierModelFor(mainModel),
    src: "default",
  };
}
//@ chunk-e6aww6q8.js:2944275-2945012 placement
/**
 * 校验候选分类器模型：组织策略不允许、或来自 env 但安全防护会拒绝升级检查时，记一次日志并返回 undefined。
 */
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
      : undefined;
  if (rejection === undefined) return model;
  let skipKey = `${source}:${model}`;
  let { loggedPolicySkips } = classifierSessionState();
  if (!loggedPolicySkips.has(skipKey)) {
    loggedPolicySkips.add(skipKey);
    logForDebugging(
      source === "env"
        ? `Auto mode classifier: ignoring CLAUDE_CODE_AUTO_MODE_MODEL=${model} because ${rejection.why}; using the default classifier model instead. ${rejection.next}`
        : `Auto mode classifier: skipping server-configured classifier model ${model} (tengu_auto_mode_config.${source}) because ${rejection.why}`,
      {
        level: source === "env" ? "warn" : "info",
      },
    );
  }
  return;
}
//@ chunk-e6aww6q8.js:2945012-2945409 placement
function lookupModelMapping(mapping, options) {
  if (mapping == null || typeof mapping !== "object") return;
  let vet = options?.vet ?? ((model) => model);
  let modelKeys = mainModelOverrideKeys();
  for (let modelKey of modelKeys) {
    let ownProperty = getOwnProperty(mapping, modelKey);
    let mapped = ownProperty ? vet(ownProperty) : undefined;
    if (mapped) return mapped;
  }
  if (!options?.prefixPatterns) return;
  for (let modelKey of modelKeys) {
    let best;
    let bestPrefixLength = 0;
    for (let [key, value] of Object.entries(mapping)) {
      if (!value || key.length <= 1 || !key.endsWith("*")) continue;
      let sliced = key.slice(0, -1);
      if (!modelKey.startsWith(sliced) || sliced.length <= bestPrefixLength) continue;
      let mapped = vet(value);
      if (mapped) {
        best = mapped;
        bestPrefixLength = sliced.length;
      }
    }
    if (best) return best;
  }
  return;
}
//@ chunk-e6aww6q8.js:2945409-2945445 placement
function getFallbackClassifierModel(model) {
  return resolveFallbackClassifierModel(model).value;
}
//@ chunk-e6aww6q8.js:2945445-2945496 placement
function resolveFallbackClassifierModel(model) {
  return {
    value: undefined,
    src: "default",
  };
}
//@ chunk-e6aww6q8.js:2945496-2945568 placement
function getProbeDemotionFallbackModel(probedModel) {
  let defaultClassifierModelFor = getDefaultClassifierModelFor(getMainLoopModel());
  if (
    strippedCanonicalName(defaultClassifierModelFor) !== strippedCanonicalName(probedModel) &&
    isPermittedByOrgModelPolicy(defaultClassifierModelFor)
  )
    return defaultClassifierModelFor;
  return;
}
//@ chunk-e6aww6q8.js:2945568-2945682 placement
/**
 * 取分类器的备用模型：外部默认模型走探测降级的备用，其他走配置的备用；与主模型相同则不返回。
 */
function getClassifierFallbackModel(resolved) {
  let fallbackModel = resolved.externalDefault
    ? getProbeDemotionFallbackModel(resolved.value)
    : getFallbackClassifierModel(resolved.value);
  return fallbackModel !== undefined &&
    strippedCanonicalName(fallbackModel) !== strippedCanonicalName(resolved.value)
    ? fallbackModel
    : undefined;
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
