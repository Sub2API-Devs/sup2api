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
import { ge } from "../../../utils/identity.js";
import { to } from "../../../utils/valueSlot.js";
import { hxt } from "../../../utils/hooks/functionHookMatchers.js";
import { isModuleAdmitted } from "../../../utils/plugins/functionHooks/admission.js";
import { ul } from "../panes.js";

//@ chunk-s61vbvea.js:297633-297664 placement
var JB = () => getPluginRegistry().renderVersions;
//@ chunk-s61vbvea.js:297664-297752 placement
function tl(e) {
  JB().setState((n) => {
    let r = new Map(n);
    return (r.set(e, (n.get(e) ?? 0) + 1), r);
  });
}
//@ chunk-s61vbvea.js:297752-297798 placement
function MS({ bump: bump, plugin: plugin, now: now }) {
  bump(plugin, now());
}
//@ chunk-s61vbvea.js:297798-297813 placement
var nl = " live";
//@ chunk-s61vbvea.js:297813-297840 placement
var SM = (e) => e.endsWith(nl);
//@ chunk-s61vbvea.js:297840-297857 placement
var _M = (e) => e + nl;
//@ chunk-s61vbvea.js:297857-297890 placement
var ol = (e, n) => (n === "live" ? _M(e) : e);
//@ chunk-s61vbvea.js:297890-297943 placement
function $yn(e, n = "steady") {
  tl(e === void 0 ? RENDER_EVENT : ol(e, n));
}
/**
 * 按插件节流渲染版本递增：间隔内的调用延后到期再递增。
 */
//@ chunk-s61vbvea.js:297943-298479 placement
function createRenderBumper({ pace: pace, now: now, intervalMs: intervalMs, onBump: onBump }) {
  let h = new Map();
  function y(S, w) {
    let R = h.get(S)?.pending;
    if (R !== void 0) clearTimeout(R);
    (h.set(S, { lastAt: w, pending: void 0 }), $yn(S, pace), onBump?.(S, w));
  }
  return {
    bump: y,
    call: (S) => {
      let w = h.get(S) ?? { lastAt: Number.NEGATIVE_INFINITY, pending: void 0 };
      if (w.pending) return !1;
      let R = now(),
        x = intervalMs - Math.max(0, R - w.lastAt);
      if (x <= 0) return (y(S, R), !0);
      let P = setTimeout(MS, x, { bump: y, plugin: S, now: now });
      return (P.unref(), h.set(S, { lastAt: w.lastAt, pending: P }), !1);
    },
    drop: () => {
      for (let { pending: pending } of h.values()) clearTimeout(pending);
      h.clear();
    },
  };
}
//@ chunk-s61vbvea.js:298479-298515 placement
var Fyn = ge(to(), (e) => e.set(void 0));
//@ chunk-s61vbvea.js:298515-298541 placement
var sl = () => Fyn.get() !== !0;
//@ chunk-s61vbvea.js:298541-298686 placement
var maySelectInstance = (e, n) =>
  Array.isArray(e)
    ? e.some((r) => maySelectInstance(r, n))
    : hxt(e, "surface", n.surface) && hxt(e, "component", n.component) && hxt(e, "requestId", n.requestId);
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
  let shownId = ul().getState().shownId,
    r = sl() && renderPluginsFor("AbovePrompt").includes(e),
    s =
      shownId !== null &&
      renderPluginsForInstance({ surface: "terminal", component: "Pane", requestId: shownId }).includes(e),
    included = renderPluginsFor("PromptHint").includes(e);
  return r || s || included;
}
//@ chunk-s61vbvea.js:299022-299056 placement
var il = ge(new Map(), (e) => e.clear());
//@ chunk-s61vbvea.js:299056-299068 placement
var DS = 1000;
//@ chunk-s61vbvea.js:299068-299126 placement
function al(e, n = Date.now()) {
  for (let r of e) il.set(r, n + DS);
}
//@ chunk-s61vbvea.js:299126-299182 placement
function NS(e, n) {
  let r = il.get(e);
  return r !== void 0 && n < r;
}
//@ chunk-s61vbvea.js:299182-299192 placement
var ll = 34;
//@ chunk-s61vbvea.js:299192-299238 placement
function NM(e, n, r = Date.now()) {
  if (n > ll) al(e, r);
}
//@ chunk-s61vbvea.js:299238-299248 placement
var LS = 16;
//@ chunk-s61vbvea.js:299248-299294 placement
function FM(e, n, r = Date.now()) {
  if (n > LS) al(e, r);
}
/**
 * 渲染实例的节奏：终端上的 AbovePrompt、PromptHint 与当前显示的 Pane 为 live，其余 steady。
 */
//@ chunk-s61vbvea.js:299294-299501 placement
function renderPaceOf(e) {
  let n = e.surface === "terminal",
    r = e.component === "AbovePrompt" && sl(),
    s = e.component === "PromptHint",
    h = e.component === "Pane" && ul().getState().shownId === e.requestId;
  return n && (r || s || h) ? "live" : "steady";
}
//@ chunk-s61vbvea.js:299501-299513 placement
var cKt = 100;
/**
 * $.ui.invalidate 的渲染失效器：steady 节流后，若插件画 live 组件再走 live 节流。
 */
//@ chunk-s61vbvea.js:299513-299741 placement
function createRenderInvalidator(e = Date.now, n = pluginDrawsLive) {
  let r = createRenderBumper({ pace: "live", now: e, intervalMs: ll }),
    s = createRenderBumper({ pace: "steady", now: e, intervalMs: cKt, onBump: r.bump });
  return {
    invalidate: (h) => {
      if (!s.call(h) && !NS(h, e()) && n(h)) r.call(h);
    },
    drop: () => {
      (s.drop(), r.drop());
    },
  };
}
//@ chunk-s61vbvea.js:299741-299760 placement
var pl = "\x00state";
//@ chunk-s61vbvea.js:299760-299777 placement
var Zd = (e) => e + pl;
//@ chunk-s61vbvea.js:299777-299804 placement
var FS = (e) => e.endsWith(pl);
/**
 * 清除所有状态类渲染版本。
 */
//@ chunk-s61vbvea.js:299804-299962 placement
function clearStateRenderVersions() {
  let e = JB(),
    filtered = [...e.getState().keys()].filter(FS);
  if (filtered.length === 0) return;
  e.setState((r) => {
    let s = new Map(r);
    for (let h of filtered) s.delete(h);
    return s;
  });
}
/**
 * 删除指定状态的渲染版本。
 */
//@ chunk-s61vbvea.js:299962-300128 placement
function dropStateRenderVersions(e) {
  let n = JB(),
    filtered = e.map(Zd).filter((s) => n.getState().has(s));
  if (filtered.length === 0) return;
  n.setState((s) => {
    let h = new Map(s);
    for (let y of filtered) h.delete(y);
    return h;
  });
}
//@ chunk-s61vbvea.js:300128-300146 placement
var ser = () => $yn();
//@ chunk-s61vbvea.js:300146-300171 placement
var ier = `${RENDER_EVENT} viewport`;
//@ chunk-s61vbvea.js:300171-300191 placement
var rFi = () => tl(ier);
/**
 * 由渲染版本表算出版本键（全局或指定插件列表、节奏）。
 */
//@ chunk-s61vbvea.js:300191-300416 placement
function renderVersionKey(e, n, r = "steady") {
  if (n === void 0) {
    let h = "";
    for (let [y, S] of e) if (y !== ier && !SM(y) && !FS(y)) h += `${y}\x00${S}\x00`;
    return h;
  }
  let s = String(e.get(RENDER_EVENT) ?? 0);
  for (let h of n) {
    let y = e.get(ol(h, r)) ?? 0;
    s += `\x00${h}\x00${y}`;
  }
  return s;
}
/**
 * 订阅渲染版本变化（全局键变化时回调）。
 */
//@ chunk-s61vbvea.js:300416-300527 placement
function subscribeRenderVersions(e) {
  let n = JB(),
    r = renderVersionKey(n.getState());
  return n.subscribe(() => {
    let s = renderVersionKey(n.getState());
    if (s !== r) ((r = s), e());
  });
}
//@ chunk-s61vbvea.js:300527-300604 placement
function rD(e, n, r) {
  let s = n.get(Zd(r));
  return s === void 0 ? e : `${e}\x00\x00${s}`;
}

export {
  renderModulesForInstance,
  Fyn,
  cKt,
  rFi,
  JB,
  $yn,
  ser,
  ier,
  createRenderInvalidator,
  Zd,
  dropStateRenderVersions,
  ll,
  NS,
  renderPaceOf,
  clearStateRenderVersions,
  maySelectInstance,
  renderPluginsForInstance,
  rD,
  renderVersionKey,
  NM,
  FM,
  subscribeRenderVersions,
};
