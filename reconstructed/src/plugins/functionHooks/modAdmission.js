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
import { jme } from "./dispatch/chain.js";
import { modulesHookingEvent } from "./hookDispatch.js";
import { vie, hasModuleHookingSite, getLoadedModulesForSite } from "../hooksModules/loadedModuleFilters.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { Tte } from "../../services/remoteManagedSettings/seating.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";

//@ chunk-w2teref8.js:521-617 placement
var p = new Set(["agent.offer", "attribution.text", "command.describe", "env.get", "prompt.section"]);
/**
 * 事件只被 sec-default 监听时可走快捷路径（可用环境变量关闭）。
 */
//@ chunk-w2teref8.js:617-799 placement
function isLoneSecDefaultShortcut(o, e, t) {
  if (
    !p.has(o) ||
    env.CLAUDE_CODE_DISABLE_LONE_SEC_DEFAULT_SHORTCUT ||
    getPluginRegistry().hooksRespawns.size > 0 ||
    jme()
  )
    return !1;
  let s = modulesHookingEvent(o, e, { among: t });
  return s.length > 0 && s.every(vie);
}
//@ chunk-w2teref8.js:799-847 placement
var freeze = Object.freeze(["allowManagedModsOnly"]);
/**
 * 策略设置中与 mods 准入有关的选项（allowManagedModsOnly）的稳定序列化，用于判断准入文本是否变化。
 */
//@ chunk-w2teref8.js:847-964 placement
function managedModsPolicyKey() {
  let o = getSettingsForSource("policySettings")?.pluginConfigs?.[Tte]?.options ?? {};
  return Rs(freeze.map((e) => [e, o[e] ?? null]));
}
/**
 * 分发 classic.<名字> 事件。
 */
//@ chunk-w2teref8.js:964-1021 placement
var dispatchClassicEvent = (o) =>
  hasModuleHookingSite(`classic.${o}`, void 0, getLoadedModulesForSite(`classic.${o}`));
/**
 * classic 事件只有空实现时可跳过分发。
 */
//@ chunk-w2teref8.js:1021-1191 placement
function canSkipEmptyClassicDispatch(o) {
  if (
    env.CLAUDE_CODE_DISABLE_EMPTY_CLASSIC_DISPATCH_SKIP ||
    getPluginRegistry().hooksRespawns.size > 0 ||
    jme()
  )
    return !1;
  let e = modulesHookingEvent(`classic.${o}`);
  return e.length > 0 && e.every(vie);
}
/**
 * session.append/prompt.attachment 是否可走快捷路径。
 */
//@ chunk-w2teref8.js:1191-1462 placement
function canShortcutAppend(o) {
  let e = getPluginRegistry(),
    t = o === "session.append" && e.appendsInFlight.size > 0;
  return (o === "session.append" || o === "prompt.attachment") &&
    !t &&
    !env.CLAUDE_CODE_DISABLE_LONE_SEC_DEFAULT_SHORTCUT &&
    e.hooksRespawns.size === 0 &&
    !jme()
    ? e.loadedModules.filter((loadedModule) => !vie(loadedModule))
    : e.loadedModules;
}

export {
  dispatchClassicEvent,
  canShortcutAppend,
  managedModsPolicyKey,
  canSkipEmptyClassicDispatch,
  isLoneSecDefaultShortcut,
  freeze,
};
