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
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../debug.js";
import {
  mergeWithAssigner_2,
  credentialRuleExtractSchema,
  credentialRuleMaskClaimsSchema,
} from "./settingsSourceTrust.js";
import { uniq } from "../collections.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { MODEL_SELECTION_ENV_VARS, CUSTOM_MODEL_OPTION_VARS } from "../managedEnvConstants.js";
import { parseDeniedModelEntry, availableModelsEntryWarning } from "../model/deniedModels.js";
import { parseParentManagedSettings } from "./managedFileSettings.js";

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
function getLegacyLocalSettingsFilePath_3(settingsContext) {
  if (settingsContext.diskless) return;
  if (
    settingsContext.cwd === null ||
    resolveLocalSettingsStoreRoot(settingsContext.cwd, settingsContext.canonicalGitRoot) ===
      resolve(settingsContext.cwd)
  )
    return;
  if (settingsContext.projectConfigDir !== undefined) return;
  return join(resolve(settingsContext.cwd), getRelativeSettingsFilePathForSource("localSettings"));
}
//@ chunk-dcmhvw5a.js:477663-477770 placement
function getSettingsForSourceIfRead(e, n) {
  let r = n.repoTierFreeze.tier(e);
  if (r !== undefined) return r.settings;
  return n.perSource.get(e);
}
//@ chunk-dcmhvw5a.js:477770-477898 placement
function getSettingsForSource_3(e, n) {
  let settingsForSourceIfRead = getSettingsForSourceIfRead(e, n.store);
  if (settingsForSourceIfRead !== undefined) return settingsForSourceIfRead;
  let settingsForSourceUncached = getSettingsForSourceUncached(e, n);
  let a = settingsForSourceUncached && trimmedPolicyTier(e, settingsForSourceUncached, n);
  n.store.perSource.set(e, a);
  return a;
}
//@ chunk-dcmhvw5a.js:477898-477986 placement
function adminTierComposesParent(e) {
  return (e.parentSettingsBehavior ?? (isProviderManagedByHost() ? "merge" : "first-wins")) === "merge";
}
//@ chunk-dcmhvw5a.js:477986-478027 placement
function shouldIncludeParentTier(e, n = false) {
  return !e || adminTierComposesParent(e) || n;
}
//@ chunk-dcmhvw5a.js:478027-478107 placement
var WINNER_ONLY_NESTED_UNDER_MERGE = [
  ["permissions", "defaultMode"],
  ["modelPicker", "replaceBuiltInOptions"],
];
//@ chunk-dcmhvw5a.js:478107-478254 placement
function pickRestrictiveSandboxSettings(e) {
  let n = {};
  for (let { path, restrictive } of MANAGED_RESTRICTION_KEYS()) {
    let atPath = getAtPath(e, path);
    if (path[0] === "sandbox" && asArray(restrictive).includes(atPath)) setAtPath(n, path, atPath);
  }
  return n.sandbox ?? {};
}
//@ chunk-dcmhvw5a.js:478254-478287 placement
function readSettingsPath(sandbox, n) {
  return getAtPath(sandbox, n);
}
//@ chunk-dcmhvw5a.js:478287-478376 placement
function isDisableAllHooksSet(e) {
  let disableAllHooks = e?.disableAllHooks;
  return (
    disableAllHooks !== undefined &&
    disableAllHooks !== null &&
    disableAllHooks !== false &&
    disableAllHooks !== "false"
  );
}
//@ chunk-dcmhvw5a.js:478376-482405 placement
function keepRestrictiveFromParent(e, n, parentManaged, s) {
  let a = {};
  if (e.allowManagedHooksOnly === true || e.disableAllHooks === true || isDisableAllHooksSet(parentManaged))
    a.allowManagedHooksOnly = true;
  if (e.disableSkillShellExecution === true) a.disableSkillShellExecution = true;
  if (
    n.hooks === undefined &&
    !Object.values(n.enabledPlugins ?? {}).some((m) => m !== false && m !== undefined)
  ) {
    if (e.allowedHttpHookUrls?.length === 0) a.allowedHttpHookUrls = [];
    if (e.httpHookAllowedEnvVars?.length === 0) a.httpHookAllowedEnvVars = [];
  }
  if (e.disableCommandPluginSources === true) a.disableCommandPluginSources = true;
  if (e.disableSideloadFlags === true) a.disableSideloadFlags = true;
  if (e.allowManagedMcpServersOnly === true) a.allowManagedMcpServersOnly = true;
  if (e.disableClaudeAiConnectors === true) a.disableClaudeAiConnectors = true;
  if (e.syncClaudeAiSkills === false) a.syncClaudeAiSkills = false;
  if (e.syncClaudeAiPlugins === false) a.syncClaudeAiPlugins = false;
  if (e.remoteTools?.allowUnattendedServing === false)
    a.remoteTools = {
      ...a.remoteTools,
      allowUnattendedServing: false,
    };
  if (normalizeCarveOutFlag(e.disablePluginDirectory) === true) a.disablePluginDirectory = true;
  if (e.allowManagedPermissionRulesOnly === true) a.allowManagedPermissionRulesOnly = true;
  if (e.disableAutoMode === "disable") a.disableAutoMode = "disable";
  let shareHostProfile = e.remoteControl?.shareHostProfile;
  if (shareHostProfile === "off" || shareHostProfile === "basic")
    a.remoteControl = {
      ...a.remoteControl,
      shareHostProfile,
    };
  if (commitTrailersMode(e.attribution, e.includeCoAuthoredBy) === "disabled")
    a.attribution = {
      ...a.attribution,
      commitTrailers: false,
    };
  if (e.attribution?.sessionUrl === false)
    a.attribution = {
      ...a.attribution,
      sessionUrl: false,
    };
  let strictPluginOnlyCustomization = e.strictPluginOnlyCustomization;
  if (
    strictPluginOnlyCustomization === true ||
    (Array.isArray(strictPluginOnlyCustomization) && strictPluginOnlyCustomization.length > 0)
  )
    a.strictPluginOnlyCustomization = strictPluginOnlyCustomization;
  if (e.deniedMcpServers) a.deniedMcpServers = e.deniedMcpServers;
  if (e.blockedMarketplaces?.length) a.blockedMarketplaces = e.blockedMarketplaces;
  if (e.deniedModels && e.deniedModels.length > 0) a.deniedModels = e.deniedModels;
  if (n.forceLoginOrgUUID === undefined && e.forceLoginOrgUUID) a.forceLoginOrgUUID = e.forceLoginOrgUUID;
  for (let m of MERGEABLE_POLICY_KEYS)
    if (n[m] === undefined && e[m])
      Object.assign(a, {
        [m]: e[m],
      });
  if (e.enforceAvailableModels === true) a.enforceAvailableModels = true;
  if (e.availableModelsMatch === "exact") a.availableModelsMatch = "exact";
  if (e.permissions) {
    let m = wS(e.permissions, ["deny", "ask"]);
    for (let f of ["deny", "ask"]) {
      let h = m[f];
      if (h !== undefined)
        m[f] = h.filter((y) => {
          if (!PATH_RULE_CARVE_OUT_RE.test(y)) return true;
          logForDebugging(
            `Ignoring ${f} rule "${y}" from the parent process's managed settings: a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, so it is not merged into the policy rules. Spell the deny without the exception instead.`,
            {
              level: "warn",
            },
          );
          return false;
        });
    }
    if (e.permissions.disableBypassPermissionsMode === "disable") m.disableBypassPermissionsMode = "disable";
    if (e.permissions.disableAutoMode === "disable") m.disableAutoMode = "disable";
    if (e.permissions.blockReadsOutsideWorkingDirectories === true)
      m.blockReadsOutsideWorkingDirectories = true;
    if (e.permissions.blockWritesOutsideWorkingDirectories === true)
      m.blockWritesOutsideWorkingDirectories = true;
    if (n.allowManagedPermissionRulesOnly !== true) {
      let { allow, additionalDirectories } = e.permissions;
      if (allow && n.sandbox?.network?.allowManagedDomainsOnly !== true) m.allow = allow;
      if (additionalDirectories) m.additionalDirectories = additionalDirectories;
    }
    if (Object.keys(m).length > 0) a.permissions = m;
  }
  if (e.sandbox) {
    let { network, filesystem, credentials } = e.sandbox;
    let y = {};
    let b = network ? wS(network, ["deniedDomains"]) : {};
    let S = filesystem ? wS(filesystem, ["denyRead", "denyWrite"]) : {};
    if (network) {
      if (n.sandbox?.network?.allowManagedDomainsOnly !== true && network.allowedDomains)
        b.allowedDomains = network.allowedDomains;
    }
    if (Object.keys(b).length > 0) y.network = b;
    if (filesystem) {
      if (n.sandbox?.filesystem?.allowManagedReadPathsOnly !== true && filesystem.allowRead)
        S.allowRead = filesystem.allowRead;
    }
    if (Object.keys(S).length > 0) y.filesystem = S;
    if (credentials) {
      let mapped = (credentials.files ?? []).map((v) =>
        v.mode === "deny"
          ? {
              path: v.path,
              mode: "deny",
            }
          : {
              path: v.path,
              mode: "mask",
              injectHosts: [],
            },
      );
      let mapped_2 = (credentials.envVars ?? [])
        .filter((v) => v.mode === "deny")
        .map((v) => ({
          name: v.name,
          mode: "deny",
        }));
      let L = {
        ...(mapped.length > 0 && {
          files: mapped,
        }),
        ...(mapped_2.length > 0 && {
          envVars: mapped_2,
        }),
      };
      if (credentials.sigv4) {
        let v = {};
        for (let j of ["streaming", "presigned", "sigv4a"])
          if (credentials.sigv4[j] === "deny") v[j] = "deny";
        L.sigv4 = v;
      }
      {
        let v = missingAwsPairs(credentials.awsPairs ?? [], []);
        if (v.length > 0) L.awsPairs = v;
      }
      if (Object.keys(L).length > 0) y.credentials = L;
    }
    mergeWithAssigner_2(y, pickRestrictiveSandboxSettings(e));
    if (Object.keys(y).length > 0) a.sandbox = y;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:482405-482586 placement
function missingAwsPairs(e, n) {
  let r = credentialRuleExtractSchema;
  let s = new Set(n.flatMap(awsPairVars));
  return uniq(e.flatMap(awsPairVars))
    .filter((a) => r.includes(a) && !s.has(a))
    .map((accessKeyIdVar, c) => ({
      accessKeyIdVar,
      secretAccessKeyVar: `${credentialRuleMaskClaimsSchema}${c + 1}_`,
    }));
}
//@ chunk-dcmhvw5a.js:482586-482716 placement
function awsPairVars(e) {
  if (!isPlainObject_2(e)) return [];
  return [e.accessKeyIdVar, e.secretAccessKeyVar, e.sessionTokenVar].filter((n) => typeof n === "string");
}
//@ chunk-dcmhvw5a.js:482716-482910 placement
var HOST_MANAGED_MODEL_ENV_KEYS = new Set([
  ...[...MODEL_SELECTION_ENV_VARS].filter((e) => e !== "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION"),
  ...CUSTOM_MODEL_OPTION_VARS,
  "CLAUDE_CODE_AUTO_MODE_MODEL",
  "CLAUDE_CODE_BG_CLASSIFIER_MODEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
]);
//@ chunk-dcmhvw5a.js:482910-483525 placement
function hostManagedModelOverlay(e, hostManagedProvider) {
  if (!hostManagedProvider || !e) return null;
  let r = {};
  if (e.model !== undefined) r.model = e.model;
  if (e.availableModels !== undefined) r.availableModels = e.availableModels;
  if (
    e.availableModelsMatch === "exact" ||
    (e.availableModelsMatch !== undefined && e.availableModels !== undefined)
  )
    r.availableModelsMatch = e.availableModelsMatch;
  if (e.enforceAvailableModels !== undefined) r.enforceAvailableModels = e.enforceAvailableModels;
  if (e.deniedModels !== undefined && e.deniedModels.length > 0) r.deniedModels = e.deniedModels;
  if (e.fallbackModel !== undefined) r.fallbackModel = e.fallbackModel;
  if (e.modelPicker !== undefined) r.modelPicker = e.modelPicker;
  return Object.keys(r).length > 0 ? r : null;
}
//@ chunk-dcmhvw5a.js:483525-483726 placement
function deniedModelsEntryWarnings(e) {
  let n = [];
  for (let r of e?.deniedModels ?? []) {
    let { warning } = parseDeniedModelEntry(r);
    if (warning !== undefined)
      n.push({
        file: "managed settings",
        path: "deniedModels",
        message: warning,
        severity: "warning",
        statusOnly: true,
      });
  }
  return n;
}
//@ chunk-dcmhvw5a.js:483726-483970 placement
function availableModelsExactEntryWarnings(e) {
  if (e?.availableModelsMatch !== "exact") return [];
  let availableModels = e.availableModels ?? [];
  return availableModels.flatMap((availableModel) => {
    let s = availableModelsEntryWarning(availableModel, availableModels);
    return s === undefined
      ? []
      : [
          {
            file: "managed settings",
            path: "availableModels",
            message: s,
            severity: "warning",
            statusOnly: true,
          },
        ];
  });
}
//@ chunk-dcmhvw5a.js:483970-484109 placement
function assignWithDeniedModels(e, hostModelOverlay) {
  let deniedModels = e.deniedModels;
  Object.assign(e, hostModelOverlay);
  if (deniedModels !== undefined && hostModelOverlay.deniedModels !== undefined)
    e.deniedModels = uniq([...deniedModels, ...hostModelOverlay.deniedModels]);
}
//@ chunk-dcmhvw5a.js:484109-484309 placement
function stripHostManagedModelKeys(e) {
  delete e.model;
  delete e.fallbackModel;
  delete e.modelPicker;
  delete e.modelOverrides;
  if (e.env) {
    let n = {};
    for (let [key, value] of Object.entries(e.env))
      if (!HOST_MANAGED_MODEL_ENV_KEYS.has(key.toUpperCase())) n[key] = value;
    e.env = n;
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
    getAllPolicyTierSettings_3(settingsContext).some((n) => n.modelPricing !== undefined)
  )
    return;
  return parseParentManagedSettings(settingsContext).settings?.modelPricing;
}
//@ chunk-dcmhvw5a.js:484761-485092 placement
function getHostManagedToolSearchEnv(settingsContext) {
  let hostToolSearchEnv = settingsContext.store.policy.hostToolSearchEnv;
  if (hostToolSearchEnv !== undefined) return hostToolSearchEnv.value;
  let r;
  if (settingsContext.hostManagedProvider) {
    let env = parseParentManagedSettings(settingsContext).settings?.env ?? {};
    for (let [key, value] of Object.entries(env)) {
      if (key === "ENABLE_TOOL_SEARCH") {
        r = value;
        break;
      }
      if (r === undefined && key.toUpperCase() === "ENABLE_TOOL_SEARCH") r = value;
    }
  }
  settingsContext.store.policy.hostToolSearchEnv = {
    value: r,
  };
  return r;
}
//@ chunk-dcmhvw5a.js:485092-485208 placement
function getAllPolicyTierSettings_3(e) {
  let allTiers = e.store.policy.allTiers;
  if (allTiers !== undefined) return allTiers;
  let r = policyTierSettings(e);
  e.store.policy.allTiers = r;
  return r;
}
export {
  getLegacyLocalSettingsFilePath_3,
  getSettingsForSourceIfRead,
  getSettingsForSource_3,
  getPairedPolicyModelOverrides,
  getDeniedModelsPolicyOverrides,
  getHostManagedModelPricing,
  getHostManagedToolSearchEnv,
  getAllPolicyTierSettings_3,
  deniedModelsEntryWarnings,
  availableModelsExactEntryWarnings,
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
};
