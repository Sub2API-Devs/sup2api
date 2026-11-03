/**
 * tools/SyntheticOutputTool/schemaCheck.ts
 *
 * 结构化输出 schema 可满足性检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-22r83hv0.js (29)
 * attribution: placement 29
 */
import { isPlainObject } from "../../utils/isPlainObject.js";
import { count } from "../../utils/collections.js";
import { takeLastChars, stripFormatChars, truncateToLength } from "../../utils/stringUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-22r83hv0.js:16402-16501 placement
var je = 32,
  He = 1e5,
  se = 80,
  ae = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]);
/**
 * 检查 JSON Schema 是否对象根且可满足，否则结构化输出无法通过
 */
//@ chunk-22r83hv0.js:16501-16869 placement
function checkSchemaSatisfiable(e) {
  if (e.reason === "root_not_object")
    return "the API only accepts an object-rooted tool input schema, so every request would be rejected";
  return e.scope === "whole"
    ? "no output can satisfy this schema, so StructuredOutput validation would fail on every attempt"
    : "one property or item sub-schema admits no value, so any output that fills it in fails validation";
}
/**
 * 检查结构化输出 schema 是否可满足：根必须是 object，再递归查找矛盾的子 schema。
 */
//@ chunk-22r83hv0.js:16869-17217 placement
function checkOutputSchemaSatisfiable(e) {
  if (O(e, "type") !== "object")
    return {
      ok: !1,
      finding: {
        reason: "root_not_object",
        scope: "whole",
        message:
          "the root schema must declare type: 'object' (the API rejects any other root type for a tool input schema); wrap arrays or primitives in an object property",
      },
    };
  let n = findUnsatisfiable(e, "", !0, je, { remaining: He });
  return n === void 0 ? { ok: !0 } : { ok: !1, finding: n };
}
/**
 * 递归查找不可满足的子 schema（深度与节点预算）。
 */
//@ chunk-22r83hv0.js:17217-17751 placement
function findUnsatisfiable(e, n, r, s, d) {
  if (s <= 0 || --d.remaining < 0) return;
  if (!isPlainObject(e) || Object.hasOwn(e, "$ref")) return;
  let f = declaredTypes(e),
    E = unsatisfiableReason(e, n, f);
  if (E !== void 0) return { ...E, scope: r ? "whole" : "subschema" };
  let h = O(e, "properties");
  if (le(f, "object") && isPlainObject(h)) {
    let v = O(e, "required"),
      y = new Set(Array.isArray(v) ? v.filter(q) : []),
      A = w(f, "object");
    for (let [N, Ce] of Object.entries(h)) {
      if (N === "__proto__") continue;
      let K = findUnsatisfiable(Ce, `${n}/properties/${ze(N)}`, r && A && y.has(N), s - 1, d);
      if (K !== void 0) return K;
    }
  }
  let g = O(e, "items");
  if (le(f, "array") && isPlainObject(g)) return findUnsatisfiable(g, `${n}/items`, !1, s - 1, d);
  return;
}
/**
 * 判断一个 schema 节点是否自相矛盾：required 中有未声明且禁止额外属性的键、enum/const 与 type 不符、取值范围交叉。
 */
//@ chunk-22r83hv0.js:17751-19074 placement
function unsatisfiableReason(e, n, r) {
  let subjectLabel = n === "" ? "the root object" : `the sub-schema at ${Qe(n)}`,
    d = O(e, "required");
  if (
    w(r, "object") &&
    Array.isArray(d) &&
    O(e, "additionalProperties") === !1 &&
    O(e, "patternProperties") === void 0
  ) {
    let g = O(e, "properties"),
      v = isPlainObject(g) ? g : {};
    for (let y of d)
      if (q(y) && !Object.hasOwn(v, y))
        return {
          reason: "required_property_forbidden",
          message: `${subjectLabel} lists "${pe(y)}" in required but does not declare it in properties, and additionalProperties is false, so no object can satisfy it \u2014 declare the property or drop it from required`,
        };
  }
  let f = O(e, "enum");
  if (r !== void 0 && Array.isArray(f) && f.length > 0) {
    if (!f.some((g) => matchesAnyType(r, g)))
      return {
        reason: "enum_type_mismatch",
        message: `${subjectLabel} declares type ${de(r)} but none of its enum values has that type, so no value can satisfy it \u2014 change type to match the enum values or vice versa`,
      };
  }
  let E = O(e, "const");
  if (E !== void 0) {
    if (r !== void 0 && !matchesAnyType(r, E))
      return {
        reason: "const_mismatch",
        message: `${subjectLabel} declares type ${de(r)} but its const value does not have that type, so no value can satisfy it`,
      };
    if (Array.isArray(f) && f.length > 0 && Ke(E) && !f.some((g) => g === E))
      return {
        reason: "const_mismatch",
        message: `${subjectLabel} has a const value that is not one of its enum values, so no value can satisfy it`,
      };
  }
  let h = crossedBoundsReason(e, r);
  if (h !== void 0)
    return { reason: "crossed_bounds", message: `${subjectLabel} has ${h}, so no value can satisfy it` };
  return;
}
/**
 * 检查数值/字符串/数组/对象的上下界是否交叉（含 required 数超过 maxProperties）。
 */
//@ chunk-22r83hv0.js:19074-20110 placement
function crossedBoundsReason(e, n) {
  if (w(n, "number") || w(n, "integer") || Ye(n, "number", "integer")) {
    let r = T(O(e, "minimum")),
      s = T(O(e, "exclusiveMinimum")),
      d = T(O(e, "maximum")),
      f = T(O(e, "exclusiveMaximum")),
      E =
        s !== void 0 && (r === void 0 || s >= r)
          ? { value: s, exclusive: !0, keyword: "exclusiveMinimum" }
          : r !== void 0
            ? { value: r, exclusive: !1, keyword: "minimum" }
            : void 0,
      h =
        f !== void 0 && (d === void 0 || f <= d)
          ? { value: f, exclusive: !0, keyword: "exclusiveMaximum" }
          : d !== void 0
            ? { value: d, exclusive: !1, keyword: "maximum" }
            : void 0;
    if (
      E !== void 0 &&
      h !== void 0 &&
      (E.value > h.value || (E.value === h.value && (E.exclusive || h.exclusive)))
    )
      return `${E.keyword} ${E.value} and ${h.keyword} ${h.value}, which admit no number`;
  }
  if (w(n, "string")) {
    let r = crossedPairReason(e, "minLength", "maxLength");
    if (r !== void 0) return r;
  }
  if (w(n, "array")) {
    let r = crossedPairReason(e, "minItems", "maxItems");
    if (r !== void 0) return r;
  }
  if (w(n, "object")) {
    let r = crossedPairReason(e, "minProperties", "maxProperties");
    if (r !== void 0) return r;
    let s = T(O(e, "maxProperties")),
      d = O(e, "required");
    if (s !== void 0 && Array.isArray(d)) {
      let f = count(d, q);
      if (f > s) return `${f} required properties but maxProperties ${s}`;
    }
  }
  return;
}
//@ chunk-22r83hv0.js:20110-20233 placement
function crossedPairReason(e, n, r) {
  let s = T(O(e, n)),
    d = T(O(e, r));
  return s !== void 0 && d !== void 0 && s > d ? `${n} ${s} greater than ${r} ${d}` : void 0;
}
//@ chunk-22r83hv0.js:20233-20484 placement
function declaredTypes(e) {
  let n = O(e, "type"),
    r;
  if (typeof n === "string" && ae.has(n)) r = [n];
  else if (Array.isArray(n) && n.length > 0 && n.every((s) => typeof s === "string" && ae.has(s)))
    r = n.slice();
  else return;
  if (O(e, "nullable") === !0 && !r.includes("null")) r.push("null");
  return r;
}
//@ chunk-22r83hv0.js:20484-20551 placement
function q(e) {
  return typeof e === "string" && !(e in Object.prototype);
}
//@ chunk-22r83hv0.js:20551-20601 placement
function le(e, n) {
  return e === void 0 || e.includes(n);
}
//@ chunk-22r83hv0.js:20601-20659 placement
function w(e, n) {
  return e !== void 0 && e.length === 1 && e[0] === n;
}
//@ chunk-22r83hv0.js:20659-20752 placement
function Ye(e, n, r) {
  return e !== void 0 && e.length === 2 && ((e[0] === n && e[1] === r) || (e[0] === r && e[1] === n));
}
/**
 * 判断值是否匹配任一声明类型。
 */
//@ chunk-22r83hv0.js:20752-21111 placement
function matchesAnyType(e, n) {
  return e.some((r) => {
    switch (r) {
      case "null":
        return n === null;
      case "boolean":
        return typeof n === "boolean";
      case "string":
        return typeof n === "string";
      case "number":
        return typeof n === "number" && Number.isFinite(n);
      case "integer":
        return typeof n === "number" && Number.isInteger(n);
      case "array":
        return Array.isArray(n);
      case "object":
        return isPlainObject(n);
      default:
        return !0;
    }
  });
}
//@ chunk-22r83hv0.js:21111-21206 placement
function Ke(e) {
  return e === null || typeof e === "string" || typeof e === "number" || typeof e === "boolean";
}
//@ chunk-22r83hv0.js:21206-21276 placement
function T(e) {
  return typeof e === "number" && Number.isFinite(e) ? e : void 0;
}
//@ chunk-22r83hv0.js:21276-21330 placement
function O(e, n) {
  return Object.hasOwn(e, n) ? e[n] : void 0;
}
//@ chunk-22r83hv0.js:21330-21416 placement
function de(e) {
  return e.length === 1 ? `'${e[0]}'` : `[${e.map((n) => `'${n}'`).join(", ")}]`;
}
//@ chunk-22r83hv0.js:21416-21486 placement
function ze(e) {
  return pe(e).replaceAll("~", "~0").replaceAll("/", "~1");
}
//@ chunk-22r83hv0.js:21486-21497 placement
var ce = 300;
//@ chunk-22r83hv0.js:21497-21553 placement
function Qe(e) {
  return e.length > ce ? `\u2026${takeLastChars(e, ce)}` : e;
}
//@ chunk-22r83hv0.js:21553-21641 placement
function pe(e) {
  let n = stripFormatChars(e.replace(/\s+/g, " "));
  return n.length > se ? `${truncateToLength(n, se)}\u2026` : n;
}
//@ chunk-22r83hv0.js:21641-21911 placement
var SUPPORTED_SCHEMA_KEYWORDS = new Set([
    "$schema",
    "type",
    "description",
    "title",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "enum",
    "const",
    "anyOf",
  ]),
  Je = new Set(["$schema", "description", "title"]),
  me = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]),
  Ze = 32,
  en = 1e5;
/**
 * 规整结构化输出 schema（检查深度、节点数与关键字），根必须是 object。
 */
//@ chunk-22r83hv0.js:21911-22114 placement
function normalizeOutputSchema(e) {
  let n = walkOutputSchema(e, Ze, { remaining: en });
  if ("reason" in n) return { ok: !1, reason: n.reason };
  if (n.node.type !== "object") return { ok: !1, reason: "root_not_object" };
  return { ok: !0, schema: { ...n.node, type: "object" } };
}
//@ chunk-22r83hv0.js:22114-22229 placement
function isJsonScalar(e) {
  return (
    e === null ||
    typeof e === "string" ||
    (typeof e === "number" && Number.isFinite(e)) ||
    typeof e === "boolean"
  );
}
/**
 * 遍历输出 JSON Schema，检查深度/节点数上限与不支持的关键字
 */
//@ chunk-22r83hv0.js:22229-24633 placement
function walkOutputSchema(e, n, r) {
  if (n <= 0) return { reason: "max_depth" };
  if (--r.remaining < 0) return { reason: "max_nodes" };
  if (!isPlainObject(e)) return { reason: "not_object" };
  for (let f of Object.keys(e))
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(f)) return { reason: "unsupported_keyword" };
  let s = {};
  if (e.description !== void 0) {
    if (typeof e.description !== "string") return { reason: "unsupported_keyword" };
    s.description = e.description;
  }
  if (e.title !== void 0) {
    if (typeof e.title !== "string") return { reason: "unsupported_keyword" };
    s.title = e.title;
  }
  if (e.anyOf !== void 0) {
    for (let E of Object.keys(e)) if (E !== "anyOf" && !Je.has(E)) return { reason: "unsupported_keyword" };
    if (!Array.isArray(e.anyOf) || e.anyOf.length === 0) return { reason: "unsupported_keyword" };
    let f = [];
    for (let E of e.anyOf) {
      let h = walkOutputSchema(E, n - 1, r);
      if ("reason" in h) return h;
      f.push(h.node);
    }
    return ((s.anyOf = f), { node: s });
  }
  if (e.const !== void 0) {
    if (!isJsonScalar(e.const)) return { reason: "unsupported_const" };
    s.const = e.const;
  }
  if (e.enum !== void 0) {
    if (
      !Array.isArray(e.enum) ||
      e.enum.length === 0 ||
      !e.enum.every(isJsonScalar) ||
      new Set(e.enum).size !== e.enum.length
    )
      return { reason: "unsupported_enum" };
    s.enum = e.enum.slice();
  }
  let d = e.type;
  if (d !== void 0)
    if (typeof d === "string") {
      if (!me.has(d)) return { reason: "unsupported_type" };
      s.type = d;
    } else if (Array.isArray(d)) {
      if (
        d.length === 0 ||
        !d.every((f) => typeof f === "string" && me.has(f) && f !== "object" && f !== "array") ||
        new Set(d).size !== d.length
      )
        return { reason: "unsupported_type" };
      s.type = d.slice();
    } else return { reason: "unsupported_type" };
  if (
    d !== "object" &&
    (e.properties !== void 0 || e.required !== void 0 || e.additionalProperties !== void 0)
  )
    return { reason: "mismatched_keywords" };
  if (d !== "array" && e.items !== void 0) return { reason: "mismatched_keywords" };
  if (d === "object") {
    let properties = e.properties;
    if (!isPlainObject(properties)) return { reason: "no_properties" };
    if (e.additionalProperties !== void 0 && e.additionalProperties !== !1)
      return { reason: "additional_properties" };
    if (e.required !== void 0) {
      if (
        !Array.isArray(e.required) ||
        !e.required.every((h) => typeof h === "string" && Object.hasOwn(properties, h)) ||
        new Set(e.required).size !== e.required.length
      )
        return { reason: "invalid_required" };
      s.required = e.required.slice();
    }
    let E = [];
    for (let [h, g] of Object.entries(properties)) {
      let v = walkOutputSchema(g, n - 1, r);
      if ("reason" in v) return v;
      E.push([h, v.node]);
    }
    ((s.properties = Object.fromEntries(E)), (s.additionalProperties = !1));
  } else if (d === "array") {
    let items = e.items;
    if (items === void 0 || Array.isArray(items)) return { reason: "unsupported_items" };
    let E = walkOutputSchema(items, n - 1, r);
    if ("reason" in E) return E;
    s.items = E.node;
  } else if (d === void 0 && s.enum === void 0 && !("const" in s)) return { reason: "missing_type" };
  return { node: s };
}
//@ chunk-22r83hv0.js:27797-27814 placement
var _e = 300,
  ye = 80;
/**
 * 把 Ajv 校验错误格式化为可读文本（附带额外属性名、实际长度/数量、允许的 enum/const 值）。
 */
//@ chunk-22r83hv0.js:27814-28629 placement
function formatSchemaError(e, n) {
  let r = `${e.instancePath || "root"}: ${e.message}`;
  switch (e.keyword) {
    case "additionalProperties": {
      let additionalProperty = e.params.additionalProperty;
      return typeof additionalProperty === "string"
        ? `${r} ('${additionalProperty.length > ye ? truncateToLength(additionalProperty, ye) + "\u2026" : additionalProperty}' is not allowed)`
        : r;
    }
    case "minLength":
    case "maxLength": {
      let s = valueAtPointer(n, e.instancePath);
      return typeof s === "string" ? `${r} (got ${[...s].length})` : r;
    }
    case "minItems":
    case "maxItems": {
      let s = valueAtPointer(n, e.instancePath);
      return Array.isArray(s) ? `${r} (got ${s.length})` : r;
    }
    case "minProperties":
    case "maxProperties": {
      let s = valueAtPointer(n, e.instancePath);
      return isPlainObject(s) ? `${r} (got ${Object.keys(s).length})` : r;
    }
    case "enum": {
      let allowedValues = e.params.allowedValues,
        d = Array.isArray(allowedValues) ? jsonExcerpt(allowedValues) : void 0;
      return d === void 0 ? r : `${r}: ${d}`;
    }
    case "const": {
      let s = "allowedValue" in e.params ? jsonExcerpt(e.params.allowedValue) : void 0;
      return s === void 0 ? r : `${r}: ${s}`;
    }
    default:
      return r;
  }
}
//@ chunk-22r83hv0.js:28629-28835 placement
function valueAtPointer(e, n) {
  let r = e;
  for (let s of n.split("/").slice(1)) {
    let replaced = s.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(r)) r = r[Number(replaced)];
    else if (isPlainObject(r) && Object.hasOwn(r, replaced)) r = r[replaced];
    else return;
  }
  return r;
}
//@ chunk-22r83hv0.js:28835-28949 placement
function jsonExcerpt(e) {
  let n;
  try {
    n = jsonStringify(e);
  } catch {
    return;
  }
  if (typeof n !== "string") return;
  return n.length > _e ? truncateToLength(n, _e) + "\u2026" : n;
}

export { checkSchemaSatisfiable, formatSchemaError, normalizeOutputSchema, checkOutputSchemaSatisfiable };
