/**
 * plugins/functionHooks/modAdmission.ts
 *
 * 2.1.316 新增：session.append/prompt.attachment 是否可走快捷路径；事件只被 sec-default 监听时可走快捷路径（可用环境变量关闭）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w2teref8.js (7)
 * attribution: placement 7
 */
import { env } from "../../utils/env.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasCurrentDispatch } from "./dispatch/chain.js";
import { modulesHookingEvent } from "./hookDispatch.js";
import {
  isSecDefaultModule,
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../hooksModules/loadedModuleFilters.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { DEFAULT_SECURITY_SEAT_PLUGIN } from "../../services/remoteManagedSettings/seating.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w2teref8.js:521-617 placement
/**
 * 可走快捷路径的事件
 */
var FAST_PATH_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w2teref8.js:521", () => {
  FAST_PATH_EVENTS = new Set([
    "agent.offer",
    "attribution.text",
    "command.describe",
    "env.get",
    "prompt.section",
  ]);
});
//@ chunk-w2teref8.js:617-799 placement
/**
 * 事件只被 sec-default 监听时可走快捷路径（可用环境变量关闭）。
 */
function isLoneSecDefaultShortcut(event, payload, among) {
  if (
    !FAST_PATH_EVENTS.has(event) ||
    env.CLAUDE_CODE_DISABLE_LONE_SEC_DEFAULT_SHORTCUT ||
    getPluginRegistry().hooksRespawns.size > 0 ||
    hasCurrentDispatch()
  )
    return false;
  let modules = modulesHookingEvent(event, payload, {
    among,
  });
  return modules.length > 0 && modules.every(isSecDefaultModule);
}
//@ chunk-w2teref8.js:799-847 placement
var MANAGED_MOD_OPTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w2teref8.js:799", () => {
  MANAGED_MOD_OPTIONS = Object.freeze(["allowManagedModsOnly"]);
});
//@ chunk-w2teref8.js:847-964 placement
/**
 * 策略设置中与 mods 准入有关的选项（allowManagedModsOnly）的稳定序列化，用于判断准入文本是否变化。
 */
function managedModsPolicyKey() {
  let options =
    getSettingsForSource("policySettings")?.pluginConfigs?.[DEFAULT_SECURITY_SEAT_PLUGIN]?.options ?? {};
  return stableStringifySafe(MANAGED_MOD_OPTIONS.map((optionKey) => [optionKey, options[optionKey] ?? null]));
}
//@ chunk-w2teref8.js:964-1021 placement
/**
 * 分发 classic.<名字> 事件。
 */
var dispatchClassicEvent = (event) =>
  hasModuleHookingSite(`classic.${event}`, undefined, getLoadedModulesForSite(`classic.${event}`));
//@ chunk-w2teref8.js:1021-1191 placement
/**
 * classic 事件只有空实现时可跳过分发。
 */
function canSkipEmptyClassicDispatch(event) {
  if (
    env.CLAUDE_CODE_DISABLE_EMPTY_CLASSIC_DISPATCH_SKIP ||
    getPluginRegistry().hooksRespawns.size > 0 ||
    hasCurrentDispatch()
  )
    return false;
  let modules = modulesHookingEvent(`classic.${event}`);
  return modules.length > 0 && modules.every(isSecDefaultModule);
}
//@ chunk-w2teref8.js:1191-1462 placement
/**
 * session.append/prompt.attachment 是否可走快捷路径。
 */
function canShortcutAppend(event) {
  let pluginRegistry = getPluginRegistry();
  let isBlockedByAppend = event === "session.append" && pluginRegistry.appendsInFlight.size > 0;
  return (event === "session.append" || event === "prompt.attachment") &&
    !isBlockedByAppend &&
    !env.CLAUDE_CODE_DISABLE_LONE_SEC_DEFAULT_SHORTCUT &&
    pluginRegistry.hooksRespawns.size === 0 &&
    !hasCurrentDispatch()
    ? pluginRegistry.loadedModules.filter((loadedModule) => !isSecDefaultModule(loadedModule))
    : pluginRegistry.loadedModules;
}
export {
  dispatchClassicEvent,
  canShortcutAppend,
  managedModsPolicyKey,
  canSkipEmptyClassicDispatch,
  isLoneSecDefaultShortcut,
  MANAGED_MOD_OPTIONS,
};
