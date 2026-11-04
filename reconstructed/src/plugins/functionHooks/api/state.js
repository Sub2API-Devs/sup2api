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
import { __export } from "../../../../runtime/bun-runtime.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:8988-8999 placement
/**
 * 空对象默认导出
 */
var EMPTY_STATE_EXPORTS = {};
//@ chunk-s61vbvea.js:8999-9634 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:8999", () => {
  __export(EMPTY_STATE_EXPORTS, {
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
});
//@ chunk-s61vbvea.js:300604-300747 placement
function bumpStateReaders(keys, fold) {
  if (keys.length === 0) return;
  fold.bumps += 1;
  let bumps = fold.bumps;
  renderVersions().setState((versions) => {
    let next = new Map(versions);
    for (let key of keys) next.set(stateKeyOf(key), bumps);
    return next;
  });
}
//@ chunk-s61vbvea.js:300747-300810 placement
var renderInstanceKey = (site) => `${site.surface}\x00${site.component}\x00${site.requestId}`;
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
  let key = renderInstanceKey(site);
  if (!(mounted.has(key) || readers.has(key))) dropStateRenderVersions([key]);
}
//@ chunk-s61vbvea.js:300924-301060 placement
function notifyStaleReaders(listeners, fold) {
  if (listeners.size === 0) return;
  bumpStateReaders([...listeners.keys()], fold);
  let mapped = [...listeners.values()].map((state) => state.instance);
  for (let staleListener of fold.staleListeners) staleListener(mapped);
}
//@ chunk-s61vbvea.js:301060-301296 placement
/**
 * 刷新一组（steady/live）积压的过期渲染实例：清定时器、记录时间，把过期实例交给监听者重新渲染。
 */
function flushStaleFold(scope, lastAt) {
  let registry = pluginStateRegistry();
  let fold = registry.folds[scope];
  if (fold.pending !== undefined) clearTimeout(fold.pending);
  fold.pending = undefined;
  fold.lastAt = lastAt;
  let stale = new Map(
    [...fold.stale].flatMap((key) => {
      let at = registry.readers.get(key);
      return at === undefined ? [] : [[key, at]];
    }),
  );
  fold.stale.clear();
  notifyStaleReaders(stale, registry);
}
//@ chunk-s61vbvea.js:301296-301324 placement
/**
 * 到点刷新待处理项
 */
function flushTrailingFold(scope, now) {
  flushStaleFold(scope, now());
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
function scheduleStaleReaders(keys, now = Date.now) {
  let registry = pluginStateRegistry();
  let scheduled = new Set();
  for (let key of keys) {
    let reader = registry.readers.get(key);
    if (reader !== undefined) {
      let fold = now();
      let instance = reader.plugins.some((plugin) => isThrottled(plugin, fold))
        ? "steady"
        : renderPaceOf(reader.instance);
      registry.folds[instance].stale.add(key);
      scheduled.add(instance);
    }
  }
  for (let key of scheduled) {
    let scope = registry.folds[key];
    if (scope.pending !== undefined) continue;
    let instance = now();
    let fold = REDRAW_INTERVAL_BY_PACE[key] - Math.max(0, instance - scope.lastAt);
    if (fold <= 0) flushStaleFold(key, instance);
    else {
      scope.pending = setTimeout(flushTrailingFold, fold, key, now);
      scope.pending.unref();
    }
  }
}
//@ chunk-s61vbvea.js:301729-301807 placement
/**
 * 状态写入后调度过期读者
 */
function noteStateWrite(key) {
  let keys = pluginStateRegistry().readersOf.get(key);
  if (keys !== undefined && keys.size > 0) scheduleStaleReaders([...keys]);
}
//@ chunk-s61vbvea.js:301807-301883 placement
/**
 * 订阅状态过期通知
 */
function subscribeStale(listener) {
  let { staleListeners } = pluginStateRegistry();
  staleListeners.add(listener);
  return () => {
    staleListeners.delete(listener);
  };
}
//@ chunk-s61vbvea.js:301883-301960 placement
/**
 * 同站点批量重绘
 */
function burstRedrawSite(site) {
  let registry = pluginStateRegistry();
  bumpStateReaders([renderInstanceKey(site)], registry);
  for (let staleListener of registry.staleListeners) staleListener([site]);
}
//@ chunk-s61vbvea.js:301960-302375 placement
/**
 * 会话结束时重置插件状态：清空节流组、读者表与状态值（保留版本下限），并通知所有读者过期。
 */
function resetPluginState() {
  let registry = pluginStateRegistry();
  for (let fold of [registry.folds.steady, registry.folds.live]) {
    if (fold.pending !== undefined) clearTimeout(fold.pending);
    fold.pending = undefined;
    fold.stale.clear();
    fold.lastAt = Number.NEGATIVE_INFINITY;
  }
  let steady = new Map(registry.readers);
  for (let live of registry.values.getState().values())
    registry.versionFloor = Math.max(registry.versionFloor, live.version);
  registry.faultRuns.clear();
  registry.readers.clear();
  registry.readersOf.clear();
  registry.values.setState((versions) => (versions.size === 0 ? versions : new Map()));
  clearStateRenderVersions();
  notifyStaleReaders(steady, registry);
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
function writeStateValue(key, value) {
  let json = jsonStringify(value);
  if (!(typeof json === "string" && json.length <= MAX_CALL_VALUE_CHARS))
    throw new HooksError(`a value of state is JSON data of at most ${MAX_CALL_VALUE_CHARS} characters`);
  let { values, versionFloor } = pluginStateRegistry();
  let version = Math.max(values.getState().get(key)?.version ?? 0, versionFloor) + 1;
  dispatchScopeStorage.exit(() => {
    values.setState((next) => {
      let prev = new Map(next);
      prev.set(key, {
        value: deepFreezeInPlace(jsonParse(json)),
        version,
      });
      return prev;
    });
    noteStateWrite(key);
  });
  return version;
}
//@ chunk-s61vbvea.js:302797-302980 placement
function forgetReader(key) {
  let registry = pluginStateRegistry();
  let reader = registry.readers.get(key);
  if (reader === undefined) return;
  for (let read of reader.reads) {
    let keys = registry.readersOf.get(read);
    keys?.delete(key);
    if (keys?.size === 0) registry.readersOf.delete(read);
  }
  registry.readers.delete(key);
}
//@ chunk-s61vbvea.js:302980-303075 placement
/**
 * 忘掉某渲染实例的读者记录
 */
function forgetRenderInstance(key) {
  let { folds } = pluginStateRegistry();
  forgetReader(key);
  folds.steady.stale.delete(key);
  folds.live.stale.delete(key);
  dropStateRenderVersions([key]);
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
  let registry = pluginStateRegistry();
  forgetReader(instanceKey);
  if (versionsRead.size === 0) return;
  registry.readers.set(instanceKey, {
    instance,
    plugins: drawingScope.pluginsOf(),
    reads: new Set(versionsRead.keys()),
  });
  let state = registry.values.getState();
  let keys = false;
  for (let [key, reader] of versionsRead) {
    let secondKey = registry.readersOf.get(key) ?? new Set();
    secondKey.add(instanceKey);
    registry.readersOf.set(key, secondKey);
    keys ||= (state.get(key)?.version ?? 0) !== reader;
  }
  for (let key of registry.readers.keys()) {
    if (registry.readers.size <= MAX_READING_INSTANCES) break;
    if (!registry.mounted.has(key)) forgetRenderInstance(key);
  }
  if (keys) scheduleStaleReaders([instanceKey]);
}
//@ chunk-s61vbvea.js:303502-303667 placement
/**
 * 标记渲染实例已挂载（引用计数），返回卸载函数；最后一次卸载且无读记录时清理。
 */
function mountStateReader(key) {
  let { mounted, readers } = pluginStateRegistry();
  mounted.set(key, (mounted.get(key) ?? 0) + 1);
  return () => {
    let count = (mounted.get(key) ?? 1) - 1;
    if (count > 0) {
      mounted.set(key, count);
      return;
    }
    mounted.delete(key);
    if (!readers.has(key)) dropStateRenderVersions([key]);
  };
}
//@ chunk-s61vbvea.js:303667-303740 placement
/**
 * 附上一次的值
 */
var withPreviousValue = (entry) => ({
  ...entry,
  previous: pluginStateRegistry().values.getState().get(stateEntryKey(entry))?.value,
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
function checkStateRef(ref) {
  if (!isPlainObject(ref)) return STATE_REFERENCE_SHAPE;
  let { plugin, key, id } = ref;
  if (!(
    typeof plugin === "string" &&
    plugin !== "" &&
    typeof key === "string" &&
    key !== "" &&
    (id === undefined || typeof id === "string")
  ))
    return STATE_REFERENCE_SHAPE;
  return [plugin, key, id ?? ""].some((problem) => problem.includes("\x00"))
    ? "a plugin, key or id holding the NUL character"
    : undefined;
}
//@ chunk-s61vbvea.js:304080-304288 placement
function validateStateRef(ref) {
  let problem = checkStateRef(ref);
  if (problem !== undefined || !isPlainObject(ref)) return problem;
  let found = Object.keys(ref).find((key) => key !== "plugin" && key !== "key" && key !== "id");
  if (found === undefined) return;
  return `takes { plugin, key, id? } and nothing else (got ${found})`;
}
//@ chunk-s61vbvea.js:304288-304357 placement
/**
 * state.set 允许的键
 */
var STATE_SET_ARG_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:304288", () => {
  STATE_SET_ARG_KEYS = new Set(["plugin", "key", "id", "value", "previous", "ifVersion"]);
});
//@ chunk-s61vbvea.js:304357-305237 placement
/**
 * 校验 $.state.set 参数（plugin/key/id/value/ifVersion）
 */
function validateStateSetArgs(ref, value) {
  let problem = checkStateRef(ref);
  if (problem !== undefined || !isPlainObject(ref)) return problem;
  let found = Object.keys(ref).find((key) => !STATE_SET_ARG_KEYS.has(key));
  if (found !== undefined)
    return `takes { plugin, key, id?, value, ifVersion? } and nothing else (got ${found})`;
  if (ref.value === undefined) return "takes a value (JSON data, never undefined)";
  let secondProblem = describeNonJsonValue(ref.value);
  if (secondProblem !== undefined) return secondProblem;
  let { ifVersion } = ref;
  if (ifVersion !== undefined && !(Number.isSafeInteger(ifVersion) && Number(ifVersion) >= 0))
    return "ifVersion is a version $.state.get answered (a whole number)";
  if (value.scopeHolder?.scope?.drawing?.isInFlight === true)
    return "denied: it was made while ui.render is being dispatched, and drawing is pure (a render hook reads state and returns a tree; write from a handler such as onPress, or from another event)";
  let thirdProblem = String(ref.plugin);
  return thirdProblem === value.plugin
    ? undefined
    : `denied: ${thirdProblem} owns that value and only its owner writes it (to change what is written, hook ${thirdProblem}'s state.set and rewrite e.value)`;
}
//@ chunk-s61vbvea.js:305237-305333 placement
/**
 * 取（或挂上）状态值表
 */
function stateValuesFor(scope) {
  let state = pluginStateRegistry().values.getState();
  if (scope === undefined) return state;
  scope.values ??= state;
  return scope.values;
}
//@ chunk-s61vbvea.js:305333-305549 placement
/**
 * $.state.get：读值与版本；正在渲染时记录读取版本以便后续失效。
 */
function stateGetForPlugin(ref, ctx) {
  let key = stateEntryKey(ref);
  let scope = scopeOf(ctx.scopeHolder);
  let entry = stateValuesFor(scope).get(key);
  let version = entry?.version ?? 0;
  let drawing = scope?.drawing;
  if (drawing?.isInFlight === true && !drawing.versionsRead.has(key)) drawing.versionsRead.set(key, version);
  return Promise.resolve({
    value: entry?.value,
    version,
  });
}
//@ chunk-s61vbvea.js:305549-305803 placement
/**
 * $.state.set：ifVersion 不匹配则不写，返回 {isSet, version}。
 */
function stateSetForPlugin(ref, ctx) {
  let key = stateEntryKey(ref);
  let { values } = pluginStateRegistry();
  let version = values.getState().get(key)?.version ?? 0;
  let versionMismatch = ref.ifVersion !== undefined && ref.ifVersion !== version;
  let version_2 = versionMismatch ? version : writeStateValue(key, ref.value);
  let scope = ctx.scopeHolder?.scope;
  if (scope?.values !== undefined) scope.values = values.getState();
  return Promise.resolve({
    isSet: !versionMismatch,
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
