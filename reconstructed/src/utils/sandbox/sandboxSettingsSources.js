/**
 * utils/sandbox/sandboxSettingsSources.ts
 *
 * 2.1.316 新增：沙箱读取的设置来源（flag/user/policy）与合并 ignoreViolations、permissions.allow
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fq0cr76a.js (12)
 * attribution: placement 12
 */
import {
  getAllPolicyTierSettings,
  getSettingsForSource,
  isPolicySlotAdminOrParentComposed,
  getMergedPolicySources,
} from "../settings/settings.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { uniq } from "../collections.js";
import { readSettingsPath } from "../settings/settingsSources.js";

//@ chunk-fq0cr76a.js:853227-853248 placement
var uM = ".claude/ssh";
//@ chunk-fq0cr76a.js:853248-853287 placement
function getSandboxSettingsSources() {
  return [...getAllPolicyTierSettings(), ...bqt()];
}
//@ chunk-fq0cr76a.js:853287-853372 placement
function bqt() {
  return [
    getSettingsForSource("flagSettings"),
    isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
  ];
}
//@ chunk-fq0cr76a.js:853372-853425 placement = _temp7 (1)
function getPolicySettingsIfEnabled() {
  return isPolicySlotAdminOrParentComposed() ? getSettingsForSource("policySettings") : null;
}
//@ chunk-fq0cr76a.js:853425-853500 placement
function collectFromSandboxSettings(e) {
  return uniq(_0().flatMap((n) => (n?.sandbox && e(n.sandbox)) ?? []));
}
//@ chunk-fq0cr76a.js:853500-853601 placement
function firstFromSandboxSettings(e) {
  for (let n of _0()) {
    let r = n?.sandbox ? e(n.sandbox) : void 0;
    if (r !== void 0) return r;
  }
  return;
}
//@ chunk-fq0cr76a.js:853601-853657 placement
function Ev(e) {
  let n = getPolicySettingsIfEnabled()?.sandbox;
  return n ? e(n) : void 0;
}
//@ chunk-fq0cr76a.js:853657-853847 placement
function mergeIgnoreViolations() {
  let e = new Map();
  for (let n of _0())
    for (let [r, s] of Object.entries(n?.sandbox?.ignoreViolations ?? {}))
      e.set(r, uniq([...(e.get(r) ?? []), ...s]));
  return e.size > 0 ? Object.fromEntries(e) : void 0;
}
//@ chunk-fq0cr76a.js:853847-853916 placement
function collectAllowRules() {
  return uniq(_0().flatMap((e) => e?.permissions?.allow ?? []));
}
//@ chunk-fq0cr76a.js:853916-853952 placement
function _0() {
  return [getPolicySettingsIfEnabled(), ...bqt()];
}
/**
 * 读取策略层的沙箱设置项：有合并的策略来源时取 policySettings，否则取各策略层第一个有值的。
 */
//@ chunk-fq0cr76a.js:854002-854139 placement
function readPolicySandboxSetting(e) {
  if (getMergedPolicySources() !== null)
    return readSettingsPath(getSettingsForSource("policySettings")?.sandbox, e);
  return getAllPolicyTierSettings()
    .map((n) => readSettingsPath(n.sandbox, e))
    .find((n) => n !== void 0);
}
/**
 * 读取沙箱设置项：策略层优先，没有时依次查找其他设置来源。
 */
//@ chunk-fq0cr76a.js:854139-854253 placement
function readSandboxSetting(e) {
  let n = readPolicySandboxSetting(e);
  if (n !== void 0) return n;
  return bqt()
    .map((r) => readSettingsPath(r?.sandbox, e))
    .find((r) => r !== void 0);
}

export {
  collectFromSandboxSettings,
  getSandboxSettingsSources,
  bqt,
  Ev,
  firstFromSandboxSettings,
  readPolicySandboxSetting,
  collectAllowRules,
  uM,
  mergeIgnoreViolations,
  readSandboxSetting,
  getPolicySettingsIfEnabled,
};
