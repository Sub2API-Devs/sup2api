/**
 * utils/hooks/functionHookMatchers.ts
 *
 * 2.1.316 新增：函数钩子匹配器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-52dd7zdd.js (53)
 * attribution: affinity 1, placement 52
 */
import { N } from "../../components/LogSelector.js";
import { isPlainObject } from "../isPlainObject.js";
import { Pf } from "../untrustedValues.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../structuredCloneLimits.js";
import { uniq } from "../collections.js";
import {
  canonicalToolName,
  toolNameVariants,
  aliasesFor,
  legacyToolNamesFor,
} from "../permissions/permissionRuleParser.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { HooksError } from "../../plugins/functionHooks/hooksErrors.js";

//@ chunk-52dd7zdd.js:534-544 affinity
var y = N();
//@ chunk-52dd7zdd.js:544-557 placement
var pd = y.get;
//@ chunk-52dd7zdd.js:557-571 placement
var dCn = y.set;
//@ chunk-52dd7zdd.js:571-692 placement
function isPlainDataObject(o) {
  if (!isPlainObject(o)) return !1;
  let prototypeOf = Object.getPrototypeOf(o);
  return prototypeOf === null || (!Pf(prototypeOf) && Object.getPrototypeOf(prototypeOf) === null);
}
//@ chunk-52dd7zdd.js:692-932 placement
function pushFreezeFrame(o, r, t) {
  if (typeof o !== "object" || !o || r.has(o)) return t;
  if (Pf(o)) return t;
  let e = (t?.depth ?? 0) + 1;
  if (e > MAX_NESTING_DEPTH) throw RangeError(NESTING_TOO_DEEP_MESSAGE);
  r.add(o);
  let isArray = Array.isArray(o);
  return isArray || isPlainDataObject(o)
    ? { node: o, keys: isArray ? [] : Object.keys(o), at: 0, depth: e, below: t }
    : t;
}
//@ chunk-52dd7zdd.js:932-1123 placement
function deepFreeze(o, r) {
  let t = pushFreezeFrame(o, r, void 0);
  while (t !== void 0) {
    let { node: node, keys: keys, at: at } = t,
      isArray = Array.isArray(node);
    if (at < (isArray ? node : keys).length)
      ((t.at = at + 1), (t = pushFreezeFrame(isArray ? node[at] : node[keys[at] ?? ""], r, t)));
    else (Object.freeze(node), (t = t.below));
  }
}
//@ chunk-52dd7zdd.js:1123-1163 placement
function Q5e(o) {
  return (deepFreeze(o, new Set()), o);
}
//@ chunk-52dd7zdd.js:1163-1358 placement
function matchesSingleKeyFilter(o, r, t) {
  if (o === void 0) return !0;
  if (Array.isArray(o)) return o.some((n) => matchesSingleKeyFilter(n, r, t));
  if (!isPlainDataObject(o) || Object.keys(o).join() !== r) return !1;
  let e = o[r];
  return Array.isArray(e) ? e.includes(t) : e === t;
}
//@ chunk-52dd7zdd.js:1358-1368 placement
var NSi = 8;
//@ chunk-52dd7zdd.js:1368-1380 placement
var $Si = 256;
//@ chunk-52dd7zdd.js:1380-1394 placement
var npr = 65536;
//@ chunk-52dd7zdd.js:1394-1645 placement
function describeValueType(o) {
  if (o === void 0) return "undefined";
  if (typeof o === "function") return "a function";
  if (typeof o === "object" && o) {
    let replaced = Object.prototype.toString.call(o).replace(/^\[object |\]$/g, "");
    return replaced === "Object" ? "an object" : `a ${replaced}`;
  }
  return `a ${typeof o}`;
}
//@ chunk-52dd7zdd.js:1645-1766 placement
function isRegExpLike(o) {
  if (typeof o !== "object" || !o) return !1;
  try {
    return (Reflect.get(RegExp.prototype, "source", o), !0);
  } catch {
    return !1;
  }
}
//@ chunk-52dd7zdd.js:1766-1792 placement
var Z5e = (o) => isPlainDataObject(o) && !isRegExpLike(o);
//@ chunk-52dd7zdd.js:1792-1841 placement
var M = (o) => o?.paths.some((r) => r.length === 0) === !0;
//@ chunk-52dd7zdd.js:1841-1861 placement
var lCn = "__proto__";
//@ chunk-52dd7zdd.js:1861-1972 placement
function filterEntriesToNullProto(o, r) {
  let create = Object.create(null);
  for (let [e, n] of Object.entries(o)) if (e !== lCn && r(n, e)) create[e] = n;
  return create;
}
//@ chunk-52dd7zdd.js:1972-2039 placement
var XUi = (o) =>
  Object.freeze(filterEntriesToNullProto(isPlainObject(o) ? o : {}, (r) => typeof r === "string"));
//@ chunk-52dd7zdd.js:2039-2169 placement
function toolNameAliasesFor(o, r) {
  let t = uniq([r, canonicalToolName(r)].flatMap((e) => toolNameVariants(e, o)));
  return uniq(t.concat(t.flatMap((e) => aliasesFor(e, o))).flatMap((e) => [e, ...legacyToolNamesFor(e)]));
}
//@ chunk-52dd7zdd.js:2169-2300 placement
function P(o, r) {
  return o.paths.some((path) => path[0] === r)
    ? { table: o.table, paths: o.paths.filter((path) => path[0] === r).map((e) => e.slice(1)) }
    : void 0;
}
//@ chunk-52dd7zdd.js:2300-2326 placement
var freeze = Object.freeze({});
//@ chunk-52dd7zdd.js:2326-2822 placement
var freeze_2 = Object.freeze({
  "tool.call": [["tool"]],
  "tool.check": [["tool"]],
  "tool.describe": [["tool"]],
  "classic.PreToolUse": [["tool"]],
  "classic.PostToolUse": [["tool_name"]],
  "classic.PostToolUseFailure": [["tool_name"]],
  "classic.PermissionRequest": [["tool_name"]],
  "classic.PermissionDenied": [["tool_name"]],
  "classic.PostToolBatch": [["tool_calls", "tool_name"]],
  "session.append": [["origin", "tool"]],
  "session.compact": [["messages", "toolUses", "tool"]],
  "ui.render": [
    ["props", "tool"],
    ["props", "calls", "tool"],
  ],
});
//@ chunk-52dd7zdd.js:2822-2866 placement
var Eos = (o) => (Object.hasOwn(freeze_2, o) ? freeze_2[o] : void 0);
//@ chunk-52dd7zdd.js:2866-2954 placement
var I = (o, r, t) =>
  M(o) && typeof r === "string" && typeof t === "string" && toolNameAliasesFor(o.table, t).includes(r);
//@ chunk-52dd7zdd.js:2954-3183 placement
function describeMatcher(o) {
  let r = typeof o === "function";
  return isRegExpLike(o)
    ? String(o)
    : Array.isArray(o)
      ? o.map(describeMatcher).join("|")
      : Z5e(o)
        ? `{${Object.entries(o)
            .map(([t, e]) => (Z5e(e) ? `${t} has ${describeMatcher(e)}` : `${t}=${describeMatcher(e)}`))
            .join(", ")}}`
        : r
          ? "function"
          : String(o);
}
//@ chunk-52dd7zdd.js:3183-3308 placement
var regExpSourceAndFlags = (o) => ({
  source: String(Reflect.get(RegExp.prototype, "source", o)),
  flags: String(Reflect.get(RegExp.prototype, "flags", o)),
});
//@ chunk-52dd7zdd.js:3308-3370 placement
var Yeo = /^\^?(?:\((?:\?:)?)?\^?\w+\$?(?:\|\^?\w+\$?)*\)?\$?$/;
//@ chunk-52dd7zdd.js:3370-3380 placement
var W = "w";
//@ chunk-52dd7zdd.js:3380-3433 placement
var S = (o) => Array.from(o, (r) => (normalizeNameForMCP(r) === r ? W : r)).join("");
//@ chunk-52dd7zdd.js:3433-3620 placement
function isAnchoredAlternation(o) {
  let r = o.source.startsWith("^(") && o.source.endsWith(")$");
  return (
    o.flags === "" &&
    Yeo.test(S(o.source)) &&
    (r || o.source.split("|").every((t) => t.startsWith("^") && t.endsWith("$")))
  );
}
//@ chunk-52dd7zdd.js:3620-3719 placement
var K = (o, r, t) =>
  M(o.names) &&
  typeof t === "string" &&
  isAnchoredAlternation(regExpSourceAndFlags(r)) &&
  toolNameAliasesFor(o.names.table, t).some((e) => o.test(r, e));
//@ chunk-52dd7zdd.js:3719-3794 placement
function C(o, r) {
  return o.names === void 0 ? o : { test: o.test, names: P(o.names, r) };
}
/**
 * 递归匹配函数钩子的 matcher 与事件值：数组任一匹配即可；原始值相等或经工具名别名表匹配；对象 matcher 要求每个键都存在且匹配；RegExp 用给定测试函数（或名称表）匹配。
 */
//@ chunk-52dd7zdd.js:3794-4204 placement
function matchesMatcher(o, r, t) {
  if (Array.isArray(o)) return Array.prototype.some.call(o, (e) => matchesMatcher(e, r, t));
  if (Array.isArray(r)) return Array.prototype.some.call(r, (e) => matchesMatcher(o, e, t));
  if (typeof o !== "object" || o === null) return o === r || I(t.names, o, r);
  if (isPlainDataObject(o)) {
    if (typeof r !== "object" || !r) return !1;
    for (let e of Object.keys(o)) if (!Object.hasOwn(r, e) || !matchesMatcher(o[e], r[e], C(t, e))) return !1;
    return !0;
  }
  return isRegExpLike(o) && (t.test(o, String(r)) || K(t, o, r));
}
/**
 * 在匹配器与示例值之间查找永远无法匹配的嵌套对象匹配器，返回其路径和实际类型。
 */
//@ chunk-52dd7zdd.js:4204-4854 placement
function findImpossibleObjectMatcher(pattern, value, path = "") {
  let e;
  if (Array.isArray(pattern))
    return (
      Array.prototype.some.call(
        pattern,
        (n) => ((e = findImpossibleObjectMatcher(n, value, path)), e !== void 0),
      ),
      e
    );
  if (Array.isArray(value))
    return (
      Array.prototype.some.call(
        value,
        (n) => ((e = findImpossibleObjectMatcher(pattern, n, path)), e !== void 0),
      ),
      e
    );
  if (!Z5e(pattern)) return;
  if (value === null) return { path: path, kind: "null" };
  switch (typeof value) {
    case "string":
      return { path: path, kind: "string" };
    case "number":
      return { path: path, kind: "number" };
    case "boolean":
      return { path: path, kind: "boolean" };
    case "bigint":
      return { path: path, kind: "bigint" };
    case "object":
      break;
    case "undefined":
    case "symbol":
    case "function":
      return;
  }
  for (let n of Object.keys(pattern)) {
    if (!Object.hasOwn(value, n)) continue;
    if (
      ((e = findImpossibleObjectMatcher(pattern[n], value[n], path === "" ? n : `${path}.${n}`)),
      e !== void 0)
    )
      return e;
  }
  return;
}
/**
 * 生成嵌套对象匹配器永远无法匹配时的错误说明。
 */
//@ chunk-52dd7zdd.js:4854-5233 placement
function impossibleMatcherMessage(o, r, t) {
  let e = t.path.split(".").at(-1) ?? t.path;
  return `hooks module ${o}: on('${r}') matcher at ${t.path} is a nested object, but e.${t.path} is a ${t.kind} there, which an object matcher can never match (a matcher has no operator keys); the hook will not run for it. A ${t.kind} is matched by the literal value or, as a string, by a RegExp, e.g. { ${e}: /^prefix/ }`;
}
//@ chunk-52dd7zdd.js:5233-5244 placement
var kos = 32;
//@ chunk-52dd7zdd.js:5244-5260 placement
var u = "$$regex";
/**
 * 把序列化的匹配器还原为运行时值（数组递归、正则对象还原为 RegExp）。
 */
//@ chunk-52dd7zdd.js:5260-5654 placement
function reviveMatcher(o, r, t) {
  if (Array.isArray(o)) return Array.prototype.map.call(o, (e, n) => reviveMatcher(e, r, `${t}[${n}]`));
  if (Z5e(o)) {
    let e = t === "" ? "" : ` at ${t}`,
      n = o[u];
    if (typeof n === "string" && typeof o.flags === "string" && Object.keys(o).length === 2)
      return (assertSafeRegExp({ source: n, flags: o.flags, where: r, at: e }), new RegExp(n, o.flags));
    assertNoReservedMatcherKey(o, r, e);
    let a = {};
    for (let [T, G] of Object.entries(o)) a[T] = reviveMatcher(G, r, t === "" ? T : `${t}.${T}`);
    return a;
  }
  return o;
}
//@ chunk-52dd7zdd.js:5654-5864 placement
function serializeMatcher(o) {
  if (isRegExpLike(o)) {
    let { source: source, flags: flags } = regExpSourceAndFlags(o);
    return { [u]: source, flags: flags };
  }
  if (Array.isArray(o)) return Array.prototype.map.call(o, serializeMatcher);
  if (Z5e(o)) {
    let r = {};
    for (let [t, e] of Object.entries(o)) r[t] = serializeMatcher(e);
    return r;
  }
  return o;
}
//@ chunk-52dd7zdd.js:5864-5937 placement
var Tos = (o) =>
  o.map(({ matcher: matcher, ...t }) =>
    matcher === void 0 ? t : { ...t, matcher: serializeMatcher(matcher) },
  );
//@ chunk-52dd7zdd.js:5937-5983 placement
var F = (o) => /\([^()]*[+*?}]\)\s*[+*{]/.test(o);
//@ chunk-52dd7zdd.js:5983-6041 placement
var g = (o) => (o.includes("g") ? "g" : o.includes("y") ? "y" : void 0);
/**
 * 拒绝不安全的正则匹配器：带状态的 g/y 标志或可能灾难性回溯的模式。
 */
//@ chunk-52dd7zdd.js:6041-6341 placement
function assertSafeRegExp({ source: source, flags: flags, where: where, at: at }) {
  let n = g(flags);
  if (n)
    throw new HooksError(
      `${where}: matcher${at} is a RegExp with the ${n} flag, which keeps state between tests; drop it`,
    );
  if (F(source))
    throw new HooksError(
      `${where}: matcher${at} is a RegExp with a nested quantifier (${source}), which can backtrack without bound; rewrite it`,
    );
}
//@ chunk-52dd7zdd.js:6341-6467 placement
function assertNoReservedMatcherKey(o, r, t) {
  if (Object.hasOwn(o, lCn))
    throw new HooksError(`${r}: matcher${t} has the key ${lCn}, which a matcher does not keep`);
}
/**
 * 校验 hooks 模块 on() 的 matcher：RegExp 不能带有状态标志或嵌套量词，对象不能用保留键，字符串长度、类型等受限，非法时抛 HooksError。
 */
//@ chunk-52dd7zdd.js:6467-7323 placement
function validateMatcherValue(value, where, path) {
  let e = path === "" ? "" : ` at ${path}`;
  if (isRegExpLike(value)) {
    assertSafeRegExp({ ...regExpSourceAndFlags(value), where: where, at: e });
    return;
  }
  if (Array.isArray(value)) {
    Array.prototype.forEach.call(value, (n, s) => validateMatcherValue(n, where, `${path}[${s}]`));
    return;
  }
  if (Z5e(value)) {
    if (Object.hasOwn(value, u))
      throw new HooksError(
        `${where}: matcher${e} uses the reserved key ${u} (how a RegExp crosses the worker boundary); a RegExp goes in as a RegExp`,
      );
    assertNoReservedMatcherKey(value, where, e);
    for (let [n, s] of Object.entries(value))
      validateMatcherValue(s, where, path === "" ? n : `${path}.${n}`);
    return;
  }
  switch (typeof value) {
    case "string":
      if (value.length > npr)
        throw new HooksError(
          `${where}: matcher${e} is a string longer than ${npr} characters, which cannot match`,
        );
      return;
    case "number":
    case "boolean":
      return;
    case "object":
      if (!value) return;
      break;
    case "bigint":
    case "symbol":
    case "undefined":
    case "function":
      break;
  }
  throw new HooksError(
    `${where}: matcher${path === "" ? "" : ` at ${path}`} must be a string, a number, a boolean, null, a RegExp, an array of those, or a nested object; got ${describeValueType(value)}`,
  );
}
//@ chunk-52dd7zdd.js:7323-7574 placement
function testRegExpMatcher(o, r) {
  if (r.length > npr)
    return (
      pd().log(
        `matcher: a value of ${r.length} characters is past the ${npr} a RegExp matcher reads; it matches, so the hook decides`,
      ),
      !0
    );
  if (g(regExpSourceAndFlags(o).flags)) o.lastIndex = 0;
  return RegExp.prototype.exec.call(o, r) !== null;
}
//@ chunk-52dd7zdd.js:7574-7687 placement
function validateObjectMatcher(o, r) {
  if (!Z5e(o)) throw new HooksError(`${r}: the matcher must be a plain object (a partial of e)`);
  validateMatcherValue(o, r, "");
}
//@ chunk-52dd7zdd.js:7687-7722 placement
var ZUi = (o, r = "matcher") => reviveMatcher(o, r, "");
//@ chunk-52dd7zdd.js:7722-7767 placement
var gxt = (o, r, t) => matchesMatcher(o, r, { test: testRegExpMatcher, names: t });
//@ chunk-52dd7zdd.js:7767-7815 placement
var rpr = (o, r, t) => matchesMatcher(o, r, { test: () => !0, names: t });
//@ chunk-52dd7zdd.js:7815-7930 placement
var fieldMatches = (o, r, t) =>
  Array.isArray(o)
    ? o.some((e) => fieldMatches(e, r, t))
    : !isPlainDataObject(o) || !Object.hasOwn(o, r.field) || rpr(o[r.field], r.value, t);
//@ chunk-52dd7zdd.js:7930-8014 placement
var opr = (o, r, t) =>
  Object.entries(r).every(([e, n]) => fieldMatches(o, { field: e, value: n }, t && P(t, e)));
//@ chunk-52dd7zdd.js:8014-8054 placement
var hxt = (o, r, t) => fieldMatches(o, { field: r, value: t });

export {
  filterEntriesToNullProto,
  matchesSingleKeyFilter,
  pd,
  dCn,
  deepFreeze,
  isPlainDataObject,
  Q5e,
  Z5e,
  hxt,
  gxt,
  NSi,
  $Si,
  kos,
  findImpossibleObjectMatcher,
  impossibleMatcherMessage,
  validateObjectMatcher,
  npr,
  testRegExpMatcher,
  matchesMatcher,
  Yeo,
  opr,
  lCn,
  describeMatcher,
  ZUi,
  Tos,
  rpr,
  XUi,
  Eos,
  freeze,
};
