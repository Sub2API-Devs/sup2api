/**
 * utils/sandbox/sandboxSettingsSources.ts
 *
 * 2.1.316 新增：沙箱读取的设置来源（flag/user/policy）与合并 ignoreViolations、permissions.allow
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-qg41pqt6.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getAllPolicyTierSettings,
  getSettingsForSource,
  isPolicySlotAdminOrParentComposed,
  getMergedPolicySources,
} from "../settings/settings.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { readSettingsPath } from "../settings/settingsSources.js";

//@ chunk-qg41pqt6.js:854922-854943 placement
/**
 * SHADOWED_SSH_DIR：沙箱内的 .claude/ssh 目录。
 */
var SHADOWED_SSH_DIR = ".claude/ssh";
//@ chunk-qg41pqt6.js:854943-854982 placement
function getSandboxSettingsSources() {
  return [...getAllPolicyTierSettings(), ...sandboxSettingsChain()];
}
//@ chunk-qg41pqt6.js:854982-855067 placement
/**
 * sandboxSettingsChain：沙箱设置的读取链。
 */
function sandboxSettingsChain() {
  return [
    getSettingsForSource("flagSettings"),
    isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
  ];
}
//@ chunk-qg41pqt6.js:855067-855120 placement (2.1.88 match: _temp7, 1)
function getPolicySettingsIfEnabled() {
  return isPolicySlotAdminOrParentComposed() ? getSettingsForSource("policySettings") : null;
}
//@ chunk-qg41pqt6.js:855120-855195 placement
function collectFromSandboxSettings(pick) {
  return normalizeCaseForComparison_2(
    sandboxSettingSources().flatMap((settings) => (settings?.sandbox && pick(settings.sandbox)) ?? []),
  );
}
//@ chunk-qg41pqt6.js:855195-855296 placement
function firstFromSandboxSettings(pick) {
  for (let settings of sandboxSettingSources()) {
    let value = settings?.sandbox ? pick(settings.sandbox) : undefined;
    if (value !== undefined) return value;
  }
  return;
}
//@ chunk-qg41pqt6.js:855296-855352 placement
/**
 * policySandboxSetting：策略层沙箱设置。
 */
function policySandboxSetting(pick) {
  let sandbox = getPolicySettingsIfEnabled()?.sandbox;
  return sandbox ? pick(sandbox) : undefined;
}
//@ chunk-qg41pqt6.js:855352-855542 placement
function mergeIgnoreViolations() {
  let merged = new Map();
  for (let settings of sandboxSettingSources())
    for (let [key, value] of Object.entries(settings?.sandbox?.ignoreViolations ?? {}))
      merged.set(key, normalizeCaseForComparison_2([...(merged.get(key) ?? []), ...value]));
  return merged.size > 0 ? Object.fromEntries(merged) : undefined;
}
//@ chunk-qg41pqt6.js:855542-855611 placement
function collectAllowRules() {
  return normalizeCaseForComparison_2(
    sandboxSettingSources().flatMap((settings) => settings?.permissions?.allow ?? []),
  );
}
//@ chunk-qg41pqt6.js:855611-855647 placement
function sandboxSettingSources() {
  return [getPolicySettingsIfEnabled(), ...sandboxSettingsChain()];
}
//@ chunk-qg41pqt6.js:855697-855834 placement
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
//@ chunk-qg41pqt6.js:855834-855948 placement
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
