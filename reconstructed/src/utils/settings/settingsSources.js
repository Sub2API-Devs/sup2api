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
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
} from "path";
import { getPromptContent } from "../../commands/commit.js";
import { resolveLocalSettingsStoreRoot } from "./settingsFileParsing.js";
import { getRelativeSettingsFilePathForSource } from "./settings.js";
import { getSettingsForSourceUncached, kn } from "./policyTiers.js";
import { isProviderManagedByHost } from "../entrypointKinds.js";
import { MANAGED_RESTRICTION_KEYS, getAtPath, JOe, setAtPath } from "./managedRestrictionKeys.js";
import { _Ot, PATH_RULE_CARVE_OUT_RE } from "./permissionRuleCarveOut.js";
import { Xt, policyTierSettings } from "./policySettings.js";
import { wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logForDebugging } from "../debug.js";
import { fj, V3e, sn } from "./settingsSourceTrust.js";
import { uniq } from "../collections.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { HOt, Z_r } from "../managedEnvConstants.js";
import { parseDeniedModelEntry, availableModelsEntryWarning } from "../model/deniedModels.js";
import { parseParentManagedSettings } from "./managedFileSettings.js";

//@ chunk-dcmhvw5a.js:422494-422731 placement
function commitTrailersMode(e, n) {
  let r = e?.commitTrailers;
  if (typeof r === "boolean") return r ? "explicit-enabled" : "disabled";
  if (e !== void 0 && getPromptContent(e)) return e.commit === "" ? "disabled" : "implicit-enabled";
  if (n !== void 0) return n ? "implicit-enabled" : "disabled";
  return;
}
//@ chunk-dcmhvw5a.js:477482-477663 placement
function getLegacyLocalSettingsFilePath_3(e) {
  if (e.diskless) return;
  if (e.cwd === null || resolveLocalSettingsStoreRoot(e.cwd, e.canonicalGitRoot) === resolve_2(e.cwd)) return;
  if (e.projectConfigDir !== void 0) return;
  return join_2(resolve_2(e.cwd), getRelativeSettingsFilePathForSource("localSettings"));
}
//@ chunk-dcmhvw5a.js:477663-477770 placement
function getSettingsForSourceIfRead(e, n) {
  let tier = n.repoTierFreeze.tier(e);
  if (tier !== void 0) return tier.settings;
  return n.perSource.get(e);
}
//@ chunk-dcmhvw5a.js:477770-477898 placement
function getSettingsForSource_3(e, n) {
  let r = getSettingsForSourceIfRead(e, n.store);
  if (r !== void 0) return r;
  let s = getSettingsForSourceUncached(e, n),
    a = s && kn(e, s, n);
  return (n.store.perSource.set(e, a), a);
}
//@ chunk-dcmhvw5a.js:477898-477986 placement
function adminTierComposesParent(e) {
  return (e.parentSettingsBehavior ?? (isProviderManagedByHost() ? "merge" : "first-wins")) === "merge";
}
//@ chunk-dcmhvw5a.js:477986-478027 placement
function shouldIncludeParentTier(e, n = !1) {
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
  for (let { path: path, restrictive: restrictive } of MANAGED_RESTRICTION_KEYS()) {
    let a = getAtPath(e, path);
    if (path[0] === "sandbox" && JOe(restrictive).includes(a)) setAtPath(n, path, a);
  }
  return n.sandbox ?? {};
}
//@ chunk-dcmhvw5a.js:478254-478287 placement
function readSettingsPath(e, n) {
  return getAtPath(e, n);
}
//@ chunk-dcmhvw5a.js:478287-478376 placement
function isDisableAllHooksSet(e) {
  let n = e?.disableAllHooks;
  return n !== void 0 && n !== null && n !== !1 && n !== "false";
}
//@ chunk-dcmhvw5a.js:478376-482405 placement
function keepRestrictiveFromParent(e, n, r, s) {
  let a = {};
  if (e.allowManagedHooksOnly === !0 || e.disableAllHooks === !0 || isDisableAllHooksSet(r))
    a.allowManagedHooksOnly = !0;
  if (e.disableSkillShellExecution === !0) a.disableSkillShellExecution = !0;
  if (n.hooks === void 0 && !Object.values(n.enabledPlugins ?? {}).some((m) => m !== !1 && m !== void 0)) {
    if (e.allowedHttpHookUrls?.length === 0) a.allowedHttpHookUrls = [];
    if (e.httpHookAllowedEnvVars?.length === 0) a.httpHookAllowedEnvVars = [];
  }
  if (e.disableCommandPluginSources === !0) a.disableCommandPluginSources = !0;
  if (e.disableSideloadFlags === !0) a.disableSideloadFlags = !0;
  if (e.allowManagedMcpServersOnly === !0) a.allowManagedMcpServersOnly = !0;
  if (e.disableClaudeAiConnectors === !0) a.disableClaudeAiConnectors = !0;
  if (e.syncClaudeAiSkills === !1) a.syncClaudeAiSkills = !1;
  if (e.syncClaudeAiPlugins === !1) a.syncClaudeAiPlugins = !1;
  if (e.remoteTools?.allowUnattendedServing === !1)
    a.remoteTools = { ...a.remoteTools, allowUnattendedServing: !1 };
  if (_Ot(e.disablePluginDirectory) === !0) a.disablePluginDirectory = !0;
  if (e.allowManagedPermissionRulesOnly === !0) a.allowManagedPermissionRulesOnly = !0;
  if (e.disableAutoMode === "disable") a.disableAutoMode = "disable";
  let c = e.remoteControl?.shareHostProfile;
  if (c === "off" || c === "basic") a.remoteControl = { ...a.remoteControl, shareHostProfile: c };
  if (commitTrailersMode(e.attribution, e.includeCoAuthoredBy) === "disabled")
    a.attribution = { ...a.attribution, commitTrailers: !1 };
  if (e.attribution?.sessionUrl === !1) a.attribution = { ...a.attribution, sessionUrl: !1 };
  let strictPluginOnlyCustomization = e.strictPluginOnlyCustomization;
  if (
    strictPluginOnlyCustomization === !0 ||
    (Array.isArray(strictPluginOnlyCustomization) && strictPluginOnlyCustomization.length > 0)
  )
    a.strictPluginOnlyCustomization = strictPluginOnlyCustomization;
  if (e.deniedMcpServers) a.deniedMcpServers = e.deniedMcpServers;
  if (e.blockedMarketplaces?.length) a.blockedMarketplaces = e.blockedMarketplaces;
  if (e.deniedModels && e.deniedModels.length > 0) a.deniedModels = e.deniedModels;
  if (n.forceLoginOrgUUID === void 0 && e.forceLoginOrgUUID) a.forceLoginOrgUUID = e.forceLoginOrgUUID;
  for (let m of Xt) if (n[m] === void 0 && e[m]) Object.assign(a, { [m]: e[m] });
  if (e.enforceAvailableModels === !0) a.enforceAvailableModels = !0;
  if (e.availableModelsMatch === "exact") a.availableModelsMatch = "exact";
  if (e.permissions) {
    let m = wS(e.permissions, ["deny", "ask"]);
    for (let f of ["deny", "ask"]) {
      let h = m[f];
      if (h !== void 0)
        m[f] = h.filter((y) => {
          if (!PATH_RULE_CARVE_OUT_RE.test(y)) return !0;
          return (
            logForDebugging(
              `Ignoring ${f} rule "${y}" from the parent process's managed settings: a rule starting with "!" removes paths from the rules listed before it instead of restricting anything, so it is not merged into the policy rules. Spell the deny without the exception instead.`,
              { level: "warn" },
            ),
            !1
          );
        });
    }
    if (e.permissions.disableBypassPermissionsMode === "disable") m.disableBypassPermissionsMode = "disable";
    if (e.permissions.disableAutoMode === "disable") m.disableAutoMode = "disable";
    if (e.permissions.blockReadsOutsideWorkingDirectories === !0) m.blockReadsOutsideWorkingDirectories = !0;
    if (e.permissions.blockWritesOutsideWorkingDirectories === !0)
      m.blockWritesOutsideWorkingDirectories = !0;
    if (n.allowManagedPermissionRulesOnly !== !0) {
      let { allow: allow, additionalDirectories: additionalDirectories } = e.permissions;
      if (allow && n.sandbox?.network?.allowManagedDomainsOnly !== !0) m.allow = allow;
      if (additionalDirectories) m.additionalDirectories = additionalDirectories;
    }
    if (Object.keys(m).length > 0) a.permissions = m;
  }
  if (e.sandbox) {
    let { network: network, filesystem: filesystem, credentials: credentials } = e.sandbox,
      y = {},
      b = network ? wS(network, ["deniedDomains"]) : {},
      S = filesystem ? wS(filesystem, ["denyRead", "denyWrite"]) : {};
    if (network) {
      if (n.sandbox?.network?.allowManagedDomainsOnly !== !0 && network.allowedDomains)
        b.allowedDomains = network.allowedDomains;
    }
    if (Object.keys(b).length > 0) y.network = b;
    if (filesystem) {
      if (n.sandbox?.filesystem?.allowManagedReadPathsOnly !== !0 && filesystem.allowRead)
        S.allowRead = filesystem.allowRead;
    }
    if (Object.keys(S).length > 0) y.filesystem = S;
    if (credentials) {
      let mapped = (credentials.files ?? []).map((v) =>
          v.mode === "deny"
            ? { path: v.path, mode: "deny" }
            : { path: v.path, mode: "mask", injectHosts: [] },
        ),
        mapped_2 = (credentials.envVars ?? [])
          .filter((v) => v.mode === "deny")
          .map((v) => ({ name: v.name, mode: "deny" })),
        L = {
          ...(mapped.length > 0 && { files: mapped }),
          ...(mapped_2.length > 0 && { envVars: mapped_2 }),
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
    if ((fj(y, pickRestrictiveSandboxSettings(e)), Object.keys(y).length > 0)) a.sandbox = y;
  }
  return a;
}
//@ chunk-dcmhvw5a.js:482405-482586 placement
function missingAwsPairs(e, n) {
  let r = V3e,
    s = new Set(n.flatMap(awsPairVars));
  return uniq(e.flatMap(awsPairVars))
    .filter((a) => r.includes(a) && !s.has(a))
    .map((a, c) => ({ accessKeyIdVar: a, secretAccessKeyVar: `${sn}${c + 1}_` }));
}
//@ chunk-dcmhvw5a.js:482586-482716 placement
function awsPairVars(e) {
  if (!isPlainObject_2(e)) return [];
  return [e.accessKeyIdVar, e.secretAccessKeyVar, e.sessionTokenVar].filter((n) => typeof n === "string");
}
//@ chunk-dcmhvw5a.js:482716-482910 placement
var HOST_MANAGED_MODEL_ENV_KEYS = new Set([
  ...[...HOt].filter((e) => e !== "ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION"),
  ...Z_r,
  "CLAUDE_CODE_AUTO_MODE_MODEL",
  "CLAUDE_CODE_BG_CLASSIFIER_MODEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
]);
//@ chunk-dcmhvw5a.js:482910-483525 placement
function hostManagedModelOverlay(e, n) {
  if (!n || !e) return null;
  let r = {};
  if (e.model !== void 0) r.model = e.model;
  if (e.availableModels !== void 0) r.availableModels = e.availableModels;
  if (
    e.availableModelsMatch === "exact" ||
    (e.availableModelsMatch !== void 0 && e.availableModels !== void 0)
  )
    r.availableModelsMatch = e.availableModelsMatch;
  if (e.enforceAvailableModels !== void 0) r.enforceAvailableModels = e.enforceAvailableModels;
  if (e.deniedModels !== void 0 && e.deniedModels.length > 0) r.deniedModels = e.deniedModels;
  if (e.fallbackModel !== void 0) r.fallbackModel = e.fallbackModel;
  if (e.modelPicker !== void 0) r.modelPicker = e.modelPicker;
  return Object.keys(r).length > 0 ? r : null;
}
//@ chunk-dcmhvw5a.js:483525-483726 placement
function deniedModelsEntryWarnings(e) {
  let n = [];
  for (let r of e?.deniedModels ?? []) {
    let { warning: warning } = parseDeniedModelEntry(r);
    if (warning !== void 0)
      n.push({
        file: "managed settings",
        path: "deniedModels",
        message: warning,
        severity: "warning",
        statusOnly: !0,
      });
  }
  return n;
}
//@ chunk-dcmhvw5a.js:483726-483970 placement
function availableModelsExactEntryWarnings(e) {
  if (e?.availableModelsMatch !== "exact") return [];
  let n = e.availableModels ?? [];
  return n.flatMap((r) => {
    let s = availableModelsEntryWarning(r, n);
    return s === void 0
      ? []
      : [
          {
            file: "managed settings",
            path: "availableModels",
            message: s,
            severity: "warning",
            statusOnly: !0,
          },
        ];
  });
}
//@ chunk-dcmhvw5a.js:483970-484109 placement
function assignWithDeniedModels(e, n) {
  let deniedModels = e.deniedModels;
  if ((Object.assign(e, n), deniedModels !== void 0 && n.deniedModels !== void 0))
    e.deniedModels = uniq([...deniedModels, ...n.deniedModels]);
}
//@ chunk-dcmhvw5a.js:484109-484309 placement
function stripHostManagedModelKeys(e) {
  if ((delete e.model, delete e.fallbackModel, delete e.modelPicker, delete e.modelOverrides, e.env)) {
    let n = {};
    for (let [r, s] of Object.entries(e.env)) if (!HOST_MANAGED_MODEL_ENV_KEYS.has(r.toUpperCase())) n[r] = s;
    e.env = n;
  }
}
//@ chunk-dcmhvw5a.js:484309-484481 placement
function getPairedPolicyModelOverrides(e) {
  let pairedModelOverrides = e.store.policy.pairedModelOverrides;
  if (pairedModelOverrides !== void 0) return pairedModelOverrides.value;
  try {
    getSettingsForSource_3("policySettings", e);
  } catch {}
  return e.store.policy.pairedModelOverrides?.value;
}
//@ chunk-dcmhvw5a.js:484481-484632 placement
function getDeniedModelsPolicyOverrides(e) {
  if (e.store.policy.deniedModelsOverrides === void 0)
    try {
      getSettingsForSource_3("policySettings", e);
    } catch {}
  return e.store.policy.deniedModelsOverrides?.value;
}
//@ chunk-dcmhvw5a.js:484632-484761 placement
function getHostManagedModelPricing(e) {
  if (!e.hostManagedProvider || getAllPolicyTierSettings_3(e).some((n) => n.modelPricing !== void 0)) return;
  return parseParentManagedSettings(e).settings?.modelPricing;
}
//@ chunk-dcmhvw5a.js:484761-485092 placement
function getHostManagedToolSearchEnv(e) {
  let hostToolSearchEnv = e.store.policy.hostToolSearchEnv;
  if (hostToolSearchEnv !== void 0) return hostToolSearchEnv.value;
  let r;
  if (e.hostManagedProvider) {
    let s = parseParentManagedSettings(e).settings?.env ?? {};
    for (let [a, c] of Object.entries(s)) {
      if (a === "ENABLE_TOOL_SEARCH") {
        r = c;
        break;
      }
      if (r === void 0 && a.toUpperCase() === "ENABLE_TOOL_SEARCH") r = c;
    }
  }
  return ((e.store.policy.hostToolSearchEnv = { value: r }), r);
}
//@ chunk-dcmhvw5a.js:485092-485208 placement
function getAllPolicyTierSettings_3(e) {
  let allTiers = e.store.policy.allTiers;
  if (allTiers !== void 0) return allTiers;
  let r = policyTierSettings(e);
  return ((e.store.policy.allTiers = r), r);
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
