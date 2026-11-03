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
import { HooksError, A3t, requireEventArgument } from "../hooksErrors.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../../../utils/structuredCloneLimits.js";
import { isPlainDataObject, pd } from "../../../utils/hooks/functionHookMatchers.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { Se } from "./chain.js";
import { hos } from "../builtinHooksModule.js";

//@ chunk-4121qate.js:72399-72412 placement
var H5e = 5000;
//@ chunk-4121qate.js:72461-72476 placement
var TAn = new AsyncLocalStorage();
/**
 * 在当前钩子预算之外执行 e（暂停计时，结束后恢复）。
 */
//@ chunk-4121qate.js:72476-72595 placement
async function outsideBudget(e) {
  let store = TAn.getStore();
  if (store === void 0) return e();
  store.pause();
  try {
    return await e();
  } finally {
    store.resume();
  }
}
//@ chunk-4121qate.js:72595-72607 placement
var Dt = 1000;
//@ chunk-4121qate.js:72607-72619 placement
var pr = 1000;
//@ chunk-4121qate.js:72619-72715 placement
var sa = `a toJSON keeps answering with a value that holds another toJSON, more than ${pr} times`;
//@ chunk-4121qate.js:72715-72733 placement
var ia = 4294967295;
/**
 * 读取插件给的列表长度并校验（非负整数且不超过 2^32-1），否则抛 HooksError。被各站点校验广泛使用。
 */
//@ chunk-4121qate.js:72733-72966 placement
function checkedListLength(e) {
  let o = e.length,
    n = typeof o !== "bigint" && typeof o !== "symbol" ? Math.max(Math.trunc(Number(o)) || 0, 0) : void 0;
  if (n === void 0 || n > ia)
    throw new HooksError(`a plugin's list claims a length no list has (got ${n ?? `a ${typeof o}`})`);
  return n;
}
/**
 * 复制值时进入一层：检查深度上限与循环，记录是否为参数自有对象。
 */
//@ chunk-4121qate.js:72966-73383 placement
function openCopyFrame(e, o, r) {
  let { seen: seen, argument: argument } = o;
  if (seen.has(e)) return r;
  let i = (r?.depth ?? 0) + 1;
  if (i > MAX_NESTING_DEPTH) throw new HooksError(A3t(NESTING_TOO_DEEP_MESSAGE));
  let isArray = Array.isArray(e),
    f = e === argument.own || isPlainDataObject(e),
    a = !isArray && !f && argument.isWhole;
  if (a && ArrayBuffer.isView(e)) return (seen.set(e, structuredClone(e)), r);
  if (!(isArray || f || a) || (!isArray && !isPlainObject(e))) return r;
  let c = isArray ? [] : Object.keys(e),
    u = isArray ? checkedListLength(e) : c.length,
    l = isArray ? [] : {};
  return (seen.set(e, l), { source: e, into: l, keys: c, length: u, isTaken: a, at: 0, depth: i, below: r });
}
//@ chunk-4121qate.js:73383-73635 placement
function copyArrayFrame(e, o) {
  let r = Array.isArray(e.source) ? e.source : [],
    n = Array.isArray(e.into) ? e.into : [];
  for (let at = e.at; at < e.length; at += 1) {
    let i = r[at],
      p = typeof i === "object" && i !== null,
      f = p ? openCopyFrame(i, o, e) : e;
    if (((n[at] = p ? (o.seen.get(i) ?? i) : i), f !== e)) return ((e.at = at + 1), f);
  }
  return e.below;
}
//@ chunk-4121qate.js:73635-73737 placement
function callToJsonSafely(e, o, r) {
  try {
    return [!1, r === void 0 ? Reflect.apply(e, o, [""]) : r(o, e, "")];
  } catch (error) {
    return [!0, error];
  }
}
//@ chunk-4121qate.js:73737-73807 placement
function fa([e, o], r) {
  let n = e ? o : r(o);
  return () => {
    if (e) throw n;
    return n;
  };
}
//@ chunk-4121qate.js:73807-73875 placement
function ar(e, o, r) {
  return fa(callToJsonSafely(e, o, r.argument.applied), r.answered);
}
//@ chunk-4121qate.js:73875-74133 placement
function finishObjectFrame(e, o) {
  let { into: into, source: source } = e,
    { argument: argument, seen: seen } = o,
    f =
      e.isTaken && argument.answer === void 0 && !Object.hasOwn(into, "toJSON")
        ? Reflect.get(source, "toJSON")
        : void 0;
  if (typeof f === "function" && !Array.isArray(into)) into.toJSON = ar(f, source, o);
  if (source === argument.answer) seen.delete(source);
  return e.below;
}
//@ chunk-4121qate.js:74133-74544 placement
function measureJsonValue(e, o) {
  let { into: into, keys: keys } = e,
    s = Array.isArray(e.source) ? {} : e.source,
    i = s === o.argument.answer;
  for (let at = e.at; at < keys.length; at += 1) {
    let f = keys[at] ?? "",
      a = s[f],
      m = f === "toJSON" && typeof a === "function",
      c = !m && typeof a === "object" && a !== null,
      u = c ? openCopyFrame(a, o, e) : e,
      l = c ? (o.seen.get(a) ?? a) : a;
    if (!(m && i))
      Object.defineProperty(into, f, {
        value: m ? ar(a, s, o) : l,
        enumerable: !0,
        writable: !0,
        configurable: !0,
      });
    if (u !== e) return ((e.at = at + 1), u);
  }
  return finishObjectFrame(e, o);
}
/**
 * 迭代深拷贝插件传来的值（处理循环、toJSON 链、深度上限），得到宿主可安全持有的纯数据副本。
 */
//@ chunk-4121qate.js:74544-74891 placement
function copyPluginValue(e, o, r) {
  if (typeof e !== "object" || e === null) return e;
  let n = {
      seen: o,
      argument: r,
      answered(f) {
        if (typeof f === "object" && f !== null && r.answers >= pr) throw new HooksError(A3t(sa));
        let m = r.answers + 1;
        return copyPluginValue(f, o, { ...r, answer: f, answers: m });
      },
    },
    s = openCopyFrame(e, n, void 0),
    i = s;
  while (i !== void 0) i = Array.isArray(i.source) ? copyArrayFrame(i, n) : measureJsonValue(i, n);
  return (s === void 0 ? o.get(e) : s.into) ?? e;
}
//@ chunk-4121qate.js:74891-75019 placement
function copyAdoptedValues(e, o, r) {
  let n = new Set(o.values());
  return e.map((s) =>
    typeof s === "object" && s !== null && !n.has(s) ? copyPluginValue(s, o, { ...r, own: s }) : s,
  );
}
//@ chunk-4121qate.js:75019-75033 placement
var da = (e) => e;
/**
 * 结束一次下游等待：计入等待耗时，全部结束且未结算时恢复计时。
 */
//@ chunk-4121qate.js:75033-75155 placement
function endDownstreamWait(e, o) {
  if (--e.pendingDownstream > 0) return;
  if (((e.beneathMs += performance.now() - e.beneathSince), !e.settled)) o.resume();
}
//@ chunk-4121qate.js:75155-75235 placement
var ya = (e, o, r) => ({ own: e, applied: o, answer: void 0, answers: 0, isWhole: r === "whole" });
/**
 * 生成"钩子改写部分未生效"的 hookFailed 上报函数（效果文字固定）。
 */
//@ chunk-4121qate.js:75235-75405 placement
var createUnappliedReporter = (e) => (o, r, n) =>
  pd().hookFailed({
    plugin: o.name,
    environmentId: o.environmentId,
    event: r,
    reason: `${o.name}: ${n}`,
    effect: e,
    hasOverrun: !1,
    skip: { kind: "unapplied", why: n },
  });
//@ chunk-4121qate.js:75405-75450 placement
var ga = createUnappliedReporter("the rest of its rewrite went on");
//@ chunk-4121qate.js:75450-75463 placement
var mr = 32000;
//@ chunk-4121qate.js:75463-75618 placement
function warnOversizedPluginText(e, o, r) {
  if (r !== void 0 && r > mr)
    pd().log(
      `${e}: wrote a text of ${r} characters (${o}; over ${mr}, accepted: a plugin's text is its own to size)`,
    );
}
/**
 * 校验并规范 next() 传入的参数：拷贝、采纳、还原与检查（站点规则），记录未生效部分与超长文本警告。
 */
//@ chunk-4121qate.js:75618-76168 placement
function normalizeNextArgument({ handler: handler, site: site, e: r }, n) {
  let s = requireEventArgument(n, handler.name),
    i = !Se(handler) && (site.checkArgument !== void 0 || site.restoreArgument !== void 0),
    p = i && !Object.is(s, r),
    f = new Map(),
    a = ya(s, handler.applied, site.argumentCopy),
    m = p ? copyPluginValue(s, f, a) : s,
    c = i && handler.isHop !== !0,
    u = i ? (site.adoptArgument?.(m, r, (x) => copyAdoptedValues(x, f, a)) ?? m) : m,
    l = i ? (site.restoreArgument?.(u, r, handler) ?? u) : u,
    y = i ? site.checkArgument?.(l, r) : void 0;
  if (y !== void 0) throw new HooksError(`${handler.name}: next() passed an argument with ${y}`);
  let g = c ? site.unappliedArgument?.(m, r) : void 0;
  if (g !== void 0) ga(handler, site.event, g);
  if (c) warnOversizedPluginText(handler.name, site.event, site.measureArgument?.(l, r));
  return da(l);
}
//@ chunk-4121qate.js:76168-76196 placement
var zRt = (e) => hos.indexOf(e);
/**
 * 找出越过当前层级的 next.to 目标所属插件（用于拒绝绕过）。
 */
//@ chunk-4121qate.js:76196-76332 placement
function findBypassingFloor(e, o, r) {
  let n = zRt(o);
  return e.find(
    (s) => (zRt(s.from) < n || (s.isPastPeers === !0 && s.from === o && s.plugin !== r)) && n < zRt(s.to),
  )?.plugin;
}

export {
  outsideBudget,
  TAn,
  mr,
  zRt,
  createUnappliedReporter,
  H5e,
  endDownstreamWait,
  normalizeNextArgument,
  findBypassingFloor,
  Dt,
  warnOversizedPluginText,
  checkedListLength,
};
