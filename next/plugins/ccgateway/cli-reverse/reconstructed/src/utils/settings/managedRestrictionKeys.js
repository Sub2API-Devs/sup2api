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
import { normalizeCarveOutFlag } from "./permissionRuleCarveOut.js";
import { EFFORT_LEVELS } from "../effort.js";
import { SEC_DEFAULT_PLUGIN_NAME } from "../plugins/securityDefaultPlugin.js";
import { isCoworkEntrypoint, isCcsCoworkSurface, isCoworkSession } from "../entrypointKinds.js";
import { getSessionEntrypoint } from "../sessionShape.js";
import { logError } from "../log.js";
import { isPlainObject as isPlainObject_2 } from "../isPlainObject.js";
import {
  isPolicyModOptionValue,
  isExactlyTrue,
  HOST_POLICY_HOLD_PATHS,
} from "../permissions/autoModeRulesPrompt.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:189885-193818 placement
/**
 * 托管设置中各限制性键及其归一化方式。
 */
var MANAGED_RESTRICTION_KEYS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:189885", () => {
  MANAGED_RESTRICTION_KEYS = DoctorLazy(() => [
    {
      path: ["allowManagedPermissionRulesOnly"],
      restrictive: true,
    },
    {
      path: ["allowManagedHooksOnly"],
      restrictive: true,
    },
    {
      path: ["allowManagedMcpServersOnly"],
      restrictive: true,
    },
    {
      path: ["enforceAvailableModels"],
      restrictive: true,
    },
    {
      path: ["disableAllHooks"],
      restrictive: true,
    },
    {
      path: ["disableClaudeAiConnectors"],
      restrictive: true,
    },
    {
      path: ["disableCommandPluginSources"],
      restrictive: true,
    },
    {
      path: ["disableSideloadFlags"],
      restrictive: true,
    },
    {
      path: ["disableSkillShellExecution"],
      restrictive: true,
    },
    {
      path: ["disableRemoteControl"],
      restrictive: true,
    },
    {
      path: ["disableAgentView"],
      restrictive: true,
    },
    {
      path: ["disableWorkflows"],
      restrictive: true,
    },
    {
      path: ["disableArtifact"],
      restrictive: true,
    },
    {
      path: ["disableBundledSkills"],
      restrictive: true,
    },
    {
      path: ["fastModePerSessionOptIn"],
      restrictive: true,
    },
    {
      path: ["isolatePeerMachines"],
      restrictive: true,
    },
    {
      path: ["strictPluginOnlyCustomization"],
      restrictive: true,
    },
    {
      path: ["disableAutoMode"],
      restrictive: "disable",
    },
    {
      path: ["disableDeepLinkRegistration"],
      restrictive: "disable",
    },
    {
      path: ["permissions", "disableBypassPermissionsMode"],
      restrictive: "disable",
    },
    {
      path: ["permissions", "disableAutoMode"],
      restrictive: "disable",
    },
    {
      path: ["permissions", "blockReadsOutsideWorkingDirectories"],
      restrictive: true,
    },
    {
      path: ["permissions", "blockWritesOutsideWorkingDirectories"],
      restrictive: true,
    },
    {
      path: ["autoMode", "classifyAllShell"],
      restrictive: true,
    },
    {
      path: ["worktree", "bgIsolation"],
      restrictive: "worktree",
    },
    {
      path: ["enableArtifact"],
      restrictive: false,
    },
    {
      path: ["enableWorkflows"],
      restrictive: false,
    },
    {
      path: ["syncClaudeAiSkills"],
      restrictive: false,
    },
    {
      path: ["syncClaudeAiPlugins"],
      restrictive: false,
    },
    {
      path: ["useAutoModeDuringPlan"],
      restrictive: false,
    },
    {
      path: ["skipDangerousModePermissionPrompt"],
      restrictive: false,
    },
    {
      path: ["skipAutoPermissionPrompt"],
      restrictive: false,
    },
    {
      path: ["enableAllProjectMcpServers"],
      restrictive: false,
    },
    {
      path: ["channelsEnabled"],
      restrictive: false,
    },
    {
      path: ["skipWebFetchPreflight"],
      restrictive: false,
    },
    {
      path: ["skipWorkflowUsageWarning"],
      restrictive: false,
    },
    {
      path: ["autoUploadSessions"],
      restrictive: false,
    },
    {
      path: ["remoteControlAtStartup"],
      restrictive: false,
    },
    {
      path: ["remoteTools", "allowUnattendedServing"],
      restrictive: false,
    },
    {
      path: ["autoContinueAtUsageLimit"],
      restrictive: false,
    },
    {
      path: ["responseComparisonEnabled"],
      restrictive: false,
    },
    {
      path: ["disablePluginDirectory"],
      restrictive: true,
      normalize: normalizeCarveOutFlag,
    },
    {
      path: ["attribution", "sessionUrl"],
      restrictive: false,
    },
    {
      path: ["crossSessionInbound"],
      restrictive: ["refuse", "hold"],
    },
    {
      path: ["remoteControl", "shareHostProfile"],
      restrictive: ["off", "basic"],
    },
    {
      path: ["modelProposedGoals"],
      restrictive: ["disabled", "alwaysAsk"],
    },
    {
      path: ["maxEffortLevel"],
      restrictive: EFFORT_LEVELS,
    },
    {
      path: ["feedbackDrafts"],
      restrictive: "off",
    },
    {
      path: ["availableModelsMatch"],
      restrictive: "exact",
    },
    {
      path: ["askUserQuestionTimeout"],
      restrictive: "never",
    },
    {
      path: ["dialogExpiry"],
      restrictive: "never",
    },
    {
      path: ["sandbox", "enabled"],
      restrictive: true,
    },
    {
      path: ["sandbox", "failIfUnavailable"],
      restrictive: true,
    },
    {
      path: ["sandbox", "autoAllowBashIfSandboxed"],
      restrictive: false,
    },
    {
      path: ["sandbox", "allowUnsandboxedCommands"],
      restrictive: false,
    },
    {
      path: ["sandbox", "enableWeakerNestedSandbox"],
      restrictive: false,
    },
    {
      path: ["sandbox", "enableWeakerNetworkIsolation"],
      restrictive: false,
    },
    {
      path: ["sandbox", "allowAppleEvents"],
      restrictive: false,
    },
    {
      path: ["sandbox", "allowNestedUserNamespaces"],
      restrictive: false,
    },
    {
      path: ["sandbox", "network", "allowManagedDomainsOnly"],
      restrictive: true,
    },
    {
      path: ["sandbox", "network", "strictAllowlist"],
      restrictive: true,
    },
    {
      path: ["sandbox", "network", "allowAllUnixSockets"],
      restrictive: false,
    },
    {
      path: ["sandbox", "network", "allowLocalBinding"],
      restrictive: false,
    },
    {
      path: ["sandbox", "filesystem", "allowManagedReadPathsOnly"],
      restrictive: true,
    },
    {
      path: ["sandbox", "filesystem", "disabled"],
      restrictive: false,
    },
    {
      path: ["sandbox", "credentials", "allowPlaintextInject"],
      restrictive: false,
    },
    {
      path: ["sandbox", "credentials", "sigv4", "streaming"],
      restrictive: "deny",
    },
    {
      path: ["sandbox", "credentials", "sigv4", "presigned"],
      restrictive: "deny",
    },
    {
      path: ["sandbox", "credentials", "sigv4", "sigv4a"],
      restrictive: "deny",
    },
    {
      path: ["isolation", "required"],
      restrictive: true,
    },
    {
      path: ["isolation", "persistHome"],
      restrictive: false,
    },
  ]);
});
//@ chunk-dcmhvw5a.js:193818-193864 placement
/**
 * asArray：标量转数组。
 */
function asArray(restrictive) {
  return Array.isArray(restrictive) ? restrictive : [restrictive];
}
//@ chunk-dcmhvw5a.js:193864-193961 placement
/**
 * 按路径取嵌套值。
 */
function getAtPath(root, parts) {
  let current = root;
  for (let part of parts) {
    if (current === null || typeof current !== "object") return;
    current = current[part];
  }
  return current;
}
//@ chunk-dcmhvw5a.js:193961-194204 placement
/**
 * 按路径设置嵌套值（复制路径上的对象）。
 */
function setAtPath(root, parts, value) {
  let chain = [root];
  let current = root;
  for (let part of parts.slice(0, -1)) {
    let child = {
      ...current[part],
    };
    current[part] = child;
    current = child;
    chain.push(current);
  }
  let last = parts.at(-1);
  if (value !== undefined) {
    current[last] = value;
    return;
  }
  delete current[last];
  for (let j = chain.length - 1; j > 0; j--) {
    if (Object.keys(chain[j]).length > 0) break;
    delete chain[j - 1][parts[j - 1]];
  }
}
//@ chunk-dcmhvw5a.js:194204-194286 placement
/**
 * 取限制键的归一化值。
 */
function restrictionValue(key, doc) {
  let atPath = getAtPath(doc, key.path);
  return key.normalize === undefined ? atPath : key.normalize(atPath);
}
//@ chunk-dcmhvw5a.js:194286-194569 placement
var SEC_DEFAULT_PLUGIN_ID; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SEC_DEFAULT_PLUGIN_IDS;
var RESTRICTION_KEYS;
deferInit("chunk-dcmhvw5a.js:194286", () => {
  SEC_DEFAULT_PLUGIN_ID = `${SEC_DEFAULT_PLUGIN_NAME}@builtin`;
  SEC_DEFAULT_PLUGIN_IDS = ["sec-default@builtin"];
  RESTRICTION_KEYS = Object.freeze({
    settings: Object.freeze(["allowManagedHooksOnly", "disableAllHooks", "disableCommandPluginSources"]),
    policyModOptions: Object.freeze(["allowManagedModsOnly"]),
    setAside: Object.freeze(["allowModsToOverrideDenyRules"]),
  });
});
//@ chunk-dcmhvw5a.js:194569-194601 placement
/**
 * 是否存在托管设置。
 */
function hasManagedSettings() {
  return coworkSessionIfAny() ?? isCoworkEntrypoint();
}
//@ chunk-dcmhvw5a.js:194601-194634 placement
/**
 * hasManagedOrCoworkSurface：有托管设置或 Cowork 界面。
 */
function hasManagedOrCoworkSurface() {
  return hasManagedSettings() || isCcsCoworkSurface();
}
//@ chunk-dcmhvw5a.js:194634-194707 placement
function coworkSessionIfAny() {
  try {
    return getSessionEntrypoint() === undefined ? undefined : isCoworkSession();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-dcmhvw5a.js:194707-194900 placement
function policyModOptions(doc) {
  let atPath = getAtPath(doc, ["pluginConfigs", SEC_DEFAULT_PLUGIN_ID, "options"]);
  let picked = {};
  for (let policyModOption of RESTRICTION_KEYS.policyModOptions) {
    let value = isPlainObject_2(atPath) ? atPath[policyModOption] : undefined;
    if (isPolicyModOptionValue(value)) picked[policyModOption] = value;
  }
  return Object.keys(picked).length > 0
    ? {
        [SEC_DEFAULT_PLUGIN_ID]: {
          options: picked,
        },
      }
    : undefined;
}
//@ chunk-dcmhvw5a.js:194900-195099 placement
/**
 * 从设置中抽取限制性设置（管理钩子、禁用钩子等）与策略插件选项，非空时标记为合并方式的托管来源。
 */
function extractRestrictionSettings(doc) {
  let out = {};
  for (let setting of RESTRICTION_KEYS.settings) {
    let atPath = getAtPath(doc, [setting]);
    if (isExactlyTrue(atPath)) out[setting] = atPath;
  }
  let options = policyModOptions(doc);
  if (options !== undefined) out.pluginConfigs = options;
  return Object.keys(out).length > 0
    ? {
        ...out,
        managedSourcesBehavior: "merge",
      }
    : {};
}
//@ chunk-dcmhvw5a.js:195099-195295 placement (2.1.88 match: GIT_MERGE_RE, 0.429)
/**
 * （旧版名配错，切分错误）把来源设置中特定路径的值合并进目标设置，并标记 managedSourcesBehavior=merge。
 */
function mergeManagedSettingsPaths(coworkCloudHolds, baseSettings) {
  let filtered = HOST_POLICY_HOLD_PATHS.filter(
    ({ path, holds }) => holds(getAtPath(coworkCloudHolds, path)) && !holds(getAtPath(baseSettings, path)),
  );
  if (filtered.length === 0) return baseSettings;
  let mergedSettings = {
    ...baseSettings,
  };
  for (let { path } of filtered) setAtPath(mergedSettings, path, getAtPath(coworkCloudHolds, path));
  return {
    ...mergedSettings,
    managedSourcesBehavior: "merge",
  };
}
export {
  hasManagedSettings,
  hasManagedOrCoworkSurface,
  extractRestrictionSettings,
  MANAGED_RESTRICTION_KEYS,
  asArray,
  restrictionValue,
  RESTRICTION_KEYS,
  SEC_DEFAULT_PLUGIN_ID,
  setAtPath,
  getAtPath,
  mergeManagedSettingsPaths,
  SEC_DEFAULT_PLUGIN_IDS,
  policyModOptions,
};
