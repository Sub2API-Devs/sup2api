/**
 * utils/model/planModeModel.ts
 *
 * 2.1.316 新增：强制的默认模型列表；计划模式模型设置与来源等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (27)
 * attribution: placement 27
 */
import { env } from "../env.js";
import { identityModelId } from "./bedrock.js";
import {
  strip1mTagWhereBuiltIn,
  tierOverrideModel,
  getDefaultOpusModel,
  getDefaultSonnetModel,
  isTierDefaultModelEnv,
  displayNameForModel,
} from "./model.js";
import { getModelStrings, reverseModelOverride, resolveProviderModelId } from "./modelStrings.js";
import { catalogFamilyDefaultKey, getModelUnavailabilityReason } from "./classifierModel.js";
import { strip1mSuffix, isBaseModelKey, isModelKeyAlias, sameModelSpelling } from "./modelIds.js";
import {
  usesFirstPartyModelIds,
  getAPIProvider,
  getRowFamily,
  getProviderAliasTargets,
  providerCatalogKey,
  isModelFamily,
} from "./providers.js";
import {
  getModelEntitlementDenySet,
  hasManagedModelDenies,
  newestAllowedInFamily,
  isModelAllowed,
  isModelDenied,
  getOrgModelDefault,
} from "./modelAllowlist.js";
import { getSettings_DEPRECATED } from "../settings/settings.js";
import {
  isModelAllowedUnderActiveEnforcement,
  eligible1mSuffixTarget,
  warnedEnforcementMessages,
  resolveAvailableModels,
  familyDefaultFor,
  getEnvDefaultModel,
  envDefaultModel_2,
  isModelEntitled,
} from "./defaultModel.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "./thirdPartyModelDefaults.js";
import {
  opus1mMergeAddsTagTo,
  isOpus1mMergeEnabled,
  parseUserSpecifiedModel,
  getCuratedModelPicker,
  applyOpus1mOptIn,
} from "./modelDisplay.js";
import { logForDebugging } from "../debug.js";
import { getUserSpecifiedModelSetting, getAdminSteering } from "./smallFastModel.js";
import { isRecognizedModel } from "./canonicalModelName.js";
import { getAdditionalModelOptionsCache, isClaudeAISubscriber } from "../auth.js";
import { getGatewayModelOptions } from "../../services/gateway/gatewayDiscovery.js";
import {
  supportsFamilyOverride,
  activeProviderModelOverrides,
  hasDescribableCatalogModel,
  catalogSupportsPlanMode,
} from "./modelCatalog/catalogCapabilities.js";
import {
  isServedCatalogActive,
  isPublishedCatalogInUse,
  orgDefaultModelState,
  entryModelKey,
  findServedModel,
  activeServedCatalog,
} from "./modelCatalog/servedCatalog.js";
import {
  getResolvedOrgDefault,
  setResolvedOrgDefault,
  getProbeRefutedDocumentDefaults,
} from "../../bootstrap/state.js";
import { getToolSearchBetaHeader } from "../betas.js";
import { has1mSuffix } from "./contextWindow1m.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "./configs.js";
import { getUltraplanModel } from "../../commands/ultraplan.js";

//@ chunk-aepeg2w5.js:438266-438374 placement = isExcludedModel (0.763)
function getDefaultHaikuModel() {
  let ANTHROPIC_DEFAULT_HAIKU_MODEL = env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
  if (ANTHROPIC_DEFAULT_HAIKU_MODEL !== undefined)
    return identityModelId(strip1mTagWhereBuiltIn(ANTHROPIC_DEFAULT_HAIKU_MODEL));
  return tierOverrideModel("haiku") ?? defaultHaikuModel();
}
//@ chunk-aepeg2w5.js:438374-438426 placement
/**
 * 取默认 Haiku 模型（目录档位或内置默认）。
 */
function defaultHaikuModel(e = getModelStrings()) {
  return catalogFamilyDefaultKey("haiku", e) ?? e.haiku45;
}
//@ chunk-aepeg2w5.js:438426-438476 placement
function isModeDependentModelSetting(e) {
  return e === "opusplan" || e === "haiku";
}
//@ chunk-aepeg2w5.js:438476-438585 placement
function planModeConstituentFamily(userSpecifiedModelSetting) {
  if (userSpecifiedModelSetting === "opusplan" || userSpecifiedModelSetting === "opusplan[1m]") return "opus";
  if (userSpecifiedModelSetting === "haiku") return "sonnet";
  return null;
}
//@ chunk-aepeg2w5.js:438585-438610 placement
function isOpusFableAdvisorSetting(e) {
  return false;
}
//@ chunk-aepeg2w5.js:438610-438923 placement
function stepDownRestrictedFamilyAliasPick(e) {
  let lower = e.trim().toLowerCase();
  let trimmed = strip1mSuffix(lower).trim();
  if (!isBaseModelKey(trimmed) || !usesFirstPartyModelIds()) return null;
  let modelEntitlementDenySet = getModelEntitlementDenySet();
  if (
    !(getSettings_DEPRECATED() || {}).availableModels &&
    modelEntitlementDenySet.size === 0 &&
    !hasManagedModelDenies()
  )
    return null;
  let h = newestAllowedInFamily(trimmed);
  if (
    h === null ||
    !(isModelAllowedUnderActiveEnforcement(h) ?? isModelAllowed(h)) ||
    isModelDenied(h, modelEntitlementDenySet)
  )
    return null;
  if (trimmed === lower) return h;
  return (trimmed === "opus"
    ? shouldProbeThirdPartyDefaults()
    : trimmed === "sonnet"
      ? shouldProbeThirdPartyDefaultsAlt()
      : true) && eligible1mSuffixTarget(h)
    ? strip1mTagWhereBuiltIn(`${h}[1m]`)
    : h;
}
//@ chunk-aepeg2w5.js:438923-439285 placement
function planModeConstituentModel(e) {
  let n = planModeConstituentFamily(e);
  if (n === null || e === undefined || e === null) return null;
  let r = e === "opusplan[1m]";
  let s;
  if (n === "opus") {
    let defaultOpusModel = getDefaultOpusModel();
    s =
      r || opus1mMergeAddsTagTo(defaultOpusModel)
        ? strip1mTagWhereBuiltIn(append1mSuffixIfMissing(defaultOpusModel))
        : defaultOpusModel;
  } else s = getDefaultSonnetModel();
  if (
    (isModelAllowedUnderActiveEnforcement(s) ?? isModelAllowed(s)) &&
    !isModelDenied(s, getModelEntitlementDenySet())
  )
    return {
      model: s,
      clamp: "none",
    };
  let y = stepDownRestrictedFamilyAliasPick(
    n === "opus" ? (r || isOpus1mMergeEnabled() ? "opus[1m]" : "opus") : "sonnet",
  );
  if (y !== null)
    return {
      model: y,
      clamp: "stepDown",
    };
  return {
    model: parseUserSpecifiedModel(e),
    clamp: "resting",
  };
}
//@ chunk-aepeg2w5.js:439285-439402 placement
function getRuntimeMainLoopModel(e) {
  let { model, clampWarning } = resolveRuntimeMainLoopModel(e);
  if (clampWarning !== null && !warnedEnforcementMessages().has(clampWarning)) {
    warnedEnforcementMessages().add(clampWarning);
    logForDebugging(clampWarning, {
      level: "warn",
    });
  }
  return model;
}
//@ chunk-aepeg2w5.js:439402-440260 placement
function resolveRuntimeMainLoopModel(e) {
  let { permissionMode, mainLoopModel, exceeds200kTokens = false } = e;
  if (permissionMode !== "plan")
    return {
      model: mainLoopModel,
      clampWarning: null,
    };
  let h = e.setting === undefined ? getUserSpecifiedModelSetting() : e.setting;
  let y = planModeConstituentFamily(h);
  if (y === null || (y === "opus" && exceeds200kTokens))
    return {
      model: mainLoopModel,
      clampWarning: null,
    };
  let S = planModeConstituentModel(h);
  if (S === null)
    return {
      model: mainLoopModel,
      clampWarning: null,
    };
  if (S.clamp === "none")
    return {
      model: S.model,
      clampWarning: null,
    };
  let w = y === "opus" ? "opusplan upgrade" : "haiku plan upgrade";
  let clampWarning =
    S.clamp === "stepDown"
      ? `Plan mode: the ${w} model is not permitted by the org model restrictions (availableModels, deniedModels or model_access entitlement); planning uses the newest permitted ${y === "opus" ? "Opus" : "Sonnet"} instead`
      : `Plan mode: the ${w} model is not permitted by the org model restrictions (availableModels, deniedModels or model_access entitlement); planning uses the resting model instead`;
  return {
    model: S.model,
    clampWarning,
  };
}
//@ chunk-aepeg2w5.js:440260-440317 placement = resolveSkillModelOverride (1)
/**
 * 去掉结尾所有 [1m] 再加一个 [1m]。旧版名 resolveSkillModelOverride_3 为错配。
 */
function append1mSuffixIfMissing(model) {
  return model.replace(/(\[1m\])+$/i, "") + "[1m]";
}
//@ chunk-aepeg2w5.js:440317-440564 placement
function getResolvedOrgDefaultModel() {
  let orgModelDefault = getOrgModelDefault();
  if (!orgModelDefault) return null;
  if (!isRecognizedOrgDefaultName(orgModelDefault.name)) {
    let n = `Org default model "${orgModelDefault.name}" is not one this build recognizes; using the standard default instead`;
    if (!warnedEnforcementMessages().has(n)) {
      warnedEnforcementMessages().add(n);
      logForDebugging(n, {
        level: "warn",
      });
    }
    return null;
  }
  return availableFamilyDefault(orgModelDefault.name);
}
//@ chunk-aepeg2w5.js:440564-440726 placement
function getBootstrapOrgDefaultEffect() {
  let orgModelDefault = getOrgModelDefault();
  if (!orgModelDefault) return null;
  if (isRecognizedOrgDefaultName(orgModelDefault.name)) {
    let resolvedOrgDefaultModel = getResolvedOrgDefaultModel();
    return resolvedOrgDefaultModel === null
      ? null
      : {
          model: resolvedOrgDefaultModel,
          kind: "org",
        };
  }
  return {
    model: resolvePlanModeModel(null).setting,
    kind: "standard",
  };
}
//@ chunk-aepeg2w5.js:440726-440785 placement
function isRecognizedOrgDefaultName(name) {
  return isModelKeyAlias(name.toLowerCase()) || isRecognizedModel(name) || isDeploymentVouchedModel(name);
}
//@ chunk-aepeg2w5.js:440785-441086 placement
function isDeploymentVouchedModel(modelId) {
  return (
    (env.ANTHROPIC_CUSTOM_MODEL_OPTION !== undefined &&
      sameModelSpelling(env.ANTHROPIC_CUSTOM_MODEL_OPTION, modelId)) ||
    isTierDefaultModelEnv(modelId) ||
    reverseModelOverride(modelId) !== modelId ||
    getAdditionalModelOptionsCache().some(
      (n) => typeof n.value === "string" && sameModelSpelling(n.value, modelId),
    ) ||
    getGatewayModelOptions().some(
      (n) => typeof n.value === "string" && sameModelSpelling(n.value, modelId),
    ) ||
    (getCuratedModelPicker()?.picker.options.some((option) =>
      sameModelSpelling(option.model.trim(), modelId),
    ) ??
      false)
  );
}
//@ chunk-aepeg2w5.js:441086-441154 placement
/**
 * 判断模型当前是否不可用（忽略覆盖后仍无）。
 */
function isUnavailableModel(e) {
  return (
    supportsFamilyOverride() &&
    getModelUnavailabilityReason(e, {
      ignoreModelOverrides: true,
    }) !== null
  );
}
//@ chunk-aepeg2w5.js:441154-441220 placement
function availableFamilyDefault(e) {
  let n = resolveAvailableModels(e, null) ?? e;
  let r = familyDefaultFor(n) ?? n;
  return isUnavailableModel(r) ? null : r;
}
//@ chunk-aepeg2w5.js:441220-441255 placement = renderToolUseMessage (1)
/**
 * 返回 tne() 中的 setting 字段（被 fastMode 等多处使用）；旧版名 renderToolUseMessage 为误配。
 */
function getDefaultMainLoopModelSetting() {
  return resolveDefaultMainLoopModelSetting().setting;
}
//@ chunk-aepeg2w5.js:441255-441497 placement
function defaultModelAttributionSuffix(attribution) {
  switch (attribution) {
    case "org":
      return " \xB7 Org default";
    case "enforced":
    case "entitlement":
    case "managed_deny":
      return " \xB7 Set by your organization";
    case "env":
      return " \xB7 Set by ANTHROPIC_DEFAULT_MODEL";
    case "served":
    case "tier":
      return "";
  }
}
//@ chunk-aepeg2w5.js:441497-441778 placement
function resolveDefaultMainLoopModelSetting() {
  let e = enforcedDefaultModels();
  if (e !== null && e.enforced)
    return {
      setting: e.setting,
      attribution: e.attribution,
    };
  let n = isServedCatalogActive();
  let resolvedOrgDefault = getResolvedOrgDefault();
  let s;
  if (n) s = null;
  else if (resolvedOrgDefault === undefined) {
    s = getResolvedOrgDefaultModel();
    if (s !== null) setResolvedOrgDefault(s);
  } else if (resolvedOrgDefault === null) s = null;
  else s = availableFamilyDefault(resolvedOrgDefault);
  if (s !== null)
    return {
      setting: s,
      attribution: "org",
    };
  return resolvePlanModeModel(e);
}
//@ chunk-aepeg2w5.js:441778-442245 placement
/**
 * 计划模式模型设置与来源。
 */
function resolvePlanModeModel(e) {
  let envDefaultModel = getEnvDefaultModel();
  if (envDefaultModel !== null)
    return {
      setting: envDefaultModel,
      attribution: "env",
    };
  let { setting, envFamily, concreteBaseline } = envDefaultModel_2();
  let y = isPublishedCatalogInUse();
  let S =
    e !== null &&
    !adminSteeringFor(envFamily) &&
    !getToolSearchBetaHeader(envFamily) &&
    !(y && isClaudeAISubscriber());
  if (S && !y)
    return {
      setting: e.setting,
      attribution: e.attribution,
    };
  let w = S ? e.setting : setting;
  let availableModels = resolveAvailableModels(w, envFamily, concreteBaseline);
  let x = availableModels ?? w;
  let P = familyDefaultFor(x);
  if (availableModels !== null)
    return {
      setting: P ?? availableModels,
      attribution: "enforced",
    };
  if (P !== null)
    return {
      setting: P,
      attribution: isModelEntitled(x) ? "managed_deny" : "entitlement",
    };
  return {
    setting: x,
    attribution: S ? e.attribution : "tier",
  };
}
//@ chunk-aepeg2w5.js:442245-442810 placement
/**
 * 强制的默认模型列表。
 */
function enforcedDefaultModels() {
  let e = orgDefaultModelState();
  let n =
    getAPIProvider() !== "firstParty"
      ? supportsFamilyOverride()
        ? activeProviderModelOverrides("default")
        : {}
      : null;
  let r =
    n !== null
      ? [n.perProvider, n.everywhere]
      : e?.enforced === true
        ? [e.model]
        : e?.accountResolved === true
          ? [e.model, ...getDefaultModelOverrides(e.model)]
          : [...getDefaultModelOverrides(e?.model), e?.model];
  let s = n !== null ? getProbeRefutedDocumentDefaults() : null;
  let h = new Set();
  for (let y of r) {
    if (y === undefined || h.has(y)) continue;
    h.add(y);
    if (s?.has(y)) continue;
    let S = catalogModelWarning(y);
    if (S !== undefined) {
      let w = y === e?.model;
      let R = isPublishedCatalogInUse() && !has1mSuffix(S) ? entryModelKey(S) : undefined;
      let x = R === undefined ? S : getModelStrings()[R];
      return {
        setting: R?.startsWith("opus") ? applyOpus1mOptIn(x) : x,
        attribution: w && e?.orgConfigured ? "org" : "served",
        enforced: w && e?.enforced === true,
      };
    }
  }
  return null;
}
//@ chunk-aepeg2w5.js:442810-443013 placement
function getDefaultModelOverrides(model) {
  let n = activeProviderModelOverrides("default");
  let r = model === undefined ? undefined : findServedModel(model);
  let s = r === undefined ? undefined : getRowFamily(r);
  let perProvider =
    s === "opus" || s === "sonnet" || s === "haiku" || s === "fable"
      ? activeProviderModelOverrides(s).perProvider
      : undefined;
  return [n.perProvider, perProvider, n.everywhere];
}
//@ chunk-aepeg2w5.js:443013-443433 placement
function cloudDocumentDefaultCandidates() {
  if (getAPIProvider() === "firstParty" || !supportsFamilyOverride()) return [];
  let { perProvider, everywhere } = activeProviderModelOverrides("default");
  let r = [];
  let s = new Set();
  for (let h of [perProvider, everywhere]) {
    if (h === undefined || s.has(h)) continue;
    s.add(h);
    let y = catalogModelWarning(h);
    if (y === undefined) continue;
    let lower = h.toLowerCase();
    let servedModel = findServedModel(h);
    let R = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)
      ? MODEL_KEY_BY_FIRST_PARTY_ID[lower]
      : entryModelKey(servedModel?.id ?? h);
    r.push({
      candidate: h,
      model: y,
      key: R,
      ...(servedModel !== undefined &&
        R === undefined &&
        hasDescribableCatalogModel(servedModel.id) && {
          overrideKey: servedModel.id,
        }),
      family: getRowFamily(
        servedModel ?? {
          id: h,
        },
      ),
      name: displayNameForModel(h, R),
    });
  }
  return r;
}
//@ chunk-aepeg2w5.js:443433-443639 placement
function documentNamesCloudDefault() {
  let e = activeServedCatalog();
  if (e === null || getAPIProvider() === "firstParty" || !supportsFamilyOverride()) return false;
  if (getEnvDefaultModel() !== null || adminSteeringFor(envDefaultModel_2().envFamily)) return false;
  let providerAliasTargets = getProviderAliasTargets(e, "default", providerCatalogKey(getAPIProvider()));
  return providerAliasTargets.perProvider !== undefined || providerAliasTargets.everywhere !== undefined;
}
//@ chunk-aepeg2w5.js:443639-444068 placement
/**
 * 目录模型的警告（未发布、提供商不支持）。
 */
function catalogModelWarning(e) {
  if (isModelKeyAlias(strip1mSuffix(e.trim().toLowerCase()).trim())) return;
  let servedModel = findServedModel(e);
  let providerModelId = resolveProviderModelId({
    id: e,
    provider_ids: servedModel?.provider_ids,
  });
  if (providerModelId === undefined) return;
  let s = servedModel === undefined ? undefined : getRowFamily(servedModel);
  if (
    servedModel !== undefined &&
    (isModelFamily(s) || s === "fable") &&
    entryModelKey(servedModel.id) === undefined &&
    getUltraplanModel(s, servedModel.id)
  )
    return;
  let h = new Set([e, parseUserSpecifiedModel(e)]);
  for (let S of h) if (!catalogSupportsPlanMode(S)) return;
  let y = providerModelId === e ? h : new Set([providerModelId]);
  for (let S of y)
    if (
      !isModelAllowed(S, {
        ignoreModelOverrides: true,
        envFreeAliasResolution: true,
      }) ||
      isUnavailableModel(S)
    )
      return;
  return providerModelId;
}
//@ chunk-aepeg2w5.js:444068-444215 placement
function getOrgLockedDefaultModel() {
  if (isServedCatalogActive()) {
    let e = enforcedDefaultModels();
    return e !== null && e.enforced
      ? {
          model: e.setting,
          kind: "org",
        }
      : null;
  }
  return getOrgModelDefault()?.override_user_selection ? getBootstrapOrgDefaultEffect() : null;
}
//@ chunk-aepeg2w5.js:444215-444296 placement
function adminSteeringFor(envFamily) {
  if (envFamily === null) return false;
  let adminSteering = getAdminSteering();
  return envFamily === "opus" ? adminSteering.opus : adminSteering.sonnet;
}
export {
  isModeDependentModelSetting,
  append1mSuffixIfMissing,
  getDefaultHaikuModel,
  getRuntimeMainLoopModel,
  isDeploymentVouchedModel,
  stepDownRestrictedFamilyAliasPick,
  planModeConstituentFamily,
  isOpusFableAdvisorSetting,
  getDefaultMainLoopModelSetting,
  resolveRuntimeMainLoopModel,
  isRecognizedOrgDefaultName,
  getResolvedOrgDefaultModel,
  resolveDefaultMainLoopModelSetting,
  getOrgLockedDefaultModel,
  getBootstrapOrgDefaultEffect,
  documentNamesCloudDefault,
  defaultModelAttributionSuffix,
  isUnavailableModel,
  defaultHaikuModel,
  planModeConstituentModel,
  cloudDocumentDefaultCandidates,
};
