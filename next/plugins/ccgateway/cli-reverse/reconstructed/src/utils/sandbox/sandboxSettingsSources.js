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
/**
 * SHADOWED_SSH_DIR：沙箱内的 .claude/ssh 目录。
 */
var SHADOWED_SSH_DIR = ".claude/ssh";
//@ chunk-fq0cr76a.js:853248-853287 placement
function getSandboxSettingsSources() {
  return [...getAllPolicyTierSettings(), ...sandboxSettingsChain()];
}
//@ chunk-fq0cr76a.js:853287-853372 placement
/**
 * sandboxSettingsChain：沙箱设置的读取链。
 */
function sandboxSettingsChain() {
  return [
    getSettingsForSource("flagSettings"),
    isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
  ];
}
//@ chunk-fq0cr76a.js:853372-853425 placement (2.1.88 match: _temp7, 1)
function getPolicySettingsIfEnabled() {
  return isPolicySlotAdminOrParentComposed() ? getSettingsForSource("policySettings") : null;
}
//@ chunk-fq0cr76a.js:853425-853500 placement
function collectFromSandboxSettings(pick) {
  return uniq(
    sandboxSettingSources().flatMap((settings) => (settings?.sandbox && pick(settings.sandbox)) ?? []),
  );
}
//@ chunk-fq0cr76a.js:853500-853601 placement
function firstFromSandboxSettings(pick) {
  for (let settings of sandboxSettingSources()) {
    let value = settings?.sandbox ? pick(settings.sandbox) : undefined;
    if (value !== undefined) return value;
  }
  return;
}
//@ chunk-fq0cr76a.js:853601-853657 placement
/**
 * policySandboxSetting：策略层沙箱设置。
 */
function policySandboxSetting(pick) {
  let sandbox = getPolicySettingsIfEnabled()?.sandbox;
  return sandbox ? pick(sandbox) : undefined;
}
//@ chunk-fq0cr76a.js:853657-853847 placement
function mergeIgnoreViolations() {
  let merged = new Map();
  for (let settings of sandboxSettingSources())
    for (let [key, value] of Object.entries(settings?.sandbox?.ignoreViolations ?? {}))
      merged.set(key, uniq([...(merged.get(key) ?? []), ...value]));
  return merged.size > 0 ? Object.fromEntries(merged) : undefined;
}
//@ chunk-fq0cr76a.js:853847-853916 placement
function collectAllowRules() {
  return uniq(sandboxSettingSources().flatMap((settings) => settings?.permissions?.allow ?? []));
}
//@ chunk-fq0cr76a.js:853916-853952 placement
function sandboxSettingSources() {
  return [getPolicySettingsIfEnabled(), ...sandboxSettingsChain()];
}
//@ chunk-fq0cr76a.js:854002-854139 placement
/**
 * 读取策略层的沙箱设置项：有合并的策略来源时取 policySettings，否则取各策略层第一个有值的。
 */
function readPolicySandboxSetting(path) {
  if (getMergedPolicySources() !== null)
    return readSettingsPath(getSettingsForSource("policySettings")?.sandbox, path);
  return getAllPolicyTierSettings()
    .map((settings) => readSettingsPath(settings.sandbox, path))
    .find((value) => value !== undefined);
}
//@ chunk-fq0cr76a.js:854139-854253 placement
/**
 * 读取沙箱设置项：策略层优先，没有时依次查找其他设置来源。
 */
function readSandboxSetting(path) {
  let policySandboxSetting = readPolicySandboxSetting(path);
  if (policySandboxSetting !== undefined) return policySandboxSetting;
  return sandboxSettingsChain()
    .map((settings) => readSettingsPath(settings?.sandbox, path))
    .find((value) => value !== undefined);
}
export {
  collectFromSandboxSettings,
  getSandboxSettingsSources,
  sandboxSettingsChain,
  policySandboxSetting,
  firstFromSandboxSettings,
  readPolicySandboxSetting,
  collectAllowRules,
  SHADOWED_SSH_DIR,
  mergeIgnoreViolations,
  readSandboxSetting,
  getPolicySettingsIfEnabled,
};
