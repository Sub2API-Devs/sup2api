/**
 * plugins/functionHooks/ui/renderInstances.ts
 *
 * 钩子渲染实例（live/steady、viewport）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (37)
 * attribution: placement 37
 */
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { RENDER_EVENT, renderPluginsFor } from "./renderSites.js";
import { identity as identity_2 } from "../../../utils/identity.js";
import { createValueSlot } from "../../../utils/valueSlot.js";
import { matchesField } from "../../../utils/hooks/functionHookMatchers.js";
import { isModuleAdmitted } from "../../../utils/plugins/functionHooks/admission.js";
import { paneRegistry } from "../panes.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:297633-297664 placement
/**
 * 渲染版本表
 */
var renderVersions = () => getPluginRegistry().renderVersions;
//@ chunk-s61vbvea.js:297664-297752 placement
/**
 * 递增渲染版本
 */
function bumpRenderVersion(key) {
  renderVersions().setState((versions) => {
    let next = new Map(versions);
    next.set(key, (versions.get(key) ?? 0) + 1);
    return next;
  });
}
//@ chunk-s61vbvea.js:297752-297798 placement
/**
 * 定时递增渲染版本
 */
function bumpViaTimer({ bump, plugin, now }) {
  bump(plugin, now());
}
//@ chunk-s61vbvea.js:297798-297813 placement
/**
 * " live"
 */
var LIVE_SUFFIX = " live";
//@ chunk-s61vbvea.js:297813-297840 placement
/**
 * 是否 live 键
 */
var isLiveKey = (key) => key.endsWith(LIVE_SUFFIX);
//@ chunk-s61vbvea.js:297840-297857 placement
/**
 * 加 live 后缀
 */
var asLiveKey = (key) => key + LIVE_SUFFIX;
//@ chunk-s61vbvea.js:297857-297890 placement
/**
 * 按节奏生成键
 */
var pacedKey = (key, pace) => (pace === "live" ? asLiveKey(key) : key);
//@ chunk-s61vbvea.js:297890-297943 placement
/**
 * 按节奏递增渲染版本
 */
function bumpRenderPaced(key, pace = "steady") {
  bumpRenderVersion(key === undefined ? RENDER_EVENT : pacedKey(key, pace));
}
//@ chunk-s61vbvea.js:297943-298479 placement
/**
 * 按插件节流渲染版本递增：间隔内的调用延后到期再递增。
 */
function createRenderBumper({ pace, now, intervalMs, onBump }) {
  let byPlugin = new Map();
  function bump(key, now) {
    let pending = byPlugin.get(key)?.pending;
    if (pending !== undefined) clearTimeout(pending);
    byPlugin.set(key, {
      lastAt: now,
      pending: undefined,
    });
    bumpRenderPaced(key, pace);
    onBump?.(key, now);
  }
  return {
    bump,
    call: (key) => {
      let entry = byPlugin.get(key) ?? {
        lastAt: Number.NEGATIVE_INFINITY,
        pending: undefined,
      };
      if (entry.pending) return false;
      let calledAt = now();
      let waitMs = intervalMs - Math.max(0, calledAt - entry.lastAt);
      if (waitMs <= 0) {
        bump(key, calledAt);
        return true;
      }
      let timer = setTimeout(bumpViaTimer, waitMs, {
        bump,
        plugin: key,
        now,
      });
      timer.unref();
      byPlugin.set(key, {
        lastAt: entry.lastAt,
        pending: timer,
      });
      return false;
    },
    drop: () => {
      for (let { pending } of byPlugin.values()) clearTimeout(pending);
      byPlugin.clear();
    },
  };
}
//@ chunk-s61vbvea.js:298479-298515 placement
/**
 * 渲染突发槽
 */
var renderBurstSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:298479", () => {
  renderBurstSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-s61vbvea.js:298515-298541 placement
/**
 * 是否允许渲染
 */
var isRenderAllowed = () => renderBurstSlot.get() !== true;
//@ chunk-s61vbvea.js:298541-298686 placement
var maySelectInstance = (matcher, instance) =>
  Array.isArray(matcher)
    ? matcher.some((entry) => maySelectInstance(entry, instance))
    : matchesField(matcher, "surface", instance.surface) &&
      matchesField(matcher, "component", instance.component) &&
      matchesField(matcher, "requestId", instance.requestId);
//@ chunk-s61vbvea.js:298686-298775 placement
var renderModulesForInstance = (instance) =>
  getPluginRegistry().loadedModules.filter(
    (loadedModule) =>
      loadedModule.hooks(RENDER_EVENT) &&
      isModuleAdmitted(loadedModule) &&
      maySelectInstance(loadedModule.matcherFor(RENDER_EVENT), instance),
  );
//@ chunk-s61vbvea.js:298775-298812 placement
var renderPluginsForInstance = (instance) => renderModulesForInstance(instance).map((mod) => mod.name);
//@ chunk-s61vbvea.js:298812-299022 placement
function pluginDrawsLive(pluginName) {
  let shownId = paneRegistry().getState().shownId;
  let isAbovePrompt = isRenderAllowed() && renderPluginsFor("AbovePrompt").includes(pluginName);
  let isShownPane =
    shownId !== null &&
    renderPluginsForInstance({
      surface: "terminal",
      component: "Pane",
      requestId: shownId,
    }).includes(pluginName);
  let included = renderPluginsFor("PromptHint").includes(pluginName);
  return isAbovePrompt || isShownPane || included;
}
//@ chunk-s61vbvea.js:299022-299056 placement
/**
 * 节流截止表
 */
var throttleUntil; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:299022", () => {
  throttleUntil = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-s61vbvea.js:299056-299068 placement
/**
 * 1000
 */
var RENDER_THROTTLE_WINDOW_MS = 1000;
//@ chunk-s61vbvea.js:299068-299126 placement
/**
 * 节流若干键
 */
function throttleKeys(keys, now = Date.now()) {
  for (let key of keys) throttleUntil.set(key, now + RENDER_THROTTLE_WINDOW_MS);
}
//@ chunk-s61vbvea.js:299126-299182 placement
/**
 * 是否仍在节流
 */
function isThrottled(key, now) {
  let until = throttleUntil.get(key);
  return until !== undefined && now < until;
}
//@ chunk-s61vbvea.js:299182-299192 placement
/**
 * 34
 */
var LIVE_THROTTLE_LIMIT = 34;
//@ chunk-s61vbvea.js:299192-299238 placement
/**
 * live 节奏节流
 */
function throttleLive(keys, elapsedMs, now = Date.now()) {
  if (elapsedMs > LIVE_THROTTLE_LIMIT) throttleKeys(keys, now);
}
//@ chunk-s61vbvea.js:299238-299248 placement
/**
 * 16
 */
var STEADY_THROTTLE_LIMIT = 16;
//@ chunk-s61vbvea.js:299248-299294 placement
/**
 * steady 节奏节流
 */
function throttleSteady(keys, elapsedMs, now = Date.now()) {
  if (elapsedMs > STEADY_THROTTLE_LIMIT) throttleKeys(keys, now);
}
//@ chunk-s61vbvea.js:299294-299501 placement
/**
 * 渲染实例的节奏：终端上的 AbovePrompt、PromptHint 与当前显示的 Pane 为 live，其余 steady。
 */
function renderPaceOf(input) {
  let isTerminal = input.surface === "terminal";
  let isAbovePrompt = input.component === "AbovePrompt" && isRenderAllowed();
  let isPromptHint = input.component === "PromptHint";
  let isShownPane = input.component === "Pane" && paneRegistry().getState().shownId === input.requestId;
  return isTerminal && (isAbovePrompt || isPromptHint || isShownPane) ? "live" : "steady";
}
//@ chunk-s61vbvea.js:299501-299513 placement
/**
 * steady 节奏下重绘的最小间隔 100 毫秒，低于间隔的失效请求合并到下一次。
 */
var STEADY_REDRAW_INTERVAL_MS = 100;
//@ chunk-s61vbvea.js:299513-299741 placement
/**
 * $.ui.invalidate 的渲染失效器：steady 节流后，若插件画 live 组件再走 live 节流。
 */
function createRenderInvalidator(now = Date.now, drawsLive = pluginDrawsLive) {
  let renderBumper = createRenderBumper({
    pace: "live",
    now,
    intervalMs: LIVE_THROTTLE_LIMIT,
  });
  let renderBumper_2 = createRenderBumper({
    pace: "steady",
    now,
    intervalMs: STEADY_REDRAW_INTERVAL_MS,
    onBump: renderBumper.bump,
  });
  return {
    invalidate: (pluginName) => {
      if (!renderBumper_2.call(pluginName) && !isThrottled(pluginName, now()) && drawsLive(pluginName))
        renderBumper.call(pluginName);
    },
    drop: () => {
      renderBumper_2.drop();
      renderBumper.drop();
    },
  };
}
//@ chunk-s61vbvea.js:299741-299760 placement
/**
 * "\0state"
 */
var STATE_KEY_SUFFIX = "\x00state";
//@ chunk-s61vbvea.js:299760-299777 placement
/**
 * 加 state 后缀
 */
var stateKeyOf = (key) => key + STATE_KEY_SUFFIX;
//@ chunk-s61vbvea.js:299777-299804 placement
/**
 * 是否 state 键
 */
var isStateKey = (key) => key.endsWith(STATE_KEY_SUFFIX);
//@ chunk-s61vbvea.js:299804-299962 placement
/**
 * 清除所有状态类渲染版本。
 */
function clearStateRenderVersions() {
  let versions = renderVersions();
  let filtered = [...versions.getState().keys()].filter(isStateKey);
  if (filtered.length === 0) return;
  versions.setState((state) => {
    let next = new Map(state);
    for (let key of filtered) next.delete(key);
    return next;
  });
}
//@ chunk-s61vbvea.js:299962-300128 placement
/**
 * 删除指定状态的渲染版本。
 */
function dropStateRenderVersions(pluginNames) {
  let versions = renderVersions();
  let filtered = pluginNames.map(stateKeyOf).filter((key) => versions.getState().has(key));
  if (filtered.length === 0) return;
  versions.setState((state) => {
    let next = new Map(state);
    for (let key of filtered) next.delete(key);
    return next;
  });
}
//@ chunk-s61vbvea.js:300128-300146 placement
/**
 * 全量失效
 */
var invalidateAll = () => bumpRenderPaced();
//@ chunk-s61vbvea.js:300146-300171 placement
/**
 * renderEvent 的视口键（"<renderEvent> viewport"），视口相关失效都打到它上面。
 */
var VIEWPORT_KEY = `${RENDER_EVENT} viewport`;
//@ chunk-s61vbvea.js:300171-300191 placement
/**
 * 视口失效
 */
var invalidateViewport = () => bumpRenderVersion(VIEWPORT_KEY);
//@ chunk-s61vbvea.js:300191-300416 placement
/**
 * 由渲染版本表算出版本键（全局或指定插件列表、节奏）。
 */
function renderVersionKey(state, plugins, pace = "steady") {
  if (plugins === undefined) {
    let keyText = "";
    for (let [key, version] of state)
      if (key !== VIEWPORT_KEY && !isLiveKey(key) && !isStateKey(key)) keyText += `${key}\x00${version}\x00`;
    return keyText;
  }
  let text = String(state.get(RENDER_EVENT) ?? 0);
  for (let pluginName of plugins) {
    let version = state.get(pacedKey(pluginName, pace)) ?? 0;
    text += `\x00${pluginName}\x00${version}`;
  }
  return text;
}
//@ chunk-s61vbvea.js:300416-300527 placement
/**
 * 订阅渲染版本变化（全局键变化时回调）。
 */
function subscribeRenderVersions(listener) {
  let versions = renderVersions();
  let previous = renderVersionKey(versions.getState());
  return versions.subscribe(() => {
    let next = renderVersionKey(versions.getState());
    if (next !== previous) {
      previous = next;
      listener();
    }
  });
}
//@ chunk-s61vbvea.js:300527-300604 placement
/**
 * 附上各插件版本
 */
function withPluginVersions(key, versions, instanceKey) {
  let pluginVersion = versions.get(stateKeyOf(instanceKey));
  return pluginVersion === undefined ? key : `${key}\x00\x00${pluginVersion}`;
}
export {
  renderModulesForInstance,
  renderBurstSlot,
  STEADY_REDRAW_INTERVAL_MS,
  invalidateViewport,
  renderVersions,
  bumpRenderPaced,
  invalidateAll,
  VIEWPORT_KEY,
  createRenderInvalidator,
  stateKeyOf,
  dropStateRenderVersions,
  LIVE_THROTTLE_LIMIT,
  isThrottled,
  renderPaceOf,
  clearStateRenderVersions,
  maySelectInstance,
  renderPluginsForInstance,
  withPluginVersions,
  renderVersionKey,
  throttleLive,
  throttleSteady,
  subscribeRenderVersions,
};
