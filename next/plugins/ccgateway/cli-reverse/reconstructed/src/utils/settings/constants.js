/**
 * utils/settings/constants.ts
 *
 * 设置来源常量与名称（userSettings/projectSettings/localSettings/flagSettings/policySettings）、--setting-sources 解析、启用来源计算。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/constants.ts
 * pieces: chunk-0avm71bs.js (1), chunk-sq9ffh11.js (13)
 * attribution: fingerprint 1, facade-exports 12, layout 1
 */
import { CLAUDE_AI_SYNC_LABEL, commandSyncNameState } from "./commandSyncNames.js";
import { capitalize } from "../stringUtils.js";
import {
  isRestrictedSession,
  getAllowedSettingSourcesAsConfigured,
  getAllowedSettingSources,
} from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sq9ffh11.js:3481-3571 facade-exports (2.1.88 match: SETTING_SOURCES, 1)
/**
 * 设置来源的合并顺序（低→高）：userSettings、projectSettings、localSettings、flagSettings、policySettings。
 */
var SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"];
//@ chunk-sq9ffh11.js:3571-3788 facade-exports (2.1.88 match: getSettingSourceName, 1)
function getSettingSourceName(source) {
  switch (source) {
    case "userSettings":
      return "user";
    case "projectSettings":
      return "project";
    case "localSettings":
      return "project, gitignored";
    case "flagSettings":
      return "cli flag";
    case "policySettings":
      return "managed";
  }
}
//@ chunk-sq9ffh11.js:3788-4138 facade-exports (2.1.88 match: getSourceDisplayName, 0.827)
function getSourceDisplayName(source) {
  switch (source) {
    case "userSettings":
      return "User";
    case "projectSettings":
      return "Project";
    case "localSettings":
      return "Local";
    case "flagSettings":
      return "Flag";
    case "policySettings":
      return "Managed";
    case "plugin":
      return "Plugin";
    case "built-in":
      return "Built-in";
    case "mcp":
      return "MCP";
    case "memoryStore":
      return "Memory store";
    case "syncedSkills":
      return CLAUDE_AI_SYNC_LABEL;
  }
}
//@ chunk-sq9ffh11.js:4138-4740 facade-exports (2.1.88 match: getSettingSourceDisplayNameLowercase, 0.77)
function getSettingSourceDisplayNameLowercase(source) {
  switch (source) {
    case "userSettings":
      return "user settings";
    case "projectSettings":
      return "shared project settings";
    case "localSettings":
      return "project local settings";
    case "flagSettings":
      return "command line arguments";
    case "policySettings":
      return "enterprise managed settings";
    case "cliArg":
      return "CLI argument";
    case "command":
      return "command configuration";
    case "session":
      return "current session";
    case "toolsNarrowing":
      return "CLI tool narrowing";
    case "mcpServerPolicy":
      return "MCP server policy";
    case "hostCredential":
      return "cloud-session credential guard";
    case "mcpMount":
      return "Remote Control server mount";
  }
}
//@ chunk-sq9ffh11.js:4740-4773 facade-exports
function getSettingSourceDisplayNameCapitalized(enabledSettingSource) {
  return capitalize(getSettingSourceDisplayNameLowercase(enabledSettingSource));
}
//@ chunk-sq9ffh11.js:4773-5025 facade-exports
/**
 * 解析 --setting-sources 逗号列表（user,project,local），非法值抛错。
 */
function parseSettingSourcesFlag(flag) {
  if (flag === "") return [];
  let names = flag.split(",").map((name) => name.trim());
  let sources = [];
  for (let name of names) {
    let found = SETTING_SOURCE_FLAG_PAIRS.find(([alias]) => alias === name);
    if (!found) {
      let joined = SETTING_SOURCE_FLAG_PAIRS.map(([alias]) => alias).join(", ");
      throw Error(`Invalid setting source: ${name}. Valid options are: ${joined}`);
    }
    sources.push(found[1]);
  }
  return sources;
}
//@ chunk-sq9ffh11.js:5025-5137 layout
function formatSettingSourcesFlag(allowedSettingSourcesAsConfigured) {
  let mapped = SETTING_SOURCE_FLAG_PAIRS.filter(([, source]) =>
    allowedSettingSourcesAsConfigured.includes(source),
  ).map(([alias]) => alias);
  return mapped.length === SETTING_SOURCE_FLAG_PAIRS.length ? undefined : mapped.join(",");
}
//@ chunk-sq9ffh11.js:5137-5183 facade-exports
function appliedSettingSourcesFlagValue() {
  if (isRestrictedSession()) return;
  return formatSettingSourcesFlag(getAllowedSettingSourcesAsConfigured());
}
//@ chunk-sq9ffh11.js:5183-5258 facade-exports
function appliedSettingSourcesArgv() {
  let flagValue = appliedSettingSourcesFlagValue();
  return flagValue === undefined ? [] : [`--setting-sources=${flagValue}`];
}
//@ chunk-sq9ffh11.js:5258-5496 facade-exports
/**
 * 返回当前启用的设置来源（--setting-sources 允许的 user/project/local，加上始终启用的 flag 与 policy），按 SETTING_SOURCES 顺序，按 allowed 缓存。
 */
function getEnabledSettingSources() {
  let allowedSettingSources = getAllowedSettingSources();
  let cache = commandSyncNameState();
  if (cache.enabledSources?.allowed === allowedSettingSources) return cache.enabledSources.result;
  let allowed = new Set(allowedSettingSources);
  allowed.add("flagSettings");
  allowed.add("policySettings");
  let filtered = SETTING_SOURCES.filter((source) => allowed.has(source));
  cache.enabledSources = {
    allowed: allowedSettingSources,
    result: filtered,
  };
  return filtered;
}
//@ chunk-sq9ffh11.js:5496-5535 facade-exports
/**
 * 某设置来源当前是否启用（受 --setting-sources 影响；flag/policy 总是启用）。
 */
function isSettingSourceEnabled(source) {
  return getEnabledSettingSources().includes(source);
}
//@ chunk-sq9ffh11.js:5535-5743 facade-exports (2.1.88 match: parseSettingSourcesFlag, 0.698)
/**
 * 可由 --setting-sources 选择的三个来源 [user, project, local]；同语句定义仓库目录来源列表/集合与 flag 名映射。
 */
var EDITABLE_SETTING_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REPO_DIR_SETTING_SOURCE_LIST;
var REPO_DIR_SETTING_SOURCES;
var SETTING_SOURCE_FLAG_NAMES;
var SETTING_SOURCE_FLAG_PAIRS;
deferInit("chunk-sq9ffh11.js:5535", () => {
  EDITABLE_SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings"];
  REPO_DIR_SETTING_SOURCE_LIST = ["projectSettings", "localSettings"];
  REPO_DIR_SETTING_SOURCES = new Set(REPO_DIR_SETTING_SOURCE_LIST);
  SETTING_SOURCE_FLAG_NAMES = {
    userSettings: "user",
    projectSettings: "project",
    localSettings: "local",
  };
  SETTING_SOURCE_FLAG_PAIRS = EDITABLE_SETTING_SOURCES.map((source) => [
    SETTING_SOURCE_FLAG_NAMES[source],
    source,
  ]);
});
//@ chunk-sq9ffh11.js:5743-5901 facade-exports (2.1.88 match: SOURCES, 0.502)
var SOURCES = ["localSettings", "projectSettings", "userSettings"];
var INLINE_FLAG_SETTINGS_LABEL = "--settings (inline JSON)";
var REPO_UNGRANTABLE_DEFAULT_MODES = ["auto", "bypassPermissions"];
var HOST_FREE_FORM_SETTINGS_KEY = "organizationFreeFormSettings";
//@ chunk-0avm71bs.js:11683-11778 fingerprint (2.1.88 match: SETTING_SOURCES, 1)
var TRUSTED_SETTING_SOURCES = ["policySettings", "flagSettings", "userSettings"];
var REPO_SETTING_SOURCES = ["localSettings", "projectSettings"];
export {
  isSettingSourceEnabled,
  SETTING_SOURCES,
  getSettingSourceDisplayNameLowercase,
  EDITABLE_SETTING_SOURCES,
  TRUSTED_SETTING_SOURCES,
  REPO_SETTING_SOURCES,
  HOST_FREE_FORM_SETTINGS_KEY,
  parseSettingSourcesFlag,
  REPO_DIR_SETTING_SOURCES,
  getEnabledSettingSources,
  getSettingSourceName,
  REPO_DIR_SETTING_SOURCE_LIST,
  appliedSettingSourcesArgv,
  getSettingSourceDisplayNameCapitalized,
  INLINE_FLAG_SETTINGS_LABEL,
  SOURCES,
  getSourceDisplayName,
  appliedSettingSourcesFlagValue,
  REPO_UNGRANTABLE_DEFAULT_MODES,
};
