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
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { PATH_RULE_CARVE_OUT_RE } from "../../utils/settings/permissionRuleCarveOut.js";
import { coerceBooleanString } from "../../utils/spellcheck.js";
import { skillOverridesSchema } from "../../utils/settings/types.js";
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
function isRestrictedUnvouchedDocument(e) {
  return hasManagedSettings() && Object.keys(e).length > 0 && En(extractRestrictionSettings(e), e);
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
function stripUnvouchedRestrictions(e) {
  for (let r of LOOSENING_SETTING_PATHS) setAtPath(e, r, undefined);
  for (let { path, names } of CREDENTIAL_LIST_PATHS) {
    let atPath = getAtPath(e, path);
    let flattened = (Array.isArray(atPath) ? atPath : [atPath]).flatMap((g) =>
      isPlainObject_2(g) && typeof g[names] === "string"
        ? [
            {
              [names]: g[names],
              mode: "deny",
            },
          ]
        : [],
    );
    setAtPath(e, path, flattened.length > 0 ? flattened : undefined);
  }
  for (let r of [
    ["permissions", "deny"],
    ["permissions", "ask"],
  ]) {
    let atPath = getAtPath(e, r);
    if (Array.isArray(atPath)) {
      let filtered = atPath.filter((c) => typeof c !== "string" || !PATH_RULE_CARVE_OUT_RE.test(c));
      setAtPath(e, r, filtered);
    }
  }
  for (let { path, restrictive } of MANAGED_RESTRICTION_KEYS()) {
    let atPath = getAtPath(e, path);
    let c = path[0] === "strictPluginOnlyCustomization" ? atPath : coerceBooleanString(atPath);
    if (restrictive === true && c === false) setAtPath(e, path, undefined);
  }
  let strictPluginOnlyCustomization = e.strictPluginOnlyCustomization;
  if (
    Array.isArray(strictPluginOnlyCustomization) &&
    !strictPluginOnlyCustomization.some((r) => skillOverridesSchema.includes(r))
  )
    delete e.strictPluginOnlyCustomization;
  if (e.availableModelsMatch === "prefix") delete e.availableModelsMatch;
}
//@ chunk-dcmhvw5a.js:401104-401583 placement
function restrictionsOfUnvouchedDocument(e) {
  let n = {
    ...collectManagedRestrictions(e),
  };
  stripUnvouchedRestrictions(n);
  if (e.parentSettingsBehavior === "merge") n.parentSettingsBehavior = "merge";
  let options = Object.fromEntries(
    [...SEC_DEFAULT_PLUGIN_IDS, SEC_DEFAULT_PLUGIN_ID].flatMap((c) =>
      Object.entries(e.pluginConfigs?.[c]?.options ?? {}),
    ),
  );
  let s = policyModOptions({
    pluginConfigs: {
      [SEC_DEFAULT_PLUGIN_ID]: {
        options,
      },
    },
  });
  if (s !== undefined) n.pluginConfigs = s;
  let filtered = Object.entries(e.enabledPlugins ?? {}).filter(
    ([key, value]) =>
      value === false &&
      !(
        key.includes("@") && normalizeReservedMarketplaceCase(key.slice(key.lastIndexOf("@") + 1)) === BUILTIN
      ),
  );
  return filtered.length === 0
    ? n
    : {
        ...n,
        enabledPlugins: Object.fromEntries(filtered),
      };
}
//@ chunk-dcmhvw5a.js:401583-402126 placement
/**
 * 计算未担保设置文档中可采用的限制部分。
 */
function restrictionsOfUnvouchedDocumentUnsafe(e) {
  if (!e || !isSnapshotOnlySession()) return e;
  let n = {
    ...collectManagedRestrictions(e),
  };
  if (isDiskless()) {
    stripUnvouchedRestrictions(n);
    if (e.fastMode === false) n.fastMode = false;
    if (e.fastModePerSessionOptIn === true) n.fastModePerSessionOptIn = true;
    let flattened = Object.entries(isPlainObject_2(e.skillOverrides) ? e.skillOverrides : {}).flatMap(
      ([key, value]) => (value === "off" ? [[key, "off"]] : []),
    );
    if (flattened.length > 0) n.skillOverrides = Object.fromEntries(flattened);
    if (e === currentRemoteSettingsState_2().verifiedPayload) {
      if (typeof e.claudeMd === "string" && e.claudeMd !== "") n.claudeMd = e.claudeMd;
      for (let [key, value] of Object.entries(summarizePermissionRules(e.autoMode).lists))
        setAtPath(n, ["autoMode", key], value);
    }
  }
  return {
    ...n,
    managedSourcesBehavior: "merge",
  };
}
export {
  isRestrictedUnvouchedDocument,
  restrictionsOfUnvouchedDocumentUnsafe,
  CREDENTIAL_LIST_PATHS,
  restrictionsOfUnvouchedDocument,
};
