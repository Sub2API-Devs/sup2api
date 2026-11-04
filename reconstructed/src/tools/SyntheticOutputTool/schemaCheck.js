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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-22r83hv0.js:16402-16501 placement
/**
 * schema 可满足性检查的最大深度（32）。
 */
var MAX_SCHEMA_DEPTH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_SCHEMA_NODES;
var MAX_SCHEMA_LABEL_CHARS;
var SCHEMA_TYPES;
deferInit("chunk-22r83hv0.js:16402", () => {
  MAX_SCHEMA_DEPTH = 32;
  MAX_SCHEMA_NODES = 1e5;
  MAX_SCHEMA_LABEL_CHARS = 80;
  SCHEMA_TYPES = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]);
});
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
function checkOutputSchemaSatisfiable(schema) {
  if (ownOrUndefined(schema, "type") !== "object")
    return {
      ok: false,
      finding: {
        reason: "root_not_object",
        scope: "whole",
        message:
          "the root schema must declare type: 'object' (the API rejects any other root type for a tool input schema); wrap arrays or primitives in an object property",
      },
    };
  let unsatisfiable = findUnsatisfiable(schema, "", true, MAX_SCHEMA_DEPTH, {
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
function findUnsatisfiable(schema, pointer, inWholeScope, depthLeft, budget) {
  if (depthLeft <= 0 || --budget.remaining < 0) return;
  if (!isPlainObject(schema) || Object.hasOwn(schema, "$ref")) return;
  let types = declaredTypes(schema);
  let reason = unsatisfiableReason(schema, pointer, types);
  if (reason !== undefined)
    return {
      ...reason,
      scope: inWholeScope ? "whole" : "subschema",
    };
  let properties = ownOrUndefined(schema, "properties");
  if (typeIncludes(types, "object") && isPlainObject(properties)) {
    let requiredList = ownOrUndefined(schema, "required");
    let requiredNames = new Set(Array.isArray(requiredList) ? requiredList.filter(isSafePropertyName) : []);
    let onlyObjectType = isOnlyType(types, "object");
    for (let [key, value] of Object.entries(properties)) {
      if (key === "__proto__") continue;
      let unsatisfiable = findUnsatisfiable(
        value,
        `${pointer}/properties/${escapeJsonPointer(key)}`,
        inWholeScope && onlyObjectType && requiredNames.has(key),
        depthLeft - 1,
        budget,
      );
      if (unsatisfiable !== undefined) return unsatisfiable;
    }
  }
  let items = ownOrUndefined(schema, "items");
  if (typeIncludes(types, "array") && isPlainObject(items))
    return findUnsatisfiable(items, `${pointer}/items`, false, depthLeft - 1, budget);
  return;
}
//@ chunk-22r83hv0.js:17751-19074 placement
/**
 * 判断一个 schema 节点是否自相矛盾：required 中有未声明且禁止额外属性的键、enum/const 与 type 不符、取值范围交叉。
 */
function unsatisfiableReason(schema, pointer, types) {
  let subjectLabel = pointer === "" ? "the root object" : `the sub-schema at ${shortenPointer(pointer)}`;
  let requiredList = ownOrUndefined(schema, "required");
  if (
    isOnlyType(types, "object") &&
    Array.isArray(requiredList) &&
    ownOrUndefined(schema, "additionalProperties") === false &&
    ownOrUndefined(schema, "patternProperties") === undefined
  ) {
    let properties = ownOrUndefined(schema, "properties");
    let propertyMap = isPlainObject(properties) ? properties : {};
    for (let propName of requiredList)
      if (isSafePropertyName(propName) && !Object.hasOwn(propertyMap, propName))
        return {
          reason: "required_property_forbidden",
          message: `${subjectLabel} lists "${normalizeLabel(propName)}" in required but does not declare it in properties, and additionalProperties is false, so no object can satisfy it \u2014 declare the property or drop it from required`,
        };
  }
  let enumValues = ownOrUndefined(schema, "enum");
  if (types !== undefined && Array.isArray(enumValues) && enumValues.length > 0) {
    if (!enumValues.some((enumValue) => matchesAnyType(types, enumValue)))
      return {
        reason: "enum_type_mismatch",
        message: `${subjectLabel} declares type ${formatTypeList(types)} but none of its enum values has that type, so no value can satisfy it \u2014 change type to match the enum values or vice versa`,
      };
  }
  let constValue = ownOrUndefined(schema, "const");
  if (constValue !== undefined) {
    if (types !== undefined && !matchesAnyType(types, constValue))
      return {
        reason: "const_mismatch",
        message: `${subjectLabel} declares type ${formatTypeList(types)} but its const value does not have that type, so no value can satisfy it`,
      };
    if (
      Array.isArray(enumValues) &&
      enumValues.length > 0 &&
      isPrimitiveValue(constValue) &&
      !enumValues.some((enumValue) => enumValue === constValue)
    )
      return {
        reason: "const_mismatch",
        message: `${subjectLabel} has a const value that is not one of its enum values, so no value can satisfy it`,
      };
  }
  let boundsReason = crossedBoundsReason(schema, types);
  if (boundsReason !== undefined)
    return {
      reason: "crossed_bounds",
      message: `${subjectLabel} has ${boundsReason}, so no value can satisfy it`,
    };
  return;
}
//@ chunk-22r83hv0.js:19074-20110 placement
/**
 * 检查数值/字符串/数组/对象的上下界是否交叉（含 required 数超过 maxProperties）。
 */
function crossedBoundsReason(schema, types) {
  if (isOnlyType(types, "number") || isOnlyType(types, "integer") || isTwoTypes(types, "number", "integer")) {
    let minimum = finiteNumberOrUndefined(ownOrUndefined(schema, "minimum"));
    let exclusiveMinimum = finiteNumberOrUndefined(ownOrUndefined(schema, "exclusiveMinimum"));
    let maximum = finiteNumberOrUndefined(ownOrUndefined(schema, "maximum"));
    let exclusiveMaximum = finiteNumberOrUndefined(ownOrUndefined(schema, "exclusiveMaximum"));
    let lowerBound =
      exclusiveMinimum !== undefined && (minimum === undefined || exclusiveMinimum >= minimum)
        ? {
            value: exclusiveMinimum,
            exclusive: true,
            keyword: "exclusiveMinimum",
          }
        : minimum !== undefined
          ? {
              value: minimum,
              exclusive: false,
              keyword: "minimum",
            }
          : undefined;
    let upperBound =
      exclusiveMaximum !== undefined && (maximum === undefined || exclusiveMaximum <= maximum)
        ? {
            value: exclusiveMaximum,
            exclusive: true,
            keyword: "exclusiveMaximum",
          }
        : maximum !== undefined
          ? {
              value: maximum,
              exclusive: false,
              keyword: "maximum",
            }
          : undefined;
    if (
      lowerBound !== undefined &&
      upperBound !== undefined &&
      (lowerBound.value > upperBound.value ||
        (lowerBound.value === upperBound.value && (lowerBound.exclusive || upperBound.exclusive)))
    )
      return `${lowerBound.keyword} ${lowerBound.value} and ${upperBound.keyword} ${upperBound.value}, which admit no number`;
  }
  if (isOnlyType(types, "string")) {
    let lengthReason = crossedPairReason(schema, "minLength", "maxLength");
    if (lengthReason !== undefined) return lengthReason;
  }
  if (isOnlyType(types, "array")) {
    let itemsReason = crossedPairReason(schema, "minItems", "maxItems");
    if (itemsReason !== undefined) return itemsReason;
  }
  if (isOnlyType(types, "object")) {
    let propertiesReason = crossedPairReason(schema, "minProperties", "maxProperties");
    if (propertiesReason !== undefined) return propertiesReason;
    let maxProperties = finiteNumberOrUndefined(ownOrUndefined(schema, "maxProperties"));
    let requiredList = ownOrUndefined(schema, "required");
    if (maxProperties !== undefined && Array.isArray(requiredList)) {
      let requiredCount = count(requiredList, isSafePropertyName);
      if (requiredCount > maxProperties)
        return `${requiredCount} required properties but maxProperties ${maxProperties}`;
    }
  }
  return;
}
//@ chunk-22r83hv0.js:20110-20233 placement
function crossedPairReason(schema, minKey, maxKey) {
  let minValue = finiteNumberOrUndefined(ownOrUndefined(schema, minKey));
  let maxValue = finiteNumberOrUndefined(ownOrUndefined(schema, maxKey));
  return minValue !== undefined && maxValue !== undefined && minValue > maxValue
    ? `${minKey} ${minValue} greater than ${maxKey} ${maxValue}`
    : undefined;
}
//@ chunk-22r83hv0.js:20233-20484 placement
function declaredTypes(schema) {
  let declared = ownOrUndefined(schema, "type");
  let types;
  if (typeof declared === "string" && SCHEMA_TYPES.has(declared)) types = [declared];
  else if (
    Array.isArray(declared) &&
    declared.length > 0 &&
    declared.every((typeName) => typeof typeName === "string" && SCHEMA_TYPES.has(typeName))
  )
    types = declared.slice();
  else return;
  if (ownOrUndefined(schema, "nullable") === true && !types.includes("null")) types.push("null");
  return types;
}
//@ chunk-22r83hv0.js:20484-20551 placement
/**
 * 属性名是字符串且不是原型上的名字（避免原型污染）。
 */
function isSafePropertyName(name) {
  return typeof name === "string" && !(name in Object.prototype);
}
//@ chunk-22r83hv0.js:20551-20601 placement
/**
 * 声明的类型里是否包含给定类型（未声明时视为包含）。
 */
function typeIncludes(types, typeName) {
  return types === undefined || types.includes(typeName);
}
//@ chunk-22r83hv0.js:20601-20659 placement
/**
 * 声明的类型恰好只有一种。
 */
function isOnlyType(types, typeName) {
  return types !== undefined && types.length === 1 && types[0] === typeName;
}
//@ chunk-22r83hv0.js:20659-20752 placement
/**
 * 声明的类型恰好是给定的两个之一（顺序无关）。
 */
function isTwoTypes(types, first, second) {
  return (
    types !== undefined &&
    types.length === 2 &&
    ((types[0] === first && types[1] === second) || (types[0] === second && types[1] === first))
  );
}
//@ chunk-22r83hv0.js:20752-21111 placement
/**
 * 判断值是否匹配任一声明类型。
 */
function matchesAnyType(types, value) {
  return types.some((typeName) => {
    switch (typeName) {
      case "null":
        return value === null;
      case "boolean":
        return typeof value === "boolean";
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && Number.isFinite(value);
      case "integer":
        return typeof value === "number" && Number.isInteger(value);
      case "array":
        return Array.isArray(value);
      case "object":
        return isPlainObject(value);
      default:
        return true;
    }
  });
}
//@ chunk-22r83hv0.js:21111-21206 placement
/**
 * 值是否为基础类型（null/字符串/数字/布尔）。
 */
function isPrimitiveValue(value) {
  return (
    value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );
}
//@ chunk-22r83hv0.js:21206-21276 placement
/**
 * 有限数字则返回，否则 undefined。
 */
function finiteNumberOrUndefined(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
//@ chunk-22r83hv0.js:21276-21330 placement
/**
 * 只读自有属性，缺失返回 undefined。
 */
function ownOrUndefined(object, key) {
  return Object.hasOwn(object, key) ? object[key] : undefined;
}
//@ chunk-22r83hv0.js:21330-21416 placement
/**
 * 把类型列表格式化成单引号文本。
 */
function formatTypeList(types) {
  return types.length === 1 ? `'${types[0]}'` : `[${types.map((typeName) => `'${typeName}'`).join(", ")}]`;
}
//@ chunk-22r83hv0.js:21416-21486 placement
/**
 * 按 JSON Pointer 规则转义属性名（~ 与 /）。
 */
function escapeJsonPointer(pointer) {
  return normalizeLabel(pointer).replaceAll("~", "~0").replaceAll("/", "~1");
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
function shortenPointer(pointer) {
  return pointer.length > MAX_POINTER_TAIL_CHARS
    ? `\u2026${takeLastChars(pointer, MAX_POINTER_TAIL_CHARS)}`
    : pointer;
}
//@ chunk-22r83hv0.js:21553-21641 placement
/**
 * 折叠空白并截断标签文本，用于错误信息。
 */
function normalizeLabel(label) {
  let normalized = stripFormatChars(label.replace(/\s+/g, " "));
  return normalized.length > MAX_SCHEMA_LABEL_CHARS
    ? `${truncateToLength(normalized, MAX_SCHEMA_LABEL_CHARS)}\u2026`
    : normalized;
}
//@ chunk-22r83hv0.js:21641-21911 placement
/**
 * anyOf 之外允许出现的元信息关键字。
 */
var SUPPORTED_SCHEMA_KEYWORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUPPORTED_OVERLAY_KEYWORDS;
var SCHEMA_TYPE_SET;
var OUTPUT_SCHEMA_MAX_DEPTH;
var OUTPUT_SCHEMA_MAX_NODES;
deferInit("chunk-22r83hv0.js:21641", () => {
  SUPPORTED_SCHEMA_KEYWORDS = new Set([
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
  SUPPORTED_OVERLAY_KEYWORDS = new Set(["$schema", "description", "title"]);
  SCHEMA_TYPE_SET = new Set(["object", "array", "string", "integer", "number", "boolean", "null"]);
  OUTPUT_SCHEMA_MAX_DEPTH = 32;
  OUTPUT_SCHEMA_MAX_NODES = 1e5;
});
//@ chunk-22r83hv0.js:21911-22114 placement
/**
 * 规整结构化输出 schema（检查深度、节点数与关键字），根必须是 object。
 */
function normalizeOutputSchema(schema) {
  let walkResult = walkOutputSchema(schema, OUTPUT_SCHEMA_MAX_DEPTH, {
    remaining: OUTPUT_SCHEMA_MAX_NODES,
  });
  if ("reason" in walkResult)
    return {
      ok: false,
      reason: walkResult.reason,
    };
  if (walkResult.node.type !== "object")
    return {
      ok: false,
      reason: "root_not_object",
    };
  return {
    ok: true,
    schema: {
      ...walkResult.node,
      type: "object",
    },
  };
}
//@ chunk-22r83hv0.js:22114-22229 placement
function isJsonScalar(value) {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}
//@ chunk-22r83hv0.js:22229-24633 placement
/**
 * 遍历输出 JSON Schema，检查深度/节点数上限与不支持的关键字
 */
function walkOutputSchema(node, depthLeft, budget) {
  if (depthLeft <= 0)
    return {
      reason: "max_depth",
    };
  if (--budget.remaining < 0)
    return {
      reason: "max_nodes",
    };
  if (!isPlainObject(node))
    return {
      reason: "not_object",
    };
  for (let key of Object.keys(node))
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(key))
      return {
        reason: "unsupported_keyword",
      };
  let out = {};
  if (node.description !== undefined) {
    if (typeof node.description !== "string")
      return {
        reason: "unsupported_keyword",
      };
    out.description = node.description;
  }
  if (node.title !== undefined) {
    if (typeof node.title !== "string")
      return {
        reason: "unsupported_keyword",
      };
    out.title = node.title;
  }
  if (node.anyOf !== undefined) {
    for (let key of Object.keys(node))
      if (key !== "anyOf" && !SUPPORTED_OVERLAY_KEYWORDS.has(key))
        return {
          reason: "unsupported_keyword",
        };
    if (!Array.isArray(node.anyOf) || node.anyOf.length === 0)
      return {
        reason: "unsupported_keyword",
      };
    let variants = [];
    for (let variant of node.anyOf) {
      let variantResult = walkOutputSchema(variant, depthLeft - 1, budget);
      if ("reason" in variantResult) return variantResult;
      variants.push(variantResult.node);
    }
    out.anyOf = variants;
    return {
      node: out,
    };
  }
  if (node.const !== undefined) {
    if (!isJsonScalar(node.const))
      return {
        reason: "unsupported_const",
      };
    out.const = node.const;
  }
  if (node.enum !== undefined) {
    if (
      !Array.isArray(node.enum) ||
      node.enum.length === 0 ||
      !node.enum.every(isJsonScalar) ||
      new Set(node.enum).size !== node.enum.length
    )
      return {
        reason: "unsupported_enum",
      };
    out.enum = node.enum.slice();
  }
  let declaredType = node.type;
  if (declaredType !== undefined)
    if (typeof declaredType === "string") {
      if (!SCHEMA_TYPE_SET.has(declaredType))
        return {
          reason: "unsupported_type",
        };
      out.type = declaredType;
    } else if (Array.isArray(declaredType)) {
      if (
        declaredType.length === 0 ||
        !declaredType.every(
          (typeName) =>
            typeof typeName === "string" &&
            SCHEMA_TYPE_SET.has(typeName) &&
            typeName !== "object" &&
            typeName !== "array",
        ) ||
        new Set(declaredType).size !== declaredType.length
      )
        return {
          reason: "unsupported_type",
        };
      out.type = declaredType.slice();
    } else
      return {
        reason: "unsupported_type",
      };
  if (
    declaredType !== "object" &&
    (node.properties !== undefined || node.required !== undefined || node.additionalProperties !== undefined)
  )
    return {
      reason: "mismatched_keywords",
    };
  if (declaredType !== "array" && node.items !== undefined)
    return {
      reason: "mismatched_keywords",
    };
  if (declaredType === "object") {
    let properties = node.properties;
    if (!isPlainObject(properties))
      return {
        reason: "no_properties",
      };
    if (node.additionalProperties !== undefined && node.additionalProperties !== false)
      return {
        reason: "additional_properties",
      };
    if (node.required !== undefined) {
      if (
        !Array.isArray(node.required) ||
        !node.required.every(
          (requiredName) => typeof requiredName === "string" && Object.hasOwn(properties, requiredName),
        ) ||
        new Set(node.required).size !== node.required.length
      )
        return {
          reason: "invalid_required",
        };
      out.required = node.required.slice();
    }
    let propertyEntries = [];
    for (let [key, value] of Object.entries(properties)) {
      let propertyResult = walkOutputSchema(value, depthLeft - 1, budget);
      if ("reason" in propertyResult) return propertyResult;
      propertyEntries.push([key, propertyResult.node]);
    }
    out.properties = Object.fromEntries(propertyEntries);
    out.additionalProperties = false;
  } else if (declaredType === "array") {
    let items = node.items;
    if (items === undefined || Array.isArray(items))
      return {
        reason: "unsupported_items",
      };
    let itemsResult = walkOutputSchema(items, depthLeft - 1, budget);
    if ("reason" in itemsResult) return itemsResult;
    out.items = itemsResult.node;
  } else if (declaredType === undefined && out.enum === undefined && !("const" in out))
    return {
      reason: "missing_type",
    };
  return {
    node: out,
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
function formatSchemaError(error, data) {
  let baseMessage = `${error.instancePath || "root"}: ${error.message}`;
  switch (error.keyword) {
    case "additionalProperties": {
      let additionalProperty = error.params.additionalProperty;
      return typeof additionalProperty === "string"
        ? `${baseMessage} ('${additionalProperty.length > MAX_PROPERTY_NAME_DISPLAY_CHARS ? truncateToLength(additionalProperty, MAX_PROPERTY_NAME_DISPLAY_CHARS) + "\u2026" : additionalProperty}' is not allowed)`
        : baseMessage;
    }
    case "minLength":
    case "maxLength": {
      let value = valueAtPointer(data, error.instancePath);
      return typeof value === "string" ? `${baseMessage} (got ${[...value].length})` : baseMessage;
    }
    case "minItems":
    case "maxItems": {
      let value = valueAtPointer(data, error.instancePath);
      return Array.isArray(value) ? `${baseMessage} (got ${value.length})` : baseMessage;
    }
    case "minProperties":
    case "maxProperties": {
      let value = valueAtPointer(data, error.instancePath);
      return isPlainObject(value) ? `${baseMessage} (got ${Object.keys(value).length})` : baseMessage;
    }
    case "enum": {
      let allowedValues = error.params.allowedValues;
      let allowedExcerpt = Array.isArray(allowedValues) ? jsonExcerpt(allowedValues) : undefined;
      return allowedExcerpt === undefined ? baseMessage : `${baseMessage}: ${allowedExcerpt}`;
    }
    case "const": {
      let constExcerpt = "allowedValue" in error.params ? jsonExcerpt(error.params.allowedValue) : undefined;
      return constExcerpt === undefined ? baseMessage : `${baseMessage}: ${constExcerpt}`;
    }
    default:
      return baseMessage;
  }
}
//@ chunk-22r83hv0.js:28629-28835 placement
function valueAtPointer(data, instancePath) {
  let current = data;
  for (let segment of instancePath.split("/").slice(1)) {
    let replaced = segment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(current)) current = current[Number(replaced)];
    else if (isPlainObject(current) && Object.hasOwn(current, replaced)) current = current[replaced];
    else return;
  }
  return current;
}
//@ chunk-22r83hv0.js:28835-28949 placement
function jsonExcerpt(value) {
  let serialized;
  try {
    serialized = jsonStringify(value);
  } catch {
    return;
  }
  if (typeof serialized !== "string") return;
  return serialized.length > MAX_FORMATTED_ERROR_CHARS
    ? truncateToLength(serialized, MAX_FORMATTED_ERROR_CHARS) + "\u2026"
    : serialized;
}
export { checkSchemaSatisfiable, formatSchemaError, normalizeOutputSchema, checkOutputSchemaSatisfiable };
