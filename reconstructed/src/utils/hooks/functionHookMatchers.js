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
import { createLogSinkRef } from "../../components/LogSelector.js";
import { isPlainObject } from "../isPlainObject.js";
import { isUntrustedObject } from "../untrustedValues.js";
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
var matcherLoggerHolder = createLogSinkRef();
//@ chunk-52dd7zdd.js:544-557 placement
/**
 * 取匹配器日志器实例。
 */
var matcherLog = matcherLoggerHolder.get;
//@ chunk-52dd7zdd.js:557-571 placement
/**
 * 设置匹配器日志器。
 */
var setMatcherLog = matcherLoggerHolder.set;
//@ chunk-52dd7zdd.js:571-692 placement
function isPlainDataObject(o) {
  if (!isPlainObject(o)) return false;
  let prototypeOf = Object.getPrototypeOf(o);
  return (
    prototypeOf === null || (!isUntrustedObject(prototypeOf) && Object.getPrototypeOf(prototypeOf) === null)
  );
}
//@ chunk-52dd7zdd.js:692-932 placement
function pushFreezeFrame(o, r, t) {
  if (typeof o !== "object" || !o || r.has(o)) return t;
  if (isUntrustedObject(o)) return t;
  let e = (t?.depth ?? 0) + 1;
  if (e > MAX_NESTING_DEPTH) throw RangeError(NESTING_TOO_DEEP_MESSAGE);
  r.add(o);
  let n = Array.isArray(o);
  return n || isPlainDataObject(o)
    ? {
        node: o,
        keys: n ? [] : Object.keys(o),
        at: 0,
        depth: e,
        below: t,
      }
    : t;
}
//@ chunk-52dd7zdd.js:932-1123 placement
function deepFreeze(o, r) {
  let t = pushFreezeFrame(o, r, undefined);
  while (t !== undefined) {
    let { node, keys, at } = t;
    let a = Array.isArray(node);
    if (at < (a ? node : keys).length) {
      t.at = at + 1;
      t = pushFreezeFrame(a ? node[at] : node[keys[at] ?? ""], r, t);
    } else {
      Object.freeze(node);
      t = t.below;
    }
  }
}
//@ chunk-52dd7zdd.js:1123-1163 placement
/**
 * 原地深冻结对象（带已访问集合防循环）。
 */
function deepFreezeInPlace(o) {
  deepFreeze(o, new Set());
  return o;
}
//@ chunk-52dd7zdd.js:1163-1358 placement
function matchesSingleKeyFilter(o, r, t) {
  if (o === undefined) return true;
  if (Array.isArray(o)) return o.some((n) => matchesSingleKeyFilter(n, r, t));
  if (!isPlainDataObject(o) || Object.keys(o).join() !== r) return false;
  let e = o[r];
  return Array.isArray(e) ? e.includes(t) : e === t;
}
//@ chunk-52dd7zdd.js:1358-1368 placement
/**
 * 匹配器嵌套深度上限。
 */
var MAX_MATCHER_DEPTH = 8;
//@ chunk-52dd7zdd.js:1368-1380 placement
/**
 * 匹配器键数上限。
 */
var MAX_MATCHER_KEYS = 256;
//@ chunk-52dd7zdd.js:1380-1394 placement
/**
 * 匹配器字符串长度上限。
 */
var MAX_MATCHER_CHARS = 65536;
//@ chunk-52dd7zdd.js:1394-1645 placement
function describeValueType(o) {
  if (o === undefined) return "undefined";
  if (typeof o === "function") return "a function";
  if (typeof o === "object" && o) {
    let replaced = Object.prototype.toString.call(o).replace(/^\[object |\]$/g, "");
    return replaced === "Object" ? "an object" : `a ${replaced}`;
  }
  return `a ${typeof o}`;
}
//@ chunk-52dd7zdd.js:1645-1766 placement
function isRegExpLike(o) {
  if (typeof o !== "object" || !o) return false;
  try {
    Reflect.get(RegExp.prototype, "source", o);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-52dd7zdd.js:1766-1792 placement
/**
 * 判断是否为可当作 matcher 的普通对象（非正则）。
 */
var isPlainMatcherObject = (o) => isPlainDataObject(o) && !isRegExpLike(o);
//@ chunk-52dd7zdd.js:1792-1841 placement
var hasEmptyPathEntry = (o) => o?.paths.some((path) => path.length === 0) === true;
//@ chunk-52dd7zdd.js:1841-1861 placement
/**
 * 匹配器对象中禁止保留的键 "__proto__"。
 */
var PROTO_KEY = "__proto__";
//@ chunk-52dd7zdd.js:1861-1972 placement
function filterEntriesToNullProto(o, r) {
  let t = Object.create(null);
  for (let [key, value] of Object.entries(o)) if (key !== PROTO_KEY && r(value, key)) t[key] = value;
  return t;
}
//@ chunk-52dd7zdd.js:1972-2039 placement
/**
 * 冻结只保留字符串值的条目（用无原型对象）。
 */
var freezeStringEntries = (o) =>
  Object.freeze(filterEntriesToNullProto(isPlainObject(o) ? o : {}, (r) => typeof r === "string"));
//@ chunk-52dd7zdd.js:2039-2169 placement
function toolNameAliasesFor(table, r) {
  let t = uniq([r, canonicalToolName(r)].flatMap((e) => toolNameVariants(e, table)));
  return uniq(t.concat(t.flatMap((e) => aliasesFor(e, table))).flatMap((e) => [e, ...legacyToolNamesFor(e)]));
}
//@ chunk-52dd7zdd.js:2169-2300 placement
function filterNameTableByTool(o, r) {
  return o.paths.some((path) => path[0] === r)
    ? {
        table: o.table,
        paths: o.paths.filter((path) => path[0] === r).map((path) => path.slice(1)),
      }
    : undefined;
}
//@ chunk-52dd7zdd.js:2300-2326 placement
var JUi = Object.freeze({});
//@ chunk-52dd7zdd.js:2326-2822 placement
var b = Object.freeze({
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
/**
 * 从冻结的工具别名表中取值。
 */
var frozenToolTableEntry = (o) => (Object.hasOwn(b, o) ? b[o] : undefined);
//@ chunk-52dd7zdd.js:2866-2954 placement
var matchesToolAlias = (names, r, t) =>
  hasEmptyPathEntry(names) &&
  typeof r === "string" &&
  typeof t === "string" &&
  toolNameAliasesFor(names.table, t).includes(r);
//@ chunk-52dd7zdd.js:2954-3183 placement
function describeMatcher(o) {
  let r = typeof o === "function";
  return isRegExpLike(o)
    ? String(o)
    : Array.isArray(o)
      ? o.map(describeMatcher).join("|")
      : isPlainMatcherObject(o)
        ? `{${Object.entries(o)
            .map(([key, value]) =>
              isPlainMatcherObject(value)
                ? `${key} has ${describeMatcher(value)}`
                : `${key}=${describeMatcher(value)}`,
            )
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
/**
 * 锚定交替形式（^a$|^b$）的正则，用于识别可安全比对的 matcher。
 */
var ANCHORED_ALTERNATION_RE = /^\^?(?:\((?:\?:)?)?\^?\w+\$?(?:\|\^?\w+\$?)*\)?\$?$/;
//@ chunk-52dd7zdd.js:3370-3380 placement
var NORMALIZED_NAME_MARK = "w";
//@ chunk-52dd7zdd.js:3380-3433 placement
var normalizeMCPNameChars = (source) =>
  Array.from(source, (r) => (normalizeNameForMCP(r) === r ? NORMALIZED_NAME_MARK : r)).join("");
//@ chunk-52dd7zdd.js:3433-3620 placement
function isAnchoredAlternation(o) {
  let r = o.source.startsWith("^(") && o.source.endsWith(")$");
  return (
    o.flags === "" &&
    ANCHORED_ALTERNATION_RE.test(normalizeMCPNameChars(o.source)) &&
    (r || o.source.split("|").every((t) => t.startsWith("^") && t.endsWith("$")))
  );
}
//@ chunk-52dd7zdd.js:3620-3719 placement
var matchesAliasAlternation = (o, r, t) =>
  hasEmptyPathEntry(o.names) &&
  typeof t === "string" &&
  isAnchoredAlternation(regExpSourceAndFlags(r)) &&
  toolNameAliasesFor(o.names.table, t).some((e) => o.test(r, e));
//@ chunk-52dd7zdd.js:3719-3794 placement
function narrowNameTable(o, r) {
  return o.names === undefined
    ? o
    : {
        test: o.test,
        names: filterNameTableByTool(o.names, r),
      };
}
//@ chunk-52dd7zdd.js:3794-4204 placement
/**
 * 递归匹配函数钩子的 matcher 与事件值：数组任一匹配即可；原始值相等或经工具名别名表匹配；对象 matcher 要求每个键都存在且匹配；RegExp 用给定测试函数（或名称表）匹配。
 */
function matchesMatcher(o, r, t) {
  if (Array.isArray(o)) return Array.prototype.some.call(o, (e) => matchesMatcher(e, r, t));
  if (Array.isArray(r)) return Array.prototype.some.call(r, (e) => matchesMatcher(o, e, t));
  if (typeof o !== "object" || o === null) return o === r || matchesToolAlias(t.names, o, r);
  if (isPlainDataObject(o)) {
    if (typeof r !== "object" || !r) return false;
    for (let key of Object.keys(o))
      if (!Object.hasOwn(r, key) || !matchesMatcher(o[key], r[key], narrowNameTable(t, key))) return false;
    return true;
  }
  return isRegExpLike(o) && (t.test(o, String(r)) || matchesAliasAlternation(t, o, r));
}
//@ chunk-52dd7zdd.js:4204-4854 placement
/**
 * 在匹配器与示例值之间查找永远无法匹配的嵌套对象匹配器，返回其路径和实际类型。
 */
function findImpossibleObjectMatcher(pattern, value, path = "") {
  let e;
  if (Array.isArray(pattern)) {
    Array.prototype.some.call(pattern, (n) => {
      e = findImpossibleObjectMatcher(n, value, path);
      return e !== undefined;
    });
    return e;
  }
  if (Array.isArray(value)) {
    Array.prototype.some.call(value, (n) => {
      e = findImpossibleObjectMatcher(pattern, n, path);
      return e !== undefined;
    });
    return e;
  }
  if (!isPlainMatcherObject(pattern)) return;
  if (value === null)
    return {
      path,
      kind: "null",
    };
  switch (typeof value) {
    case "string":
      return {
        path,
        kind: "string",
      };
    case "number":
      return {
        path,
        kind: "number",
      };
    case "boolean":
      return {
        path,
        kind: "boolean",
      };
    case "bigint":
      return {
        path,
        kind: "bigint",
      };
    case "object":
      break;
    case "undefined":
    case "symbol":
    case "function":
      return;
  }
  for (let key of Object.keys(pattern)) {
    if (!Object.hasOwn(value, key)) continue;
    e = findImpossibleObjectMatcher(pattern[key], value[key], path === "" ? key : `${path}.${key}`);
    if (e !== undefined) return e;
  }
  return;
}
//@ chunk-52dd7zdd.js:4854-5233 placement
/**
 * 生成嵌套对象匹配器永远无法匹配时的错误说明。
 */
function impossibleMatcherMessage(o, r, t) {
  let e = t.path.split(".").at(-1) ?? t.path;
  return `hooks module ${o}: on('${r}') matcher at ${t.path} is a nested object, but e.${t.path} is a ${t.kind} there, which an object matcher can never match (a matcher has no operator keys); the hook will not run for it. A ${t.kind} is matched by the literal value or, as a string, by a RegExp, e.g. { ${e}: /^prefix/ }`;
}
//@ chunk-52dd7zdd.js:5233-5244 placement
/**
 * 序列化 matcher 时的字符预算。
 */
var MAX_SERIALIZED_MATCHER_CHARS = 32;
//@ chunk-52dd7zdd.js:5244-5260 placement
var REGEX_MARKER_KEY = "$$regex";
//@ chunk-52dd7zdd.js:5260-5654 placement
/**
 * 把序列化的匹配器还原为运行时值（数组递归、正则对象还原为 RegExp）。
 */
function reviveMatcher(o, r, t) {
  if (Array.isArray(o)) return Array.prototype.map.call(o, (e, n) => reviveMatcher(e, r, `${t}[${n}]`));
  if (isPlainMatcherObject(o)) {
    let e = t === "" ? "" : ` at ${t}`;
    let n = o[REGEX_MARKER_KEY];
    if (typeof n === "string" && typeof o.flags === "string" && Object.keys(o).length === 2) {
      assertSafeRegExp({
        source: n,
        flags: o.flags,
        where: r,
        at: e,
      });
      return new RegExp(n, o.flags);
    }
    assertNoReservedMatcherKey(o, r, e);
    let a = {};
    for (let [key, value] of Object.entries(o))
      a[key] = reviveMatcher(value, r, t === "" ? key : `${t}.${key}`);
    return a;
  }
  return o;
}
//@ chunk-52dd7zdd.js:5654-5864 placement
function serializeMatcher(o) {
  if (isRegExpLike(o)) {
    let { source, flags } = regExpSourceAndFlags(o);
    return {
      [REGEX_MARKER_KEY]: source,
      flags,
    };
  }
  if (Array.isArray(o)) return Array.prototype.map.call(o, serializeMatcher);
  if (isPlainMatcherObject(o)) {
    let r = {};
    for (let [key, value] of Object.entries(o)) r[key] = serializeMatcher(value);
    return r;
  }
  return o;
}
//@ chunk-52dd7zdd.js:5864-5937 placement
/**
 * 把 matcher 列表序列化（正则可序列化形式）。
 */
var serializeMatcherList = (registered) =>
  registered.map(({ matcher, ...t }) =>
    matcher === undefined
      ? t
      : {
          ...t,
          matcher: serializeMatcher(matcher),
        },
  );
//@ chunk-52dd7zdd.js:5937-5983 placement
var CATASTROPHIC_REPEAT_RE = (source) => /\([^()]*[+*?}]\)\s*[+*{]/.test(source);
//@ chunk-52dd7zdd.js:5983-6041 placement
var unsafeRegExpFlag = (flags) => (flags.includes("g") ? "g" : flags.includes("y") ? "y" : undefined);
//@ chunk-52dd7zdd.js:6041-6341 placement
/**
 * 拒绝不安全的正则匹配器：带状态的 g/y 标志或可能灾难性回溯的模式。
 */
function assertSafeRegExp({ source, flags, where, at }) {
  let n = unsafeRegExpFlag(flags);
  if (n)
    throw new HooksError(
      `${where}: matcher${at} is a RegExp with the ${n} flag, which keeps state between tests; drop it`,
    );
  if (CATASTROPHIC_REPEAT_RE(source))
    throw new HooksError(
      `${where}: matcher${at} is a RegExp with a nested quantifier (${source}), which can backtrack without bound; rewrite it`,
    );
}
//@ chunk-52dd7zdd.js:6341-6467 placement
function assertNoReservedMatcherKey(o, r, t) {
  if (Object.hasOwn(o, PROTO_KEY))
    throw new HooksError(`${r}: matcher${t} has the key ${PROTO_KEY}, which a matcher does not keep`);
}
//@ chunk-52dd7zdd.js:6467-7323 placement
/**
 * 校验 hooks 模块 on() 的 matcher：RegExp 不能带有状态标志或嵌套量词，对象不能用保留键，字符串长度、类型等受限，非法时抛 HooksError。
 */
function validateMatcherValue(value, where, path) {
  let e = path === "" ? "" : ` at ${path}`;
  if (isRegExpLike(value)) {
    assertSafeRegExp({
      ...regExpSourceAndFlags(value),
      where,
      at: e,
    });
    return;
  }
  if (Array.isArray(value)) {
    Array.prototype.forEach.call(value, (n, s) => validateMatcherValue(n, where, `${path}[${s}]`));
    return;
  }
  if (isPlainMatcherObject(value)) {
    if (Object.hasOwn(value, REGEX_MARKER_KEY))
      throw new HooksError(
        `${where}: matcher${e} uses the reserved key ${REGEX_MARKER_KEY} (how a RegExp crosses the worker boundary); a RegExp goes in as a RegExp`,
      );
    assertNoReservedMatcherKey(value, where, e);
    for (let [key, value_2] of Object.entries(value))
      validateMatcherValue(value_2, where, path === "" ? key : `${path}.${key}`);
    return;
  }
  switch (typeof value) {
    case "string":
      if (value.length > MAX_MATCHER_CHARS)
        throw new HooksError(
          `${where}: matcher${e} is a string longer than ${MAX_MATCHER_CHARS} characters, which cannot match`,
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
  if (r.length > MAX_MATCHER_CHARS) {
    matcherLog().log(
      `matcher: a value of ${r.length} characters is past the ${MAX_MATCHER_CHARS} a RegExp matcher reads; it matches, so the hook decides`,
    );
    return true;
  }
  if (unsafeRegExpFlag(regExpSourceAndFlags(o).flags)) o.lastIndex = 0;
  return RegExp.prototype.exec.call(o, r) !== null;
}
//@ chunk-52dd7zdd.js:7574-7687 placement
function validateObjectMatcher(o, where) {
  if (!isPlainMatcherObject(o))
    throw new HooksError(`${where}: the matcher must be a plain object (a partial of e)`);
  validateMatcherValue(o, where, "");
}
//@ chunk-52dd7zdd.js:7687-7722 placement
/**
 * 反序列化 matcher 的默认入口（键名 "matcher"）。
 */
var reviveMatcherDefault = (matcher, r = "matcher") => reviveMatcher(matcher, r, "");
//@ chunk-52dd7zdd.js:7722-7767 placement
/**
 * 用正则语义判定 matcher 是否匹配（含工具别名表）。
 */
var matchesRegExpMatcher = (matcher, r, names) =>
  matchesMatcher(matcher, r, {
    test: testRegExpMatcher,
    names,
  });
//@ chunk-52dd7zdd.js:7767-7815 placement
/**
 * 用恒真测试判定字面 matcher 是否匹配（含工具别名表）。
 */
var matchesLiteralMatcher = (o, r, names) =>
  matchesMatcher(o, r, {
    test: () => true,
    names,
  });
//@ chunk-52dd7zdd.js:7815-7930 placement
var fieldMatches = (o, r, names) =>
  Array.isArray(o)
    ? o.some((e) => fieldMatches(e, r, names))
    : !isPlainDataObject(o) ||
      !Object.hasOwn(o, r.field) ||
      matchesLiteralMatcher(o[r.field], r.value, names);
//@ chunk-52dd7zdd.js:7930-8014 placement
/**
 * 判断对象字段是否全部匹配给定键值。
 */
var matchesFields = (o, r, pathTable) =>
  Object.entries(r).every(([key, value]) =>
    fieldMatches(
      o,
      {
        field: key,
        value,
      },
      pathTable && filterNameTableByTool(pathTable, key),
    ),
  );
//@ chunk-52dd7zdd.js:8014-8054 placement
/**
 * 判断单个字段是否匹配给定值。
 */
var matchesField = (o, field, value) =>
  fieldMatches(o, {
    field,
    value,
  });
export {
  filterEntriesToNullProto,
  matchesSingleKeyFilter,
  matcherLog,
  setMatcherLog,
  deepFreeze,
  isPlainDataObject,
  deepFreezeInPlace,
  isPlainMatcherObject,
  matchesField,
  matchesRegExpMatcher,
  MAX_MATCHER_DEPTH,
  MAX_MATCHER_KEYS,
  MAX_SERIALIZED_MATCHER_CHARS,
  findImpossibleObjectMatcher,
  impossibleMatcherMessage,
  validateObjectMatcher,
  MAX_MATCHER_CHARS,
  testRegExpMatcher,
  matchesMatcher,
  ANCHORED_ALTERNATION_RE,
  matchesFields,
  PROTO_KEY,
  describeMatcher,
  reviveMatcherDefault,
  serializeMatcherList,
  matchesLiteralMatcher,
  freezeStringEntries,
  frozenToolTableEntry,
  JUi,
};
