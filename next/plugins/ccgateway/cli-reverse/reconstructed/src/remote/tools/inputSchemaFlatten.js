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
function resolveSchemaRef(schema, root) {
  let $ref = schema.$ref;
  if (typeof $ref !== "string") return schema;
  let match = /^#\/(\$defs|definitions)\/([^/]+)$/.exec($ref);
  if (match === null) return schema;
  let defs = root[match[1]];
  if (!isPlainObject_2(defs)) return schema;
  let resolved = defs[match[2]];
  return isPlainObject_2(resolved) ? resolved : schema;
}
//@ chunk-g54kbxqw.js:11463-11517 placement
function dedupeResolvedSchemaRefs(schemas, root) {
  return uniq(schemas.map((schema) => (isPlainObject_2(schema) ? resolveSchemaRef(schema, root) : schema)));
}
//@ chunk-g54kbxqw.js:11517-11752 placement
function describeSchemaVariantFields(schema) {
  if (!isPlainObject_2(schema)) return null;
  let required = schema.required;
  if (Array.isArray(required) && required.length > 0 && required.every((field) => typeof field === "string"))
    return required.join(", ");
  let properties = schema.properties;
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
function flattenInputSchema(schema) {
  if (!isPlainObject_2(schema))
    return {
      outcome: "unchanged",
    };
  let combinators = SCHEMA_COMBINATOR_KEYS.filter((key) => key in schema);
  if (combinators.length === 0)
    return {
      outcome: "unchanged",
    };
  try {
    let properties = Object.create(null);
    let absorbProperties = (properties_2) => {
      if (!isPlainObject_2(properties_2)) return;
      for (let [key, value] of Object.entries(properties_2))
        if (SAFE_SCHEMA_KEY_RE.test(key) && !(key in properties) && isPlainObject_2(value))
          properties[key] = value;
    };
    absorbProperties(schema.properties);
    for (let combinator of combinators) {
      let branches = schema[combinator];
      if (!Array.isArray(branches))
        return {
          outcome: "drop",
          reason: `input schema has top-level ${combinator} that is not an array`,
        };
      for (let branch of dedupeResolvedSchemaRefs(branches, schema))
        if (isPlainObject_2(branch)) absorbProperties(branch.properties);
    }
    let required = new Set();
    let absorbRequired = (required_2) => {
      if (!Array.isArray(required_2)) return;
      for (let name of required_2) if (typeof name === "string" && name in properties) required.add(name);
    };
    absorbRequired(schema.required);
    let allOf = schema.allOf;
    if (Array.isArray(allOf)) {
      for (let branch of dedupeResolvedSchemaRefs(allOf, schema))
        if (isPlainObject_2(branch)) absorbRequired(branch.required);
    }
    let isVariantChoice = combinators.includes("anyOf") || combinators.includes("oneOf");
    let flattened = {
      type: "object",
      properties,
      required: [...required],
    };
    for (let key of SCHEMA_PASSTHROUGH_KEYS) if (key in schema) flattened[key] = schema[key];
    let note = combinatorConstraintNote(combinators, schema, isVariantChoice);
    if (!("additionalProperties" in schema)) flattened.additionalProperties = true;
    return {
      outcome: "normalized",
      schema: flattened,
      note,
      combinators,
    };
  } catch {
    return {
      outcome: "drop",
      reason: `input schema uses top-level ${combinators.join("/")} and could not be normalized`,
    };
  }
}
//@ chunk-g54kbxqw.js:12773-13300 placement
function combinatorConstraintNote(combinators, schema, isVariantChoice) {
  if (!isVariantChoice)
    return "Input constraint: all listed parameters apply together (flattened from a JSON Schema allOf).";
  let combinator = combinators.includes("oneOf") ? "oneOf" : "anyOf";
  let branches = schema[combinator];
  let groups = Array.isArray(branches)
    ? uniq(
        dedupeResolvedSchemaRefs(branches, schema)
          .map(describeSchemaVariantFields)
          .filter((fields) => fields !== null),
      )
    : [];
  let requirementText =
    combinator === "oneOf"
      ? "Provide parameters for exactly one of"
      : "Provide parameters for at least one of";
  if (groups.length === 0)
    return `Input constraint: ${requirementText} the documented parameter groups (flattened from a JSON Schema ${combinator}).`;
  let joined = groups.map((group) => `(${group})`).join(" or ");
  return `Input constraint: ${requirementText}: ${joined}.`;
}
//@ chunk-g54kbxqw.js:13300-13342 placement
function joinDescription(note, description) {
  return description
    ? `${note}

${description}`
    : note;
}
export { joinDescription, SAFE_SCHEMA_KEY_RE, resolveSchemaRef, SCHEMA_COMBINATOR_KEYS, flattenInputSchema };
