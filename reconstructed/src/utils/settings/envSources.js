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
function cte() {
  return overlayEnvCaseInsensitive(getPreSettingsEnvSnapshot(), collectNonProjectEnv());
}
//@ chunk-e4vyc04t.js:543-727 placement
function overlayEnvCaseInsensitive(s, n) {
  let r = new Set(Object.keys(n).map((e) => e.toUpperCase())),
    t = { ...s };
  for (let e of Object.keys(t)) if (!(e in n) && r.has(e.toUpperCase())) delete t[e];
  return Object.assign(t, n);
}
//@ chunk-e4vyc04t.js:727-906 placement
function mergeEnvCaseInsensitive(...s) {
  let n = new Map();
  for (let t of s) for (let [e, o] of Object.entries(t)) n.set(e.toUpperCase(), { key: e, value: o });
  let r = {};
  for (let { key: key, value: e } of n.values()) r[key] = e;
  return r;
}

export { cte };
