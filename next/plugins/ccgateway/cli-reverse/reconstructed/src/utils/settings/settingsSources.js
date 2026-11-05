/**
 * utils/settings/settingsSources.ts
 *
 * 2.1.316 新增：设置来源与合并策略（merge/first-wins、托管来源、deniedModels）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (24)
 * attribution: placement 24
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve, join } from "path";
import { hasCommitOrPrArg } from "../../commands/commit.js";
import { resolveLocalSettingsStoreRoot } from "./settingsFileParsing.js";
import { getRelativeSettingsFilePathForSource } from "./settings.js";
import { getSettingsForSourceUncached, trimmedPolicyTier } from "./policyTiers.js";
import { isProviderManagedByHost } from "../entrypointKinds.js";
import { MANAGED_RESTRICTION_KEYS, getAtPath, asArray, setAtPath } from "./managedRestrictionKeys.js";
import { normalizeCarveOutFlag, PATH_RULE_CARVE_OUT_RE } from "./permissionRuleCarveOut.js";
import { MERGEABLE_POLICY_KEYS, policyTierSettings } from "./policySettings.js";
import { pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../debug.js";
import { mergeWithAssigner_2 } from "../../../vendor/lodash-es/_mergeWithFamily.js";
import { AWS_CREDENTIAL_ENV_NAMES, PARENT_PAIR_SUPPRESSOR_SENTINEL } from "./settingsSourceTrust.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { MODEL_SELECTION_ENV_VARS, CUSTOM_MODEL_OPTION_VARS } from "../managedEnvConstants.js";
import { parseDeniedModelEntry, availableModelsEntryWarning } from "../model/deniedModels.js";
import { parseParentManagedSettings } from "./managedFileSettings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:420957-421194 placement
function commitTrailersMode(attribution, includeCoAuthoredBy) {
  let commitTrailers = attribution?.commitTrailers;
  if (typeof commitTrailers === "boolean") return commitTrailers ? "explicit-enabled" : "disabled";
  if (attribution !== undefined && hasCommitOrPrArg(attribution))
    return attribution.commit === "" ? "disabled" : "implicit-enabled";
  if (includeCoAuthoredBy !== undefined) return includeCoAuthoredBy ? "implicit-enabled" : "disabled";
  return;
}
//@ chunk-z20c443b.js:476117-476298 placement
function getLegacyLocalSettingsFilePath_3(context) {
  if (context.diskless) return;
  if (
    context.cwd === null ||
    resolveLocalSettingsStoreRoot(context.cwd, context.canonicalGitRoot) === resolve(context.cwd)
  )
    return;
  if (context.projectConfigDir !== undefined) return;
  return join(resolve(context.cwd), getRelativeSettingsFilePathForSource("localSettings"));
}
//@ chunk-z20c443b.js:476298-476405 placement
function getSettingsForSourceIfRead(source, store) {
  let frozenTier = store.repoTierFreeze.tier(source);
  if (frozenTier !== undefined) return frozenTier.settings;
  return store.perSource.get(source);
}
//@ chunk-z20c443b.js:476405-476533 placement
function getSettingsForSource_3(source, context) {
  let settingsForSourceIfRead = getSettingsForSourceIfRead(source, context.store);
  if (settingsForSourceIfRead !== undefined) return settingsForSourceIfRead;
  let settingsForSourceUncached = getSettingsForSourceUncached(source, context);
  let settings = settingsForSourceUncached && trimmedPolicyTier(source, settingsForSourceUncached, context);
  context.store.perSource.set(source, settings);
  return settings;
}
//@ chunk-z20c443b.js:476533-476621 placement
function adminTierComposesParent(settings) {
  return (
    (settings.parentSettingsBehavior ?? (isProviderManagedByHost() ? "merge" : "first-wins")) === "merge"
  );
}
//@ chunk-z20c443b.js:476621-476662 placement
function shouldIncludeParentTier(settings, forceInclude = false) {
  return !settings || adminTierComposesParent(settings) || forceInclude;
}
//@ chunk-z20c443b.js:476662-476742 placement
var WINNER_ONLY_NESTED_UNDER_MERGE = [
  ["permissions", "defaultMode"],
  ["modelPicker", "replaceBuiltInOptions"],
];
//@ chunk-z20c443b.js:476742-476889 placement
function pickRestrictiveSandboxSettings(settings) {
  let restrictive = {};
  for (let { path, restrictive: restrictive_2 } of MANAGED_RESTRICTION_KEYS()) {
    let atPath = getAtPath(settings, path);
    if (path[0] === "sandbox" && asArray(restrictive_2).includes(atPath))
      setAtPath(restrictive, path, atPath);
  }
  return restrictive.sandbox ?? {};
}
//@ chunk-z20c443b.js:476889-476922 placement
function readSettingsPath(sandbox, path) {
  return getAtPath(sandbox, path);
}
//@ chunk-z20c443b.js:476922-477011 placement
function isDisableAllHooksSet(settings) {
  let disableAllHooks = settings?.disableAllHooks;
  return (
    disableAllHooks !== undefined &&
    disableAllHooks !== null &&
    disableAllHooks !== false &&
    disableAllHooks !== "false"
  );
}
//@ chunk-z20c443b.js:477011-481040 placement
function keepRestrictiveFromParent(parentSettings, currentSettings, settings, context) {
  let kept = {};
  if (
    parentSettings.allowManagedHooksOnly === true ||
    parentSettings.disableAllHooks === true ||
    isDisableAllHooksSet(settings)
  )
    kept.allowManagedHooksOnly = true;
  if (parentSettings.disableSkillShellExecution === true) kept.disableSkillShellExecution = true;
  if (
    currentSettings.hooks === undefined &&
    !Object.values(currentSettings.enabledPlugins ?? {}).some(
      (enabled) => enabled !== false && enabled !== undefined,
    )
  ) {
    if (parentSettings.allowedHttpHookUrls?.length === 0) kept.allowedHttpHookUrls = [];
    if (parentSettings.httpHookAllowedEnvVars?.length === 0) kept.httpHookAllowedEnvVars = [];
  }
  if (parentSettings.disableCommandPluginSources === true) kept.disableCommandPluginSources = true;
  if (parentSettings.disableSideloadFlags === true) kept.disableSideloadFlags = true;
  if (parentSettings.allowManagedMcpServersOnly === true) kept.allowManagedMcpServersOnly = true;
  if (parentSettings.disableClaudeAiConnectors === true) kept.disableClaudeAiConnectors = true;
  if (parentSettings.syncClaudeAiSkills === false) kept.syncClaudeAiSkills = false;
  if (parentSettings.syncClaudeAiPlugins === false) kept.syncClaudeAiPlugins = false;
  if (parentSettings.remoteTools?.allowUnattendedServing === false)
    kept.remoteTools = {
      ...kept.remoteTools,
      allowUnattendedServing: false,
    };
  if (normalizeCarveOutFlag(parentSettings.disablePluginDirectory) === true)
    kept.disablePluginDirectory = true;
  if (parentSettings.allowManagedPermissionRulesOnly === true) kept.allowManagedPermissionRulesOnly = true;
  if (parentSettings.disableAutoMode === "disable") kept.disableAutoMode = "disable";
  let shareHostProfile = parentSettings.remoteControl?.shareHostProfile;
  if (shareHostProfile === "off" || shareHostProfile === "basic")
    kept.remoteControl = {
      ...kept.remoteControl,
      shareHostProfile,
    };
  if (commitTrailersMode(parentSettings.attribution, parentSettings.includeCoAuthoredBy) === "disabled")
    kept.attribution = {
      ...kept.attribution,
      commitTrailers: false,
    };
  if (parentSettings.attribution?.sessionUrl === false)
    kept.attribution = {
      ...kept.attribution,
      sessionUrl: false,
    };
  let strictPluginOnlyCustomization = parentSettings.strictPluginOnlyCustomization;
  if (
    strictPluginOnlyCustomization === true ||
    (Array.isArray(strictPluginOnlyCustomization) && strictPluginOnlyCustomization.length > 0)
  )
    kept.strictPluginOnlyCustomization = strictPluginOnlyCustomization;
  if (parentSettings.deniedMcpServers) kept.deniedMcpServers = parentSettings.deniedMcpServers;
  if (parentSettings.blockedMarketplaces?.length)
    kept.blockedMarketplaces = parentSettings.blockedMarketplaces;
  if (parentSettings.deniedModels && parentSettings.deniedModels.length > 0)
    kept.deniedModels = parentSettings.deniedModels;
  if (currentSettings.forceLoginOrgUUID === undefined && parentSettings.forceLoginOrgUUID)
    kept.forceLoginOrgUUID = parentSettings.forceLoginOrgUUID;
  for (let key of MERGEABLE_POLICY_KEYS)
    if (currentSettings[key] === undefined && parentSettings[key])
      Object.assign(kept, {
        [key]: parentSettings[key],
      });
  if (parentSettings.enforceAvailableModels === true) kept.enforceAvailableModels = true;
  if (parentSettings.availableModelsMatch === "exact") kept.availableModelsMatch = "exact";
  if (parentSettings.permissions) {
    let permissions = pickAlias(parentSettings.permissions, ["deny", "ask"]);
    for (let ruleKind of ["deny", "ask"]) {
      let rules = permissions[ruleKind];
      if (rules !== undefined)
        permissions[ruleKind] = rules.filter((rule) => {
          if (!PATH_RULE_CARVE_OUT_RE.test(rule)) return true;
          logForDebugging(
            `Ignoring ${ruleKind} rule "${rule}" from the parent process's managed settings: a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, so it is not merged into the policy rules. Spell the deny without the exception instead.`,
            {
              level: "warn",
            },
          );
          return false;
        });
    }
    if (parentSettings.permissions.disableBypassPermissionsMode === "disable")
      permissions.disableBypassPermissionsMode = "disable";
    if (parentSettings.permissions.disableAutoMode === "disable") permissions.disableAutoMode = "disable";
    if (parentSettings.permissions.blockReadsOutsideWorkingDirectories === true)
      permissions.blockReadsOutsideWorkingDirectories = true;
    if (parentSettings.permissions.blockWritesOutsideWorkingDirectories === true)
      permissions.blockWritesOutsideWorkingDirectories = true;
    if (currentSettings.allowManagedPermissionRulesOnly !== true) {
      let { allow, additionalDirectories } = parentSettings.permissions;
      if (allow && currentSettings.sandbox?.network?.allowManagedDomainsOnly !== true)
        permissions.allow = allow;
      if (additionalDirectories) permissions.additionalDirectories = additionalDirectories;
    }
    if (Object.keys(permissions).length > 0) kept.permissions = permissions;
  }
  if (parentSettings.sandbox) {
    let { network, filesystem, credentials } = parentSettings.sandbox;
    let sandbox = {};
    let keptNetwork = network ? pickAlias(network, ["deniedDomains"]) : {};
    let keptFilesystem = filesystem ? pickAlias(filesystem, ["denyRead", "denyWrite"]) : {};
    if (network) {
      if (currentSettings.sandbox?.network?.allowManagedDomainsOnly !== true && network.allowedDomains)
        keptNetwork.allowedDomains = network.allowedDomains;
    }
    if (Object.keys(keptNetwork).length > 0) sandbox.network = keptNetwork;
    if (filesystem) {
      if (currentSettings.sandbox?.filesystem?.allowManagedReadPathsOnly !== true && filesystem.allowRead)
        keptFilesystem.allowRead = filesystem.allowRead;
    }
    if (Object.keys(keptFilesystem).length > 0) sandbox.filesystem = keptFilesystem;
    if (credentials) {
      let mapped = (credentials.files ?? []).map((fileRule) =>
        fileRule.mode === "deny"
          ? {
              path: fileRule.path,
              mode: "deny",
            }
          : {
              path: fileRule.path,
              mode: "mask",
              injectHosts: [],
            },
      );
      let mapped_2 = (credentials.envVars ?? [])
        .filter((envRule) => envRule.mode === "deny")
        .map((envRule) => ({
          name: envRule.name,
          mode: "deny",
        }));
      let keptCredentials = {
        ...(mapped.length > 0 && {
          files: mapped,
        }),
        ...(mapped_2.length > 0 && {
          envVars: mapped_2,
        }),
      };
      if (credentials.sigv4) {
        let sigv4 = {};
        for (let field of ["streaming", "presigned", "sigv4a"])
          if (credentials.sigv4[field] === "deny") sigv4[field] = "deny";
        keptCredentials.sigv4 = sigv4;
      }
      {
        let awsPairs = missingAwsPairs(credentials.awsPairs ?? [], []);
        if (awsPairs.length > 0) keptCredentials.awsPairs = awsPairs;
      }
      if (Object.keys(keptCredentials).length > 0) sandbox.credentials = keptCredentials;
    }
    mergeWithAssigner_2(sandbox, pickRestrictiveSandboxSettings(parentSettings));
    if (Object.keys(sandbox).length > 0) kept.sandbox = sandbox;
  }
  return kept;
}
//@ chunk-z20c443b.js:481040-481221 placement
function missingAwsPairs(pairs, outerPairs) {
  let allowedVarNames = AWS_CREDENTIAL_ENV_NAMES;
  let claimedVars = new Set(outerPairs.flatMap(awsPairVars));
  return normalizeCaseForComparison_2(pairs.flatMap(awsPairVars))
    .filter((varName) => allowedVarNames.includes(varName) && !claimedVars.has(varName))
    .map((accessKeyIdVar, pairIndex) => ({
      accessKeyIdVar,
      secretAccessKeyVar: `${PARENT_PAIR_SUPPRESSOR_SENTINEL}${pairIndex + 1}_`,
    }));
}
//@ chunk-z20c443b.js:481221-481351 placement
function awsPairVars(pair) {
  if (!isPlainObject_2(pair)) return [];
  return [pair.accessKeyIdVar, pair.secretAccessKeyVar, pair.sessionTokenVar].filter(
    (varName) => typeof varName === "string",
  );
}
//@ chunk-z20c443b.js:481351-481545 placement
var HOST_MANAGED_MODEL_ENV_KEYS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (../managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z20c443b.js:481351", () => {
  HOST_MANAGED_MODEL_ENV_KEYS = new Set([
    ...[...MODEL_SELECTION_ENV_VARS].filter((envVar) => envVar !== "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION"),
    ...CUSTOM_MODEL_OPTION_VARS,
    "CLAUDE_CODE_AUTO_MODE_MODEL",
    "CLAUDE_CODE_BG_CLASSIFIER_MODEL",
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  ]);
});
//@ chunk-z20c443b.js:481545-482160 placement
function hostManagedModelOverlay(settings, hostManagedProvider) {
  if (!hostManagedProvider || !settings) return null;
  let overlay = {};
  if (settings.model !== undefined) overlay.model = settings.model;
  if (settings.availableModels !== undefined) overlay.availableModels = settings.availableModels;
  if (
    settings.availableModelsMatch === "exact" ||
    (settings.availableModelsMatch !== undefined && settings.availableModels !== undefined)
  )
    overlay.availableModelsMatch = settings.availableModelsMatch;
  if (settings.enforceAvailableModels !== undefined)
    overlay.enforceAvailableModels = settings.enforceAvailableModels;
  if (settings.deniedModels !== undefined && settings.deniedModels.length > 0)
    overlay.deniedModels = settings.deniedModels;
  if (settings.fallbackModel !== undefined) overlay.fallbackModel = settings.fallbackModel;
  if (settings.modelPicker !== undefined) overlay.modelPicker = settings.modelPicker;
  return Object.keys(overlay).length > 0 ? overlay : null;
}
//@ chunk-z20c443b.js:482160-482361 placement
function deniedModelsEntryWarnings(settings) {
  let warnings = [];
  for (let entry of settings?.deniedModels ?? []) {
    let { warning } = parseDeniedModelEntry(entry);
    if (warning !== undefined)
      warnings.push({
        file: "managed settings",
        path: "deniedModels",
        message: warning,
        severity: "warning",
        statusOnly: true,
      });
  }
  return warnings;
}
//@ chunk-z20c443b.js:482361-482605 placement
function availableModelsExactEntryWarnings(settings) {
  if (settings?.availableModelsMatch !== "exact") return [];
  let availableModels = settings.availableModels ?? [];
  return availableModels.flatMap((availableModel) => {
    let warning = availableModelsEntryWarning(availableModel, availableModels);
    return warning === undefined
      ? []
      : [
          {
            file: "managed settings",
            path: "availableModels",
            message: warning,
            severity: "warning",
            statusOnly: true,
          },
        ];
  });
}
//@ chunk-z20c443b.js:482605-482744 placement
function assignWithDeniedModels(settings, hostModelOverlay) {
  let deniedModels = settings.deniedModels;
  Object.assign(settings, hostModelOverlay);
  if (deniedModels !== undefined && hostModelOverlay.deniedModels !== undefined)
    settings.deniedModels = normalizeCaseForComparison_2([...deniedModels, ...hostModelOverlay.deniedModels]);
}
//@ chunk-z20c443b.js:482744-482944 placement
function stripHostManagedModelKeys(settings) {
  delete settings.model;
  delete settings.fallbackModel;
  delete settings.modelPicker;
  delete settings.modelOverrides;
  if (settings.env) {
    let filteredEnv = {};
    for (let [key, value] of Object.entries(settings.env))
      if (!HOST_MANAGED_MODEL_ENV_KEYS.has(key.toUpperCase())) filteredEnv[key] = value;
    settings.env = filteredEnv;
  }
}
//@ chunk-z20c443b.js:482944-483116 placement
function getPairedPolicyModelOverrides(settingsContext) {
  let pairedModelOverrides = settingsContext.store.policy.pairedModelOverrides;
  if (pairedModelOverrides !== undefined) return pairedModelOverrides.value;
  try {
    getSettingsForSource_3("policySettings", settingsContext);
  } catch {}
  return settingsContext.store.policy.pairedModelOverrides?.value;
}
//@ chunk-z20c443b.js:483116-483267 placement
function getDeniedModelsPolicyOverrides(settingsContext) {
  if (settingsContext.store.policy.deniedModelsOverrides === undefined)
    try {
      getSettingsForSource_3("policySettings", settingsContext);
    } catch {}
  return settingsContext.store.policy.deniedModelsOverrides?.value;
}
//@ chunk-z20c443b.js:483267-483396 placement
function getHostManagedModelPricing(settingsContext) {
  if (
    !settingsContext.hostManagedProvider ||
    getAllPolicyTierSettings_3(settingsContext).some((tier) => tier.modelPricing !== undefined)
  )
    return;
  return parseParentManagedSettings(settingsContext).settings?.modelPricing;
}
//@ chunk-z20c443b.js:483396-483727 placement
function getHostManagedToolSearchEnv(settingsContext) {
  let hostToolSearchEnv = settingsContext.store.policy.hostToolSearchEnv;
  if (hostToolSearchEnv !== undefined) return hostToolSearchEnv.value;
  let value;
  if (settingsContext.hostManagedProvider) {
    let env = parseParentManagedSettings(settingsContext).settings?.env ?? {};
    for (let [key, value_2] of Object.entries(env)) {
      if (key === "ENABLE_TOOL_SEARCH") {
        value = value_2;
        break;
      }
      if (value === undefined && key.toUpperCase() === "ENABLE_TOOL_SEARCH") value = value_2;
    }
  }
  settingsContext.store.policy.hostToolSearchEnv = {
    value,
  };
  return value;
}
//@ chunk-z20c443b.js:483727-483843 placement
function getAllPolicyTierSettings_3(context) {
  let allTiers = context.store.policy.allTiers;
  if (allTiers !== undefined) return allTiers;
  let tierSettings = policyTierSettings(context);
  context.store.policy.allTiers = tierSettings;
  return tierSettings;
}
export {
  deniedModelsEntryWarnings,
  availableModelsExactEntryWarnings,
  getLegacyLocalSettingsFilePath_3,
  getAllPolicyTierSettings_3,
  getSettingsForSource_3,
  getSettingsForSourceIfRead,
  getPairedPolicyModelOverrides,
  getDeniedModelsPolicyOverrides,
  getHostManagedModelPricing,
  getHostManagedToolSearchEnv,
  readSettingsPath,
  adminTierComposesParent,
  shouldIncludeParentTier,
  isDisableAllHooksSet,
  keepRestrictiveFromParent,
  hostManagedModelOverlay,
  WINNER_ONLY_NESTED_UNDER_MERGE,
  missingAwsPairs,
  stripHostManagedModelKeys,
  assignWithDeniedModels,
  HOST_MANAGED_MODEL_ENV_KEYS,
};
