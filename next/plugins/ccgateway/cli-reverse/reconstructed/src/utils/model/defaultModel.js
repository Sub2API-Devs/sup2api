/**
 * utils/model/defaultModel.ts
 *
 * 2.1.316 新增：结合 availableModels 与强制策略解析可用模型；模型强制策略状态（active/inactive/refused）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (24)
 * attribution: placement 24
 */
import {
  getModelEntitlementDenySet,
  isModelDenied,
  isModelAllowed,
  newestAllowedInFamilyForProvider,
  isBlockedByManagedModelPolicy,
  isModelDeniedByManagedSettings,
  aliasExpansionPermitted,
} from "./modelAllowlist.js";
import {
  getDefaultOpusModel,
  getDefaultSonnetModel,
  isFableFamilyOrPinnedModel,
  DEFAULT_MANTLE_OPUS_KEY,
  isLegacyOpusFirstParty,
  getDefaultOpusBuiltin,
  strip1mTag,
  isServedExpandedSpelling,
} from "./model.js";
import {
  getDefaultHaikuModel,
  isModeDependentModelSetting,
  isOpusFableAdvisorSetting,
  isUnavailableModel,
  resolveDefaultMainLoopModelSetting,
  append1mSuffixIfMissing,
  defaultHaikuModel,
} from "./planModeModel.js";
import { getCanonicalName } from "./canonicalModelName.js";
import {
  parseUserSpecifiedModel,
  isOpusDefaultSubscriber,
  applyOpus1mOptIn,
  isOpus1mMergeEnabled,
} from "./modelDisplay.js";
import { logForDebugging } from "../debug.js";
import {
  getSettingsForSource,
  getSettings_DEPRECATED,
  getFatalAdminPolicyLoadErrors,
  isPermissionDeniedPolicyError,
  adminPolicyLoadFailureRefusesLaunch,
  getPolicySettingsOrigin,
  getPairedPolicyModelOverrides,
} from "../settings/settings.js";
import {
  strip1mSuffix,
  isBaseModelKey,
  isModelKeyAlias,
  parseModelId,
  normalizeDottedVersion,
} from "./modelIds.js";
import { getInitialEnvDefaultModel } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getUserSpecifiedModelSetting, isSonnetOnlySteering } from "./smallFastModel.js";
import { isClaudeAISubscriber } from "../auth.js";
import { usesFirstPartyModelIds, getAPIProvider, isFirstPartyApiBackend } from "./providers.js";
import { getModelStrings, getRawModelStrings } from "./modelStrings.js";
import { firstPartyNameToCanonical, getDefaultMainLoopModel } from "./modelFallback.js";
import { has1mSuffix_2, isLegacyNo1mModel } from "./contextWindow1m.js";
import { resolveBuiltinAlias } from "./aliases.js";
import { VERSIONED_MODEL_RE } from "../toolErrors.js";
import { getDefaultSonnetBuiltin } from "./modelOptions.js";
import { getProviderState } from "./providerCaches.js";
import { BEDROCK_REGION_PREFIXES } from "./bedrock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:444410-444950 placement
/**
 * 被限制模型的同族默认。
 */
function familyDefaultFor(model) {
  let modelEntitlementDenySet = getModelEntitlementDenySet();
  if (
    !(modelEntitlementDenySet.size > 0 && isModelDenied(model, modelEntitlementDenySet)) &&
    !isBlockedByManagedModelPolicySafe(model)
  )
    return null;
  let familyDefaults = [
    {
      family: "opus",
      model: getDefaultOpusModel(),
    },
    {
      family: "sonnet",
      model: getDefaultSonnetModel(),
    },
    {
      family: "haiku",
      model: getDefaultHaikuModel(),
    },
  ];
  let canonicalName = getCanonicalName(parseUserSpecifiedModel(model));
  let index = familyDefaults.findIndex((entry) => canonicalName.includes(entry.family));
  let startIndex = index !== -1 ? index : isFableFamilyOrPinnedModel(parseUserSpecifiedModel(model)) ? 0 : 1;
  for (let { family, model } of familyDefaults.slice(startIndex)) {
    if (isModelAllowed(model)) return model;
    let newer = newestAllowedInFamilyForProvider(family);
    if (newer !== null) return newer;
  }
  if (!isBlockedByManagedModelPolicySafe(model)) return null;
  let listedModel = availableModelsFamilies();
  if (listedModel === null)
    logForDebugging(
      `managed settings (deniedModels or an exact-match availableModels) block the default model ${model} and every model it could fall back to`,
      {
        level: "warn",
      },
    );
  return listedModel;
}
//@ chunk-aepeg2w5.js:444950-445402 placement
/**
 * 托管 availableModels 中的模型族。
 */
function availableModelsFamilies() {
  let allowlist;
  let exactMatch;
  try {
    let settingsForSource = getSettingsForSource("policySettings");
    allowlist = settingsForSource?.availableModels;
    exactMatch = settingsForSource?.availableModelsMatch === "exact";
  } catch {
    return null;
  }
  for (let entry of allowlist ?? []) {
    let lower = strip1mSuffix(entry.trim().toLowerCase());
    if (lower === "") continue;
    let replaced = lower.replace(/^claude-/, "");
    let familyKey = isBaseModelKey(lower) ? lower : exactMatch && isBaseModelKey(replaced) ? replaced : null;
    if (familyKey !== null) {
      let newer = newestAllowedInFamilyForProvider(familyKey);
      if (newer !== null) return newer;
      continue;
    }
    if (isModelKeyAlias(lower) || lower === "default") continue;
    let candidate =
      parseModelId(lower) !== null
        ? lower
        : parseModelId(`claude-${lower}`) !== null
          ? `claude-${lower}`
          : entry.trim();
    if (isOpaqueModelId(candidate) && isModelAllowed(candidate)) return candidate;
  }
  return null;
}
//@ chunk-aepeg2w5.js:445402-445451 placement
/**
 * isBlockedByManagedModelPolicy 的安全包装（异常按受限处理）。
 */
function isBlockedByManagedModelPolicySafe(model) {
  try {
    return isBlockedByManagedModelPolicy(model);
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:445451-445500 placement
/**
 * isModelDeniedByManagedSettings 的安全包装（异常按拒绝处理）。
 */
function isModelDeniedByManagedSafe(model) {
  try {
    return isModelDeniedByManagedSettings(model);
  } catch {
    return true;
  }
}
//@ chunk-aepeg2w5.js:445500-445549 placement
/**
 * 同上，但异常按未拒绝处理。
 */
function isModelDeniedByManagedFalse(model) {
  try {
    return isModelDeniedByManagedSettings(model);
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:445549-445602 placement
/**
 * 判断模型是否在权益允许范围内。
 */
function isModelEntitled(model) {
  let modelEntitlementDenySet = getModelEntitlementDenySet();
  return !(modelEntitlementDenySet.size > 0 && isModelDenied(model, modelEntitlementDenySet));
}
//@ chunk-aepeg2w5.js:445602-445939 placement
function getEnvDefaultModel() {
  let initialEnvDefaultModel = getInitialEnvDefaultModel();
  let candidate = initialEnvDefaultModel === undefined ? env.ANTHROPIC_DEFAULT_MODEL : initialEnvDefaultModel;
  if (candidate == null) return null;
  let lower = candidate.trim().toLowerCase();
  if (lower === "default" || lower === "inherit") return null;
  if (isModeDependentModelSetting(strip1mSuffix(lower))) return null;
  if (isOpusFableAdvisorSetting(lower)) return null;
  if (
    getModelEnforcementState().state !== "inactive" ||
    getSettings_DEPRECATED()?.enforceAvailableModels === true
  )
    return null;
  if (!isModelAllowed(candidate)) return null;
  if (isUnavailableModel(candidate)) return null;
  return candidate;
}
//@ chunk-aepeg2w5.js:445939-445999 placement
function isEnvDefaultModelGoverning() {
  return getUserSpecifiedModelSetting() == null && resolveDefaultMainLoopModelSetting().attribution === "env";
}
//@ chunk-aepeg2w5.js:445999-446390 placement
/**
 * 环境决定的默认模型设置。
 */
function envDefaultModel_2() {
  if (isClaudeAISubscriber()) {
    if (isOpusDefaultSubscriber())
      return {
        setting: applyOpus1mOptIn(getDefaultOpusModel()),
        envFamily: "opus",
      };
  } else if (usesFirstPartyModelIds())
    return {
      setting: applyOpus1mOptIn(getDefaultOpusModel()),
      envFamily: "opus",
    };
  let apiProvider = getAPIProvider();
  if (apiProvider === "mantle")
    return {
      setting: getModelStrings()[DEFAULT_MANTLE_OPUS_KEY],
      envFamily: null,
      concreteBaseline: String(getRawModelStrings()[DEFAULT_MANTLE_OPUS_KEY]),
    };
  if (apiProvider === "bedrock" || apiProvider === "vertex") {
    if (isSonnetOnlySteering())
      return {
        setting: getDefaultSonnetModel(),
        envFamily: "sonnet",
      };
    return {
      setting: getDefaultOpusModel(),
      envFamily: "opus",
    };
  }
  return {
    setting: getDefaultSonnetModel(),
    envFamily: "sonnet",
  };
}
//@ chunk-aepeg2w5.js:446390-450425 placement
/**
 * 结合 availableModels 与强制策略解析可用模型。
 */
function resolveAvailableModels(model, envFamily, concreteBaseline) {
  let settings = getSettings_DEPRECATED() || {};
  let { availableModels, enforceAvailableModels } = settings;
  let overridesMap = {};
  let modelEnforcementState = getModelEnforcementState();
  if (modelEnforcementState.state === "refused") return null;
  let cascadeTrusted = modelEnforcementState.state === "inactive" && modelEnforcementState.cascadeTrusted;
  if (modelEnforcementState.state === "active") {
    availableModels = modelEnforcementState.allowlist;
    enforceAvailableModels = true;
    overridesMap = modelEnforcementState.overridesMap;
  } else if (!modelEnforcementState.cascadeTrusted) return null;
  if (!enforceAvailableModels) return null;
  if (cascadeTrusted && Object.keys(overridesMap).length === 0 && settings.modelOverrides)
    overridesMap = settings.modelOverrides;
  if (!availableModels || availableModels.length === 0) return null;
  let resolutionOptions = {
    overridesMap,
    envFreeAliasResolution: true,
    allowlist: availableModels,
  };
  let suffixOptions = {
    overridesMap,
  };
  let mappedValueFor = (modelId) => {
    let canonical = firstPartyNameToCanonical(strip1mSuffix(modelId));
    for (let [key, value] of Object.entries(overridesMap))
      if (firstPartyNameToCanonical(strip1mSuffix(key)) === canonical) return value;
    return;
  };
  let adoptEntry = (entry, options) => {
    let strippedEntry = strip1mSuffix(entry);
    if (options?.isConcreteEntry) return entry;
    let mapped = mappedValueFor(strippedEntry);
    if (!mapped?.trim()) return entry;
    mapped = mapped.trim();
    {
      let lower = strip1mSuffix(mapped).trim().toLowerCase();
      let had1m = has1mSuffix_2(mapped);
      let builtin = isModelKeyAlias(lower) ? resolveBuiltinAlias(lower) : null;
      if (builtin !== null) mapped = had1m ? append1mSuffixIfMissing(builtin) : builtin;
      else {
        let opusKey = lower.startsWith("claude-") ? lower : `claude-${lower}`;
        if (isLegacyOpusFirstParty(opusKey) && usesFirstPartyModelIds()) {
          let defaultOpusBuiltin = getDefaultOpusBuiltin(getRawModelStrings());
          mapped = had1m ? append1mSuffixIfMissing(defaultOpusBuiltin) : defaultOpusBuiltin;
        }
      }
    }
    if (isUnavailableModel(strip1mSuffix(mapped))) {
      let warning = `enforceAvailableModels: the managed modelOverrides target "${mapped}" is server-unavailable; using the unmapped candidate`;
      if (!warnedEnforcementMessages().has(warning)) {
        warnedEnforcementMessages().add(warning);
        logForDebugging(warning, {
          level: "warn",
        });
      }
      return entry;
    }
    if (strippedEntry !== entry)
      return eligible1mSuffixTarget(mapped, suffixOptions)
        ? append1mSuffixIfMissing(mapped)
        : strip1mTag(mapped);
    if (has1mSuffix_2(mapped) && !eligible1mSuffixTarget(mapped, suffixOptions)) return strip1mTag(mapped);
    return mapped;
  };
  let steered = null;
  let unavailableSteered = null;
  let rawModel = String(model);
  let requestedLower = strip1mSuffix(rawModel.trim().toLowerCase());
  let requestedHad1m = has1mSuffix_2(model);
  let requestedKey = requestedLower.startsWith("claude-") ? requestedLower : `claude-${requestedLower}`;
  let requestedBuiltin = isLegacyOpusFirstParty(requestedKey)
    ? getDefaultOpusBuiltin(getRawModelStrings())
    : resolveBuiltinAlias(requestedLower);
  if (requestedBuiltin !== null) {
    let candidate =
      requestedLower !== rawModel.trim().toLowerCase() &&
      eligible1mSuffixTarget(requestedBuiltin, suffixOptions)
        ? append1mSuffixIfMissing(requestedBuiltin)
        : strip1mSuffix(requestedBuiltin);
    let userSpecifiedModel = parseUserSpecifiedModel(rawModel);
    if (strip1mSuffix(userSpecifiedModel) !== strip1mSuffix(requestedBuiltin)) steered = candidate;
    if (isModelAllowed(candidate, resolutionOptions))
      if (strip1mSuffix(userSpecifiedModel) !== strip1mSuffix(requestedBuiltin)) {
        if (!isUnavailableModel(candidate)) return adoptEntry(candidate);
        unavailableSteered = candidate;
      } else return null;
  } else {
    let rawModelStrings = getRawModelStrings();
    let tierEnvTable = getTierEnvTable(rawModelStrings);
    if (envFamily !== undefined) {
      if (envFamily !== null) {
        let found = tierEnvTable.find(([tier]) => tier === envFamily);
        if (found === undefined) throw Error(`steeringVarTable has no row for tier family "${envFamily}"`);
        let getter = found[3];
        let tierModel = getter();
        if (typeof tierModel === "string" && strip1mSuffix(tierModel).toLowerCase() !== requestedLower) {
          let steeredModel = getter();
          steered =
            requestedHad1m && eligible1mSuffixTarget(steeredModel, suffixOptions)
              ? append1mSuffixIfMissing(steeredModel)
              : steeredModel;
        }
      }
      if (
        envFamily === null &&
        concreteBaseline !== undefined &&
        strip1mSuffix(concreteBaseline).toLowerCase() !== requestedLower
      )
        steered = concreteBaseline;
    } else {
      let matchedTierIndex = (() => {
        for (let [, , tierIndex, getter] of tierEnvTable) {
          let tierModel = getter();
          if (typeof tierModel === "string" && strip1mSuffix(tierModel).toLowerCase() === requestedLower)
            return tierIndex;
        }
        return null;
      })();
      let rows = tierEnvTable;
      for (let [, tierCanonical, tierIndex, getter] of rows) {
        if (
          tierCanonical === undefined ||
          strip1mSuffix(tierCanonical.trim().toLowerCase()) !== requestedLower
        )
          continue;
        if (matchedTierIndex !== null && matchedTierIndex <= tierIndex) continue;
        {
          let tierModel = getter();
          steered =
            requestedHad1m && eligible1mSuffixTarget(tierModel, suffixOptions)
              ? append1mSuffixIfMissing(tierModel)
              : tierModel;
        }
        break;
      }
    }
    if (isModelAllowed(model, resolutionOptions)) return null;
  }
  let skipped = [];
  if (unavailableSteered !== null) {
    let entry = unavailableSteered;
    skipped.push({
      entry,
      adopt: () => adoptEntry(entry),
    });
  }
  for (let availableModel of availableModels) {
    let trimmed = availableModel.trim();
    if (!trimmed) continue;
    let lower = trimmed.toLowerCase();
    let stripped = strip1mSuffix(lower);
    let builtinAlias = resolveBuiltinAlias(stripped);
    if (builtinAlias !== null) {
      let candidate =
        lower !== stripped && eligible1mSuffixTarget(builtinAlias, suffixOptions)
          ? append1mSuffixIfMissing(builtinAlias)
          : builtinAlias;
      if (isOpaqueModelId(candidate) && isModelAllowed(candidate, resolutionOptions)) {
        if (!isUnavailableModel(candidate)) return adoptEntry(candidate);
        skipped.push({
          entry: trimmed,
          adopt: () => adoptEntry(candidate),
        });
      }
      continue;
    }
    let lowerStripped = strip1mSuffix(lower);
    let key = lowerStripped.startsWith("claude-") ? lowerStripped : `claude-${lowerStripped}`;
    if (isLegacyOpusFirstParty(key) && usesFirstPartyModelIds()) {
      let defaultOpusBuiltin = getDefaultOpusBuiltin(getRawModelStrings());
      let candidate =
        lower !== lowerStripped && eligible1mSuffixTarget(defaultOpusBuiltin, suffixOptions)
          ? append1mSuffixIfMissing(defaultOpusBuiltin)
          : defaultOpusBuiltin;
      if (!isUnavailableModel(candidate)) return adoptEntry(candidate);
      skipped.push({
        entry: trimmed,
        adopt: () => adoptEntry(candidate),
      });
      continue;
    }
    let needsPrefix =
      getAPIProvider() !== "foundry" && !lower.startsWith("claude-") && VERSIONED_MODEL_RE.test(lower);
    let isFirstPartyShape = needsPrefix || (getAPIProvider() !== "foundry" && lower.startsWith("claude-"));
    let modelId = parseUserSpecifiedModel(
      needsPrefix ? `claude-${lower}` : isFirstPartyShape ? lower : trimmed,
    );
    let lower_2 = strip1mSuffix(modelId).toLowerCase();
    if (
      isFirstPartyShape &&
      !/[-@]\d{8}$/.test(lower_2) &&
      firstPartyNameToCanonical(lower_2) !== normalizeDottedVersion(lower_2)
    )
      continue;
    if (!isOpaqueModelId(modelId)) continue;
    let isConcreteEntry = !isFirstPartyShape || /[-@]\d{8}$/.test(lower_2);
    if (isModelAllowed(modelId, resolutionOptions)) {
      let adopt = () => {
        let strippedModel = strip1mTag(modelId);
        if (strippedModel !== modelId)
          return adoptEntry(eligible1mSuffixTarget(modelId, suffixOptions) ? modelId : strippedModel, {
            isConcreteEntry,
          });
        return adoptEntry(modelId, {
          isConcreteEntry,
        });
      };
      if (!isUnavailableModel(modelId)) return adopt();
      skipped.push({
        entry: trimmed,
        adopt,
      });
    }
  }
  let mappedSteered = steered !== null ? mappedValueFor(steered) : undefined;
  let isAdminMapped =
    mappedSteered !== undefined &&
    strip1mSuffix(mappedSteered).trim().toLowerCase() === strip1mSuffix(model).trim().toLowerCase();
  let reason =
    steered !== null
      ? isAdminMapped
        ? "tier default is the admin-mapped value \u2014 pinning its canonical builtin (the policy mapping re-applies at the exit)"
        : "user steering detected \u2014 pinning the env-free tier builtin (policy-mapped if applicable)"
      : "keeping the tier default";
  let firstSkipped = isFirstPartyApiBackend() ? undefined : skipped[0];
  let choiceReason =
    firstSkipped !== undefined
      ? "using the first of them (off the first-party API the published document does not move the Default outside the list)"
      : reason;
  let warning =
    skipped.length > 0
      ? `enforceAvailableModels: no availableModels entry survived; ${skipped.length} entr${skipped.length === 1 ? "y was" : "ies were"} allowed but skipped as server-unavailable (${skipped.map((entry) => entry.entry).join(", ")}); ${choiceReason}`
      : `enforceAvailableModels: no availableModels entry expands to an allowed model; ${reason}`;
  if (!warnedEnforcementMessages().has(warning)) {
    warnedEnforcementMessages().add(warning);
    logForDebugging(warning, {
      level: "warn",
    });
  }
  if (firstSkipped !== undefined) return firstSkipped.adopt();
  return steered !== null ? adoptEntry(steered) : null;
}
//@ chunk-aepeg2w5.js:450425-450565 placement (2.1.88 match: getFastModeModel, 0.455)
/**
 * 判断别名解析出的模型是否应加 [1m]：旧模型或非 claude- 前缀按规则；opus 在第一方时看 isOpus1mMergeEnabled。旧版名 getFastModeModel 为错配，应归 utils/model/model.ts。
 */
function eligible1mSuffixTarget(model, options) {
  if (isKnownNon1mTarget(model, options)) return false;
  let canonical = firstPartyNameToCanonical(strip1mTag(model).trim());
  if (!canonical.startsWith("claude-")) return true;
  return canonical.includes("opus") && usesFirstPartyModelIds() ? isOpus1mMergeEnabled() : true;
}
//@ chunk-aepeg2w5.js:450565-450738 placement (2.1.88 match: modelMatchesVersionPrefix, 0.776)
/**
 * 去掉 [1m] 后的规范名是否为不支持 1M 合并的旧模型（3.x、opus-4-0/4-1/4-5、haiku-4-5）。
 */
function isKnownNon1mTarget(model, entry) {
  let trimmed = model.trim();
  let trimmed_2 = strip1mTag(trimmed).trim();
  let canonical = firstPartyNameToCanonical(trimmed_2);
  if (canonical.startsWith("claude-")) return isLegacyNo1mModel(canonical);
  if (isLegacyNo1mModel(getCanonicalName(trimmed_2, entry))) return true;
  return (
    trimmed_2 !== trimmed && entry?.overridesMap === undefined && isLegacyNo1mModel(getCanonicalName(trimmed))
  );
}
//@ chunk-aepeg2w5.js:450738-450923 placement (2.1.88 match: aliasMatchesParentTier, 0.756)
/**
 * [族, ANTHROPIC_DEFAULT_*_MODEL 值, 序号, 内置默认取值函数]（haiku/sonnet/opus）。
 */
function getTierEnvTable(modelStrings) {
  return [
    ["haiku", env.ANTHROPIC_DEFAULT_HAIKU_MODEL, 0, () => defaultHaikuModel(modelStrings)],
    ["sonnet", env.ANTHROPIC_DEFAULT_SONNET_MODEL, 1, () => getDefaultSonnetBuiltin(modelStrings)],
    ["opus", env.ANTHROPIC_DEFAULT_OPUS_MODEL, 2, () => getDefaultOpusBuiltin(modelStrings)],
  ];
}
//@ chunk-aepeg2w5.js:450923-450975 placement
/**
 * 取已提示过的模型强制策略消息集合。
 */
function warnedEnforcementMessages() {
  return getProviderState().warnedEnforcementMessages;
}
//@ chunk-aepeg2w5.js:450975-453361 placement
/**
 * 模型强制策略状态（active/inactive/refused）。
 */
function getModelEnforcementState() {
  try {
    let filtered = getFatalAdminPolicyLoadErrors().filter((error) => !isPermissionDeniedPolicyError(error));
    let settingsForSource = getSettingsForSource("policySettings");
    let warnAboutFailedSource = (tierSurvives) => {
      if (!settingsForSource || filtered.length === 0) return;
      let warning = tierSurvives
        ? "enforceAvailableModels: an admin policy source failed to load; enforcing the surviving admin tier (the failed source may carry a different policy \u2014 fix it to restore full coverage)"
        : "enforceAvailableModels: an admin policy source failed to load and the surviving admin tier carries no model policy \u2014 model enforcement is OFF; the failed source may have carried it";
      if (!warnedEnforcementMessages().has(warning)) {
        warnedEnforcementMessages().add(warning);
        logForDebugging(warning, {
          level: "warn",
        });
      }
    };
    if (adminPolicyLoadFailureRefusesLaunch()) {
      if (
        !warnedEnforcementMessages().has(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
        )
      ) {
        warnedEnforcementMessages().add(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
        );
        logForDebugging(
          "enforceAvailableModels: a policy source exists but failed to load; refusing cascade-trust mode (model enforcement from user/project settings is disabled until the policy source is fixed)",
          {
            level: "warn",
          },
        );
      }
      return {
        state: "refused",
      };
    }
    if (!settingsForSource)
      return {
        state: "inactive",
        cascadeTrusted: true,
      };
    let { availableModels, enforceAvailableModels, modelOverrides } = settingsForSource;
    if (
      filtered.length === 0 &&
      availableModels === undefined &&
      enforceAvailableModels === undefined &&
      modelOverrides === undefined &&
      (getPolicySettingsOrigin() === "hkcu" || getPolicySettingsOrigin() === "parent")
    )
      return {
        state: "inactive",
        cascadeTrusted: true,
      };
    if (enforceAvailableModels && availableModels === undefined) {
      if (
        !warnedEnforcementMessages().has(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
        )
      ) {
        warnedEnforcementMessages().add(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
        );
        logForDebugging(
          "enforceAvailableModels: the policy view sets the enforce flag but not availableModels; enforcement is disabled (the flag requires a policy-owned allowlist)",
          {
            level: "warn",
          },
        );
      }
      warnAboutFailedSource(false);
      return {
        state: "inactive",
        cascadeTrusted: false,
      };
    }
    if (enforceAvailableModels !== true || availableModels === undefined || availableModels.length === 0) {
      warnAboutFailedSource(false);
      return {
        state: "inactive",
        cascadeTrusted: false,
      };
    }
    warnAboutFailedSource(true);
    return {
      state: "active",
      allowlist: availableModels,
      overridesMap: modelOverrides ?? getPairedPolicyModelOverrides() ?? {},
    };
  } catch (error) {
    let warning = `enforceAvailableModels: policy-tier settings read failed; refusing cascade-trust mode: ${error instanceof Error ? error.message : String(error)}`;
    if (!warnedEnforcementMessages().has(warning)) {
      warnedEnforcementMessages().add(warning);
      logForDebugging(warning, {
        level: "warn",
      });
    }
    return {
      state: "refused",
    };
  }
}
//@ chunk-aepeg2w5.js:453361-453647 placement
function isModelAllowedUnderActiveEnforcement(model) {
  let modelEnforcementState = getModelEnforcementState();
  if (modelEnforcementState.state === "refused") return false;
  if (modelEnforcementState.state === "inactive") return null;
  let options = {
    allowlist: modelEnforcementState.allowlist,
    overridesMap: modelEnforcementState.overridesMap,
    envFreeAliasResolution: true,
  };
  if (!isModelAllowed(model, options)) return false;
  let trimmed = strip1mSuffix(model.trim().toLowerCase()).trim();
  return (
    !(
      isModelKeyAlias(trimmed) ||
      isServedExpandedSpelling(trimmed) ||
      (usesFirstPartyModelIds() && isLegacyOpusFirstParty(trimmed))
    ) || aliasExpansionPermitted(trimmed, options)
  );
}
//@ chunk-aepeg2w5.js:453647-453724 placement
function isModelAdmittedByAvailableModels(model) {
  return (
    isModelAllowedUnderActiveEnforcement(model) ??
    (isModelAllowed(model, {
      skipEntitlementDenyOverlay: true,
    }) ||
      isExemptDefaultResolvingPick(model))
  );
}
//@ chunk-aepeg2w5.js:453724-453773 placement
function isPermittedByOrgModelPolicy(model) {
  return (
    (isModelAllowedUnderActiveEnforcement(model) ?? isModelAllowed(model)) &&
    !isModelDenied(model, getModelEntitlementDenySet())
  );
}
//@ chunk-aepeg2w5.js:453773-453844 placement
function isDefaultMainLoopModel(model) {
  return (
    strip1mSuffix(parseUserSpecifiedModel(model)).toLowerCase() ===
    strip1mSuffix(getDefaultMainLoopModel()).toLowerCase()
  );
}
//@ chunk-aepeg2w5.js:453844-453964 placement
function isExemptDefaultResolvingPick(model) {
  let lower = strip1mSuffix(model.trim().toLowerCase());
  if (isModeDependentModelSetting(lower)) return false;
  if (isBlockedByManagedModelPolicySafe(model)) return false;
  if (lower === "best") return false;
  return isDefaultMainLoopModel(model);
}
//@ chunk-aepeg2w5.js:453964-454094 placement
function isWindowSilentDefaultPick(model) {
  if (!isExemptDefaultResolvingPick(model)) return false;
  let lower = model.trim().toLowerCase();
  return (
    parseUserSpecifiedModel(model).toLowerCase() === getDefaultMainLoopModel().toLowerCase() ||
    (isModelKeyAlias(lower) && lower === strip1mSuffix(lower))
  );
}
//@ chunk-aepeg2w5.js:454094-454270 placement (2.1.88 match: modelMatchesVersionPrefix, 1)
/**
 * 别名展开成内置默认模型（小写）；旧 Opus 4/4.1 在重映射时展开成最新 Opus。
 */
function resolveModelAliasEnvFree(alias) {
  let stripped = strip1mSuffix(alias);
  let builtinAlias = resolveBuiltinAlias(stripped);
  if (builtinAlias !== null) return builtinAlias.toLowerCase();
  let resolvedModel = stripped.startsWith("claude-") ? stripped : `claude-${stripped}`;
  if (usesFirstPartyModelIds() && isLegacyOpusFirstParty(resolvedModel))
    return getDefaultOpusBuiltin(getRawModelStrings()).toLowerCase();
  return null;
}
//@ chunk-aepeg2w5.js:454270-454338 placement
var regExp_29; // deferred: uses BEDROCK_REGION_PREFIXES (./bedrock.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:454270", () => {
  regExp_29 = new RegExp(`^((${BEDROCK_REGION_PREFIXES.join("|")})\\.)?(anthropic\\.|claude-)`);
});
//@ chunk-aepeg2w5.js:454338-454481 placement
function isOpaqueModelId(modelId) {
  let lower = modelId.toLowerCase();
  if (regExp_29.test(lower)) return true;
  if (lower.startsWith("arn:aws:bedrock:")) return true;
  if (getAPIProvider() === "foundry") return true;
  return false;
}
export {
  isExemptDefaultResolvingPick,
  isEnvDefaultModelGoverning,
  isKnownNon1mTarget,
  getModelEnforcementState,
  isModelDeniedByManagedFalse,
  isPermittedByOrgModelPolicy,
  isModelAllowedUnderActiveEnforcement,
  getEnvDefaultModel,
  isWindowSilentDefaultPick,
  resolveModelAliasEnvFree,
  isModelDeniedByManagedSafe,
  isBlockedByManagedModelPolicySafe,
  eligible1mSuffixTarget,
  warnedEnforcementMessages,
  resolveAvailableModels,
  familyDefaultFor,
  envDefaultModel_2,
  isModelEntitled,
  isModelAdmittedByAvailableModels,
};
