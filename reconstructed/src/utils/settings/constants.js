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
import { CLAUDE_AI_SYNC_LABEL, is } from "./commandSyncNames.js";
import { capitalize } from "../stringUtils.js";
import {
  isRestrictedSession,
  getAllowedSettingSourcesAsConfigured,
  getAllowedSettingSources,
} from "../../bootstrap/state.js";

/**
 * 设置来源的合并顺序（低→高）：userSettings、projectSettings、localSettings、flagSettings、policySettings。
 */
//@ chunk-5hsd6qen.js:3444-3534 facade-exports = SETTING_SOURCES (1)
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
function getSettingSourceDisplayNameCapitalized(e) {
  return capitalize(getSettingSourceDisplayNameLowercase(e));
}
/**
 * 解析 --setting-sources 逗号列表（user,project,local），非法值抛错。
 */
//@ chunk-5hsd6qen.js:4736-4988 facade-exports
function parseSettingSourcesFlag(e) {
  if (e === "") return [];
  let mapped = e.split(",").map((o) => o.trim()),
    t = [];
  for (let o of mapped) {
    let found = SETTING_SOURCE_FLAG_PAIRS.find(([s]) => s === o);
    if (!found) {
      let joined = SETTING_SOURCE_FLAG_PAIRS.map(([c]) => c).join(", ");
      throw Error(`Invalid setting source: ${o}. Valid options are: ${joined}`);
    }
    t.push(found[1]);
  }
  return t;
}
//@ chunk-5hsd6qen.js:4988-5100 layout
function formatSettingSourcesFlag(e) {
  let mapped = SETTING_SOURCE_FLAG_PAIRS.filter(([, t]) => e.includes(t)).map(([t]) => t);
  return mapped.length === SETTING_SOURCE_FLAG_PAIRS.length ? void 0 : mapped.join(",");
}
//@ chunk-5hsd6qen.js:5100-5146 facade-exports
function appliedSettingSourcesFlagValue() {
  if (isRestrictedSession()) return;
  return formatSettingSourcesFlag(getAllowedSettingSourcesAsConfigured());
}
//@ chunk-5hsd6qen.js:5146-5221 facade-exports
function appliedSettingSourcesArgv() {
  let e = appliedSettingSourcesFlagValue();
  return e === void 0 ? [] : [`--setting-sources=${e}`];
}
/**
 * 返回当前启用的设置来源（--setting-sources 允许的 user/project/local，加上始终启用的 flag 与 policy），按 SETTING_SOURCES 顺序，按 allowed 缓存。
 */
//@ chunk-5hsd6qen.js:5221-5459 facade-exports
function getEnabledSettingSources() {
  let e = getAllowedSettingSources(),
    n = is();
  if (n.enabledSources?.allowed === e) return n.enabledSources.result;
  let t = new Set(e);
  (t.add("flagSettings"), t.add("policySettings"));
  let filtered = SETTING_SOURCES.filter((i) => t.has(i));
  return ((n.enabledSources = { allowed: e, result: filtered }), filtered);
}
/**
 * 某设置来源当前是否启用（受 --setting-sources 影响；flag/policy 总是启用）。
 */
//@ chunk-5hsd6qen.js:5459-5498 facade-exports
function isSettingSourceEnabled(source) {
  return getEnabledSettingSources().includes(source);
}
/**
 * 可由 --setting-sources 选择的三个来源 [user, project, local]；同语句定义仓库目录来源列表/集合与 flag 名映射。
 */
//@ chunk-5hsd6qen.js:5498-5706 facade-exports = parseSettingSourcesFlag (0.698)
var EDITABLE_SETTING_SOURCES = ["userSettings", "projectSettings", "localSettings"],
  REPO_DIR_SETTING_SOURCE_LIST = ["projectSettings", "localSettings"],
  REPO_DIR_SETTING_SOURCES = new Set(REPO_DIR_SETTING_SOURCE_LIST),
  SETTING_SOURCE_FLAG_NAMES = { userSettings: "user", projectSettings: "project", localSettings: "local" },
  SETTING_SOURCE_FLAG_PAIRS = EDITABLE_SETTING_SOURCES.map((e) => [SETTING_SOURCE_FLAG_NAMES[e], e]);
//@ chunk-5hsd6qen.js:5706-5796 facade-exports = supportsPersistence (0.756)
var SOURCES = ["localSettings", "projectSettings", "userSettings"],
  INLINE_FLAG_SETTINGS_LABEL = "--settings (inline JSON)";
//@ chunk-5hsd6qen.js:5796-5868 facade-exports
var REPO_UNGRANTABLE_DEFAULT_MODES = ["auto", "bypassPermissions"],
  HOST_FREE_FORM_SETTINGS_KEY = "organizationFreeFormSettings";
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
