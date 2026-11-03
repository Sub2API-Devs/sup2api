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
import { oJt } from "../../utils/settings/types.js";
import {
  collectManagedRestrictions,
  summarizePermissionRules,
} from "../../utils/settings/managedSettingsKeys.js";
import { mJt } from "../../utils/plugins/pluginIdentifier.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";
import { Is, re } from "./remoteSettingsState.js";
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-dcmhvw5a.js:400133-400199 placement
function DC(e) {
  return hasManagedSettings() && Object.keys(e).length > 0 && En(extractRestrictionSettings(e), e);
}
//@ chunk-dcmhvw5a.js:400199-400399 placement
var LOOSENING_SETTING_PATHS = [
    ["allowedHttpHookUrls"],
    ["httpHookAllowedEnvVars"],
    ["isolation", "required"],
  ],
  CREDENTIAL_LIST_PATHS = [
    { path: ["sandbox", "credentials", "files"], names: "path" },
    { path: ["sandbox", "credentials", "envVars"], names: "name" },
  ];
/**
 * 对未担保的设置文档只保留限制性设置（deny 化、清除放宽项）。
 */
//@ chunk-dcmhvw5a.js:400399-401104 placement
function stripUnvouchedRestrictions(e) {
  for (let r of LOOSENING_SETTING_PATHS) setAtPath(e, r, void 0);
  for (let { path: path, names: names } of CREDENTIAL_LIST_PATHS) {
    let a = getAtPath(e, path),
      flattened = (Array.isArray(a) ? a : [a]).flatMap((g) =>
        isPlainObject_2(g) && typeof g[names] === "string" ? [{ [names]: g[names], mode: "deny" }] : [],
      );
    setAtPath(e, path, flattened.length > 0 ? flattened : void 0);
  }
  for (let r of [
    ["permissions", "deny"],
    ["permissions", "ask"],
  ]) {
    let s = getAtPath(e, r);
    if (Array.isArray(s)) {
      let filtered = s.filter((c) => typeof c !== "string" || !PATH_RULE_CARVE_OUT_RE.test(c));
      setAtPath(e, r, filtered);
    }
  }
  for (let { path: path, restrictive: restrictive } of MANAGED_RESTRICTION_KEYS()) {
    let a = getAtPath(e, path),
      c = path[0] === "strictPluginOnlyCustomization" ? a : coerceBooleanString(a);
    if (restrictive === !0 && c === !1) setAtPath(e, path, void 0);
  }
  let strictPluginOnlyCustomization = e.strictPluginOnlyCustomization;
  if (
    Array.isArray(strictPluginOnlyCustomization) &&
    !strictPluginOnlyCustomization.some((r) => oJt.includes(r))
  )
    delete e.strictPluginOnlyCustomization;
  if (e.availableModelsMatch === "prefix") delete e.availableModelsMatch;
}
//@ chunk-dcmhvw5a.js:401104-401583 placement
function restrictionsOfUnvouchedDocument(e) {
  let n = { ...collectManagedRestrictions(e) };
  if ((stripUnvouchedRestrictions(n), e.parentSettingsBehavior === "merge"))
    n.parentSettingsBehavior = "merge";
  let fromEntries = Object.fromEntries(
      [...SEC_DEFAULT_PLUGIN_IDS, SEC_DEFAULT_PLUGIN_ID].flatMap((c) =>
        Object.entries(e.pluginConfigs?.[c]?.options ?? {}),
      ),
    ),
    s = policyModOptions({ pluginConfigs: { [SEC_DEFAULT_PLUGIN_ID]: { options: fromEntries } } });
  if (s !== void 0) n.pluginConfigs = s;
  let filtered = Object.entries(e.enabledPlugins ?? {}).filter(
    ([c, g]) => g === !1 && !(c.includes("@") && mJt(c.slice(c.lastIndexOf("@") + 1)) === BUILTIN),
  );
  return filtered.length === 0 ? n : { ...n, enabledPlugins: Object.fromEntries(filtered) };
}
/**
 * 计算未担保设置文档中可采用的限制部分。
 */
//@ chunk-dcmhvw5a.js:401583-402126 placement
function restrictionsOfUnvouchedDocumentUnsafe(e) {
  if (!e || !Is()) return e;
  let n = { ...collectManagedRestrictions(e) };
  if (isDiskless()) {
    if ((stripUnvouchedRestrictions(n), e.fastMode === !1)) n.fastMode = !1;
    if (e.fastModePerSessionOptIn === !0) n.fastModePerSessionOptIn = !0;
    let flattened = Object.entries(isPlainObject_2(e.skillOverrides) ? e.skillOverrides : {}).flatMap(
      ([s, a]) => (a === "off" ? [[s, "off"]] : []),
    );
    if (flattened.length > 0) n.skillOverrides = Object.fromEntries(flattened);
    if (e === re().verifiedPayload) {
      if (typeof e.claudeMd === "string" && e.claudeMd !== "") n.claudeMd = e.claudeMd;
      for (let [s, a] of Object.entries(summarizePermissionRules(e.autoMode).lists))
        setAtPath(n, ["autoMode", s], a);
    }
  }
  return { ...n, managedSourcesBehavior: "merge" };
}

export { DC, restrictionsOfUnvouchedDocumentUnsafe, CREDENTIAL_LIST_PATHS, restrictionsOfUnvouchedDocument };
