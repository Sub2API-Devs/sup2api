/**
 * utils/settings/commandSyncNames.ts
 *
 * 2.1.316 新增：随 claude.ai 同步/隐藏的斜杠命令名单
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sq9ffh11.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SETTINGS_CACHE_STORE_SLOT } from "../../bootstrap/stateSlices.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-sq9ffh11.js:277-315 placement
/**
 * commandSyncNameState：按宿主保存的斜杠命令名单状态。
 */
function commandSyncNameState() {
  return SETTINGS_CACHE_STORE_SLOT.of(getRootSession().host);
}
//@ chunk-sq9ffh11.js:315-356 placement
/**
 * mergedCommandNames：合并后的斜杠命令名单。
 */
function mergedCommandNames() {
  return commandSyncNameState().mergedSettings;
}
//@ chunk-sq9ffh11.js:356-393 placement
/**
 * invalidateCommandNames：使命令名单缓存失效。
 */
function invalidateCommandNames(source) {
  commandSyncNameState().invalidateAll(source);
}
//@ chunk-sq9ffh11.js:393-431 placement
/**
 * pluginCommandBase：插件命令名前缀。
 */
function pluginCommandBase() {
  return commandSyncNameState().pluginBase;
}
//@ chunk-sq9ffh11.js:431-469 placement
/**
 * setPluginCommandBase：设置插件命令名前缀。
 */
function setPluginCommandBase(settings) {
  commandSyncNameState().setPluginBase(settings);
}
//@ chunk-sq9ffh11.js:469-507 placement
/**
 * clearPluginCommandBase：清空插件命令名前缀。
 */
function clearPluginCommandBase() {
  commandSyncNameState().clearPluginBase();
}
//@ chunk-sq9ffh11.js:507-2994 placement
/**
 * 斜杠命令名单（claude.ai 同步、配置类命令等）。
 */
var CLAUDE_AI_SYNC_LABEL = "claude.ai sync";
var COMMAND_NAME_SOURCES = {
  advisor: "config",
  agents: "config",
  "auto-mode-setup": "config",
  autocompact: "config",
  brief: "config",
  channel: "config",
  chrome: "config",
  clawd: "config",
  "cloud-plugins": "config",
  color: "config",
  config: "config",
  effort: "config",
  env: "config",
  experiments: "config",
  "extra-usage": "config",
  fast: "config",
  focus: "config",
  goal: "config",
  hooks: "config",
  ide: "config",
  "install-github-app": "config",
  "install-slack-app": "config",
  issue: "config",
  keybindings: "config",
  mcp: "config",
  memory: "config",
  model: "config",
  "output-style": "config",
  passes: "config",
  "pause-memory": "config",
  permissions: "config",
  plan: "config",
  plugin: "config",
  project: "config",
  powerup: "config",
  "privacy-settings": "config",
  "pro-trial-expired": "config",
  "rate-limit-options": "config",
  "remote-control": "config",
  "remote-env": "config",
  "use-case": "config",
  sandbox: "config",
  "scroll-speed": "config",
  "setup-bedrock": "config",
  "setup-vertex": "config",
  "terminal-setup": "config",
  theme: "config",
  tui: "config",
  upgrade: "config",
  "usage-credits": "config",
  vim: "config",
  voice: "config",
  "web-setup": "config",
  wellbeing: "config",
  "add-dir": "action",
  "ant-trace": "action",
  artifacts: "action",
  background: "action",
  branch: "action",
  btw: "action",
  bug: "action",
  cd: "action",
  clear: "action",
  compact: "action",
  copy: "action",
  "debug-tool-call": "action",
  desktop: "action",
  exit: "action",
  export: "action",
  feedback: "action",
  heapdump: "action",
  "design-consent": "action",
  "design-revoke": "action",
  "design-login": "action",
  login: "action",
  logout: "action",
  "low-priority": "action",
  "limit-reset": "action",
  "claim-credit": "action",
  import: "action",
  "mock-limits": "action",
  "oauth-refresh": "action",
  onboarding: "action",
  "perf-issue": "action",
  radio: "action",
  "reload-plugins": "action",
  "reload-skills": "action",
  rename: "action",
  "reset-limits": "action",
  "settings-review": "config",
  restart: "action",
  update: "action",
  resume: "action",
  "simulate-usage": "action",
  rewind: "action",
  stickers: "action",
  stop: "action",
  teleport: "action",
  thrash: "action",
  context: "info",
  diff: "info",
  help: "info",
  "input-debug": "info",
  mobile: "info",
  recap: "info",
  "release-notes": "info",
  "render-debug": "info",
  session: "info",
  "skill-doctor": "info",
  skills: "info",
  status: "info",
  usage: "info",
  version: "info",
  "__remote-workflow": "agent",
  "workflow-launch-exec": "agent",
  "autofix-pr": "agent",
  autopilot: "agent",
  bugfix: "agent",
  daemon: "agent",
  dashboard: "agent",
  docs: "agent",
  fork: "agent",
  subtask: "agent",
  investigate: "agent",
  schedule: "agent",
  "list-agents": "agent",
  loops: "agent",
  tasks: "agent",
  ultraplan: "agent",
  ultrareview: "agent",
  workflows: "agent",
};
//@ chunk-sq9ffh11.js:2994-3072 placement
/**
 * commandKindOf：取命令来源分类（prompt 视为 skill）。
 */
function commandKindOf(command) {
  if (command.type === "prompt") return "skill";
  return COMMAND_NAME_SOURCES[command.name] ?? "action";
}
//@ chunk-sq9ffh11.js:3072-3481 placement
function isBuiltinCommandSource(command) {
  if (command.type !== "prompt") return "builtin";
  if (command.loadedFrom === "syncedSkills") return "synced";
  switch (command.source) {
    case "builtin":
      return "builtin";
    case "bundled":
      return "bundled";
    case "mcp":
    case "memoryStore":
      return "remote";
    case "plugin":
      return "plugin";
    case "userSettings":
      return "user";
    case "projectSettings":
    case "localSettings":
      return "project";
    case "policySettings":
      return "managed";
    case "flagSettings":
      return "flag";
  }
}
export {
  invalidateCommandNames,
  CLAUDE_AI_SYNC_LABEL,
  commandSyncNameState,
  mergedCommandNames,
  pluginCommandBase,
  clearPluginCommandBase,
  setPluginCommandBase,
  isBuiltinCommandSource,
  commandKindOf,
};
