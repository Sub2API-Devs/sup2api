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
/**
 * schema 可满足性检查的最大深度（32）。
 */
var MAX_SCHEMA_DEPTH = 32;
var MAX_SCHEMA_NODES = 1e5;
var MAX_SCHEMA_LABEL_CHARS = 80;
var SCHEMA_TYPES = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]);
//@ chunk-22r83hv0.js:16501-16869 placement
/**
 * 检查 JSON Schema 是否对象根且可满足，否则结构化输出无法通过
 */
function checkSchemaSatisfiable(unsatisfiable) {
  if (unsatisfiable.reason === "root_not_object")
    return "the API only accepts an object-rooted tool input schema, so every request would be rejected";
  return unsatisfiable.scope === "whole"
    ? "no output can satisfy this schema, so StructuredOutput validation would fail on every attempt"
    : "one property or item sub-schema admits no value, so any output that fills it in fails validation";
}
//@ chunk-22r83hv0.js:16869-17217 placement
/**
 * 检查结构化输出 schema 是否可满足：根必须是 object，再递归查找矛盾的子 schema。
 */
function checkOutputSchemaSatisfiable(jsonSchema) {
  if (ownOrUndefined(jsonSchema, "type") !== "object")
    return {
      ok: false,
      finding: {
        reason: "root_not_object",
        scope: "whole",
        message:
          "the root schema must declare type: 'object' (the API rejects any other root type for a tool input schema); wrap arrays or primitives in an object property",
      },
    };
  let unsatisfiable = findUnsatisfiable(jsonSchema, "", true, MAX_SCHEMA_DEPTH, {
    remaining: MAX_SCHEMA_NODES,
  });
  return unsatisfiable === undefined
    ? {
        ok: true,
      }
    : {
        ok: false,
        finding: unsatisfiable,
      };
}
//@ chunk-22r83hv0.js:17217-17751 placement
/**
 * 递归查找不可满足的子 schema（深度与节点预算）。
 */
function findUnsatisfiable(e, n, r, s, d) {
  if (s <= 0 || --d.remaining < 0) return;
  if (!isPlainObject(e) || Object.hasOwn(e, "$ref")) return;
  let f = declaredTypes(e);
  let E = unsatisfiableReason(e, n, f);
  if (E !== undefined)
    return {
      ...E,
      scope: r ? "whole" : "subschema",
    };
  let h = ownOrUndefined(e, "properties");
  if (typeIncludes(f, "object") && isPlainObject(h)) {
    let v = ownOrUndefined(e, "required");
    let y = new Set(Array.isArray(v) ? v.filter(isSafePropertyName) : []);
    let A = isOnlyType(f, "object");
    for (let [key, value] of Object.entries(h)) {
      if (key === "__proto__") continue;
      let unsatisfiable = findUnsatisfiable(
        value,
        `${n}/properties/${escapeJsonPointer(key)}`,
        r && A && y.has(key),
        s - 1,
        d,
      );
      if (unsatisfiable !== undefined) return unsatisfiable;
    }
  }
  let g = ownOrUndefined(e, "items");
  if (typeIncludes(f, "array") && isPlainObject(g))
    return findUnsatisfiable(g, `${n}/items`, false, s - 1, d);
  return;
}
//@ chunk-22r83hv0.js:17751-19074 placement
/**
 * 判断一个 schema 节点是否自相矛盾：required 中有未声明且禁止额外属性的键、enum/const 与 type 不符、取值范围交叉。
 */
function unsatisfiableReason(e, n, r) {
  let subjectLabel = n === "" ? "the root object" : `the sub-schema at ${shortenPointer(n)}`;
  let d = ownOrUndefined(e, "required");
  if (
    isOnlyType(r, "object") &&
    Array.isArray(d) &&
    ownOrUndefined(e, "additionalProperties") === false &&
    ownOrUndefined(e, "patternProperties") === undefined
  ) {
    let g = ownOrUndefined(e, "properties");
    let v = isPlainObject(g) ? g : {};
    for (let y of d)
      if (isSafePropertyName(y) && !Object.hasOwn(v, y))
        return {
          reason: "required_property_forbidden",
          message: `${subjectLabel} lists "${normalizeLabel(y)}" in required but does not declare it in properties, and additionalProperties is false, so no object can satisfy it \u2014 declare the property or drop it from required`,
        };
  }
  let f = ownOrUndefined(e, "enum");
  if (r !== undefined && Array.isArray(f) && f.length > 0) {
    if (!f.some((g) => matchesAnyType(r, g)))
      return {
        reason: "enum_type_mismatch",
        message: `${subjectLabel} declares type ${formatTypeList(r)} but none of its enum values has that type, so no value can satisfy it \u2014 change type to match the enum values or vice versa`,
      };
  }
  let E = ownOrUndefined(e, "const");
  if (E !== undefined) {
    if (r !== undefined && !matchesAnyType(r, E))
      return {
        reason: "const_mismatch",
        message: `${subjectLabel} declares type ${formatTypeList(r)} but its const value does not have that type, so no value can satisfy it`,
      };
    if (Array.isArray(f) && f.length > 0 && isPrimitiveValue(E) && !f.some((g) => g === E))
      return {
        reason: "const_mismatch",
        message: `${subjectLabel} has a const value that is not one of its enum values, so no value can satisfy it`,
      };
  }
  let h = crossedBoundsReason(e, r);
  if (h !== undefined)
    return {
      reason: "crossed_bounds",
      message: `${subjectLabel} has ${h}, so no value can satisfy it`,
    };
  return;
}
//@ chunk-22r83hv0.js:19074-20110 placement
/**
 * 检查数值/字符串/数组/对象的上下界是否交叉（含 required 数超过 maxProperties）。
 */
function crossedBoundsReason(e, n) {
  if (isOnlyType(n, "number") || isOnlyType(n, "integer") || isTwoTypes(n, "number", "integer")) {
    let r = finiteNumberOrUndefined(ownOrUndefined(e, "minimum"));
    let s = finiteNumberOrUndefined(ownOrUndefined(e, "exclusiveMinimum"));
    let d = finiteNumberOrUndefined(ownOrUndefined(e, "maximum"));
    let f = finiteNumberOrUndefined(ownOrUndefined(e, "exclusiveMaximum"));
    let E =
      s !== undefined && (r === undefined || s >= r)
        ? {
            value: s,
            exclusive: true,
            keyword: "exclusiveMinimum",
          }
        : r !== undefined
          ? {
              value: r,
              exclusive: false,
              keyword: "minimum",
            }
          : undefined;
    let h =
      f !== undefined && (d === undefined || f <= d)
        ? {
            value: f,
            exclusive: true,
            keyword: "exclusiveMaximum",
          }
        : d !== undefined
          ? {
              value: d,
              exclusive: false,
              keyword: "maximum",
            }
          : undefined;
    if (
      E !== undefined &&
      h !== undefined &&
      (E.value > h.value || (E.value === h.value && (E.exclusive || h.exclusive)))
    )
      return `${E.keyword} ${E.value} and ${h.keyword} ${h.value}, which admit no number`;
  }
  if (isOnlyType(n, "string")) {
    let r = crossedPairReason(e, "minLength", "maxLength");
    if (r !== undefined) return r;
  }
  if (isOnlyType(n, "array")) {
    let r = crossedPairReason(e, "minItems", "maxItems");
    if (r !== undefined) return r;
  }
  if (isOnlyType(n, "object")) {
    let r = crossedPairReason(e, "minProperties", "maxProperties");
    if (r !== undefined) return r;
    let s = finiteNumberOrUndefined(ownOrUndefined(e, "maxProperties"));
    let d = ownOrUndefined(e, "required");
    if (s !== undefined && Array.isArray(d)) {
      let f = count(d, isSafePropertyName);
      if (f > s) return `${f} required properties but maxProperties ${s}`;
    }
  }
  return;
}
//@ chunk-22r83hv0.js:20110-20233 placement
function crossedPairReason(e, n, r) {
  let s = finiteNumberOrUndefined(ownOrUndefined(e, n));
  let d = finiteNumberOrUndefined(ownOrUndefined(e, r));
  return s !== undefined && d !== undefined && s > d ? `${n} ${s} greater than ${r} ${d}` : undefined;
}
//@ chunk-22r83hv0.js:20233-20484 placement
function declaredTypes(e) {
  let n = ownOrUndefined(e, "type");
  let r;
  if (typeof n === "string" && SCHEMA_TYPES.has(n)) r = [n];
  else if (Array.isArray(n) && n.length > 0 && n.every((s) => typeof s === "string" && SCHEMA_TYPES.has(s)))
    r = n.slice();
  else return;
  if (ownOrUndefined(e, "nullable") === true && !r.includes("null")) r.push("null");
  return r;
}
//@ chunk-22r83hv0.js:20484-20551 placement
/**
 * 属性名是字符串且不是原型上的名字（避免原型污染）。
 */
function isSafePropertyName(e) {
  return typeof e === "string" && !(e in Object.prototype);
}
//@ chunk-22r83hv0.js:20551-20601 placement
/**
 * 声明的类型里是否包含给定类型（未声明时视为包含）。
 */
function typeIncludes(e, n) {
  return e === undefined || e.includes(n);
}
//@ chunk-22r83hv0.js:20601-20659 placement
/**
 * 声明的类型恰好只有一种。
 */
function isOnlyType(e, n) {
  return e !== undefined && e.length === 1 && e[0] === n;
}
//@ chunk-22r83hv0.js:20659-20752 placement
/**
 * 声明的类型恰好是给定的两个之一（顺序无关）。
 */
function isTwoTypes(e, n, r) {
  return e !== undefined && e.length === 2 && ((e[0] === n && e[1] === r) || (e[0] === r && e[1] === n));
}
//@ chunk-22r83hv0.js:20752-21111 placement
/**
 * 判断值是否匹配任一声明类型。
 */
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
        return true;
    }
  });
}
//@ chunk-22r83hv0.js:21111-21206 placement
/**
 * 值是否为基础类型（null/字符串/数字/布尔）。
 */
function isPrimitiveValue(e) {
  return e === null || typeof e === "string" || typeof e === "number" || typeof e === "boolean";
}
//@ chunk-22r83hv0.js:21206-21276 placement
/**
 * 有限数字则返回，否则 undefined。
 */
function finiteNumberOrUndefined(e) {
  return typeof e === "number" && Number.isFinite(e) ? e : undefined;
}
//@ chunk-22r83hv0.js:21276-21330 placement
/**
 * 只读自有属性，缺失返回 undefined。
 */
function ownOrUndefined(e, n) {
  return Object.hasOwn(e, n) ? e[n] : undefined;
}
//@ chunk-22r83hv0.js:21330-21416 placement
/**
 * 把类型列表格式化成单引号文本。
 */
function formatTypeList(e) {
  return e.length === 1 ? `'${e[0]}'` : `[${e.map((n) => `'${n}'`).join(", ")}]`;
}
//@ chunk-22r83hv0.js:21416-21486 placement
/**
 * 按 JSON Pointer 规则转义属性名（~ 与 /）。
 */
function escapeJsonPointer(e) {
  return normalizeLabel(e).replaceAll("~", "~0").replaceAll("/", "~1");
}
//@ chunk-22r83hv0.js:21486-21497 placement
/**
 * schema 路径只保留末尾 300 字符。
 */
var MAX_POINTER_TAIL_CHARS = 300;
//@ chunk-22r83hv0.js:21497-21553 placement
/**
 * 路径过长时只返回末尾部分（前加省略号）。
 */
function shortenPointer(e) {
  return e.length > MAX_POINTER_TAIL_CHARS ? `\u2026${takeLastChars(e, MAX_POINTER_TAIL_CHARS)}` : e;
}
//@ chunk-22r83hv0.js:21553-21641 placement
/**
 * 折叠空白并截断标签文本，用于错误信息。
 */
function normalizeLabel(e) {
  let n = stripFormatChars(e.replace(/\s+/g, " "));
  return n.length > MAX_SCHEMA_LABEL_CHARS ? `${truncateToLength(n, MAX_SCHEMA_LABEL_CHARS)}\u2026` : n;
}
//@ chunk-22r83hv0.js:21641-21911 placement
/**
 * anyOf 之外允许出现的元信息关键字。
 */
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
]);
var SUPPORTED_OVERLAY_KEYWORDS = new Set(["$schema", "description", "title"]);
var SCHEMA_TYPE_SET = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]);
var OUTPUT_SCHEMA_MAX_DEPTH = 32;
var OUTPUT_SCHEMA_MAX_NODES = 1e5;
//@ chunk-22r83hv0.js:21911-22114 placement
/**
 * 规整结构化输出 schema（检查深度、节点数与关键字），根必须是 object。
 */
function normalizeOutputSchema(e) {
  let n = walkOutputSchema(e, OUTPUT_SCHEMA_MAX_DEPTH, {
    remaining: OUTPUT_SCHEMA_MAX_NODES,
  });
  if ("reason" in n)
    return {
      ok: false,
      reason: n.reason,
    };
  if (n.node.type !== "object")
    return {
      ok: false,
      reason: "root_not_object",
    };
  return {
    ok: true,
    schema: {
      ...n.node,
      type: "object",
    },
  };
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
//@ chunk-22r83hv0.js:22229-24633 placement
/**
 * 遍历输出 JSON Schema，检查深度/节点数上限与不支持的关键字
 */
function walkOutputSchema(e, n, r) {
  if (n <= 0)
    return {
      reason: "max_depth",
    };
  if (--r.remaining < 0)
    return {
      reason: "max_nodes",
    };
  if (!isPlainObject(e))
    return {
      reason: "not_object",
    };
  for (let key of Object.keys(e))
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(key))
      return {
        reason: "unsupported_keyword",
      };
  let s = {};
  if (e.description !== undefined) {
    if (typeof e.description !== "string")
      return {
        reason: "unsupported_keyword",
      };
    s.description = e.description;
  }
  if (e.title !== undefined) {
    if (typeof e.title !== "string")
      return {
        reason: "unsupported_keyword",
      };
    s.title = e.title;
  }
  if (e.anyOf !== undefined) {
    for (let key of Object.keys(e))
      if (key !== "anyOf" && !SUPPORTED_OVERLAY_KEYWORDS.has(key))
        return {
          reason: "unsupported_keyword",
        };
    if (!Array.isArray(e.anyOf) || e.anyOf.length === 0)
      return {
        reason: "unsupported_keyword",
      };
    let f = [];
    for (let E of e.anyOf) {
      let h = walkOutputSchema(E, n - 1, r);
      if ("reason" in h) return h;
      f.push(h.node);
    }
    s.anyOf = f;
    return {
      node: s,
    };
  }
  if (e.const !== undefined) {
    if (!isJsonScalar(e.const))
      return {
        reason: "unsupported_const",
      };
    s.const = e.const;
  }
  if (e.enum !== undefined) {
    if (
      !Array.isArray(e.enum) ||
      e.enum.length === 0 ||
      !e.enum.every(isJsonScalar) ||
      new Set(e.enum).size !== e.enum.length
    )
      return {
        reason: "unsupported_enum",
      };
    s.enum = e.enum.slice();
  }
  let d = e.type;
  if (d !== undefined)
    if (typeof d === "string") {
      if (!SCHEMA_TYPE_SET.has(d))
        return {
          reason: "unsupported_type",
        };
      s.type = d;
    } else if (Array.isArray(d)) {
      if (
        d.length === 0 ||
        !d.every((f) => typeof f === "string" && SCHEMA_TYPE_SET.has(f) && f !== "object" && f !== "array") ||
        new Set(d).size !== d.length
      )
        return {
          reason: "unsupported_type",
        };
      s.type = d.slice();
    } else
      return {
        reason: "unsupported_type",
      };
  if (
    d !== "object" &&
    (e.properties !== undefined || e.required !== undefined || e.additionalProperties !== undefined)
  )
    return {
      reason: "mismatched_keywords",
    };
  if (d !== "array" && e.items !== undefined)
    return {
      reason: "mismatched_keywords",
    };
  if (d === "object") {
    let properties = e.properties;
    if (!isPlainObject(properties))
      return {
        reason: "no_properties",
      };
    if (e.additionalProperties !== undefined && e.additionalProperties !== false)
      return {
        reason: "additional_properties",
      };
    if (e.required !== undefined) {
      if (
        !Array.isArray(e.required) ||
        !e.required.every((h) => typeof h === "string" && Object.hasOwn(properties, h)) ||
        new Set(e.required).size !== e.required.length
      )
        return {
          reason: "invalid_required",
        };
      s.required = e.required.slice();
    }
    let E = [];
    for (let [key, value] of Object.entries(properties)) {
      let v = walkOutputSchema(value, n - 1, r);
      if ("reason" in v) return v;
      E.push([key, v.node]);
    }
    s.properties = Object.fromEntries(E);
    s.additionalProperties = false;
  } else if (d === "array") {
    let items = e.items;
    if (items === undefined || Array.isArray(items))
      return {
        reason: "unsupported_items",
      };
    let E = walkOutputSchema(items, n - 1, r);
    if ("reason" in E) return E;
    s.items = E.node;
  } else if (d === undefined && s.enum === undefined && !("const" in s))
    return {
      reason: "missing_type",
    };
  return {
    node: s,
  };
}
//@ chunk-22r83hv0.js:27797-27814 placement
/**
 * 格式化后错误文本的最大长度（300）。
 */
var MAX_FORMATTED_ERROR_CHARS = 300;
var MAX_PROPERTY_NAME_DISPLAY_CHARS = 80;
//@ chunk-22r83hv0.js:27814-28629 placement
/**
 * 把 Ajv 校验错误格式化为可读文本（附带额外属性名、实际长度/数量、允许的 enum/const 值）。
 */
function formatSchemaError(error, n) {
  let r = `${error.instancePath || "root"}: ${error.message}`;
  switch (error.keyword) {
    case "additionalProperties": {
      let additionalProperty = error.params.additionalProperty;
      return typeof additionalProperty === "string"
        ? `${r} ('${additionalProperty.length > MAX_PROPERTY_NAME_DISPLAY_CHARS ? truncateToLength(additionalProperty, MAX_PROPERTY_NAME_DISPLAY_CHARS) + "\u2026" : additionalProperty}' is not allowed)`
        : r;
    }
    case "minLength":
    case "maxLength": {
      let s = valueAtPointer(n, error.instancePath);
      return typeof s === "string" ? `${r} (got ${[...s].length})` : r;
    }
    case "minItems":
    case "maxItems": {
      let s = valueAtPointer(n, error.instancePath);
      return Array.isArray(s) ? `${r} (got ${s.length})` : r;
    }
    case "minProperties":
    case "maxProperties": {
      let s = valueAtPointer(n, error.instancePath);
      return isPlainObject(s) ? `${r} (got ${Object.keys(s).length})` : r;
    }
    case "enum": {
      let allowedValues = error.params.allowedValues;
      let d = Array.isArray(allowedValues) ? jsonExcerpt(allowedValues) : undefined;
      return d === undefined ? r : `${r}: ${d}`;
    }
    case "const": {
      let s = "allowedValue" in error.params ? jsonExcerpt(error.params.allowedValue) : undefined;
      return s === undefined ? r : `${r}: ${s}`;
    }
    default:
      return r;
  }
}
//@ chunk-22r83hv0.js:28629-28835 placement
function valueAtPointer(e, instancePath) {
  let r = e;
  for (let s of instancePath.split("/").slice(1)) {
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
  return n.length > MAX_FORMATTED_ERROR_CHARS ? truncateToLength(n, MAX_FORMATTED_ERROR_CHARS) + "\u2026" : n;
}
export { checkSchemaSatisfiable, formatSchemaError, normalizeOutputSchema, checkOutputSchemaSatisfiable };
