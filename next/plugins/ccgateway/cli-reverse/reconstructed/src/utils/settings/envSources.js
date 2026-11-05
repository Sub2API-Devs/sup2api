/**
 * utils/settings/envSources.ts
 *
 * 2.1.316 新增：设置中的环境变量来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mdjhvrs8.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { filterPolicyPredicateEnv, getLegacyEnvMap, getPreSettingsEnvSnapshot } from "../managedEnvApply.js";
import { isSettingSourceEnabled } from "./constants.js";
import { getSettingsForSource } from "./settings.js";

//@ chunk-mdjhvrs8.js:306-509 placement
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
//@ chunk-mdjhvrs8.js:509-542 placement
/**
 * effectiveEnvSnapshot：预设置环境与非项目环境合并后的快照。
 */
function effectiveEnvSnapshot() {
  return overlayEnvCaseInsensitive(getPreSettingsEnvSnapshot(), collectNonProjectEnv());
}
//@ chunk-mdjhvrs8.js:542-726 placement
function overlayEnvCaseInsensitive(preSettingsEnvSnapshot, nonProjectEnv) {
  let uppercaseKeys = new Set(Object.keys(nonProjectEnv).map((key) => key.toUpperCase()));
  let result = {
    ...preSettingsEnvSnapshot,
  };
  for (let key of Object.keys(result))
    if (!(key in nonProjectEnv) && uppercaseKeys.has(key.toUpperCase())) delete result[key];
  return Object.assign(result, nonProjectEnv);
}
//@ chunk-mdjhvrs8.js:726-905 placement
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
