/**
 * plugins/functionHooks/sites/plainData.ts
 *
 * 钩子数据纯 JSON 校验（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (17)
 * attribution: placement 17
 */
import { checkedListLength } from "../dispatch/valueSizing.js";
import { MAX_TREE_TEXT_CHARS } from "../ui/treeConstants.js";
import { HooksError } from "../hooksErrors.js";
import { isUntrustedObject } from "../../../utils/untrustedValues.js";
import { checkPinnedKeys } from "./siteRules.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4121qate.js:128890-128947 placement
/**
 * 纯数据检查状态
 */
var emptyPlainDataState = () => ({
  nodes: 0,
  chars: 0,
  path: new Set(),
  done: new Map(),
});
//@ chunk-4121qate.js:128947-129089 placement
function* childEntriesWithCost(value) {
  if (Array.isArray(value)) {
    let length = checkedListLength(value);
    for (let index = 0; index < length; index += 1) yield [1, value[index]];
    return;
  }
  for (let [key, value_2] of Object.entries(value)) yield [key.length + 4, value_2];
}
//@ chunk-4121qate.js:129089-129100 placement
var MAX_DEPTH = 32;
//@ chunk-4121qate.js:129100-129112 placement
/**
 * 纯数据最大深度
 */
var MAX_DEPTH_2 = MAX_DEPTH;
//@ chunk-4121qate.js:129112-129124 placement
/**
 * 文本字符上限
 */
var MAX_TREE_TEXT_CHARS_2 = MAX_TREE_TEXT_CHARS;
//@ chunk-4121qate.js:129124-129138 placement
var MAX_NODES = 20000;
//@ chunk-4121qate.js:129138-129150 placement
/**
 * 节点上限
 */
var MAX_NODES_2 = MAX_NODES;
//@ chunk-4121qate.js:129150-129288 placement
function plainDataLimitProblem(budget) {
  if (budget.nodes > MAX_NODES_2) return `holds more than ${MAX_NODES_2} values`;
  return budget.chars > MAX_TREE_TEXT_CHARS_2
    ? `serializes to more than ${MAX_TREE_TEXT_CHARS_2} characters`
    : undefined;
}
//@ chunk-4121qate.js:129288-129445 placement
function scalarJsonLength(value) {
  switch (typeof value) {
    case "boolean":
      return 5;
    case "string":
      return value.length + 2;
    case "number":
      return String(value).length;
    default:
      return value === null ? 5 : undefined;
  }
}
//@ chunk-4121qate.js:129445-129576 placement
function valueKind(value) {
  if (value === null) return "null";
  let isObject = typeof value === "object";
  return Array.isArray(value) ? "an array" : isObject ? "an object" : `a ${typeof value}`;
}
//@ chunk-4121qate.js:129576-130412 placement
function checkPlainDataDepth(value, depth, budget) {
  if (depth > MAX_DEPTH_2) return `nests deeper than ${MAX_DEPTH_2}`;
  let memo = typeof value === "object" ? budget.done.get(value) : undefined;
  budget.nodes += memo?.nodes ?? 1;
  budget.chars += memo?.chars ?? scalarJsonLength(value) ?? 2;
  let limitProblem = plainDataLimitProblem(budget);
  if (limitProblem !== undefined || memo !== undefined) return limitProblem;
  if (typeof value === "number" && !Number.isFinite(value)) return `holds ${String(value)}`;
  if (scalarJsonLength(value) !== undefined) return;
  if (value === undefined) return "holds undefined (an array hole, a missing value)";
  if (typeof value !== "object" || value === null) return `holds ${valueKind(value)}`;
  if (budget.path.has(value)) return "holds a cycle";
  let prototypeOf = Object.getPrototypeOf(value);
  if (!(Array.isArray(value) || prototypeOf === null || Object.getPrototypeOf(prototypeOf) === null))
    return "holds an object that is not plain (a class instance)";
  let before = {
    nodes: budget.nodes - 1,
    chars: budget.chars - 2,
  };
  budget.path.add(value);
  for (let [entryCost, child] of childEntriesWithCost(value)) {
    budget.chars += entryCost;
    let childProblem = checkPlainDataDepth(child, depth + 1, budget);
    if (childProblem !== undefined) return childProblem;
  }
  budget.path.delete(value);
  budget.done.set(value, {
    nodes: budget.nodes - before.nodes,
    chars: budget.chars - before.chars,
  });
  return;
}
//@ chunk-4121qate.js:130412-130438 placement
/**
 * 纯数据校验入口
 */
var checkPlainData = (value) => checkPlainDataDepth(value, 0, emptyPlainDataState());
//@ chunk-4121qate.js:130438-130499 placement
/**
 * 普通对象
 */
var isPlainObjectNoArray = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
//@ chunk-4121qate.js:130499-130562 placement
var FORBIDDEN_OBJECT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:130499", () => {
  FORBIDDEN_OBJECT_KEYS = Object.freeze(["__proto__", "constructor", "prototype"]);
});
//@ chunk-4121qate.js:130562-131896 placement
/**
 * 校验插件钩子传回的值是纯 JSON 数据（深度、类型、原型键）
 */
function checkPlainData_2(value, depth, memo) {
  let isFiniteNumber = typeof value === "number" && Number.isFinite(value);
  if (typeof value === "string" || typeof value === "boolean" || value === null || isFiniteNumber)
    return value;
  if (typeof value !== "object")
    throw new HooksError(
      typeof value === "number" ? `holds ${String(value)}` : `holds what JSON cannot (${typeof value})`,
    );
  if (isUntrustedObject(value)) throw new HooksError("holds a Proxy or a vm context");
  if (depth > MAX_DEPTH_2) throw new HooksError(`nests deeper than ${MAX_DEPTH_2}`);
  let memoized = memo.get(value);
  if (memoized !== undefined) return memoized;
  if (memo.has(value)) throw new HooksError("holds a cycle");
  let isArray = Array.isArray(value);
  let prototypeOf = Object.getPrototypeOf(value);
  let isPlainProto =
    prototypeOf === null ||
    prototypeOf === Object.prototype ||
    (typeof prototypeOf === "object" &&
      Object.getPrototypeOf(prototypeOf) === null &&
      Object.keys(prototypeOf).length === 0 &&
      Reflect.ownKeys(prototypeOf).length === Reflect.ownKeys(Object.prototype).length);
  if (!isArray && !isPlainProto) throw new HooksError("holds an object that is not plain");
  let filtered = Reflect.ownKeys(value).filter((key) => typeof key === "string");
  let found = filtered.find((forbiddenKey) => FORBIDDEN_OBJECT_KEYS.includes(forbiddenKey));
  if (found !== undefined) throw new HooksError(`holds a key ${found}`);
  let mapped = filtered
    .filter((key) => !isArray || key !== "length")
    .map((key) => [key, Object.getOwnPropertyDescriptor(value, key)]);
  let any = mapped.some(([, descriptor]) => !("value" in (descriptor ?? {})));
  let arrayLength = isArray ? value.length : 0;
  let hasHoleOrKey = isArray && mapped.length !== arrayLength;
  if (any || hasHoleOrKey)
    throw new HooksError(any ? "holds an accessor" : "holds a list with a hole or a key");
  memo.set(value, undefined);
  let copy = isArray
    ? Array.from(
        {
          length: arrayLength,
        },
        (unusedSlot, index) =>
          checkPlainData_2(Object.getOwnPropertyDescriptor(value, String(index))?.value, depth + 1, memo),
      )
    : Object.fromEntries(
        mapped
          .filter(([, descriptor]) => descriptor?.enumerable === true)
          .map(([key, descriptor]) => [key, checkPlainData_2(descriptor?.value, depth + 1, memo)]),
      );
  memo.set(value, copy);
  return copy;
}
//@ chunk-4121qate.js:131896-132028 placement
/**
 * 校验值是纯数据对象（深度、节点数、字符数、禁止键），返回对象或问题说明文本。
 */
function checkPlainObject(frontmatter) {
  try {
    let checked = checkPlainData_2(frontmatter, 0, new Map());
    return isPlainObjectNoArray(checked) ? checked : "is no plain object";
  } catch (error) {
    if (error instanceof HooksError) return error.message;
    throw error;
  }
}
//@ chunk-4121qate.js:132028-132362 placement
/**
 * skill.prompt 参数校验：skill 不可改，固定字段不可改，text 必须是字符串，frontmatter 必须是纯数据对象。
 */
function checkSkillPromptArgument(args, received) {
  let { skill, text, frontmatter } = args;
  let isSkillString = typeof skill === "string";
  let isSameSkill = skill === received.skill;
  let isTextString = typeof text === "string";
  let frontmatterCheck = checkPlainObject(frontmatter);
  let frontmatterProblem =
    typeof frontmatterCheck === "string" ? frontmatterCheck : checkPlainData(frontmatterCheck);
  return isSkillString
    ? isSameSkill
      ? (checkPinnedKeys(["source", "pluginName", "path", "frontmatterProblem"], args, received) ??
        (isTextString ? frontmatterProblem && `a frontmatter that ${frontmatterProblem}` : "no { text }"))
      : "a changed skill (the hooks beneath match on it)"
    : "no { skill }";
}
export {
  checkSkillPromptArgument,
  checkPlainObject,
  emptyPlainDataState,
  checkPlainDataDepth,
  checkPlainData,
  MAX_DEPTH,
  MAX_NODES,
  valueKind,
  FORBIDDEN_OBJECT_KEYS,
  MAX_TREE_TEXT_CHARS_2,
  MAX_NODES_2,
  MAX_DEPTH_2,
};
