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
/**
 * 导出常量或表 `SCHEMA_COMBINATOR_KEYS`：值为 ["anyOf", "oneOf", "allOf"], LXr = /^[a-zA-Z0-9_.-]{1,64}$/, Br = ["$defs", "definitions", "$schema", "additionalPropert…。
 */
var SCHEMA_COMBINATOR_KEYS = ["anyOf", "oneOf", "allOf"];
var SAFE_SCHEMA_KEY_RE = /^[a-zA-Z0-9_.-]{1,64}$/;
var SCHEMA_PASSTHROUGH_KEYS = [
  "$defs",
  "definitions",
  "$schema",
  "additionalProperties",
  "description",
  "title",
];
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
function dedupeResolvedSchemaRefs(e, n) {
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
//@ chunk-g54kbxqw.js:11752-12773 placement
/**
 * 把含 anyOf/oneOf/allOf 的工具输入 JSON Schema 拍平为单个对象（用于远程工具声明），附加约束说明。
 */
function flattenInputSchema(e) {
  if (!isPlainObject_2(e))
    return {
      outcome: "unchanged",
    };
  let filtered = SCHEMA_COMBINATOR_KEYS.filter((s) => s in e);
  if (filtered.length === 0)
    return {
      outcome: "unchanged",
    };
  try {
    let s = Object.create(null);
    let r = (properties) => {
      if (!isPlainObject_2(properties)) return;
      for (let [key, value] of Object.entries(properties))
        if (SAFE_SCHEMA_KEY_RE.test(key) && !(key in s) && isPlainObject_2(value)) s[key] = value;
    };
    r(e.properties);
    for (let w of filtered) {
      let P = e[w];
      if (!Array.isArray(P))
        return {
          outcome: "drop",
          reason: `input schema has top-level ${w} that is not an array`,
        };
      for (let L of dedupeResolvedSchemaRefs(P, e)) if (isPlainObject_2(L)) r(L.properties);
    }
    let h = new Set();
    let y = (required) => {
      if (!Array.isArray(required)) return;
      for (let P of required) if (typeof P === "string" && P in s) h.add(P);
    };
    y(e.required);
    let allOf = e.allOf;
    if (Array.isArray(allOf)) {
      for (let w of dedupeResolvedSchemaRefs(allOf, e)) if (isPlainObject_2(w)) y(w.required);
    }
    let C = filtered.includes("anyOf") || filtered.includes("oneOf");
    let R = {
      type: "object",
      properties: s,
      required: [...h],
    };
    for (let w of SCHEMA_PASSTHROUGH_KEYS) if (w in e) R[w] = e[w];
    let note = combinatorConstraintNote(filtered, e, C);
    if (!("additionalProperties" in e)) R.additionalProperties = true;
    return {
      outcome: "normalized",
      schema: R,
      note,
      combinators: filtered,
    };
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
  let r = e.includes("oneOf") ? "oneOf" : "anyOf";
  let h = n[r];
  let y = Array.isArray(h)
    ? uniq(
        dedupeResolvedSchemaRefs(h, n)
          .map(describeSchemaVariantFields)
          .filter((R) => R !== null),
      )
    : [];
  let k = r === "oneOf" ? "Provide parameters for exactly one of" : "Provide parameters for at least one of";
  if (y.length === 0)
    return `Input constraint: ${k} the documented parameter groups (flattened from a JSON Schema ${r}).`;
  let joined = y.map((R) => `(${R})`).join(" or ");
  return `Input constraint: ${k}: ${joined}.`;
}
//@ chunk-g54kbxqw.js:13300-13342 placement
function joinDescription(note, description) {
  return description
    ? `${note}

${description}`
    : note;
}
export { joinDescription, SAFE_SCHEMA_KEY_RE, resolveSchemaRef, SCHEMA_COMBINATOR_KEYS, flattenInputSchema };
