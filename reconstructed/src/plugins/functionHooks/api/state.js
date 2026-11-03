/**
 * plugins/functionHooks/api/state.ts
 *
 * 函数钩子插件状态存储（state session：get/set/版本）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (31)
 * attribution: placement 31
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import { createPluginStateStore, getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import {
  JB,
  Zd,
  dropStateRenderVersions,
  cKt,
  ll,
  NS,
  renderPaceOf,
  clearStateRenderVersions,
} from "../ui/renderInstances.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { uEe } from "./sessionOps.js";
import { HooksError } from "../hooksErrors.js";
import { Ho, SA } from "../dispatch/dispatchScope.js";
import { Q5e } from "../../../utils/hooks/functionHookMatchers.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { describeNonJsonValue } from "../panes.js";

//@ chunk-s61vbvea.js:8988-8999 placement
var uSe = {};
//@ chunk-s61vbvea.js:8999-9634 placement
Ar(uSe, {
  MAX_READING_INSTANCES: () => lf,
  REDRAW_INTERVAL_MS: () => nf,
  REFERENCE_SHAPE: () => hl,
  STATE_SET_KEYS: () => cf,
  addressProblem: () => checkStateRef,
  bumpInstances: () => bumpStateReaders,
  clearStateSession: () => resetPluginState,
  commitReads: () => recordStateReads,
  createStateSession: () => createPluginStateStore,
  default: () => uSe,
  dropUnheldVersion: () => HS,
  entryKeyOf: () => nxe,
  flushStale: () => flushStaleFold,
  flushTrailing: () => tf,
  forgetInstance: () => af,
  holdInstance: () => mountStateReader,
  landValue: () => writeStateValue,
  noteStale: () => scheduleStaleReaders,
  noteWrite: () => $S,
  onStale: () => US,
  previousStamped: () => NZs,
  redrawInstances: () => notifyStaleReaders,
  redrawSite: () => rf,
  stateGet: () => stateGetForPlugin,
  stateGetProblem: () => validateStateRef,
  stateSession: () => zS,
  stateSet: () => stateSetForPlugin,
  stateSetProblem: () => validateStateSetArgs,
  unfollow: () => forgetReader,
  valuesFor: () => uf,
});
//@ chunk-s61vbvea.js:300604-300747 placement
function bumpStateReaders(e, n) {
  if (e.length === 0) return;
  n.bumps += 1;
  let bumps = n.bumps;
  JB().setState((s) => {
    let h = new Map(s);
    for (let y of e) h.set(Zd(y), bumps);
    return h;
  });
}
//@ chunk-s61vbvea.js:300747-300810 placement
var renderInstanceKey = (e) => `${e.surface}\x00${e.component}\x00${e.requestId}`;
//@ chunk-s61vbvea.js:300810-300838 placement
var zS = () => getPluginRegistry().pluginState;
//@ chunk-s61vbvea.js:300838-300924 placement
function HS(e) {
  let { mounted: mounted, readers: readers } = zS(),
    s = renderInstanceKey(e);
  if (!(mounted.has(s) || readers.has(s))) dropStateRenderVersions([s]);
}
//@ chunk-s61vbvea.js:300924-301060 placement
function notifyStaleReaders(e, n) {
  if (e.size === 0) return;
  bumpStateReaders([...e.keys()], n);
  let mapped = [...e.values()].map((s) => s.instance);
  for (let staleListener of n.staleListeners) staleListener(mapped);
}
/**
 * 刷新一组（steady/live）积压的过期渲染实例：清定时器、记录时间，把过期实例交给监听者重新渲染。
 */
//@ chunk-s61vbvea.js:301060-301296 placement
function flushStaleFold(e, n) {
  let r = zS(),
    s = r.folds[e];
  if (s.pending !== void 0) clearTimeout(s.pending);
  ((s.pending = void 0), (s.lastAt = n));
  let h = new Map(
    [...s.stale].flatMap((y) => {
      let S = r.readers.get(y);
      return S === void 0 ? [] : [[y, S]];
    }),
  );
  (s.stale.clear(), notifyStaleReaders(h, r));
}
//@ chunk-s61vbvea.js:301296-301324 placement
function tf(e, n) {
  flushStaleFold(e, n());
}
//@ chunk-s61vbvea.js:301324-301352 placement
var nf = { steady: cKt, live: ll };
/**
 * 把读过已变状态的渲染实例归入 steady 或 live 组，按各组节流间隔立即或延时刷新。
 */
//@ chunk-s61vbvea.js:301352-301729 placement
function scheduleStaleReaders(e, n = Date.now) {
  let r = zS(),
    s = new Set();
  for (let h of e) {
    let y = r.readers.get(h);
    if (y !== void 0) {
      let S = n(),
        R = y.plugins.some((plugin) => NS(plugin, S)) ? "steady" : renderPaceOf(y.instance);
      (r.folds[R].stale.add(h), s.add(R));
    }
  }
  for (let h of s) {
    let y = r.folds[h];
    if (y.pending !== void 0) continue;
    let S = n(),
      w = nf[h] - Math.max(0, S - y.lastAt);
    if (w <= 0) flushStaleFold(h, S);
    else ((y.pending = setTimeout(tf, w, h, n)), y.pending.unref());
  }
}
//@ chunk-s61vbvea.js:301729-301807 placement
function $S(e) {
  let n = zS().readersOf.get(e);
  if (n !== void 0 && n.size > 0) scheduleStaleReaders([...n]);
}
//@ chunk-s61vbvea.js:301807-301883 placement
function US(e) {
  let { staleListeners: staleListeners } = zS();
  return (
    staleListeners.add(e),
    () => {
      staleListeners.delete(e);
    }
  );
}
//@ chunk-s61vbvea.js:301883-301960 placement
function rf(e) {
  let n = zS();
  bumpStateReaders([renderInstanceKey(e)], n);
  for (let staleListener of n.staleListeners) staleListener([e]);
}
/**
 * 会话结束时重置插件状态：清空节流组、读者表与状态值（保留版本下限），并通知所有读者过期。
 */
//@ chunk-s61vbvea.js:301960-302375 placement
function resetPluginState() {
  let e = zS();
  for (let r of [e.folds.steady, e.folds.live]) {
    if (r.pending !== void 0) clearTimeout(r.pending);
    ((r.pending = void 0), r.stale.clear(), (r.lastAt = Number.NEGATIVE_INFINITY));
  }
  let n = new Map(e.readers);
  for (let r of e.values.getState().values()) e.versionFloor = Math.max(e.versionFloor, r.version);
  (e.faultRuns.clear(),
    e.readers.clear(),
    e.readersOf.clear(),
    e.values.setState((r) => (r.size === 0 ? r : new Map())),
    clearStateRenderVersions(),
    notifyStaleReaders(n, e));
}
//@ chunk-s61vbvea.js:302375-302457 placement
var nxe = ({ plugin: plugin, key: key, id: id }) =>
  id === void 0 ? `${plugin}\x00${key}` : `${plugin}\x00${key}\x00${id}`;
/**
 * 写一个插件状态值：JSON 化并检查大小，版本号取 max(旧版本, 下限)+1，写入后通知读者。返回新版本。
 */
//@ chunk-s61vbvea.js:302457-302797 placement
function writeStateValue(e, n) {
  let r = jsonStringify(n);
  if (!(typeof r === "string" && r.length <= uEe))
    throw new HooksError(`a value of state is JSON data of at most ${uEe} characters`);
  let { values: values, versionFloor: versionFloor } = zS(),
    S = Math.max(values.getState().get(e)?.version ?? 0, versionFloor) + 1;
  return (
    Ho.exit(() => {
      (values.setState((w) => {
        let R = new Map(w);
        return (R.set(e, { value: Q5e(jsonParse(r)), version: S }), R);
      }),
        $S(e));
    }),
    S
  );
}
//@ chunk-s61vbvea.js:302797-302980 placement
function forgetReader(e) {
  let n = zS(),
    r = n.readers.get(e);
  if (r === void 0) return;
  for (let read of r.reads) {
    let h = n.readersOf.get(read);
    if ((h?.delete(e), h?.size === 0)) n.readersOf.delete(read);
  }
  n.readers.delete(e);
}
//@ chunk-s61vbvea.js:302980-303075 placement
function af(e) {
  let { folds: folds } = zS();
  (forgetReader(e), folds.steady.stale.delete(e), folds.live.stale.delete(e), dropStateRenderVersions([e]));
}
//@ chunk-s61vbvea.js:303075-303087 placement
var lf = 4000;
/**
 * 记录一次渲染读了哪些状态及版本：更新读者索引，读者过多时淘汰未挂载的，若读到的已过期立刻排程重渲染。
 */
//@ chunk-s61vbvea.js:303087-303502 placement
function recordStateReads(e) {
  let { instanceKey: instanceKey, instance: instance, versionsRead: versionsRead } = e,
    h = zS();
  if ((forgetReader(instanceKey), versionsRead.size === 0)) return;
  h.readers.set(instanceKey, {
    instance: instance,
    plugins: e.pluginsOf(),
    reads: new Set(versionsRead.keys()),
  });
  let state = h.values.getState(),
    S = !1;
  for (let [w, R] of versionsRead) {
    let x = h.readersOf.get(w) ?? new Set();
    (x.add(instanceKey), h.readersOf.set(w, x), (S ||= (state.get(w)?.version ?? 0) !== R));
  }
  for (let w of h.readers.keys()) {
    if (h.readers.size <= lf) break;
    if (!h.mounted.has(w)) af(w);
  }
  if (S) scheduleStaleReaders([instanceKey]);
}
/**
 * 标记渲染实例已挂载（引用计数），返回卸载函数；最后一次卸载且无读记录时清理。
 */
//@ chunk-s61vbvea.js:303502-303667 placement
function mountStateReader(e) {
  let { mounted: mounted, readers: readers } = zS();
  return (
    mounted.set(e, (mounted.get(e) ?? 0) + 1),
    () => {
      let s = (mounted.get(e) ?? 1) - 1;
      if (s > 0) {
        mounted.set(e, s);
        return;
      }
      if ((mounted.delete(e), !readers.has(e))) dropStateRenderVersions([e]);
    }
  );
}
//@ chunk-s61vbvea.js:303667-303740 placement
var NZs = (e) => ({ ...e, previous: zS().values.getState().get(nxe(e))?.value });
//@ chunk-s61vbvea.js:303740-303808 placement
var hl = "takes a reference { plugin, key } (id for a family member)";
/**
 * 校验状态引用 {plugin, key, id?}：非空字符串且不含 NUL。
 */
//@ chunk-s61vbvea.js:303808-304080 placement
function checkStateRef(e) {
  if (!isPlainObject(e)) return hl;
  let { plugin: plugin, key: key, id: id } = e;
  if (!(
    typeof plugin === "string" &&
    plugin !== "" &&
    typeof key === "string" &&
    key !== "" &&
    (id === void 0 || typeof id === "string")
  ))
    return hl;
  return [plugin, key, id ?? ""].some((S) => S.includes("\x00"))
    ? "a plugin, key or id holding the NUL character"
    : void 0;
}
//@ chunk-s61vbvea.js:304080-304288 placement
function validateStateRef(e) {
  let n = checkStateRef(e);
  if (n !== void 0 || !isPlainObject(e)) return n;
  let found = Object.keys(e).find((s) => s !== "plugin" && s !== "key" && s !== "id");
  if (found === void 0) return;
  return `takes { plugin, key, id? } and nothing else (got ${found})`;
}
//@ chunk-s61vbvea.js:304288-304357 placement
var cf = new Set(["plugin", "key", "id", "value", "previous", "ifVersion"]);
/**
 * 校验 $.state.set 参数（plugin/key/id/value/ifVersion）
 */
//@ chunk-s61vbvea.js:304357-305237 placement
function validateStateSetArgs(e, n) {
  let r = checkStateRef(e);
  if (r !== void 0 || !isPlainObject(e)) return r;
  let found = Object.keys(e).find((x) => !cf.has(x));
  if (found !== void 0)
    return `takes { plugin, key, id?, value, ifVersion? } and nothing else (got ${found})`;
  if (e.value === void 0) return "takes a value (JSON data, never undefined)";
  let h = describeNonJsonValue(e.value);
  if (h !== void 0) return h;
  let { ifVersion: ifVersion } = e;
  if (ifVersion !== void 0 && !(Number.isSafeInteger(ifVersion) && Number(ifVersion) >= 0))
    return "ifVersion is a version $.state.get answered (a whole number)";
  if (n.scopeHolder?.scope?.drawing?.isInFlight === !0)
    return "denied: it was made while ui.render is being dispatched, and drawing is pure (a render hook reads state and returns a tree; write from a handler such as onPress, or from another event)";
  let w = String(e.plugin);
  return w === n.plugin
    ? void 0
    : `denied: ${w} owns that value and only its owner writes it (to change what is written, hook ${w}'s state.set and rewrite e.value)`;
}
//@ chunk-s61vbvea.js:305237-305333 placement
function uf(e) {
  let state = zS().values.getState();
  if (e === void 0) return state;
  return ((e.values ??= state), e.values);
}
/**
 * $.state.get：读值与版本；正在渲染时记录读取版本以便后续失效。
 */
//@ chunk-s61vbvea.js:305333-305549 placement
function stateGetForPlugin(e, n) {
  let r = nxe(e),
    s = SA(n.scopeHolder),
    h = uf(s).get(r),
    y = h?.version ?? 0,
    S = s?.drawing;
  if (S?.isInFlight === !0 && !S.versionsRead.has(r)) S.versionsRead.set(r, y);
  return Promise.resolve({ value: h?.value, version: y });
}
/**
 * $.state.set：ifVersion 不匹配则不写，返回 {isSet, version}。
 */
//@ chunk-s61vbvea.js:305549-305803 placement
function stateSetForPlugin(e, n) {
  let r = nxe(e),
    { values: values } = zS(),
    h = values.getState().get(r)?.version ?? 0,
    y = e.ifVersion !== void 0 && e.ifVersion !== h,
    S = y ? h : writeStateValue(r, e.value),
    w = n.scopeHolder?.scope;
  if (w?.values !== void 0) w.values = values.getState();
  return Promise.resolve({ isSet: !y, version: S });
}

export {
  resetPluginState,
  zS,
  nxe,
  writeStateValue,
  uSe,
  validateStateSetArgs,
  stateSetForPlugin,
  flushStaleFold,
  validateStateRef,
  stateGetForPlugin,
  renderInstanceKey,
  mountStateReader,
  NZs,
  recordStateReads,
  US,
  rf,
  HS,
};
