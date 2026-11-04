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
function defaultHaikuModel(modelStrings = getModelStrings()) {
  return catalogFamilyDefaultKey("haiku", modelStrings) ?? modelStrings.haiku45;
}
//@ chunk-aepeg2w5.js:438426-438476 placement
function isModeDependentModelSetting(setting) {
  return setting === "opusplan" || setting === "haiku";
}
//@ chunk-aepeg2w5.js:438476-438585 placement
function planModeConstituentFamily(modelSetting) {
  if (modelSetting === "opusplan" || modelSetting === "opusplan[1m]") return "opus";
  if (modelSetting === "haiku") return "sonnet";
  return null;
}
//@ chunk-aepeg2w5.js:438585-438610 placement
function isOpusFableAdvisorSetting(setting) {
  return false;
}
//@ chunk-aepeg2w5.js:438610-438923 placement
function stepDownRestrictedFamilyAliasPick(spec) {
  let lower = spec.trim().toLowerCase();
  let trimmed = strip1mSuffix(lower).trim();
  if (!isBaseModelKey(trimmed) || !usesFirstPartyModelIds()) return null;
  let modelEntitlementDenySet = getModelEntitlementDenySet();
  if (
    !(getSettings_DEPRECATED() || {}).availableModels &&
    modelEntitlementDenySet.size === 0 &&
    !hasManagedModelDenies()
  )
    return null;
  let newest = newestAllowedInFamily(trimmed);
  if (
    newest === null ||
    !(isModelAllowedUnderActiveEnforcement(newest) ?? isModelAllowed(newest)) ||
    isModelDenied(newest, modelEntitlementDenySet)
  )
    return null;
  if (trimmed === lower) return newest;
  return (trimmed === "opus"
    ? shouldProbeThirdPartyDefaults()
    : trimmed === "sonnet"
      ? shouldProbeThirdPartyDefaultsAlt()
      : true) && eligible1mSuffixTarget(newest)
    ? strip1mTagWhereBuiltIn(`${newest}[1m]`)
    : newest;
}
//@ chunk-aepeg2w5.js:438923-439285 placement
function planModeConstituentModel(setting) {
  let family = planModeConstituentFamily(setting);
  if (family === null || setting === undefined || setting === null) return null;
  let had1m = setting === "opusplan[1m]";
  let model;
  if (family === "opus") {
    let defaultOpusModel = getDefaultOpusModel();
    model =
      had1m || opus1mMergeAddsTagTo(defaultOpusModel)
        ? strip1mTagWhereBuiltIn(append1mSuffixIfMissing(defaultOpusModel))
        : defaultOpusModel;
  } else model = getDefaultSonnetModel();
  if (
    (isModelAllowedUnderActiveEnforcement(model) ?? isModelAllowed(model)) &&
    !isModelDenied(model, getModelEntitlementDenySet())
  )
    return {
      model,
      clamp: "none",
    };
  let steppedDown = stepDownRestrictedFamilyAliasPick(
    family === "opus" ? (had1m || isOpus1mMergeEnabled() ? "opus[1m]" : "opus") : "sonnet",
  );
  if (steppedDown !== null)
    return {
      model: steppedDown,
      clamp: "stepDown",
    };
  return {
    model: parseUserSpecifiedModel(setting),
    clamp: "resting",
  };
}
//@ chunk-aepeg2w5.js:439285-439402 placement
function getRuntimeMainLoopModel(input) {
  let { model, clampWarning } = resolveRuntimeMainLoopModel(input);
  if (clampWarning !== null && !warnedEnforcementMessages().has(clampWarning)) {
    warnedEnforcementMessages().add(clampWarning);
    logForDebugging(clampWarning, {
      level: "warn",
    });
  }
  return model;
}
//@ chunk-aepeg2w5.js:439402-440260 placement
function resolveRuntimeMainLoopModel(input) {
  let { permissionMode, mainLoopModel, exceeds200kTokens = false } = input;
  if (permissionMode !== "plan")
    return {
      model: mainLoopModel,
      clampWarning: null,
    };
  let setting = input.setting === undefined ? getUserSpecifiedModelSetting() : input.setting;
  let family = planModeConstituentFamily(setting);
  if (family === null || (family === "opus" && exceeds200kTokens))
    return {
      model: mainLoopModel,
      clampWarning: null,
    };
  let constituent = planModeConstituentModel(setting);
  if (constituent === null)
    return {
      model: mainLoopModel,
      clampWarning: null,
    };
  if (constituent.clamp === "none")
    return {
      model: constituent.model,
      clampWarning: null,
    };
  let settingLabel = family === "opus" ? "opusplan upgrade" : "haiku plan upgrade";
  let clampWarning =
    constituent.clamp === "stepDown"
      ? `Plan mode: the ${settingLabel} model is not permitted by the org model restrictions (availableModels, deniedModels or model_access entitlement); planning uses the newest permitted ${family === "opus" ? "Opus" : "Sonnet"} instead`
      : `Plan mode: the ${settingLabel} model is not permitted by the org model restrictions (availableModels, deniedModels or model_access entitlement); planning uses the resting model instead`;
  return {
    model: constituent.model,
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
    let warning = `Org default model "${orgModelDefault.name}" is not one this build recognizes; using the standard default instead`;
    if (!warnedEnforcementMessages().has(warning)) {
      warnedEnforcementMessages().add(warning);
      logForDebugging(warning, {
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
      (option) => typeof option.value === "string" && sameModelSpelling(option.value, modelId),
    ) ||
    getGatewayModelOptions().some(
      (option) => typeof option.value === "string" && sameModelSpelling(option.value, modelId),
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
function isUnavailableModel(model) {
  return (
    supportsFamilyOverride() &&
    getModelUnavailabilityReason(model, {
      ignoreModelOverrides: true,
    }) !== null
  );
}
//@ chunk-aepeg2w5.js:441154-441220 placement
function availableFamilyDefault(model) {
  let resolved = resolveAvailableModels(model, null) ?? model;
  let familyDefault = familyDefaultFor(resolved) ?? resolved;
  return isUnavailableModel(familyDefault) ? null : familyDefault;
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
  let enforced = enforcedDefaultModels();
  if (enforced !== null && enforced.enforced)
    return {
      setting: enforced.setting,
      attribution: enforced.attribution,
    };
  let servedActive = isServedCatalogActive();
  let model = getResolvedOrgDefault();
  let orgDefault;
  if (servedActive) orgDefault = null;
  else if (model === undefined) {
    orgDefault = getResolvedOrgDefaultModel();
    if (orgDefault !== null) setResolvedOrgDefault(orgDefault);
  } else if (model === null) orgDefault = null;
  else orgDefault = availableFamilyDefault(model);
  if (orgDefault !== null)
    return {
      setting: orgDefault,
      attribution: "org",
    };
  return resolvePlanModeModel(enforced);
}
//@ chunk-aepeg2w5.js:441778-442245 placement
/**
 * 计划模式模型设置与来源。
 */
function resolvePlanModeModel(enforced) {
  let envDefaultModel = getEnvDefaultModel();
  if (envDefaultModel !== null)
    return {
      setting: envDefaultModel,
      attribution: "env",
    };
  let { setting, envFamily, concreteBaseline } = envDefaultModel_2();
  let publishedInUse = isPublishedCatalogInUse();
  let trustEnforced =
    enforced !== null &&
    !adminSteeringFor(envFamily) &&
    !getToolSearchBetaHeader(envFamily) &&
    !(publishedInUse && isClaudeAISubscriber());
  if (trustEnforced && !publishedInUse)
    return {
      setting: enforced.setting,
      attribution: enforced.attribution,
    };
  let baseSetting = trustEnforced ? enforced.setting : setting;
  let availableModels = resolveAvailableModels(baseSetting, envFamily, concreteBaseline);
  let resolvedSetting = availableModels ?? baseSetting;
  let familyDefault = familyDefaultFor(resolvedSetting);
  if (availableModels !== null)
    return {
      setting: familyDefault ?? availableModels,
      attribution: "enforced",
    };
  if (familyDefault !== null)
    return {
      setting: familyDefault,
      attribution: isModelEntitled(resolvedSetting) ? "managed_deny" : "entitlement",
    };
  return {
    setting: resolvedSetting,
    attribution: trustEnforced ? enforced.attribution : "tier",
  };
}
//@ chunk-aepeg2w5.js:442245-442810 placement
/**
 * 强制的默认模型列表。
 */
function enforcedDefaultModels() {
  let orgState = orgDefaultModelState();
  let providerOverrides =
    getAPIProvider() !== "firstParty"
      ? supportsFamilyOverride()
        ? activeProviderModelOverrides("default")
        : {}
      : null;
  let candidates =
    providerOverrides !== null
      ? [providerOverrides.perProvider, providerOverrides.everywhere]
      : orgState?.enforced === true
        ? [orgState.model]
        : orgState?.accountResolved === true
          ? [orgState.model, ...getDefaultModelOverrides(orgState.model)]
          : [...getDefaultModelOverrides(orgState?.model), orgState?.model];
  let refuted = providerOverrides !== null ? getProbeRefutedDocumentDefaults() : null;
  let seen = new Set();
  for (let candidate of candidates) {
    if (candidate === undefined || seen.has(candidate)) continue;
    seen.add(candidate);
    if (refuted?.has(candidate)) continue;
    let modelId = catalogModelWarning(candidate);
    if (modelId !== undefined) {
      let isOrgModel = candidate === orgState?.model;
      let key = isPublishedCatalogInUse() && !has1mSuffix(modelId) ? entryModelKey(modelId) : undefined;
      let value = key === undefined ? modelId : getModelStrings()[key];
      return {
        setting: key?.startsWith("opus") ? applyOpus1mOptIn(value) : value,
        attribution: isOrgModel && orgState?.orgConfigured ? "org" : "served",
        enforced: isOrgModel && orgState?.enforced === true,
      };
    }
  }
  return null;
}
//@ chunk-aepeg2w5.js:442810-443013 placement
function getDefaultModelOverrides(model) {
  let defaultOverrides = activeProviderModelOverrides("default");
  let served = model === undefined ? undefined : findServedModel(model);
  let family = served === undefined ? undefined : getRowFamily(served);
  let perProvider =
    family === "opus" || family === "sonnet" || family === "haiku" || family === "fable"
      ? activeProviderModelOverrides(family).perProvider
      : undefined;
  return [defaultOverrides.perProvider, perProvider, defaultOverrides.everywhere];
}
//@ chunk-aepeg2w5.js:443013-443433 placement
function cloudDocumentDefaultCandidates() {
  if (getAPIProvider() === "firstParty" || !supportsFamilyOverride()) return [];
  let { perProvider, everywhere } = activeProviderModelOverrides("default");
  let candidates = [];
  let seen = new Set();
  for (let candidate of [perProvider, everywhere]) {
    if (candidate === undefined || seen.has(candidate)) continue;
    seen.add(candidate);
    let modelId = catalogModelWarning(candidate);
    if (modelId === undefined) continue;
    let lower = candidate.toLowerCase();
    let servedModel = findServedModel(candidate);
    let key = Object.hasOwn(MODEL_KEY_BY_FIRST_PARTY_ID, lower)
      ? MODEL_KEY_BY_FIRST_PARTY_ID[lower]
      : entryModelKey(servedModel?.id ?? candidate);
    candidates.push({
      candidate,
      model: modelId,
      key,
      ...(servedModel !== undefined &&
        key === undefined &&
        hasDescribableCatalogModel(servedModel.id) && {
          overrideKey: servedModel.id,
        }),
      family: getRowFamily(
        servedModel ?? {
          id: candidate,
        },
      ),
      name: displayNameForModel(candidate, key),
    });
  }
  return candidates;
}
//@ chunk-aepeg2w5.js:443433-443639 placement
function documentNamesCloudDefault() {
  let catalog = activeServedCatalog();
  if (catalog === null || getAPIProvider() === "firstParty" || !supportsFamilyOverride()) return false;
  if (getEnvDefaultModel() !== null || adminSteeringFor(envDefaultModel_2().envFamily)) return false;
  let providerAliasTargets = getProviderAliasTargets(
    catalog,
    "default",
    providerCatalogKey(getAPIProvider()),
  );
  return providerAliasTargets.perProvider !== undefined || providerAliasTargets.everywhere !== undefined;
}
//@ chunk-aepeg2w5.js:443639-444068 placement
/**
 * 目录模型的警告（未发布、提供商不支持）。
 */
function catalogModelWarning(setting) {
  if (isModelKeyAlias(strip1mSuffix(setting.trim().toLowerCase()).trim())) return;
  let servedModel = findServedModel(setting);
  let providerModelId = resolveProviderModelId({
    id: setting,
    provider_ids: servedModel?.provider_ids,
  });
  if (providerModelId === undefined) return;
  let family = servedModel === undefined ? undefined : getRowFamily(servedModel);
  if (
    servedModel !== undefined &&
    (isModelFamily(family) || family === "fable") &&
    entryModelKey(servedModel.id) === undefined &&
    getUltraplanModel(family, servedModel.id)
  )
    return;
  let specs = new Set([setting, parseUserSpecifiedModel(setting)]);
  for (let spec of specs) if (!catalogSupportsPlanMode(spec)) return;
  let candidates = providerModelId === setting ? specs : new Set([providerModelId]);
  for (let candidate of candidates)
    if (
      !isModelAllowed(candidate, {
        ignoreModelOverrides: true,
        envFreeAliasResolution: true,
      }) ||
      isUnavailableModel(candidate)
    )
      return;
  return providerModelId;
}
//@ chunk-aepeg2w5.js:444068-444215 placement
function getOrgLockedDefaultModel() {
  if (isServedCatalogActive()) {
    let enforced = enforcedDefaultModels();
    return enforced !== null && enforced.enforced
      ? {
          model: enforced.setting,
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
