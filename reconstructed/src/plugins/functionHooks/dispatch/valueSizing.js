/**
 * plugins/functionHooks/dispatch/valueSizing.ts
 *
 * 钩子传值大小度量与超限告警（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (27)
 * attribution: placement 27
 */
import { AsyncLocalStorage } from "async_hooks";
import { HooksError, nextNotPlainData, requireEventArgument } from "../hooksErrors.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../../../utils/structuredCloneLimits.js";
import { isPlainDataObject, matcherLog } from "../../../utils/hooks/functionHookMatchers.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { isCoreOrManaged } from "./chain.js";
import { HOOK_TIER_ORDER } from "../builtinHooksModule.js";

//@ chunk-4121qate.js:72399-72412 placement
/**
 * 预算用尽后的宽限 5 秒：超时后仍给它这段时间结算；宽限内不结束就记 lingeredMs 并按策略处理。
 */
var LINGER_GRACE_MS = 5000;
//@ chunk-4121qate.js:72461-72476 placement
/**
 * 暂停计时的 ALS
 */
var budgetPauseStorage = new AsyncLocalStorage();
//@ chunk-4121qate.js:72476-72595 placement
/**
 * 在当前钩子预算之外执行 e（暂停计时，结束后恢复）。
 */
async function outsideBudget(e) {
  let o = budgetPauseStorage.getStore();
  if (o === undefined) return e();
  o.pause();
  try {
    return await e();
  } finally {
    o.resume();
  }
}
//@ chunk-4121qate.js:72595-72607 placement
/**
 * 1000
 */
var VALUE_NODE_SLACK = 1000;
//@ chunk-4121qate.js:72607-72619 placement
/**
 * 1000
 */
var MAX_TOJSON_DEPTH = 1000;
//@ chunk-4121qate.js:72619-72715 placement
/**
 * toJSON 循环说明
 */
var TOJSON_LOOP_TEXT = `a toJSON keeps answering with a value that holds another toJSON, more than ${MAX_TOJSON_DEPTH} times`;
//@ chunk-4121qate.js:72715-72733 placement
/**
 * 4294967295
 */
var MAX_UINT32 = 4294967295;
//@ chunk-4121qate.js:72733-72966 placement
/**
 * 读取插件给的列表长度并校验（非负整数且不超过 2^32-1），否则抛 HooksError。被各站点校验广泛使用。
 */
function checkedListLength(e) {
  let o = e.length;
  let n =
    typeof o !== "bigint" && typeof o !== "symbol" ? Math.max(Math.trunc(Number(o)) || 0, 0) : undefined;
  if (n === undefined || n > MAX_UINT32)
    throw new HooksError(`a plugin's list claims a length no list has (got ${n ?? `a ${typeof o}`})`);
  return n;
}
//@ chunk-4121qate.js:72966-73383 placement
/**
 * 复制值时进入一层：检查深度上限与循环，记录是否为参数自有对象。
 */
function openCopyFrame(e, o, r) {
  let { seen, argument } = o;
  if (seen.has(e)) return r;
  let i = (r?.depth ?? 0) + 1;
  if (i > MAX_NESTING_DEPTH) throw new HooksError(nextNotPlainData(NESTING_TOO_DEEP_MESSAGE));
  let p = Array.isArray(e);
  let f = e === argument.own || isPlainDataObject(e);
  let isWhole = !p && !f && argument.isWhole;
  if (isWhole && ArrayBuffer.isView(e)) {
    seen.set(e, structuredClone(e));
    return r;
  }
  if (!(p || f || isWhole) || (!p && !isPlainObject(e))) return r;
  let c = p ? [] : Object.keys(e);
  let u = p ? checkedListLength(e) : c.length;
  let l = p ? [] : {};
  seen.set(e, l);
  return {
    source: e,
    into: l,
    keys: c,
    length: u,
    isTaken: isWhole,
    at: 0,
    depth: i,
    below: r,
  };
}
//@ chunk-4121qate.js:73383-73635 placement
function copyArrayFrame(e, o) {
  let source = Array.isArray(e.source) ? e.source : [];
  let into = Array.isArray(e.into) ? e.into : [];
  for (let at = e.at; at < e.length; at += 1) {
    let i = source[at];
    let p = typeof i === "object" && i !== null;
    let f = p ? openCopyFrame(i, o, e) : e;
    into[at] = p ? (o.seen.get(i) ?? i) : i;
    if (f !== e) {
      e.at = at + 1;
      return f;
    }
  }
  return e.below;
}
//@ chunk-4121qate.js:73635-73737 placement
function callToJsonSafely(e, o, applied) {
  try {
    return [false, applied === undefined ? Reflect.apply(e, o, [""]) : applied(o, e, "")];
  } catch (error) {
    return [true, error];
  }
}
//@ chunk-4121qate.js:73737-73807 placement
/**
 * 惰性抛/返回值
 */
function lazyThunk([e, o], answered) {
  let n = e ? o : answered(o);
  return () => {
    if (e) throw n;
    return n;
  };
}
//@ chunk-4121qate.js:73807-73875 placement
/**
 * 安全的 toJSON 结果
 */
function safeToJsonResult(e, source, r) {
  return lazyThunk(callToJsonSafely(e, source, r.argument.applied), r.answered);
}
//@ chunk-4121qate.js:73875-74133 placement
function finishObjectFrame(e, o) {
  let { into, source } = e;
  let { argument, seen } = o;
  let f =
    e.isTaken && argument.answer === undefined && !Object.hasOwn(into, "toJSON")
      ? Reflect.get(source, "toJSON")
      : undefined;
  if (typeof f === "function" && !Array.isArray(into)) into.toJSON = safeToJsonResult(f, source, o);
  if (source === argument.answer) seen.delete(source);
  return e.below;
}
//@ chunk-4121qate.js:74133-74544 placement
function measureJsonValue(e, o) {
  let { into, keys } = e;
  let source = Array.isArray(e.source) ? {} : e.source;
  let i = source === o.argument.answer;
  for (let at = e.at; at < keys.length; at += 1) {
    let f = keys[at] ?? "";
    let a = source[f];
    let m = f === "toJSON" && typeof a === "function";
    let c = !m && typeof a === "object" && a !== null;
    let u = c ? openCopyFrame(a, o, e) : e;
    let l = c ? (o.seen.get(a) ?? a) : a;
    if (!(m && i))
      Object.defineProperty(into, f, {
        value: m ? safeToJsonResult(a, source, o) : l,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    if (u !== e) {
      e.at = at + 1;
      return u;
    }
  }
  return finishObjectFrame(e, o);
}
//@ chunk-4121qate.js:74544-74891 placement
/**
 * 迭代深拷贝插件传来的值（处理循环、toJSON 链、深度上限），得到宿主可安全持有的纯数据副本。
 */
function copyPluginValue(e, o, r) {
  if (typeof e !== "object" || e === null) return e;
  let n = {
    seen: o,
    argument: r,
    answered(f) {
      if (typeof f === "object" && f !== null && r.answers >= MAX_TOJSON_DEPTH)
        throw new HooksError(nextNotPlainData(TOJSON_LOOP_TEXT));
      let answers = r.answers + 1;
      return copyPluginValue(f, o, {
        ...r,
        answer: f,
        answers,
      });
    },
  };
  let copyFrame = openCopyFrame(e, n, undefined);
  let i = copyFrame;
  while (i !== undefined) i = Array.isArray(i.source) ? copyArrayFrame(i, n) : measureJsonValue(i, n);
  return (copyFrame === undefined ? o.get(e) : copyFrame.into) ?? e;
}
//@ chunk-4121qate.js:74891-75019 placement
function copyAdoptedValues(e, o, r) {
  let n = new Set(o.values());
  return e.map((s) =>
    typeof s === "object" && s !== null && !n.has(s)
      ? copyPluginValue(s, o, {
          ...r,
          own: s,
        })
      : s,
  );
}
//@ chunk-4121qate.js:75019-75033 placement
/**
 * 原样返回
 */
var identityFn = (e) => e;
//@ chunk-4121qate.js:75033-75155 placement
/**
 * 结束一次下游等待：计入等待耗时，全部结束且未结算时恢复计时。
 */
function endDownstreamWait(state, budget) {
  if (--state.pendingDownstream > 0) return;
  state.beneathMs += performance.now() - state.beneathSince;
  if (!state.settled) budget.resume();
}
//@ chunk-4121qate.js:75155-75235 placement
/**
 * 答案状态
 */
var answerState = (own, applied, argumentCopy) => ({
  own,
  applied,
  answer: undefined,
  answers: 0,
  isWhole: argumentCopy === "whole",
});
//@ chunk-4121qate.js:75235-75405 placement
/**
 * 生成"钩子改写部分未生效"的 hookFailed 上报函数（效果文字固定）。
 */
var createUnappliedReporter = (effect) => (o, event, n) =>
  matcherLog().hookFailed({
    plugin: o.name,
    environmentId: o.environmentId,
    event,
    reason: `${o.name}: ${n}`,
    effect,
    hasOverrun: false,
    skip: {
      kind: "unapplied",
      why: n,
    },
  });
//@ chunk-4121qate.js:75405-75450 placement
/**
 * 其余改写仍生效
 */
var unappliedRestStands = createUnappliedReporter("the rest of its rewrite went on");
//@ chunk-4121qate.js:75450-75463 placement
/**
 * 32000
 */
var MAX_VALUE_BYTES = 32000;
//@ chunk-4121qate.js:75463-75618 placement
function warnOversizedPluginText(e, o, r) {
  if (r !== undefined && r > MAX_VALUE_BYTES)
    matcherLog().log(
      `${e}: wrote a text of ${r} characters (${o}; over ${MAX_VALUE_BYTES}, accepted: a plugin's text is its own to size)`,
    );
}
//@ chunk-4121qate.js:75618-76168 placement
/**
 * 校验并规范 next() 传入的参数：拷贝、采纳、还原与检查（站点规则），记录未生效部分与超长文本警告。
 */
function normalizeNextArgument({ handler, site, e: r }, n) {
  let s = requireEventArgument(n, handler.name);
  let i =
    !isCoreOrManaged(handler) && (site.checkArgument !== undefined || site.restoreArgument !== undefined);
  let p = i && !Object.is(s, r);
  let f = new Map();
  let a = answerState(s, handler.applied, site.argumentCopy);
  let m = p ? copyPluginValue(s, f, a) : s;
  let c = i && handler.isHop !== true;
  let u = i ? (site.adoptArgument?.(m, r, (x) => copyAdoptedValues(x, f, a)) ?? m) : m;
  let l = i ? (site.restoreArgument?.(u, r, handler) ?? u) : u;
  let y = i ? site.checkArgument?.(l, r) : undefined;
  if (y !== undefined) throw new HooksError(`${handler.name}: next() passed an argument with ${y}`);
  let g = c ? site.unappliedArgument?.(m, r) : undefined;
  if (g !== undefined) unappliedRestStands(handler, site.event, g);
  if (c) warnOversizedPluginText(handler.name, site.event, site.measureArgument?.(l, r));
  return identityFn(l);
}
//@ chunk-4121qate.js:76168-76196 placement
/**
 * 层级序号
 */
var tierIndex = (e) => HOOK_TIER_ORDER.indexOf(e);
//@ chunk-4121qate.js:76196-76332 placement
/**
 * 找出越过当前层级的 next.to 目标所属插件（用于拒绝绕过）。
 */
function findBypassingFloor(e, o, name) {
  let n = tierIndex(o);
  return e.find(
    (s) =>
      (tierIndex(s.from) < n || (s.isPastPeers === true && s.from === o && s.plugin !== name)) &&
      n < tierIndex(s.to),
  )?.plugin;
}
export {
  outsideBudget,
  budgetPauseStorage,
  MAX_VALUE_BYTES,
  tierIndex,
  createUnappliedReporter,
  LINGER_GRACE_MS,
  endDownstreamWait,
  normalizeNextArgument,
  findBypassingFloor,
  VALUE_NODE_SLACK,
  warnOversizedPluginText,
  checkedListLength,
};
