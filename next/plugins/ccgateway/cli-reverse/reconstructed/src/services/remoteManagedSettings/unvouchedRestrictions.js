/**
 * services/remoteManagedSettings/unvouchedRestrictions.ts
 *
 * 2.1.316 新增：对未担保的设置文档只保留限制性设置（deny 化、清除放宽项）；计算未担保设置文档中可采用的限制部分。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (5)
 * attribution: placement 5
 */
import {
  hasManagedSettings,
  extractRestrictionSettings,
  setAtPath,
  getAtPath,
  MANAGED_RESTRICTION_KEYS,
  SEC_DEFAULT_PLUGIN_IDS,
  SEC_DEFAULT_PLUGIN_ID,
  policyModOptions,
} from "../../utils/settings/managedRestrictionKeys.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { PATH_RULE_CARVE_OUT_RE } from "../../utils/settings/permissionRuleCarveOut.js";
import { coerceBooleanString } from "../../utils/spellcheck.js";
import { SKILL_OVERRIDE_COMPONENTS } from "../../utils/settings/types.js";
import {
  collectManagedRestrictions,
  summarizePermissionRules,
} from "../../utils/settings/managedSettingsKeys.js";
import { normalizeReservedMarketplaceCase } from "../../utils/plugins/pluginIdentifier.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { isSnapshotOnlySession, currentRemoteSettingsState_2 } from "./remoteSettingsState.js";
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-dcmhvw5a.js:400133-400199 placement
/**
 * 判断文档是否含需收窄的限制设置（有托管设置、非空且收窄后与原文不同）。
 */
function isRestrictedUnvouchedDocument(settings) {
  return (
    hasManagedSettings() &&
    Object.keys(settings).length > 0 &&
    import_sortedIndex_2(extractRestrictionSettings(settings), settings)
  );
}
//@ chunk-dcmhvw5a.js:400199-400399 placement
var LOOSENING_SETTING_PATHS = [
  ["allowedHttpHookUrls"],
  ["httpHookAllowedEnvVars"],
  ["isolation", "required"],
];
var CREDENTIAL_LIST_PATHS = [
  {
    path: ["sandbox", "credentials", "files"],
    names: "path",
  },
  {
    path: ["sandbox", "credentials", "envVars"],
    names: "name",
  },
];
//@ chunk-dcmhvw5a.js:400399-401104 placement
/**
 * 对未担保的设置文档只保留限制性设置（deny 化、清除放宽项）。
 */
function stripUnvouchedRestrictions(settings) {
  for (let path of LOOSENING_SETTING_PATHS) setAtPath(settings, path, undefined);
  for (let { path, names } of CREDENTIAL_LIST_PATHS) {
    let atPath = getAtPath(settings, path);
    let flattened = (Array.isArray(atPath) ? atPath : [atPath]).flatMap((entry) =>
      isPlainObject_2(entry) && typeof entry[names] === "string"
        ? [
            {
              [names]: entry[names],
              mode: "deny",
            },
          ]
        : [],
    );
    setAtPath(settings, path, flattened.length > 0 ? flattened : undefined);
  }
  for (let path of [
    ["permissions", "deny"],
    ["permissions", "ask"],
  ]) {
    let atPath = getAtPath(settings, path);
    if (Array.isArray(atPath)) {
      let filtered = atPath.filter((rule) => typeof rule !== "string" || !PATH_RULE_CARVE_OUT_RE.test(rule));
      setAtPath(settings, path, filtered);
    }
  }
  for (let { path, restrictive } of MANAGED_RESTRICTION_KEYS()) {
    let atPath = getAtPath(settings, path);
    let value = path[0] === "strictPluginOnlyCustomization" ? atPath : coerceBooleanString(atPath);
    if (restrictive === true && value === false) setAtPath(settings, path, undefined);
  }
  let strictPluginOnlyCustomization = settings.strictPluginOnlyCustomization;
  if (
    Array.isArray(strictPluginOnlyCustomization) &&
    !strictPluginOnlyCustomization.some((component) => SKILL_OVERRIDE_COMPONENTS.includes(component))
  )
    delete settings.strictPluginOnlyCustomization;
  if (settings.availableModelsMatch === "prefix") delete settings.availableModelsMatch;
}
//@ chunk-dcmhvw5a.js:401104-401583 placement
function restrictionsOfUnvouchedDocument(settings) {
  let restricted = {
    ...collectManagedRestrictions(settings),
  };
  stripUnvouchedRestrictions(restricted);
  if (settings.parentSettingsBehavior === "merge") restricted.parentSettingsBehavior = "merge";
  let options = Object.fromEntries(
    [...SEC_DEFAULT_PLUGIN_IDS, SEC_DEFAULT_PLUGIN_ID].flatMap((pluginId) =>
      Object.entries(settings.pluginConfigs?.[pluginId]?.options ?? {}),
    ),
  );
  let pluginConfigs = policyModOptions({
    pluginConfigs: {
      [SEC_DEFAULT_PLUGIN_ID]: {
        options,
      },
    },
  });
  if (pluginConfigs !== undefined) restricted.pluginConfigs = pluginConfigs;
  let filtered = Object.entries(settings.enabledPlugins ?? {}).filter(
    ([key, value]) =>
      value === false &&
      !(
        key.includes("@") && normalizeReservedMarketplaceCase(key.slice(key.lastIndexOf("@") + 1)) === BUILTIN
      ),
  );
  return filtered.length === 0
    ? restricted
    : {
        ...restricted,
        enabledPlugins: Object.fromEntries(filtered),
      };
}
//@ chunk-dcmhvw5a.js:401583-402126 placement
/**
 * 计算未担保设置文档中可采用的限制部分。
 */
function restrictionsOfUnvouchedDocumentUnsafe(settings) {
  if (!settings || !isSnapshotOnlySession()) return settings;
  let restricted = {
    ...collectManagedRestrictions(settings),
  };
  if (isDiskless()) {
    stripUnvouchedRestrictions(restricted);
    if (settings.fastMode === false) restricted.fastMode = false;
    if (settings.fastModePerSessionOptIn === true) restricted.fastModePerSessionOptIn = true;
    let flattened = Object.entries(
      isPlainObject_2(settings.skillOverrides) ? settings.skillOverrides : {},
    ).flatMap(([key, value]) => (value === "off" ? [[key, "off"]] : []));
    if (flattened.length > 0) restricted.skillOverrides = Object.fromEntries(flattened);
    if (settings === currentRemoteSettingsState_2().verifiedPayload) {
      if (typeof settings.claudeMd === "string" && settings.claudeMd !== "")
        restricted.claudeMd = settings.claudeMd;
      for (let [key, value] of Object.entries(summarizePermissionRules(settings.autoMode).lists))
        setAtPath(restricted, ["autoMode", key], value);
    }
  }
  return {
    ...restricted,
    managedSourcesBehavior: "merge",
  };
}
export {
  isRestrictedUnvouchedDocument,
  restrictionsOfUnvouchedDocumentUnsafe,
  CREDENTIAL_LIST_PATHS,
  restrictionsOfUnvouchedDocument,
};
