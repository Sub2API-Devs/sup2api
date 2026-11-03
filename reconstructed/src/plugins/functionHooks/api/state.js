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
  renderVersions,
  stateKeyOf,
  dropStateRenderVersions,
  STEADY_REDRAW_INTERVAL_MS,
  LIVE_THROTTLE_LIMIT,
  isThrottled,
  renderPaceOf,
  clearStateRenderVersions,
} from "../ui/renderInstances.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { MAX_CALL_VALUE_CHARS } from "./sessionOps.js";
import { HooksError } from "../hooksErrors.js";
import { dispatchScopeStorage, scopeOf } from "../dispatch/dispatchScope.js";
import { deepFreezeInPlace } from "../../../utils/hooks/functionHookMatchers.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { describeNonJsonValue } from "../panes.js";

//@ chunk-s61vbvea.js:8988-8999 placement
/**
 * 空对象默认导出
 */
var EMPTY_STATE_EXPORTS = {};
//@ chunk-s61vbvea.js:8999-9634 placement
Ar(EMPTY_STATE_EXPORTS, {
  MAX_READING_INSTANCES: () => MAX_READING_INSTANCES,
  REDRAW_INTERVAL_MS: () => REDRAW_INTERVAL_BY_PACE,
  REFERENCE_SHAPE: () => STATE_REFERENCE_SHAPE,
  STATE_SET_KEYS: () => STATE_SET_ARG_KEYS,
  addressProblem: () => checkStateRef,
  bumpInstances: () => bumpStateReaders,
  clearStateSession: () => resetPluginState,
  commitReads: () => recordStateReads,
  createStateSession: () => createPluginStateStore,
  default: () => EMPTY_STATE_EXPORTS,
  dropUnheldVersion: () => dropUnheldRenderVersions,
  entryKeyOf: () => stateEntryKey,
  flushStale: () => flushStaleFold,
  flushTrailing: () => flushTrailingFold,
  forgetInstance: () => forgetRenderInstance,
  holdInstance: () => mountStateReader,
  landValue: () => writeStateValue,
  noteStale: () => scheduleStaleReaders,
  noteWrite: () => noteStateWrite,
  onStale: () => subscribeStale,
  previousStamped: () => withPreviousValue,
  redrawInstances: () => notifyStaleReaders,
  redrawSite: () => burstRedrawSite,
  stateGet: () => stateGetForPlugin,
  stateGetProblem: () => validateStateRef,
  stateSession: () => pluginStateRegistry,
  stateSet: () => stateSetForPlugin,
  stateSetProblem: () => validateStateSetArgs,
  unfollow: () => forgetReader,
  valuesFor: () => stateValuesFor,
});
//@ chunk-s61vbvea.js:300604-300747 placement
function bumpStateReaders(e, n) {
  if (e.length === 0) return;
  n.bumps += 1;
  let bumps = n.bumps;
  renderVersions().setState((s) => {
    let h = new Map(s);
    for (let y of e) h.set(stateKeyOf(y), bumps);
    return h;
  });
}
//@ chunk-s61vbvea.js:300747-300810 placement
var renderInstanceKey = (e) => `${e.surface}\x00${e.component}\x00${e.requestId}`;
//@ chunk-s61vbvea.js:300810-300838 placement
/**
 * 插件状态登记表
 */
var pluginStateRegistry = () => getPluginRegistry().pluginState;
//@ chunk-s61vbvea.js:300838-300924 placement
/**
 * 丢弃未挂载实例的渲染版本
 */
function dropUnheldRenderVersions(site) {
  let { mounted, readers } = pluginStateRegistry();
  let s = renderInstanceKey(site);
  if (!(mounted.has(s) || readers.has(s))) dropStateRenderVersions([s]);
}
//@ chunk-s61vbvea.js:300924-301060 placement
function notifyStaleReaders(e, n) {
  if (e.size === 0) return;
  bumpStateReaders([...e.keys()], n);
  let mapped = [...e.values()].map((s) => s.instance);
  for (let staleListener of n.staleListeners) staleListener(mapped);
}
//@ chunk-s61vbvea.js:301060-301296 placement
/**
 * 刷新一组（steady/live）积压的过期渲染实例：清定时器、记录时间，把过期实例交给监听者重新渲染。
 */
function flushStaleFold(e, lastAt) {
  let r = pluginStateRegistry();
  let s = r.folds[e];
  if (s.pending !== undefined) clearTimeout(s.pending);
  s.pending = undefined;
  s.lastAt = lastAt;
  let h = new Map(
    [...s.stale].flatMap((y) => {
      let S = r.readers.get(y);
      return S === undefined ? [] : [[y, S]];
    }),
  );
  s.stale.clear();
  notifyStaleReaders(h, r);
}
//@ chunk-s61vbvea.js:301296-301324 placement
/**
 * 到点刷新待处理项
 */
function flushTrailingFold(e, n) {
  flushStaleFold(e, n());
}
//@ chunk-s61vbvea.js:301324-301352 placement
/**
 * steady/live 两种重绘间隔
 */
var REDRAW_INTERVAL_BY_PACE = {
  steady: STEADY_REDRAW_INTERVAL_MS,
  live: LIVE_THROTTLE_LIMIT,
};
//@ chunk-s61vbvea.js:301352-301729 placement
/**
 * 把读过已变状态的渲染实例归入 steady 或 live 组，按各组节流间隔立即或延时刷新。
 */
function scheduleStaleReaders(e, n = Date.now) {
  let r = pluginStateRegistry();
  let s = new Set();
  for (let h of e) {
    let y = r.readers.get(h);
    if (y !== undefined) {
      let S = n();
      let R = y.plugins.some((plugin) => isThrottled(plugin, S)) ? "steady" : renderPaceOf(y.instance);
      r.folds[R].stale.add(h);
      s.add(R);
    }
  }
  for (let h of s) {
    let y = r.folds[h];
    if (y.pending !== undefined) continue;
    let S = n();
    let w = REDRAW_INTERVAL_BY_PACE[h] - Math.max(0, S - y.lastAt);
    if (w <= 0) flushStaleFold(h, S);
    else {
      y.pending = setTimeout(flushTrailingFold, w, h, n);
      y.pending.unref();
    }
  }
}
//@ chunk-s61vbvea.js:301729-301807 placement
/**
 * 状态写入后调度过期读者
 */
function noteStateWrite(e) {
  let n = pluginStateRegistry().readersOf.get(e);
  if (n !== undefined && n.size > 0) scheduleStaleReaders([...n]);
}
//@ chunk-s61vbvea.js:301807-301883 placement
/**
 * 订阅状态过期通知
 */
function subscribeStale(e) {
  let { staleListeners } = pluginStateRegistry();
  staleListeners.add(e);
  return () => {
    staleListeners.delete(e);
  };
}
//@ chunk-s61vbvea.js:301883-301960 placement
/**
 * 同站点批量重绘
 */
function burstRedrawSite(e) {
  let n = pluginStateRegistry();
  bumpStateReaders([renderInstanceKey(e)], n);
  for (let staleListener of n.staleListeners) staleListener([e]);
}
//@ chunk-s61vbvea.js:301960-302375 placement
/**
 * 会话结束时重置插件状态：清空节流组、读者表与状态值（保留版本下限），并通知所有读者过期。
 */
function resetPluginState() {
  let e = pluginStateRegistry();
  for (let r of [e.folds.steady, e.folds.live]) {
    if (r.pending !== undefined) clearTimeout(r.pending);
    r.pending = undefined;
    r.stale.clear();
    r.lastAt = Number.NEGATIVE_INFINITY;
  }
  let n = new Map(e.readers);
  for (let r of e.values.getState().values()) e.versionFloor = Math.max(e.versionFloor, r.version);
  e.faultRuns.clear();
  e.readers.clear();
  e.readersOf.clear();
  e.values.setState((r) => (r.size === 0 ? r : new Map()));
  clearStateRenderVersions();
  notifyStaleReaders(n, e);
}
//@ chunk-s61vbvea.js:302375-302457 placement
/**
 * 状态条目表的键 plugin\0key（带实例 id 时再补 \0id），同一插件同一键的不同实例分开存。
 */
var stateEntryKey = ({ plugin, key, id }) =>
  id === undefined ? `${plugin}\x00${key}` : `${plugin}\x00${key}\x00${id}`;
//@ chunk-s61vbvea.js:302457-302797 placement
/**
 * 写一个插件状态值：JSON 化并检查大小，版本号取 max(旧版本, 下限)+1，写入后通知读者。返回新版本。
 */
function writeStateValue(e, n) {
  let r = jsonStringify(n);
  if (!(typeof r === "string" && r.length <= MAX_CALL_VALUE_CHARS))
    throw new HooksError(`a value of state is JSON data of at most ${MAX_CALL_VALUE_CHARS} characters`);
  let { values, versionFloor } = pluginStateRegistry();
  let S = Math.max(values.getState().get(e)?.version ?? 0, versionFloor) + 1;
  dispatchScopeStorage.exit(() => {
    values.setState((w) => {
      let R = new Map(w);
      R.set(e, {
        value: deepFreezeInPlace(jsonParse(r)),
        version: S,
      });
      return R;
    });
    noteStateWrite(e);
  });
  return S;
}
//@ chunk-s61vbvea.js:302797-302980 placement
function forgetReader(e) {
  let n = pluginStateRegistry();
  let r = n.readers.get(e);
  if (r === undefined) return;
  for (let read of r.reads) {
    let h = n.readersOf.get(read);
    h?.delete(e);
    if (h?.size === 0) n.readersOf.delete(read);
  }
  n.readers.delete(e);
}
//@ chunk-s61vbvea.js:302980-303075 placement
/**
 * 忘掉某渲染实例的读者记录
 */
function forgetRenderInstance(e) {
  let { folds } = pluginStateRegistry();
  forgetReader(e);
  folds.steady.stale.delete(e);
  folds.live.stale.delete(e);
  dropStateRenderVersions([e]);
}
//@ chunk-s61vbvea.js:303075-303087 placement
/**
 * 4000
 */
var MAX_READING_INSTANCES = 4000;
//@ chunk-s61vbvea.js:303087-303502 placement
/**
 * 记录一次渲染读了哪些状态及版本：更新读者索引，读者过多时淘汰未挂载的，若读到的已过期立刻排程重渲染。
 */
function recordStateReads(drawingScope) {
  let { instanceKey, instance, versionsRead } = drawingScope;
  let h = pluginStateRegistry();
  forgetReader(instanceKey);
  if (versionsRead.size === 0) return;
  h.readers.set(instanceKey, {
    instance,
    plugins: drawingScope.pluginsOf(),
    reads: new Set(versionsRead.keys()),
  });
  let state = h.values.getState();
  let S = false;
  for (let [w, R] of versionsRead) {
    let x = h.readersOf.get(w) ?? new Set();
    x.add(instanceKey);
    h.readersOf.set(w, x);
    S ||= (state.get(w)?.version ?? 0) !== R;
  }
  for (let key of h.readers.keys()) {
    if (h.readers.size <= MAX_READING_INSTANCES) break;
    if (!h.mounted.has(key)) forgetRenderInstance(key);
  }
  if (S) scheduleStaleReaders([instanceKey]);
}
//@ chunk-s61vbvea.js:303502-303667 placement
/**
 * 标记渲染实例已挂载（引用计数），返回卸载函数；最后一次卸载且无读记录时清理。
 */
function mountStateReader(e) {
  let { mounted, readers } = pluginStateRegistry();
  mounted.set(e, (mounted.get(e) ?? 0) + 1);
  return () => {
    let s = (mounted.get(e) ?? 1) - 1;
    if (s > 0) {
      mounted.set(e, s);
      return;
    }
    mounted.delete(e);
    if (!readers.has(e)) dropStateRenderVersions([e]);
  };
}
//@ chunk-s61vbvea.js:303667-303740 placement
/**
 * 附上一次的值
 */
var withPreviousValue = (e) => ({
  ...e,
  previous: pluginStateRegistry().values.getState().get(stateEntryKey(e))?.value,
});
//@ chunk-s61vbvea.js:303740-303808 placement
/**
 * 状态引用形状说明
 */
var STATE_REFERENCE_SHAPE = "takes a reference { plugin, key } (id for a family member)";
//@ chunk-s61vbvea.js:303808-304080 placement
/**
 * 校验状态引用 {plugin, key, id?}：非空字符串且不含 NUL。
 */
function checkStateRef(e) {
  if (!isPlainObject(e)) return STATE_REFERENCE_SHAPE;
  let { plugin, key, id } = e;
  if (!(
    typeof plugin === "string" &&
    plugin !== "" &&
    typeof key === "string" &&
    key !== "" &&
    (id === undefined || typeof id === "string")
  ))
    return STATE_REFERENCE_SHAPE;
  return [plugin, key, id ?? ""].some((S) => S.includes("\x00"))
    ? "a plugin, key or id holding the NUL character"
    : undefined;
}
//@ chunk-s61vbvea.js:304080-304288 placement
function validateStateRef(e) {
  let n = checkStateRef(e);
  if (n !== undefined || !isPlainObject(e)) return n;
  let found = Object.keys(e).find((key) => key !== "plugin" && key !== "key" && key !== "id");
  if (found === undefined) return;
  return `takes { plugin, key, id? } and nothing else (got ${found})`;
}
//@ chunk-s61vbvea.js:304288-304357 placement
/**
 * state.set 允许的键
 */
var STATE_SET_ARG_KEYS = new Set(["plugin", "key", "id", "value", "previous", "ifVersion"]);
//@ chunk-s61vbvea.js:304357-305237 placement
/**
 * 校验 $.state.set 参数（plugin/key/id/value/ifVersion）
 */
function validateStateSetArgs(e, n) {
  let r = checkStateRef(e);
  if (r !== undefined || !isPlainObject(e)) return r;
  let found = Object.keys(e).find((key) => !STATE_SET_ARG_KEYS.has(key));
  if (found !== undefined)
    return `takes { plugin, key, id?, value, ifVersion? } and nothing else (got ${found})`;
  if (e.value === undefined) return "takes a value (JSON data, never undefined)";
  let h = describeNonJsonValue(e.value);
  if (h !== undefined) return h;
  let { ifVersion } = e;
  if (ifVersion !== undefined && !(Number.isSafeInteger(ifVersion) && Number(ifVersion) >= 0))
    return "ifVersion is a version $.state.get answered (a whole number)";
  if (n.scopeHolder?.scope?.drawing?.isInFlight === true)
    return "denied: it was made while ui.render is being dispatched, and drawing is pure (a render hook reads state and returns a tree; write from a handler such as onPress, or from another event)";
  let w = String(e.plugin);
  return w === n.plugin
    ? undefined
    : `denied: ${w} owns that value and only its owner writes it (to change what is written, hook ${w}'s state.set and rewrite e.value)`;
}
//@ chunk-s61vbvea.js:305237-305333 placement
/**
 * 取（或挂上）状态值表
 */
function stateValuesFor(e) {
  let state = pluginStateRegistry().values.getState();
  if (e === undefined) return state;
  e.values ??= state;
  return e.values;
}
//@ chunk-s61vbvea.js:305333-305549 placement
/**
 * $.state.get：读值与版本；正在渲染时记录读取版本以便后续失效。
 */
function stateGetForPlugin(e, n) {
  let r = stateEntryKey(e);
  let s = scopeOf(n.scopeHolder);
  let h = stateValuesFor(s).get(r);
  let version = h?.version ?? 0;
  let drawing = s?.drawing;
  if (drawing?.isInFlight === true && !drawing.versionsRead.has(r)) drawing.versionsRead.set(r, version);
  return Promise.resolve({
    value: h?.value,
    version,
  });
}
//@ chunk-s61vbvea.js:305549-305803 placement
/**
 * $.state.set：ifVersion 不匹配则不写，返回 {isSet, version}。
 */
function stateSetForPlugin(e, n) {
  let r = stateEntryKey(e);
  let { values } = pluginStateRegistry();
  let version = values.getState().get(r)?.version ?? 0;
  let y = e.ifVersion !== undefined && e.ifVersion !== version;
  let version_2 = y ? version : writeStateValue(r, e.value);
  let scope = n.scopeHolder?.scope;
  if (scope?.values !== undefined) scope.values = values.getState();
  return Promise.resolve({
    isSet: !y,
    version: version_2,
  });
}
export {
  resetPluginState,
  pluginStateRegistry,
  stateEntryKey,
  writeStateValue,
  EMPTY_STATE_EXPORTS,
  validateStateSetArgs,
  stateSetForPlugin,
  flushStaleFold,
  validateStateRef,
  stateGetForPlugin,
  renderInstanceKey,
  mountStateReader,
  withPreviousValue,
  recordStateReads,
  subscribeStale,
  burstRedrawSite,
  dropUnheldRenderVersions,
};
