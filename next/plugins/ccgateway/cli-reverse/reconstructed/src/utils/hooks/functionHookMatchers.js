/**
 * utils/hooks/functionHookMatchers.ts
 *
 * 2.1.316 新增：函数钩子匹配器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4j4pn0rx.js (53)
 * attribution: affinity 1, placement 51, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createLogSinkRef } from "../../components/LogSelector.js";
import { isPlainObject } from "../isPlainObject.js";
import { isUntrustedObject } from "../untrustedValues.js";
import { MAX_NESTING_DEPTH, NESTING_TOO_DEEP_MESSAGE } from "../structuredCloneLimits.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import {
  canonicalToolName,
  toolNameVariants,
  aliasesFor,
  legacyToolNamesFor,
} from "../permissions/permissionRuleParser.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { HooksError } from "../../plugins/functionHooks/hooksErrors.js";
import { deferInit, runDeferredInits } from "../../../runtime/deferred-init.js";

//@ chunk-4j4pn0rx.js:534-544 affinity
var matcherLoggerHolder; // deferred: uses createLogSinkRef (../../components/LogSelector.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4j4pn0rx.js:534", () => {
  matcherLoggerHolder = createLogSinkRef();
});
//@ chunk-4j4pn0rx.js:544-557 placement
/**
 * 取匹配器日志器实例。
 */
var matcherLog; // deferred: uses matcherLoggerHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4j4pn0rx.js:544", () => {
  matcherLog = matcherLoggerHolder.get;
});
//@ chunk-4j4pn0rx.js:557-571 placement
/**
 * 设置匹配器日志器。
 */
var setMatcherLog; // deferred: uses matcherLoggerHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4j4pn0rx.js:557", () => {
  setMatcherLog = matcherLoggerHolder.set;
});
//@ chunk-4j4pn0rx.js:571-692 placement
function isPlainDataObject(value) {
  if (!isPlainObject(value)) return false;
  let prototypeOf = Object.getPrototypeOf(value);
  return (
    prototypeOf === null || (!isUntrustedObject(prototypeOf) && Object.getPrototypeOf(prototypeOf) === null)
  );
}
//@ chunk-4j4pn0rx.js:692-932 placement
function pushFreezeFrame(value, seen, parent) {
  if (typeof value !== "object" || !value || seen.has(value)) return parent;
  if (isUntrustedObject(value)) return parent;
  let depth = (parent?.depth ?? 0) + 1;
  if (depth > MAX_NESTING_DEPTH) throw RangeError(NESTING_TOO_DEEP_MESSAGE);
  seen.add(value);
  let isArray = Array.isArray(value);
  return isArray || isPlainDataObject(value)
    ? {
        node: value,
        keys: isArray ? [] : Object.keys(value),
        at: 0,
        depth,
        below: parent,
      }
    : parent;
}
//@ chunk-4j4pn0rx.js:932-1123 placement
function deepFreeze(value, seen) {
  let frame = pushFreezeFrame(value, seen, undefined);
  while (frame !== undefined) {
    let { node, keys, at } = frame;
    let isArray = Array.isArray(node);
    if (at < (isArray ? node : keys).length) {
      frame.at = at + 1;
      frame = pushFreezeFrame(isArray ? node[at] : node[keys[at] ?? ""], seen, frame);
    } else {
      Object.freeze(node);
      frame = frame.below;
    }
  }
}
//@ chunk-4j4pn0rx.js:1123-1163 placement
/**
 * 原地深冻结对象（带已访问集合防循环）。
 */
function deepFreezeInPlace(value) {
  deepFreeze(value, new Set());
  return value;
}
//@ chunk-4j4pn0rx.js:1163-1358 placement
function matchesSingleKeyFilter(matcher, key, wanted) {
  if (matcher === undefined) return true;
  if (Array.isArray(matcher)) return matcher.some((branch) => matchesSingleKeyFilter(branch, key, wanted));
  if (!isPlainDataObject(matcher) || Object.keys(matcher).join() !== key) return false;
  let expected = matcher[key];
  return Array.isArray(expected) ? expected.includes(wanted) : expected === wanted;
}
//@ chunk-4j4pn0rx.js:1358-1368 placement
/**
 * 匹配器嵌套深度上限。
 */
var MAX_MATCHER_DEPTH = 8;
//@ chunk-4j4pn0rx.js:1368-1380 placement
/**
 * 匹配器键数上限。
 */
var MAX_MATCHER_KEYS = 256;
//@ chunk-4j4pn0rx.js:1380-1394 placement
/**
 * 匹配器字符串长度上限。
 */
var MAX_MATCHER_CHARS = 65536;
//@ chunk-4j4pn0rx.js:1394-1645 placement
function describeValueType(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "function") return "a function";
  if (typeof value === "object" && value) {
    let replaced = Object.prototype.toString.call(value).replace(/^\[object |\]$/g, "");
    return replaced === "Object" ? "an object" : `a ${replaced}`;
  }
  return `a ${typeof value}`;
}
//@ chunk-4j4pn0rx.js:1645-1766 placement
function isRegExpLike(value) {
  if (typeof value !== "object" || !value) return false;
  try {
    Reflect.get(RegExp.prototype, "source", value);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-4j4pn0rx.js:1766-1792 placement
/**
 * 判断是否为可当作 matcher 的普通对象（非正则）。
 */
var isPlainMatcherObject = (value) => isPlainDataObject(value) && !isRegExpLike(value);
//@ chunk-4j4pn0rx.js:1792-1841 placement
var hasEmptyPathEntry = (names) => names?.paths.some((path) => path.length === 0) === true;
//@ chunk-4j4pn0rx.js:1841-1861 placement
/**
 * 匹配器对象中禁止保留的键 "__proto__"。
 */
var PROTO_KEY = "__proto__";
//@ chunk-4j4pn0rx.js:1861-1972 placement
function filterEntriesToNullProto(source, keep) {
  let target = Object.create(null);
  for (let [key, value] of Object.entries(source))
    if (key !== PROTO_KEY && keep(value, key)) target[key] = value;
  return target;
}
//@ chunk-4j4pn0rx.js:1972-2039 placement
/**
 * 冻结只保留字符串值的条目（用无原型对象）。
 */
var freezeStringEntries = (table) =>
  Object.freeze(
    filterEntriesToNullProto(isPlainObject(table) ? table : {}, (value) => typeof value === "string"),
  );
//@ chunk-4j4pn0rx.js:2039-2169 placement
function toolNameAliasesFor(table, name) {
  let names = normalizeCaseForComparison_2(
    [name, canonicalToolName(name)].flatMap((name) => toolNameVariants(name, table)),
  );
  return normalizeCaseForComparison_2(
    names
      .concat(names.flatMap((name) => aliasesFor(name, table)))
      .flatMap((alias) => [alias, ...legacyToolNamesFor(alias)]),
  );
}
//@ chunk-4j4pn0rx.js:2169-2300 placement
function filterNameTableByTool(names, toolName) {
  return names.paths.some((path) => path[0] === toolName)
    ? {
        table: names.table,
        paths: names.paths.filter((path) => path[0] === toolName).map((path) => path.slice(1)),
      }
    : undefined;
}
//@ chunk-4j4pn0rx.js:2300-2326 placement
var EMPTY_MATCHER_TABLE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4j4pn0rx.js:2300", () => {
  EMPTY_MATCHER_TABLE = Object.freeze({});
});
//@ chunk-4j4pn0rx.js:2326-2822 placement
var DEFAULT_MATCHER_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4j4pn0rx.js:2326", () => {
  DEFAULT_MATCHER_FIELDS = Object.freeze({
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
});
//@ chunk-4j4pn0rx.js:2822-2866 placement
/**
 * 从冻结的工具别名表中取值。
 */
var frozenToolTableEntry = (toolName) =>
  Object.hasOwn(DEFAULT_MATCHER_FIELDS, toolName) ? DEFAULT_MATCHER_FIELDS[toolName] : undefined;
//@ chunk-4j4pn0rx.js:2866-2954 placement
var matchesToolAlias = (names, value, name) =>
  hasEmptyPathEntry(names) &&
  typeof value === "string" &&
  typeof name === "string" &&
  toolNameAliasesFor(names.table, name).includes(value);
//@ chunk-4j4pn0rx.js:2954-3183 placement
function describeMatcher(matcher) {
  let isFunction = typeof matcher === "function";
  return isRegExpLike(matcher)
    ? String(matcher)
    : Array.isArray(matcher)
      ? matcher.map(describeMatcher).join("|")
      : isPlainMatcherObject(matcher)
        ? `{${Object.entries(matcher)
            .map(([key, value]) =>
              isPlainMatcherObject(value)
                ? `${key} has ${describeMatcher(value)}`
                : `${key}=${describeMatcher(value)}`,
            )
            .join(", ")}}`
        : isFunction
          ? "function"
          : String(matcher);
}
//@ chunk-4j4pn0rx.js:3183-3308 placement
var regExpSourceAndFlags = (regexp) => ({
  source: String(Reflect.get(RegExp.prototype, "source", regexp)),
  flags: String(Reflect.get(RegExp.prototype, "flags", regexp)),
});
//@ chunk-4j4pn0rx.js:3308-3370 placement
/**
 * 锚定交替形式（^a$|^b$）的正则，用于识别可安全比对的 matcher。
 */
var ANCHORED_ALTERNATION_RE = /^\^?(?:\((?:\?:)?)?\^?\w+\$?(?:\|\^?\w+\$?)*\)?\$?$/;
//@ chunk-4j4pn0rx.js:3370-3380 placement
var NORMALIZED_NAME_MARK = "w";
//@ chunk-4j4pn0rx.js:3380-3433 placement
var normalizeMCPNameChars = (source) =>
  Array.from(source, (char) => (CLAUDEAI_SERVER_PREFIX(char) === char ? NORMALIZED_NAME_MARK : char)).join(
    "",
  );
//@ chunk-4j4pn0rx.js:3433-3620 placement
function isAnchoredAlternation(regexp) {
  let isWrapped = regexp.source.startsWith("^(") && regexp.source.endsWith(")$");
  return (
    regexp.flags === "" &&
    ANCHORED_ALTERNATION_RE.test(normalizeMCPNameChars(regexp.source)) &&
    (isWrapped || regexp.source.split("|").every((branch) => branch.startsWith("^") && branch.endsWith("$")))
  );
}
//@ chunk-4j4pn0rx.js:3620-3719 placement
var matchesAliasAlternation = (names, matcher, value) =>
  hasEmptyPathEntry(names.names) &&
  typeof value === "string" &&
  isAnchoredAlternation(regExpSourceAndFlags(matcher)) &&
  toolNameAliasesFor(names.names.table, value).some((alias) => names.test(matcher, alias));
//@ chunk-4j4pn0rx.js:3719-3794 placement
function narrowNameTable(names, toolName) {
  return names.names === undefined
    ? names
    : {
        test: names.test,
        names: filterNameTableByTool(names.names, toolName),
      };
}
//@ chunk-4j4pn0rx.js:3794-4204 placement
/**
 * 递归匹配函数钩子的 matcher 与事件值：数组任一匹配即可；原始值相等或经工具名别名表匹配；对象 matcher 要求每个键都存在且匹配；RegExp 用给定测试函数（或名称表）匹配。
 */
function matchesMatcher(pattern, value, context) {
  if (Array.isArray(pattern))
    return Array.prototype.some.call(pattern, (branch) => matchesMatcher(branch, value, context));
  if (Array.isArray(value))
    return Array.prototype.some.call(value, (branch) => matchesMatcher(pattern, branch, context));
  if (typeof pattern !== "object" || pattern === null)
    return pattern === value || matchesToolAlias(context.names, pattern, value);
  if (isPlainDataObject(pattern)) {
    if (typeof value !== "object" || !value) return false;
    for (let key of Object.keys(pattern))
      if (
        !Object.hasOwn(value, key) ||
        !matchesMatcher(pattern[key], value[key], narrowNameTable(context, key))
      )
        return false;
    return true;
  }
  return (
    isRegExpLike(pattern) &&
    (context.test(pattern, String(value)) || matchesAliasAlternation(context, pattern, value))
  );
}
//@ chunk-4j4pn0rx.js:4204-4854 placement
/**
 * 在匹配器与示例值之间查找永远无法匹配的嵌套对象匹配器，返回其路径和实际类型。
 */
function findImpossibleObjectMatcher(pattern, value, path = "") {
  let found;
  if (Array.isArray(pattern)) {
    Array.prototype.some.call(pattern, (branch) => {
      found = findImpossibleObjectMatcher(branch, value, path);
      return found !== undefined;
    });
    return found;
  }
  if (Array.isArray(value)) {
    Array.prototype.some.call(value, (branch) => {
      found = findImpossibleObjectMatcher(pattern, branch, path);
      return found !== undefined;
    });
    return found;
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
    found = findImpossibleObjectMatcher(pattern[key], value[key], path === "" ? key : `${path}.${key}`);
    if (found !== undefined) return found;
  }
  return;
}
//@ chunk-4j4pn0rx.js:4854-5233 placement
/**
 * 生成嵌套对象匹配器永远无法匹配时的错误说明。
 */
function impossibleMatcherMessage(moduleName, event, reason) {
  let leafKey = reason.path.split(".").at(-1) ?? reason.path;
  return `hooks module ${moduleName}: on('${event}') matcher at ${reason.path} is a nested object, but e.${reason.path} is a ${reason.kind} there, which an object matcher can never match (a matcher has no operator keys); the hook will not run for it. A ${reason.kind} is matched by the literal value or, as a string, by a RegExp, e.g. { ${leafKey}: /^prefix/ }`;
}
//@ chunk-4j4pn0rx.js:5233-5244 placement
/**
 * 序列化 matcher 时的字符预算。
 */
var MAX_SERIALIZED_MATCHER_CHARS = 32;
//@ chunk-4j4pn0rx.js:5244-5260 placement
var REGEX_MARKER_KEY = "$$regex";
//@ chunk-4j4pn0rx.js:5260-5654 placement
/**
 * 把序列化的匹配器还原为运行时值（数组递归、正则对象还原为 RegExp）。
 */
function reviveMatcher(matcher, where, path) {
  if (Array.isArray(matcher))
    return Array.prototype.map.call(matcher, (item, itemIndex) =>
      reviveMatcher(item, where, `${path}[${itemIndex}]`),
    );
  if (isPlainMatcherObject(matcher)) {
    let at = path === "" ? "" : ` at ${path}`;
    let source = matcher[REGEX_MARKER_KEY];
    if (
      typeof source === "string" &&
      typeof matcher.flags === "string" &&
      Object.keys(matcher).length === 2
    ) {
      assertSafeRegExp({
        source,
        flags: matcher.flags,
        where,
        at,
      });
      return new RegExp(source, matcher.flags);
    }
    assertNoReservedMatcherKey(matcher, where, at);
    let result = {};
    for (let [key, value] of Object.entries(matcher))
      result[key] = reviveMatcher(value, where, path === "" ? key : `${path}.${key}`);
    return result;
  }
  return matcher;
}
//@ chunk-4j4pn0rx.js:5654-5864 placement
function serializeMatcher(matcher) {
  if (isRegExpLike(matcher)) {
    let { source, flags } = regExpSourceAndFlags(matcher);
    return {
      [REGEX_MARKER_KEY]: source,
      flags,
    };
  }
  if (Array.isArray(matcher)) return Array.prototype.map.call(matcher, serializeMatcher);
  if (isPlainMatcherObject(matcher)) {
    let serialized = {};
    for (let [key, value] of Object.entries(matcher)) serialized[key] = serializeMatcher(value);
    return serialized;
  }
  return matcher;
}
//@ chunk-4j4pn0rx.js:5864-5937 placement
/**
 * 把 matcher 列表序列化（正则可序列化形式）。
 */
var serializeMatcherList = (registered) =>
  registered.map(({ matcher, ...rest }) =>
    matcher === undefined
      ? rest
      : {
          ...rest,
          matcher: serializeMatcher(matcher),
        },
  );
//@ chunk-4j4pn0rx.js:5937-5983 placement
var CATASTROPHIC_REPEAT_RE = (source) => /\([^()]*[+*?}]\)\s*[+*{]/.test(source);
//@ chunk-4j4pn0rx.js:5983-6041 placement
var unsafeRegExpFlag = (flags) => (flags.includes("g") ? "g" : flags.includes("y") ? "y" : undefined);
//@ chunk-4j4pn0rx.js:6041-6341 placement
/**
 * 拒绝不安全的正则匹配器：带状态的 g/y 标志或可能灾难性回溯的模式。
 */
function assertSafeRegExp({ source, flags, where, at }) {
  let flag = unsafeRegExpFlag(flags);
  if (flag)
    throw new HooksError(
      `${where}: matcher${at} is a RegExp with the ${flag} flag, which keeps state between tests; drop it`,
    );
  if (CATASTROPHIC_REPEAT_RE(source))
    throw new HooksError(
      `${where}: matcher${at} is a RegExp with a nested quantifier (${source}), which can backtrack without bound; rewrite it`,
    );
}
//@ chunk-4j4pn0rx.js:6341-6467 placement
function assertNoReservedMatcherKey(matcher, where, at) {
  if (Object.hasOwn(matcher, PROTO_KEY))
    throw new HooksError(`${where}: matcher${at} has the key ${PROTO_KEY}, which a matcher does not keep`);
}
//@ chunk-4j4pn0rx.js:6467-7323 placement
/**
 * 校验 hooks 模块 on() 的 matcher：RegExp 不能带有状态标志或嵌套量词，对象不能用保留键，字符串长度、类型等受限，非法时抛 HooksError。
 */
function validateMatcherValue(value, where, path) {
  let at = path === "" ? "" : ` at ${path}`;
  if (isRegExpLike(value)) {
    assertSafeRegExp({
      ...regExpSourceAndFlags(value),
      where,
      at,
    });
    return;
  }
  if (Array.isArray(value)) {
    Array.prototype.forEach.call(value, (branch, branchIndex) =>
      validateMatcherValue(branch, where, `${path}[${branchIndex}]`),
    );
    return;
  }
  if (isPlainMatcherObject(value)) {
    if (Object.hasOwn(value, REGEX_MARKER_KEY))
      throw new HooksError(
        `${where}: matcher${at} uses the reserved key ${REGEX_MARKER_KEY} (how a RegExp crosses the worker boundary); a RegExp goes in as a RegExp`,
      );
    assertNoReservedMatcherKey(value, where, at);
    for (let [key, value_2] of Object.entries(value))
      validateMatcherValue(value_2, where, path === "" ? key : `${path}.${key}`);
    return;
  }
  switch (typeof value) {
    case "string":
      if (value.length > MAX_MATCHER_CHARS)
        throw new HooksError(
          `${where}: matcher${at} is a string longer than ${MAX_MATCHER_CHARS} characters, which cannot match`,
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
//@ chunk-4j4pn0rx.js:7323-7574 placement
function testRegExpMatcher(regexp, value) {
  if (value.length > MAX_MATCHER_CHARS) {
    matcherLog().log(
      `matcher: a value of ${value.length} characters is past the ${MAX_MATCHER_CHARS} a RegExp matcher reads; it matches, so the hook decides`,
    );
    return true;
  }
  if (unsafeRegExpFlag(regExpSourceAndFlags(regexp).flags)) regexp.lastIndex = 0;
  return RegExp.prototype.exec.call(regexp, value) !== null;
}
//@ chunk-4j4pn0rx.js:7574-7687 placement
function validateObjectMatcher(matcher, where) {
  if (!isPlainMatcherObject(matcher))
    throw new HooksError(`${where}: the matcher must be a plain object (a partial of e)`);
  validateMatcherValue(matcher, where, "");
}
//@ chunk-4j4pn0rx.js:7687-7722 placement
/**
 * 反序列化 matcher 的默认入口（键名 "matcher"）。
 */
var reviveMatcherDefault = (matcher, where = "matcher") => reviveMatcher(matcher, where, "");
//@ chunk-4j4pn0rx.js:7722-7767 placement
/**
 * 用正则语义判定 matcher 是否匹配（含工具别名表）。
 */
var matchesRegExpMatcher = (matcher, value, names) =>
  matchesMatcher(matcher, value, {
    test: testRegExpMatcher,
    names,
  });
//@ chunk-4j4pn0rx.js:7767-7815 placement
/**
 * 用恒真测试判定字面 matcher 是否匹配（含工具别名表）。
 */
var matchesLiteralMatcher = (matcher, value, names) =>
  matchesMatcher(matcher, value, {
    test: () => true,
    names,
  });
//@ chunk-4j4pn0rx.js:7815-7936 placement
var fieldMatches = (pattern, probe, value, fallback = matchesLiteralMatcher) =>
  Array.isArray(pattern)
    ? pattern.some((branch) => fieldMatches(branch, probe, value, fallback))
    : !isPlainDataObject(pattern) ||
      !Object.hasOwn(pattern, probe.field) ||
      fallback(pattern[probe.field], probe.value, value);
//@ chunk-4j4pn0rx.js:7936-8024 layout
var matchesAllFields = (pattern, obj, names, entries) =>
  Object.entries(obj).every(([key, value]) =>
    fieldMatches(
      pattern,
      {
        field: key,
        value,
      },
      names && filterNameTableByTool(names, key),
      entries,
    ),
  );
//@ chunk-4j4pn0rx.js:8024-8064 placement
/**
 * 判断单个字段是否匹配给定值。
 */
var matchesField = (value, field, value_2) =>
  fieldMatches(value, {
    field,
    value: value_2,
  });

// The import cycle this module closes (3771 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("worker:src/utils/hooks/functionHookMatchers.js");
export {
  deepFreezeInPlace,
  matcherLog,
  freezeStringEntries,
  frozenToolTableEntry,
  EMPTY_MATCHER_TABLE,
  matchesSingleKeyFilter,
  isPlainDataObject,
  PROTO_KEY,
  describeMatcher,
  reviveMatcherDefault,
  ANCHORED_ALTERNATION_RE,
  filterEntriesToNullProto,
  serializeMatcherList,
  setMatcherLog,
  matchesField,
  matchesLiteralMatcher,
  deepFreeze,
  matchesAllFields,
  matchesRegExpMatcher,
  isPlainMatcherObject,
  MAX_MATCHER_DEPTH,
  MAX_MATCHER_KEYS,
  MAX_SERIALIZED_MATCHER_CHARS,
  findImpossibleObjectMatcher,
  impossibleMatcherMessage,
  validateObjectMatcher,
  MAX_MATCHER_CHARS,
  testRegExpMatcher,
  matchesMatcher,
};
