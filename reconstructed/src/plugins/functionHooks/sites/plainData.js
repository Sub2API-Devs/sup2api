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
import { Pf } from "../../../utils/untrustedValues.js";
import { checkPinnedKeys } from "./siteRules.js";

//@ chunk-4121qate.js:128890-128947 placement
var Dr = () => ({ nodes: 0, chars: 0, path: new Set(), done: new Map() });
//@ chunk-4121qate.js:128947-129089 placement
function* childEntriesWithCost(e) {
  if (Array.isArray(e)) {
    let o = checkedListLength(e);
    for (let r = 0; r < o; r += 1) yield [1, e[r]];
    return;
  }
  for (let [o, r] of Object.entries(e)) yield [o.length + 4, r];
}
//@ chunk-4121qate.js:129089-129100 placement
var MAX_DEPTH = 32;
//@ chunk-4121qate.js:129100-129112 placement
var Z6t = MAX_DEPTH;
//@ chunk-4121qate.js:129112-129124 placement
var afr = MAX_TREE_TEXT_CHARS;
//@ chunk-4121qate.js:129124-129138 placement
var MAX_NODES = 20000;
//@ chunk-4121qate.js:129138-129150 placement
var AZr = MAX_NODES;
//@ chunk-4121qate.js:129150-129288 placement
function plainDataLimitProblem(e) {
  if (e.nodes > AZr) return `holds more than ${AZr} values`;
  return e.chars > afr ? `serializes to more than ${afr} characters` : void 0;
}
//@ chunk-4121qate.js:129288-129445 placement
function scalarJsonLength(e) {
  switch (typeof e) {
    case "boolean":
      return 5;
    case "string":
      return e.length + 2;
    case "number":
      return String(e).length;
    default:
      return e === null ? 5 : void 0;
  }
}
//@ chunk-4121qate.js:129445-129576 placement
function valueKind(e) {
  if (e === null) return "null";
  let o = typeof e === "object";
  return Array.isArray(e) ? "an array" : o ? "an object" : `a ${typeof e}`;
}
//@ chunk-4121qate.js:129576-130412 placement
function checkPlainDataDepth(e, o, r) {
  if (o > Z6t) return `nests deeper than ${Z6t}`;
  let n = typeof e === "object" ? r.done.get(e) : void 0;
  ((r.nodes += n?.nodes ?? 1), (r.chars += n?.chars ?? scalarJsonLength(e) ?? 2));
  let s = plainDataLimitProblem(r);
  if (s !== void 0 || n !== void 0) return s;
  if (typeof e === "number" && !Number.isFinite(e)) return `holds ${String(e)}`;
  if (scalarJsonLength(e) !== void 0) return;
  if (e === void 0) return "holds undefined (an array hole, a missing value)";
  if (typeof e !== "object" || e === null) return `holds ${valueKind(e)}`;
  if (r.path.has(e)) return "holds a cycle";
  let prototypeOf = Object.getPrototypeOf(e);
  if (!(Array.isArray(e) || prototypeOf === null || Object.getPrototypeOf(prototypeOf) === null))
    return "holds an object that is not plain (a class instance)";
  let f = { nodes: r.nodes - 1, chars: r.chars - 2 };
  r.path.add(e);
  for (let [a, m] of childEntriesWithCost(e)) {
    r.chars += a;
    let c = checkPlainDataDepth(m, o + 1, r);
    if (c !== void 0) return c;
  }
  (r.path.delete(e), r.done.set(e, { nodes: r.nodes - f.nodes, chars: r.chars - f.chars }));
  return;
}
//@ chunk-4121qate.js:130412-130438 placement
var lEe = (e) => checkPlainDataDepth(e, 0, Dr());
//@ chunk-4121qate.js:130438-130499 placement
var mm = (e) => typeof e === "object" && e !== null && !Array.isArray(e);
//@ chunk-4121qate.js:130499-130562 placement
var FORBIDDEN_OBJECT_KEYS = Object.freeze(["__proto__", "constructor", "prototype"]);
/**
 * 校验插件钩子传回的值是纯 JSON 数据（深度、类型、原型键）
 */
//@ chunk-4121qate.js:130562-131896 placement
function checkPlainData(e, o, r) {
  let n = typeof e === "number" && Number.isFinite(e);
  if (typeof e === "string" || typeof e === "boolean" || e === null || n) return e;
  if (typeof e !== "object")
    throw new HooksError(
      typeof e === "number" ? `holds ${String(e)}` : `holds what JSON cannot (${typeof e})`,
    );
  if (Pf(e)) throw new HooksError("holds a Proxy or a vm context");
  if (o > Z6t) throw new HooksError(`nests deeper than ${Z6t}`);
  let s = r.get(e);
  if (s !== void 0) return s;
  if (r.has(e)) throw new HooksError("holds a cycle");
  let isArray = Array.isArray(e),
    prototypeOf = Object.getPrototypeOf(e),
    f =
      prototypeOf === null ||
      prototypeOf === Object.prototype ||
      (typeof prototypeOf === "object" &&
        Object.getPrototypeOf(prototypeOf) === null &&
        Object.keys(prototypeOf).length === 0 &&
        Reflect.ownKeys(prototypeOf).length === Reflect.ownKeys(Object.prototype).length);
  if (!isArray && !f) throw new HooksError("holds an object that is not plain");
  let filtered = Reflect.ownKeys(e).filter((x) => typeof x === "string"),
    found = filtered.find((x) => FORBIDDEN_OBJECT_KEYS.includes(x));
  if (found !== void 0) throw new HooksError(`holds a key ${found}`);
  let mapped = filtered
      .filter((x) => !isArray || x !== "length")
      .map((x) => [x, Object.getOwnPropertyDescriptor(e, x)]),
    any = mapped.some(([, x]) => !("value" in (x ?? {}))),
    l = isArray ? e.length : 0,
    y = isArray && mapped.length !== l;
  if (any || y) throw new HooksError(any ? "holds an accessor" : "holds a list with a hole or a key");
  r.set(e, void 0);
  let g = isArray
    ? Array.from({ length: l }, (x, T) =>
        checkPlainData(Object.getOwnPropertyDescriptor(e, String(T))?.value, o + 1, r),
      )
    : Object.fromEntries(
        mapped
          .filter(([, x]) => x?.enumerable === !0)
          .map(([x, T]) => [x, checkPlainData(T?.value, o + 1, r)]),
      );
  return (r.set(e, g), g);
}
/**
 * 校验值是纯数据对象（深度、节点数、字符数、禁止键），返回对象或问题说明文本。
 */
//@ chunk-4121qate.js:131896-132028 placement
function checkPlainObject(e) {
  try {
    let o = checkPlainData(e, 0, new Map());
    return mm(o) ? o : "is no plain object";
  } catch (error) {
    if (error instanceof HooksError) return error.message;
    throw error;
  }
}
/**
 * skill.prompt 参数校验：skill 不可改，固定字段不可改，text 必须是字符串，frontmatter 必须是纯数据对象。
 */
//@ chunk-4121qate.js:132028-132362 placement
function checkSkillPromptArgument(e, o) {
  let { skill: skill, text: text, frontmatter: frontmatter } = e,
    i = typeof skill === "string",
    p = skill === o.skill,
    f = typeof text === "string",
    a = checkPlainObject(frontmatter),
    m = typeof a === "string" ? a : lEe(a);
  return i
    ? p
      ? (checkPinnedKeys(["source", "pluginName", "path", "frontmatterProblem"], e, o) ??
        (f ? m && `a frontmatter that ${m}` : "no { text }"))
      : "a changed skill (the hooks beneath match on it)"
    : "no { skill }";
}

export {
  checkSkillPromptArgument,
  checkPlainObject,
  Dr,
  checkPlainDataDepth,
  lEe,
  MAX_DEPTH,
  MAX_NODES,
  valueKind,
  FORBIDDEN_OBJECT_KEYS,
  afr,
  AZr,
  Z6t,
};
