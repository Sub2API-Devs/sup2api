/**
 * utils/settings/envSources.ts
 *
 * 2.1.316 新增：设置中的环境变量来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e4vyc04t.js (4)
 * attribution: placement 4
 */
import { filterPolicyPredicateEnv, getLegacyEnvMap, getPreSettingsEnvSnapshot } from "../managedEnvApply.js";
import { isSettingSourceEnabled } from "./constants.js";
import { getSettingsForSource } from "./settings.js";

//@ chunk-e4vyc04t.js:306-509 placement
function collectNonProjectEnv() {
  return mergeEnvCaseInsensitive(
    filterPolicyPredicateEnv(getLegacyEnvMap(), "globalConfig"),
    isSettingSourceEnabled("userSettings")
      ? filterPolicyPredicateEnv(getSettingsForSource("userSettings")?.env, "userSettings")
      : {},
    filterPolicyPredicateEnv(getSettingsForSource("flagSettings")?.env, "flagSettings"),
    filterPolicyPredicateEnv(getSettingsForSource("policySettings")?.env, "policySettings"),
  );
}
//@ chunk-e4vyc04t.js:509-543 placement
/**
 * effectiveEnvSnapshot：预设置环境与非项目环境合并后的快照。
 */
function effectiveEnvSnapshot() {
  return overlayEnvCaseInsensitive(getPreSettingsEnvSnapshot(), collectNonProjectEnv());
}
//@ chunk-e4vyc04t.js:543-727 placement
function overlayEnvCaseInsensitive(preSettingsEnvSnapshot, nonProjectEnv) {
  let r = new Set(Object.keys(nonProjectEnv).map((key) => key.toUpperCase()));
  let t = {
    ...preSettingsEnvSnapshot,
  };
  for (let key of Object.keys(t)) if (!(key in nonProjectEnv) && r.has(key.toUpperCase())) delete t[key];
  return Object.assign(t, nonProjectEnv);
}
//@ chunk-e4vyc04t.js:727-906 placement
function mergeEnvCaseInsensitive(...s) {
  let n = new Map();
  for (let t of s)
    for (let [key, value] of Object.entries(t))
      n.set(key.toUpperCase(), {
        key,
        value,
      });
  let r = {};
  for (let { key, value: e } of n.values()) r[key] = e;
  return r;
}
export { effectiveEnvSnapshot };
