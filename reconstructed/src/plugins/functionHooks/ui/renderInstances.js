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

//@ chunk-s61vbvea.js:297633-297664 placement
/**
 * 渲染版本表
 */
var renderVersions = () => getPluginRegistry().renderVersions;
//@ chunk-s61vbvea.js:297664-297752 placement
/**
 * 递增渲染版本
 */
function bumpRenderVersion(e) {
  renderVersions().setState((n) => {
    let r = new Map(n);
    r.set(e, (n.get(e) ?? 0) + 1);
    return r;
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
var isLiveKey = (e) => e.endsWith(LIVE_SUFFIX);
//@ chunk-s61vbvea.js:297840-297857 placement
/**
 * 加 live 后缀
 */
var asLiveKey = (e) => e + LIVE_SUFFIX;
//@ chunk-s61vbvea.js:297857-297890 placement
/**
 * 按节奏生成键
 */
var pacedKey = (e, n) => (n === "live" ? asLiveKey(e) : e);
//@ chunk-s61vbvea.js:297890-297943 placement
/**
 * 按节奏递增渲染版本
 */
function bumpRenderPaced(plugin, n = "steady") {
  bumpRenderVersion(plugin === undefined ? RENDER_EVENT : pacedKey(plugin, n));
}
//@ chunk-s61vbvea.js:297943-298479 placement
/**
 * 按插件节流渲染版本递增：间隔内的调用延后到期再递增。
 */
function createRenderBumper({ pace, now, intervalMs, onBump }) {
  let h = new Map();
  function y(S, w) {
    let pending = h.get(S)?.pending;
    if (pending !== undefined) clearTimeout(pending);
    h.set(S, {
      lastAt: w,
      pending: undefined,
    });
    bumpRenderPaced(S, pace);
    onBump?.(S, w);
  }
  return {
    bump: y,
    call: (S) => {
      let w = h.get(S) ?? {
        lastAt: Number.NEGATIVE_INFINITY,
        pending: undefined,
      };
      if (w.pending) return false;
      let R = now();
      let x = intervalMs - Math.max(0, R - w.lastAt);
      if (x <= 0) {
        y(S, R);
        return true;
      }
      let timer = setTimeout(bumpViaTimer, x, {
        bump: y,
        plugin: S,
        now,
      });
      timer.unref();
      h.set(S, {
        lastAt: w.lastAt,
        pending: timer,
      });
      return false;
    },
    drop: () => {
      for (let { pending } of h.values()) clearTimeout(pending);
      h.clear();
    },
  };
}
//@ chunk-s61vbvea.js:298479-298515 placement
/**
 * 渲染突发槽
 */
var renderBurstSlot = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-s61vbvea.js:298515-298541 placement
/**
 * 是否允许渲染
 */
var isRenderAllowed = () => renderBurstSlot.get() !== true;
//@ chunk-s61vbvea.js:298541-298686 placement
var maySelectInstance = (e, n) =>
  Array.isArray(e)
    ? e.some((r) => maySelectInstance(r, n))
    : matchesField(e, "surface", n.surface) &&
      matchesField(e, "component", n.component) &&
      matchesField(e, "requestId", n.requestId);
//@ chunk-s61vbvea.js:298686-298775 placement
var renderModulesForInstance = (e) =>
  getPluginRegistry().loadedModules.filter(
    (loadedModule) =>
      loadedModule.hooks(RENDER_EVENT) &&
      isModuleAdmitted(loadedModule) &&
      maySelectInstance(loadedModule.matcherFor(RENDER_EVENT), e),
  );
//@ chunk-s61vbvea.js:298775-298812 placement
var renderPluginsForInstance = (e) => renderModulesForInstance(e).map((n) => n.name);
//@ chunk-s61vbvea.js:298812-299022 placement
function pluginDrawsLive(e) {
  let shownId = paneRegistry().getState().shownId;
  let r = isRenderAllowed() && renderPluginsFor("AbovePrompt").includes(e);
  let s =
    shownId !== null &&
    renderPluginsForInstance({
      surface: "terminal",
      component: "Pane",
      requestId: shownId,
    }).includes(e);
  let included = renderPluginsFor("PromptHint").includes(e);
  return r || s || included;
}
//@ chunk-s61vbvea.js:299022-299056 placement
/**
 * 节流截止表
 */
var throttleUntil = identity_2(new Map(), (e) => e.clear());
//@ chunk-s61vbvea.js:299056-299068 placement
/**
 * 1000
 */
var RENDER_THROTTLE_WINDOW_MS = 1000;
//@ chunk-s61vbvea.js:299068-299126 placement
/**
 * 节流若干键
 */
function throttleKeys(e, n = Date.now()) {
  for (let r of e) throttleUntil.set(r, n + RENDER_THROTTLE_WINDOW_MS);
}
//@ chunk-s61vbvea.js:299126-299182 placement
/**
 * 是否仍在节流
 */
function isThrottled(e, n) {
  let r = throttleUntil.get(e);
  return r !== undefined && n < r;
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
function throttleLive(e, n, r = Date.now()) {
  if (n > LIVE_THROTTLE_LIMIT) throttleKeys(e, r);
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
function throttleSteady(e, n, r = Date.now()) {
  if (n > STEADY_THROTTLE_LIMIT) throttleKeys(e, r);
}
//@ chunk-s61vbvea.js:299294-299501 placement
/**
 * 渲染实例的节奏：终端上的 AbovePrompt、PromptHint 与当前显示的 Pane 为 live，其余 steady。
 */
function renderPaceOf(e) {
  let n = e.surface === "terminal";
  let r = e.component === "AbovePrompt" && isRenderAllowed();
  let s = e.component === "PromptHint";
  let h = e.component === "Pane" && paneRegistry().getState().shownId === e.requestId;
  return n && (r || s || h) ? "live" : "steady";
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
function createRenderInvalidator(e = Date.now, n = pluginDrawsLive) {
  let renderBumper = createRenderBumper({
    pace: "live",
    now: e,
    intervalMs: LIVE_THROTTLE_LIMIT,
  });
  let renderBumper_2 = createRenderBumper({
    pace: "steady",
    now: e,
    intervalMs: STEADY_REDRAW_INTERVAL_MS,
    onBump: renderBumper.bump,
  });
  return {
    invalidate: (h) => {
      if (!renderBumper_2.call(h) && !isThrottled(h, e()) && n(h)) renderBumper.call(h);
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
var stateKeyOf = (e) => e + STATE_KEY_SUFFIX;
//@ chunk-s61vbvea.js:299777-299804 placement
/**
 * 是否 state 键
 */
var isStateKey = (e) => e.endsWith(STATE_KEY_SUFFIX);
//@ chunk-s61vbvea.js:299804-299962 placement
/**
 * 清除所有状态类渲染版本。
 */
function clearStateRenderVersions() {
  let e = renderVersions();
  let filtered = [...e.getState().keys()].filter(isStateKey);
  if (filtered.length === 0) return;
  e.setState((r) => {
    let s = new Map(r);
    for (let h of filtered) s.delete(h);
    return s;
  });
}
//@ chunk-s61vbvea.js:299962-300128 placement
/**
 * 删除指定状态的渲染版本。
 */
function dropStateRenderVersions(e) {
  let n = renderVersions();
  let filtered = e.map(stateKeyOf).filter((s) => n.getState().has(s));
  if (filtered.length === 0) return;
  n.setState((s) => {
    let h = new Map(s);
    for (let y of filtered) h.delete(y);
    return h;
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
function renderVersionKey(state, n, r = "steady") {
  if (n === undefined) {
    let h = "";
    for (let [y, S] of state)
      if (y !== VIEWPORT_KEY && !isLiveKey(y) && !isStateKey(y)) h += `${y}\x00${S}\x00`;
    return h;
  }
  let s = String(state.get(RENDER_EVENT) ?? 0);
  for (let h of n) {
    let y = state.get(pacedKey(h, r)) ?? 0;
    s += `\x00${h}\x00${y}`;
  }
  return s;
}
//@ chunk-s61vbvea.js:300416-300527 placement
/**
 * 订阅渲染版本变化（全局键变化时回调）。
 */
function subscribeRenderVersions(e) {
  let n = renderVersions();
  let r = renderVersionKey(n.getState());
  return n.subscribe(() => {
    let s = renderVersionKey(n.getState());
    if (s !== r) {
      r = s;
      e();
    }
  });
}
//@ chunk-s61vbvea.js:300527-300604 placement
/**
 * 附上各插件版本
 */
function withPluginVersions(e, n, r) {
  let s = n.get(stateKeyOf(r));
  return s === undefined ? e : `${e}\x00\x00${s}`;
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
