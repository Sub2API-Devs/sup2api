/**
 * utils/settings/constants.ts
 *
 * 设置来源常量与名称（userSettings/projectSettings/localSettings/flagSettings/policySettings）、--setting-sources 解析、启用来源计算。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/constants.ts
 * pieces: chunk-5hsd6qen.js (14), chunk-6zvepy0r.js (1)
 * attribution: facade-exports 13, layout 1, fingerprint 1
 */
import { CLAUDE_AI_SYNC_LABEL, commandSyncNameState } from "./commandSyncNames.js";
import { capitalize } from "../stringUtils.js";
import {
  isRestrictedSession,
  getAllowedSettingSourcesAsConfigured,
  getAllowedSettingSources,
} from "../../bootstrap/state.js";

//@ chunk-5hsd6qen.js:3444-3534 facade-exports = SETTING_SOURCES (1)
/**
 * 设置来源的合并顺序（低→高）：userSettings、projectSettings、localSettings、flagSettings、policySettings。
 */
var SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"];
//@ chunk-5hsd6qen.js:3534-3751 facade-exports = getSettingSourceName (1)
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
//@ chunk-5hsd6qen.js:3751-4101 facade-exports = getSourceDisplayName (0.827)
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
//@ chunk-5hsd6qen.js:4101-4703 facade-exports = getSettingSourceDisplayNameLowercase (0.77)
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
//@ chunk-5hsd6qen.js:4703-4736 facade-exports
function getSettingSourceDisplayNameCapitalized(enabledSettingSource) {
  return capitalize(getSettingSourceDisplayNameLowercase(enabledSettingSource));
}
//@ chunk-5hsd6qen.js:4736-4988 facade-exports
/**
 * 解析 --setting-sources 逗号列表（user,project,local），非法值抛错。
 */
function parseSettingSourcesFlag(flag) {
  if (flag === "") return [];
  let names = flag.split(",").map((o) => o.trim());
  let t = [];
  for (let name of names) {
    let found = SETTING_SOURCE_FLAG_PAIRS.find(([s]) => s === name);
    if (!found) {
      let joined = SETTING_SOURCE_FLAG_PAIRS.map(([c]) => c).join(", ");
      throw Error(`Invalid setting source: ${name}. Valid options are: ${joined}`);
    }
    t.push(found[1]);
  }
  return t;
}
//@ chunk-5hsd6qen.js:4988-5100 layout
function formatSettingSourcesFlag(allowedSettingSourcesAsConfigured) {
  let mapped = SETTING_SOURCE_FLAG_PAIRS.filter(([, t]) => allowedSettingSourcesAsConfigured.includes(t)).map(
    ([t]) => t,
  );
  return mapped.length === SETTING_SOURCE_FLAG_PAIRS.length ? undefined : mapped.join(",");
}
//@ chunk-5hsd6qen.js:5100-5146 facade-exports
function appliedSettingSourcesFlagValue() {
  if (isRestrictedSession()) return;
  return formatSettingSourcesFlag(getAllowedSettingSourcesAsConfigured());
}
//@ chunk-5hsd6qen.js:5146-5221 facade-exports
function appliedSettingSourcesArgv() {
  let e = appliedSettingSourcesFlagValue();
  return e === undefined ? [] : [`--setting-sources=${e}`];
}
//@ chunk-5hsd6qen.js:5221-5459 facade-exports
/**
 * 返回当前启用的设置来源（--setting-sources 允许的 user/project/local，加上始终启用的 flag 与 policy），按 SETTING_SOURCES 顺序，按 allowed 缓存。
 */
function getEnabledSettingSources() {
  let allowedSettingSources = getAllowedSettingSources();
  let n = commandSyncNameState();
  if (n.enabledSources?.allowed === allowedSettingSources) return n.enabledSources.result;
  let t = new Set(allowedSettingSources);
  t.add("flagSettings");
  t.add("policySettings");
  let filtered = SETTING_SOURCES.filter((i) => t.has(i));
  n.enabledSources = {
    allowed: allowedSettingSources,
    result: filtered,
  };
  return filtered;
}
//@ chunk-5hsd6qen.js:5459-5498 facade-exports
/**
 * 某设置来源当前是否启用（受 --setting-sources 影响；flag/policy 总是启用）。
 */
function isSettingSourceEnabled(source) {
  return getEnabledSettingSources().includes(source);
}
//@ chunk-5hsd6qen.js:5498-5706 facade-exports = parseSettingSourcesFlag (0.698)
/**
 * 可由 --setting-sources 选择的三个来源 [user, project, local]；同语句定义仓库目录来源列表/集合与 flag 名映射。
 */
var EDITABLE_SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings"];
var REPO_DIR_SETTING_SOURCE_LIST = ["projectSettings", "localSettings"];
var REPO_DIR_SETTING_SOURCES = new Set(REPO_DIR_SETTING_SOURCE_LIST);
var SETTING_SOURCE_FLAG_NAMES = {
  userSettings: "user",
  projectSettings: "project",
  localSettings: "local",
};
var SETTING_SOURCE_FLAG_PAIRS = EDITABLE_SETTING_SOURCES.map((e) => [SETTING_SOURCE_FLAG_NAMES[e], e]);
//@ chunk-5hsd6qen.js:5706-5796 facade-exports = supportsPersistence (0.756)
var SOURCES = ["localSettings", "projectSettings", "userSettings"];
var INLINE_FLAG_SETTINGS_LABEL = "--settings (inline JSON)";
//@ chunk-5hsd6qen.js:5796-5868 facade-exports
var REPO_UNGRANTABLE_DEFAULT_MODES = ["auto", "bypassPermissions"];
var HOST_FREE_FORM_SETTINGS_KEY = "organizationFreeFormSettings";
//@ chunk-6zvepy0r.js:6733-6780 fingerprint = getEnabledSettingSources (1)
var SETTING_SOURCES_BY_PRIORITY = ["policySettings", "flagSettings", ...EDITABLE_SETTING_SOURCES];
export {
  isSettingSourceEnabled,
  getEnabledSettingSources,
  getSettingSourceDisplayNameCapitalized,
  getSettingSourceDisplayNameLowercase,
  EDITABLE_SETTING_SOURCES,
  SETTING_SOURCES,
  REPO_DIR_SETTING_SOURCE_LIST,
  getSourceDisplayName,
  parseSettingSourcesFlag,
  REPO_DIR_SETTING_SOURCES,
  HOST_FREE_FORM_SETTINGS_KEY,
  getSettingSourceName,
  appliedSettingSourcesFlagValue,
  INLINE_FLAG_SETTINGS_LABEL,
  SETTING_SOURCES_BY_PRIORITY,
  appliedSettingSourcesArgv,
  SOURCES,
};
