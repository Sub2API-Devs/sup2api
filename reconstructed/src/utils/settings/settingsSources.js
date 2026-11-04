/**
 * utils/settings/settingsSources.ts
 *
 * 2.1.316 新增：设置来源与合并策略（merge/first-wins、托管来源、deniedModels）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (24)
 * attribution: placement 24
 */
import { resolve, join } from "path";
import { getPromptContent } from "../../commands/commit.js";
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
import { uniq } from "../collections.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { MODEL_SELECTION_ENV_VARS, CUSTOM_MODEL_OPTION_VARS } from "../managedEnvConstants.js";
import { parseDeniedModelEntry, availableModelsEntryWarning } from "../model/deniedModels.js";
import { parseParentManagedSettings } from "./managedFileSettings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:422494-422731 placement
function commitTrailersMode(attribution, includeCoAuthoredBy) {
  let commitTrailers = attribution?.commitTrailers;
  if (typeof commitTrailers === "boolean") return commitTrailers ? "explicit-enabled" : "disabled";
  if (attribution !== undefined && getPromptContent(attribution))
    return attribution.commit === "" ? "disabled" : "implicit-enabled";
  if (includeCoAuthoredBy !== undefined) return includeCoAuthoredBy ? "implicit-enabled" : "disabled";
  return;
}
//@ chunk-dcmhvw5a.js:477482-477663 placement
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
//@ chunk-dcmhvw5a.js:477663-477770 placement
function getSettingsForSourceIfRead(source, store) {
  let frozenTier = store.repoTierFreeze.tier(source);
  if (frozenTier !== undefined) return frozenTier.settings;
  return store.perSource.get(source);
}
//@ chunk-dcmhvw5a.js:477770-477898 placement
function getSettingsForSource_3(source, context) {
  let settingsForSourceIfRead = getSettingsForSourceIfRead(source, context.store);
  if (settingsForSourceIfRead !== undefined) return settingsForSourceIfRead;
  let settingsForSourceUncached = getSettingsForSourceUncached(source, context);
  let settings = settingsForSourceUncached && trimmedPolicyTier(source, settingsForSourceUncached, context);
  context.store.perSource.set(source, settings);
  return settings;
}
//@ chunk-dcmhvw5a.js:477898-477986 placement
function adminTierComposesParent(settings) {
  return (
    (settings.parentSettingsBehavior ?? (isProviderManagedByHost() ? "merge" : "first-wins")) === "merge"
  );
}
//@ chunk-dcmhvw5a.js:477986-478027 placement
function shouldIncludeParentTier(settings, forceInclude = false) {
  return !settings || adminTierComposesParent(settings) || forceInclude;
}
//@ chunk-dcmhvw5a.js:478027-478107 placement
var WINNER_ONLY_NESTED_UNDER_MERGE = [
  ["permissions", "defaultMode"],
  ["modelPicker", "replaceBuiltInOptions"],
];
//@ chunk-dcmhvw5a.js:478107-478254 placement
function pickRestrictiveSandboxSettings(settings) {
  let restrictive = {};
  for (let { path, restrictive: restrictive_2 } of MANAGED_RESTRICTION_KEYS()) {
    let atPath = getAtPath(settings, path);
    if (path[0] === "sandbox" && asArray(restrictive_2).includes(atPath))
      setAtPath(restrictive, path, atPath);
  }
  return restrictive.sandbox ?? {};
}
//@ chunk-dcmhvw5a.js:478254-478287 placement
function readSettingsPath(sandbox, path) {
  return getAtPath(sandbox, path);
}
//@ chunk-dcmhvw5a.js:478287-478376 placement
function isDisableAllHooksSet(settings) {
  let disableAllHooks = settings?.disableAllHooks;
  return (
    disableAllHooks !== undefined &&
    disableAllHooks !== null &&
    disableAllHooks !== false &&
    disableAllHooks !== "false"
  );
}
//@ chunk-dcmhvw5a.js:478376-482405 placement
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
//@ chunk-dcmhvw5a.js:482405-482586 placement
function missingAwsPairs(pairs, outerPairs) {
  let allowedVarNames = AWS_CREDENTIAL_ENV_NAMES;
  let claimedVars = new Set(outerPairs.flatMap(awsPairVars));
  return uniq(pairs.flatMap(awsPairVars))
    .filter((varName) => allowedVarNames.includes(varName) && !claimedVars.has(varName))
    .map((accessKeyIdVar, pairIndex) => ({
      accessKeyIdVar,
      secretAccessKeyVar: `${PARENT_PAIR_SUPPRESSOR_SENTINEL}${pairIndex + 1}_`,
    }));
}
//@ chunk-dcmhvw5a.js:482586-482716 placement
function awsPairVars(pair) {
  if (!isPlainObject_2(pair)) return [];
  return [pair.accessKeyIdVar, pair.secretAccessKeyVar, pair.sessionTokenVar].filter(
    (varName) => typeof varName === "string",
  );
}
//@ chunk-dcmhvw5a.js:482716-482910 placement
var HOST_MANAGED_MODEL_ENV_KEYS; // deferred: uses ARTIFACT_PROVIDER_ENV_VARS (../managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:482716", () => {
  HOST_MANAGED_MODEL_ENV_KEYS = new Set([
    ...[...MODEL_SELECTION_ENV_VARS].filter((envVar) => envVar !== "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION"),
    ...CUSTOM_MODEL_OPTION_VARS,
    "CLAUDE_CODE_AUTO_MODE_MODEL",
    "CLAUDE_CODE_BG_CLASSIFIER_MODEL",
    "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  ]);
});
//@ chunk-dcmhvw5a.js:482910-483525 placement
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
//@ chunk-dcmhvw5a.js:483525-483726 placement
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
//@ chunk-dcmhvw5a.js:483726-483970 placement
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
//@ chunk-dcmhvw5a.js:483970-484109 placement
function assignWithDeniedModels(settings, hostModelOverlay) {
  let deniedModels = settings.deniedModels;
  Object.assign(settings, hostModelOverlay);
  if (deniedModels !== undefined && hostModelOverlay.deniedModels !== undefined)
    settings.deniedModels = uniq([...deniedModels, ...hostModelOverlay.deniedModels]);
}
//@ chunk-dcmhvw5a.js:484109-484309 placement
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
//@ chunk-dcmhvw5a.js:484309-484481 placement
function getPairedPolicyModelOverrides(settingsContext) {
  let pairedModelOverrides = settingsContext.store.policy.pairedModelOverrides;
  if (pairedModelOverrides !== undefined) return pairedModelOverrides.value;
  try {
    getSettingsForSource_3("policySettings", settingsContext);
  } catch {}
  return settingsContext.store.policy.pairedModelOverrides?.value;
}
//@ chunk-dcmhvw5a.js:484481-484632 placement
function getDeniedModelsPolicyOverrides(settingsContext) {
  if (settingsContext.store.policy.deniedModelsOverrides === undefined)
    try {
      getSettingsForSource_3("policySettings", settingsContext);
    } catch {}
  return settingsContext.store.policy.deniedModelsOverrides?.value;
}
//@ chunk-dcmhvw5a.js:484632-484761 placement
function getHostManagedModelPricing(settingsContext) {
  if (
    !settingsContext.hostManagedProvider ||
    getAllPolicyTierSettings_3(settingsContext).some((tier) => tier.modelPricing !== undefined)
  )
    return;
  return parseParentManagedSettings(settingsContext).settings?.modelPricing;
}
//@ chunk-dcmhvw5a.js:484761-485092 placement
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
//@ chunk-dcmhvw5a.js:485092-485208 placement
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
  adminTierComposesParent,
  shouldIncludeParentTier,
  isDisableAllHooksSet,
  keepRestrictiveFromParent,
  hostManagedModelOverlay,
  WINNER_ONLY_NESTED_UNDER_MERGE,
  missingAwsPairs,
  stripHostManagedModelKeys,
  assignWithDeniedModels,
  readSettingsPath,
  HOST_MANAGED_MODEL_ENV_KEYS,
};
