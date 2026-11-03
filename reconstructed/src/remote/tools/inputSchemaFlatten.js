/**
 * remote/tools/inputSchemaFlatten.ts
 *
 * 2.1.316 新增：展开远程工具输入 JSON Schema（$ref、组合关键字）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (7)
 * attribution: placement 7
 */
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-g54kbxqw.js:11123-11267 placement
var SCHEMA_COMBINATOR_KEYS = ["anyOf", "oneOf", "allOf"],
  LXr = /^[a-zA-Z0-9_.-]{1,64}$/,
  Br = ["$defs", "definitions", "$schema", "additionalProperties", "description", "title"];
//@ chunk-g54kbxqw.js:11267-11463 placement
function resolveSchemaRef(e, n) {
  let $ref = e.$ref;
  if (typeof $ref !== "string") return e;
  let match = /^#\/(\$defs|definitions)\/([^/]+)$/.exec($ref);
  if (match === null) return e;
  let h = n[match[1]];
  if (!isPlainObject_2(h)) return e;
  let y = h[match[2]];
  return isPlainObject_2(y) ? y : e;
}
//@ chunk-g54kbxqw.js:11463-11517 placement
function jt(e, n) {
  return uniq(e.map((s) => (isPlainObject_2(s) ? resolveSchemaRef(s, n) : s)));
}
//@ chunk-g54kbxqw.js:11517-11752 placement
function describeSchemaVariantFields(e) {
  if (!isPlainObject_2(e)) return null;
  let required = e.required;
  if (Array.isArray(required) && required.length > 0 && required.every((r) => typeof r === "string"))
    return required.join(", ");
  let properties = e.properties;
  if (isPlainObject_2(properties)) {
    let keys = Object.keys(properties);
    if (keys.length > 0) return keys.join(", ");
  }
  return null;
}
/**
 * 把含 anyOf/oneOf/allOf 的工具输入 JSON Schema 拍平为单个对象（用于远程工具声明），附加约束说明。
 */
//@ chunk-g54kbxqw.js:11752-12773 placement
function flattenInputSchema(e) {
  if (!isPlainObject_2(e)) return { outcome: "unchanged" };
  let filtered = SCHEMA_COMBINATOR_KEYS.filter((s) => s in e);
  if (filtered.length === 0) return { outcome: "unchanged" };
  try {
    let create = Object.create(null),
      r = (w) => {
        if (!isPlainObject_2(w)) return;
        for (let [P, L] of Object.entries(w))
          if (LXr.test(P) && !(P in create) && isPlainObject_2(L)) create[P] = L;
      };
    r(e.properties);
    for (let w of filtered) {
      let P = e[w];
      if (!Array.isArray(P))
        return { outcome: "drop", reason: `input schema has top-level ${w} that is not an array` };
      for (let L of jt(P, e)) if (isPlainObject_2(L)) r(L.properties);
    }
    let h = new Set(),
      y = (w) => {
        if (!Array.isArray(w)) return;
        for (let P of w) if (typeof P === "string" && P in create) h.add(P);
      };
    y(e.required);
    let allOf = e.allOf;
    if (Array.isArray(allOf)) {
      for (let w of jt(allOf, e)) if (isPlainObject_2(w)) y(w.required);
    }
    let C = filtered.includes("anyOf") || filtered.includes("oneOf"),
      R = { type: "object", properties: create, required: [...h] };
    for (let w of Br) if (w in e) R[w] = e[w];
    let S = combinatorConstraintNote(filtered, e, C);
    if (!("additionalProperties" in e)) R.additionalProperties = !0;
    return { outcome: "normalized", schema: R, note: S, combinators: filtered };
  } catch {
    return {
      outcome: "drop",
      reason: `input schema uses top-level ${filtered.join("/")} and could not be normalized`,
    };
  }
}
//@ chunk-g54kbxqw.js:12773-13300 placement
function combinatorConstraintNote(e, n, s) {
  if (!s)
    return "Input constraint: all listed parameters apply together (flattened from a JSON Schema allOf).";
  let r = e.includes("oneOf") ? "oneOf" : "anyOf",
    h = n[r],
    y = Array.isArray(h)
      ? uniq(
          jt(h, n)
            .map(describeSchemaVariantFields)
            .filter((R) => R !== null),
        )
      : [],
    k = r === "oneOf" ? "Provide parameters for exactly one of" : "Provide parameters for at least one of";
  if (y.length === 0)
    return `Input constraint: ${k} the documented parameter groups (flattened from a JSON Schema ${r}).`;
  let joined = y.map((R) => `(${R})`).join(" or ");
  return `Input constraint: ${k}: ${joined}.`;
}
//@ chunk-g54kbxqw.js:13300-13342 placement
function joinDescription(e, n) {
  return n
    ? `${e}

${n}`
    : e;
}

export { joinDescription, LXr, resolveSchemaRef, SCHEMA_COMBINATOR_KEYS, flattenInputSchema };
