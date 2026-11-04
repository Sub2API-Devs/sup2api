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
  let uppercaseKeys = new Set(Object.keys(nonProjectEnv).map((key) => key.toUpperCase()));
  let result = {
    ...preSettingsEnvSnapshot,
  };
  for (let key of Object.keys(result))
    if (!(key in nonProjectEnv) && uppercaseKeys.has(key.toUpperCase())) delete result[key];
  return Object.assign(result, nonProjectEnv);
}
//@ chunk-e4vyc04t.js:727-906 placement
function mergeEnvCaseInsensitive(...envs) {
  let byKey = new Map();
  for (let env of envs)
    for (let [key, value] of Object.entries(env))
      byKey.set(key.toUpperCase(), {
        key,
        value,
      });
  let out = {};
  for (let { key, value } of byKey.values()) out[key] = value;
  return out;
}
export { effectiveEnvSnapshot };
