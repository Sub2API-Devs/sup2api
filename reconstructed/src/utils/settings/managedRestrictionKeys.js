/**
 * utils/settings/managedRestrictionKeys.ts
 *
 * 2.1.316 新增：托管设置中各限制性键及其归一化方式；按路径设置嵌套值（复制路径上的对象）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (12)
 * attribution: placement 12
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { _Ot } from "./permissionRuleCarveOut.js";
import { EFFORT_LEVELS } from "../effort.js";
import { SEC_DEFAULT_PLUGIN_NAME } from "../plugins/securityDefaultPlugin.js";
import { isCoworkEntrypoint, isCcsCoworkSurface, isCoworkSession } from "../entrypointKinds.js";
import { getSessionEntrypoint } from "../sessionShape.js";
import { logError } from "../log.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import { isPolicyModOptionValue, nc, HOST_POLICY_HOLD_PATHS } from "../permissions/autoModeRulesPrompt.js";

/**
 * 托管设置中各限制性键及其归一化方式。
 */
//@ chunk-dcmhvw5a.js:189885-193818 placement
var MANAGED_RESTRICTION_KEYS = DoctorLazy(() => [
  { path: ["allowManagedPermissionRulesOnly"], restrictive: !0 },
  { path: ["allowManagedHooksOnly"], restrictive: !0 },
  { path: ["allowManagedMcpServersOnly"], restrictive: !0 },
  { path: ["enforceAvailableModels"], restrictive: !0 },
  { path: ["disableAllHooks"], restrictive: !0 },
  { path: ["disableClaudeAiConnectors"], restrictive: !0 },
  { path: ["disableCommandPluginSources"], restrictive: !0 },
  { path: ["disableSideloadFlags"], restrictive: !0 },
  { path: ["disableSkillShellExecution"], restrictive: !0 },
  { path: ["disableRemoteControl"], restrictive: !0 },
  { path: ["disableAgentView"], restrictive: !0 },
  { path: ["disableWorkflows"], restrictive: !0 },
  { path: ["disableArtifact"], restrictive: !0 },
  { path: ["disableBundledSkills"], restrictive: !0 },
  { path: ["fastModePerSessionOptIn"], restrictive: !0 },
  { path: ["isolatePeerMachines"], restrictive: !0 },
  { path: ["strictPluginOnlyCustomization"], restrictive: !0 },
  { path: ["disableAutoMode"], restrictive: "disable" },
  { path: ["disableDeepLinkRegistration"], restrictive: "disable" },
  { path: ["permissions", "disableBypassPermissionsMode"], restrictive: "disable" },
  { path: ["permissions", "disableAutoMode"], restrictive: "disable" },
  { path: ["permissions", "blockReadsOutsideWorkingDirectories"], restrictive: !0 },
  { path: ["permissions", "blockWritesOutsideWorkingDirectories"], restrictive: !0 },
  { path: ["autoMode", "classifyAllShell"], restrictive: !0 },
  { path: ["worktree", "bgIsolation"], restrictive: "worktree" },
  { path: ["enableArtifact"], restrictive: !1 },
  { path: ["enableWorkflows"], restrictive: !1 },
  { path: ["syncClaudeAiSkills"], restrictive: !1 },
  { path: ["syncClaudeAiPlugins"], restrictive: !1 },
  { path: ["useAutoModeDuringPlan"], restrictive: !1 },
  { path: ["skipDangerousModePermissionPrompt"], restrictive: !1 },
  { path: ["skipAutoPermissionPrompt"], restrictive: !1 },
  { path: ["enableAllProjectMcpServers"], restrictive: !1 },
  { path: ["channelsEnabled"], restrictive: !1 },
  { path: ["skipWebFetchPreflight"], restrictive: !1 },
  { path: ["skipWorkflowUsageWarning"], restrictive: !1 },
  { path: ["autoUploadSessions"], restrictive: !1 },
  { path: ["remoteControlAtStartup"], restrictive: !1 },
  { path: ["remoteTools", "allowUnattendedServing"], restrictive: !1 },
  { path: ["autoContinueAtUsageLimit"], restrictive: !1 },
  { path: ["responseComparisonEnabled"], restrictive: !1 },
  { path: ["disablePluginDirectory"], restrictive: !0, normalize: _Ot },
  { path: ["attribution", "sessionUrl"], restrictive: !1 },
  { path: ["crossSessionInbound"], restrictive: ["refuse", "hold"] },
  { path: ["remoteControl", "shareHostProfile"], restrictive: ["off", "basic"] },
  { path: ["modelProposedGoals"], restrictive: ["disabled", "alwaysAsk"] },
  { path: ["maxEffortLevel"], restrictive: EFFORT_LEVELS },
  { path: ["feedbackDrafts"], restrictive: "off" },
  { path: ["availableModelsMatch"], restrictive: "exact" },
  { path: ["askUserQuestionTimeout"], restrictive: "never" },
  { path: ["dialogExpiry"], restrictive: "never" },
  { path: ["sandbox", "enabled"], restrictive: !0 },
  { path: ["sandbox", "failIfUnavailable"], restrictive: !0 },
  { path: ["sandbox", "autoAllowBashIfSandboxed"], restrictive: !1 },
  { path: ["sandbox", "allowUnsandboxedCommands"], restrictive: !1 },
  { path: ["sandbox", "enableWeakerNestedSandbox"], restrictive: !1 },
  { path: ["sandbox", "enableWeakerNetworkIsolation"], restrictive: !1 },
  { path: ["sandbox", "allowAppleEvents"], restrictive: !1 },
  { path: ["sandbox", "allowNestedUserNamespaces"], restrictive: !1 },
  { path: ["sandbox", "network", "allowManagedDomainsOnly"], restrictive: !0 },
  { path: ["sandbox", "network", "strictAllowlist"], restrictive: !0 },
  { path: ["sandbox", "network", "allowAllUnixSockets"], restrictive: !1 },
  { path: ["sandbox", "network", "allowLocalBinding"], restrictive: !1 },
  { path: ["sandbox", "filesystem", "allowManagedReadPathsOnly"], restrictive: !0 },
  { path: ["sandbox", "filesystem", "disabled"], restrictive: !1 },
  { path: ["sandbox", "credentials", "allowPlaintextInject"], restrictive: !1 },
  { path: ["sandbox", "credentials", "sigv4", "streaming"], restrictive: "deny" },
  { path: ["sandbox", "credentials", "sigv4", "presigned"], restrictive: "deny" },
  { path: ["sandbox", "credentials", "sigv4", "sigv4a"], restrictive: "deny" },
  { path: ["isolation", "required"], restrictive: !0 },
  { path: ["isolation", "persistHome"], restrictive: !1 },
]);
//@ chunk-dcmhvw5a.js:193818-193864 placement
function JOe(e) {
  return Array.isArray(e) ? e : [e];
}
/**
 * 按路径取嵌套值。
 */
//@ chunk-dcmhvw5a.js:193864-193961 placement
function getAtPath(e, n) {
  let r = e;
  for (let s of n) {
    if (r === null || typeof r !== "object") return;
    r = r[s];
  }
  return r;
}
/**
 * 按路径设置嵌套值（复制路径上的对象）。
 */
//@ chunk-dcmhvw5a.js:193961-194204 placement
function setAtPath(e, n, r) {
  let s = [e],
    a = e;
  for (let g of n.slice(0, -1)) {
    let m = { ...a[g] };
    ((a[g] = m), (a = m), s.push(a));
  }
  let at = n.at(-1);
  if (r !== void 0) {
    a[at] = r;
    return;
  }
  delete a[at];
  for (let g = s.length - 1; g > 0; g--) {
    if (Object.keys(s[g]).length > 0) break;
    delete s[g - 1][n[g - 1]];
  }
}
/**
 * 取限制键的归一化值。
 */
//@ chunk-dcmhvw5a.js:194204-194286 placement
function restrictionValue(e, n) {
  let r = getAtPath(n, e.path);
  return e.normalize === void 0 ? r : e.normalize(r);
}
//@ chunk-dcmhvw5a.js:194286-194569 placement
var SEC_DEFAULT_PLUGIN_ID = `${SEC_DEFAULT_PLUGIN_NAME}@builtin`,
  SEC_DEFAULT_PLUGIN_IDS = ["sec-default@builtin"],
  RESTRICTION_KEYS = Object.freeze({
    settings: Object.freeze(["allowManagedHooksOnly", "disableAllHooks", "disableCommandPluginSources"]),
    policyModOptions: Object.freeze(["allowManagedModsOnly"]),
    setAside: Object.freeze(["allowModsToOverrideDenyRules"]),
  });
/**
 * 是否存在托管设置。
 */
//@ chunk-dcmhvw5a.js:194569-194601 placement
function hasManagedSettings() {
  return Ob() ?? isCoworkEntrypoint();
}
//@ chunk-dcmhvw5a.js:194601-194634 placement
function u1e() {
  return hasManagedSettings() || isCcsCoworkSurface();
}
//@ chunk-dcmhvw5a.js:194634-194707 placement
function Ob() {
  try {
    return getSessionEntrypoint() === void 0 ? void 0 : isCoworkSession();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-dcmhvw5a.js:194707-194900 placement
function policyModOptions(e) {
  let n = getAtPath(e, ["pluginConfigs", SEC_DEFAULT_PLUGIN_ID, "options"]),
    r = {};
  for (let policyModOption of RESTRICTION_KEYS.policyModOptions) {
    let c = isPlainObject_2(n) ? n[policyModOption] : void 0;
    if (isPolicyModOptionValue(c)) r[policyModOption] = c;
  }
  return Object.keys(r).length > 0 ? { [SEC_DEFAULT_PLUGIN_ID]: { options: r } } : void 0;
}
/**
 * 从设置中抽取限制性设置（管理钩子、禁用钩子等）与策略插件选项，非空时标记为合并方式的托管来源。
 */
//@ chunk-dcmhvw5a.js:194900-195099 placement
function extractRestrictionSettings(e) {
  let n = {};
  for (let setting of RESTRICTION_KEYS.settings) {
    let c = getAtPath(e, [setting]);
    if (nc(c)) n[setting] = c;
  }
  let r = policyModOptions(e);
  if (r !== void 0) n.pluginConfigs = r;
  return Object.keys(n).length > 0 ? { ...n, managedSourcesBehavior: "merge" } : {};
}
/**
 * （旧版名配错，切分错误）把来源设置中特定路径的值合并进目标设置，并标记 managedSourcesBehavior=merge。
 */
//@ chunk-dcmhvw5a.js:195099-195295 placement = GIT_MERGE_RE (0.429)
function mergeManagedSettingsPaths(e, n) {
  let filtered = HOST_POLICY_HOLD_PATHS.filter(
    ({ path: path, holds: holds }) => holds(getAtPath(e, path)) && !holds(getAtPath(n, path)),
  );
  if (filtered.length === 0) return n;
  let s = { ...n };
  for (let { path: path } of filtered) setAtPath(s, path, getAtPath(e, path));
  return { ...s, managedSourcesBehavior: "merge" };
}

export {
  hasManagedSettings,
  u1e,
  extractRestrictionSettings,
  MANAGED_RESTRICTION_KEYS,
  JOe,
  restrictionValue,
  RESTRICTION_KEYS,
  SEC_DEFAULT_PLUGIN_ID,
  setAtPath,
  getAtPath,
  mergeManagedSettingsPaths,
  SEC_DEFAULT_PLUGIN_IDS,
  policyModOptions,
};
