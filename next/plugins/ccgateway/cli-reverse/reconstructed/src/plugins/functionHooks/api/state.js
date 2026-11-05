/**
 * plugins/functionHooks/api/state.ts
 *
 * 函数钩子插件状态存储（state session：get/set/版本）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (31)
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

//@ chunk-7jxyna5q.js:8963-8974 placement
/**
 * 空对象默认导出
 */
var EMPTY_STATE_EXPORTS = {};
//@ chunk-7jxyna5q.js:8974-9610 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:8974", () => {
  __export(EMPTY_STATE_EXPORTS, {
    MAX_READING_INSTANCES: () => MAX_READING_INSTANCES,
    REDRAW_INTERVAL_MS: () => REDRAW_INTERVAL_MS,
    REFERENCE_SHAPE: () => REFERENCE_SHAPE,
    STATE_SET_KEYS: () => STATE_SET_KEYS,
    addressProblem: () => addressProblem,
    bumpInstances: () => bumpInstances,
    clearStateSession: () => clearStateSession,
    commitReads: () => commitReads,
    createStateSession: () => createPluginStateStore,
    default: () => EMPTY_STATE_EXPORTS,
    dropUnheldVersion: () => dropUnheldVersion,
    entryKeyOf: () => entryKeyOf,
    flushStale: () => flushStale,
    flushTrailing: () => flushTrailing,
    forgetInstance: () => forgetInstance,
    holdInstance: () => holdInstance,
    landValue: () => landValue,
    noteStale: () => noteStale,
    noteWrite: () => noteWrite,
    onStale: () => onStale,
    previousStamped: () => previousStamped,
    redrawInstances: () => redrawInstances,
    redrawSite: () => redrawSite,
    stateGet: () => stateGet,
    stateGetProblem: () => stateGetProblem,
    stateSession: () => stateSession,
    stateSet: () => stateSet,
    stateSetProblem: () => stateSetProblem,
    unfollow: () => unfollow,
    valuesFor: () => valuesFor,
  });
});
//@ chunk-7jxyna5q.js:224027-224170 placement
function bumpInstances(keys, fold) {
  if (keys.length === 0) return;
  fold.bumps += 1;
  let bumps = fold.bumps;
  renderVersions().setState((versions) => {
    let next = new Map(versions);
    for (let key of keys) next.set(stateKeyOf(key), bumps);
    return next;
  });
}
//@ chunk-7jxyna5q.js:224170-224233 placement
var renderInstanceKey = (site) => `${site.surface}\x00${site.component}\x00${site.requestId}`;
//@ chunk-7jxyna5q.js:224233-224261 placement
/**
 * 插件状态登记表
 */
var stateSession = () => getPluginRegistry().pluginState;
//@ chunk-7jxyna5q.js:224261-224347 placement
/**
 * 丢弃未挂载实例的渲染版本
 */
function dropUnheldVersion(site) {
  let { mounted, readers } = stateSession();
  let key = renderInstanceKey(site);
  if (!(mounted.has(key) || readers.has(key))) dropStateRenderVersions([key]);
}
//@ chunk-7jxyna5q.js:224347-224483 placement
function redrawInstances(listeners, fold) {
  if (listeners.size === 0) return;
  bumpInstances([...listeners.keys()], fold);
  let mapped = [...listeners.values()].map((state) => state.instance);
  for (let staleListener of fold.staleListeners) staleListener(mapped);
}
//@ chunk-7jxyna5q.js:224483-224719 placement
/**
 * 刷新一组（steady/live）积压的过期渲染实例：清定时器、记录时间，把过期实例交给监听者重新渲染。
 */
function flushStale(scope, lastAt) {
  let registry = stateSession();
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
  redrawInstances(stale, registry);
}
//@ chunk-7jxyna5q.js:224719-224747 placement
/**
 * 到点刷新待处理项
 */
function flushTrailing(scope, now) {
  flushStale(scope, now());
}
//@ chunk-7jxyna5q.js:224747-224775 placement
/**
 * steady/live 两种重绘间隔
 */
var REDRAW_INTERVAL_MS = {
  steady: STEADY_REDRAW_INTERVAL_MS,
  live: LIVE_THROTTLE_LIMIT,
};
//@ chunk-7jxyna5q.js:224775-225152 placement
/**
 * 把读过已变状态的渲染实例归入 steady 或 live 组，按各组节流间隔立即或延时刷新。
 */
function noteStale(keys, now = Date.now) {
  let registry = stateSession();
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
    let fold = REDRAW_INTERVAL_MS[key] - Math.max(0, instance - scope.lastAt);
    if (fold <= 0) flushStale(key, instance);
    else {
      scope.pending = setTimeout(flushTrailing, fold, key, now);
      scope.pending.unref();
    }
  }
}
//@ chunk-7jxyna5q.js:225152-225230 placement
/**
 * 状态写入后调度过期读者
 */
function noteWrite(key) {
  let keys = stateSession().readersOf.get(key);
  if (keys !== undefined && keys.size > 0) noteStale([...keys]);
}
//@ chunk-7jxyna5q.js:225230-225306 placement
/**
 * 订阅状态过期通知
 */
function onStale(listener) {
  let { staleListeners } = stateSession();
  staleListeners.add(listener);
  return () => {
    staleListeners.delete(listener);
  };
}
//@ chunk-7jxyna5q.js:225306-225387 placement
/**
 * 同站点批量重绘
 */
function redrawSite(...site) {
  let registry = stateSession();
  bumpInstances(site.map(renderInstanceKey), registry);
  for (let staleListener of registry.staleListeners) staleListener(site);
}
//@ chunk-7jxyna5q.js:225387-225802 placement
/**
 * 会话结束时重置插件状态：清空节流组、读者表与状态值（保留版本下限），并通知所有读者过期。
 */
function clearStateSession() {
  let registry = stateSession();
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
  redrawInstances(steady, registry);
}
//@ chunk-7jxyna5q.js:225802-225884 placement
/**
 * 状态条目表的键 plugin\0key（带实例 id 时再补 \0id），同一插件同一键的不同实例分开存。
 */
var entryKeyOf = ({ plugin, key, id }) =>
  id === undefined ? `${plugin}\x00${key}` : `${plugin}\x00${key}\x00${id}`;
//@ chunk-7jxyna5q.js:225884-226224 placement
/**
 * 写一个插件状态值：JSON 化并检查大小，版本号取 max(旧版本, 下限)+1，写入后通知读者。返回新版本。
 */
function landValue(key, value) {
  let json = jsonStringify(value);
  if (!(typeof json === "string" && json.length <= MAX_CALL_VALUE_CHARS))
    throw new HooksError(`a value of state is JSON data of at most ${MAX_CALL_VALUE_CHARS} characters`);
  let { values, versionFloor } = stateSession();
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
    noteWrite(key);
  });
  return version;
}
//@ chunk-7jxyna5q.js:226224-226407 placement
function unfollow(key) {
  let registry = stateSession();
  let reader = registry.readers.get(key);
  if (reader === undefined) return;
  for (let read of reader.reads) {
    let keys = registry.readersOf.get(read);
    keys?.delete(key);
    if (keys?.size === 0) registry.readersOf.delete(read);
  }
  registry.readers.delete(key);
}
//@ chunk-7jxyna5q.js:226407-226502 placement
/**
 * 忘掉某渲染实例的读者记录
 */
function forgetInstance(key) {
  let { folds } = stateSession();
  unfollow(key);
  folds.steady.stale.delete(key);
  folds.live.stale.delete(key);
  dropStateRenderVersions([key]);
}
//@ chunk-7jxyna5q.js:226502-226514 placement
/**
 * 4000
 */
var MAX_READING_INSTANCES = 4000;
//@ chunk-7jxyna5q.js:226514-226929 placement
/**
 * 记录一次渲染读了哪些状态及版本：更新读者索引，读者过多时淘汰未挂载的，若读到的已过期立刻排程重渲染。
 */
function commitReads(drawingScope) {
  let { instanceKey, instance, versionsRead } = drawingScope;
  let registry = stateSession();
  unfollow(instanceKey);
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
    if (!registry.mounted.has(key)) forgetInstance(key);
  }
  if (keys) noteStale([instanceKey]);
}
//@ chunk-7jxyna5q.js:226929-227094 placement
/**
 * 标记渲染实例已挂载（引用计数），返回卸载函数；最后一次卸载且无读记录时清理。
 */
function holdInstance(key) {
  let { mounted, readers } = stateSession();
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
//@ chunk-7jxyna5q.js:227094-227167 placement
/**
 * 附上一次的值
 */
var previousStamped = (entry) => ({
  ...entry,
  previous: stateSession().values.getState().get(entryKeyOf(entry))?.value,
});
//@ chunk-7jxyna5q.js:227167-227235 placement
/**
 * 状态引用形状说明
 */
var REFERENCE_SHAPE = "takes a reference { plugin, key } (id for a family member)";
//@ chunk-7jxyna5q.js:227235-227507 placement
/**
 * 校验状态引用 {plugin, key, id?}：非空字符串且不含 NUL。
 */
function addressProblem(ref) {
  if (!isPlainObject(ref)) return REFERENCE_SHAPE;
  let { plugin, key, id } = ref;
  if (!(
    typeof plugin === "string" &&
    plugin !== "" &&
    typeof key === "string" &&
    key !== "" &&
    (id === undefined || typeof id === "string")
  ))
    return REFERENCE_SHAPE;
  return [plugin, key, id ?? ""].some((problem) => problem.includes("\x00"))
    ? "a plugin, key or id holding the NUL character"
    : undefined;
}
//@ chunk-7jxyna5q.js:227507-227715 placement
function stateGetProblem(ref) {
  let problem = addressProblem(ref);
  if (problem !== undefined || !isPlainObject(ref)) return problem;
  let found = Object.keys(ref).find((key) => key !== "plugin" && key !== "key" && key !== "id");
  if (found === undefined) return;
  return `takes { plugin, key, id? } and nothing else (got ${found})`;
}
//@ chunk-7jxyna5q.js:227715-227784 placement
/**
 * state.set 允许的键
 */
var STATE_SET_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:227715", () => {
  STATE_SET_KEYS = new Set(["plugin", "key", "id", "value", "previous", "ifVersion"]);
});
//@ chunk-7jxyna5q.js:227784-228664 placement
/**
 * 校验 $.state.set 参数（plugin/key/id/value/ifVersion）
 */
function stateSetProblem(ref, value) {
  let problem = addressProblem(ref);
  if (problem !== undefined || !isPlainObject(ref)) return problem;
  let found = Object.keys(ref).find((key) => !STATE_SET_KEYS.has(key));
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
//@ chunk-7jxyna5q.js:228664-228760 placement
/**
 * 取（或挂上）状态值表
 */
function valuesFor(scope) {
  let state = stateSession().values.getState();
  if (scope === undefined) return state;
  scope.values ??= state;
  return scope.values;
}
//@ chunk-7jxyna5q.js:228760-228976 placement
/**
 * $.state.get：读值与版本；正在渲染时记录读取版本以便后续失效。
 */
function stateGet(ref, ctx) {
  let key = entryKeyOf(ref);
  let scope = scopeOf(ctx.scopeHolder);
  let entry = valuesFor(scope).get(key);
  let version = entry?.version ?? 0;
  let drawing = scope?.drawing;
  if (drawing?.isInFlight === true && !drawing.versionsRead.has(key)) drawing.versionsRead.set(key, version);
  return Promise.resolve({
    value: entry?.value,
    version,
  });
}
//@ chunk-7jxyna5q.js:228976-229230 placement
/**
 * $.state.set：ifVersion 不匹配则不写，返回 {isSet, version}。
 */
function stateSet(ref, ctx) {
  let key = entryKeyOf(ref);
  let { values } = stateSession();
  let version = values.getState().get(key)?.version ?? 0;
  let versionMismatch = ref.ifVersion !== undefined && ref.ifVersion !== version;
  let version_2 = versionMismatch ? version : landValue(key, ref.value);
  let scope = ctx.scopeHolder?.scope;
  if (scope?.values !== undefined) scope.values = values.getState();
  return Promise.resolve({
    isSet: !versionMismatch,
    version: version_2,
  });
}
export {
  redrawSite,
  stateSession,
  entryKeyOf,
  landValue,
  stateGetProblem,
  stateGet,
  stateSetProblem,
  previousStamped,
  stateSet,
  renderInstanceKey,
  commitReads,
  onStale,
  dropUnheldVersion,
  EMPTY_STATE_EXPORTS,
  flushStale,
  clearStateSession,
  holdInstance,
};
