/**
 * json-schema-typed/2020_12.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-schema-typed@9.0.0
 * pieces: chunk-1dth5azr.js (2)
 * attribution: affinity 1, esm-fingerprint 2
 */
import { isPlainObject } from "../../src/utils/isPlainObject.js";

//@ chunk-1dth5azr.js:2665-2796 affinity
var MAX_SCHEMA_DEPTH = 32;
var JSON_SCHEMA_TYPES = new Set(["array", "boolean", "integer", "null", "number", "object", "string"]);
var JSON_POINTER_RE = /^[A-Za-z_][-A-Za-z0-9._]*$/u;
var ANY_URI_RE = /^[^#]*#?$/u;
//@ chunk-1dth5azr.js:2796-4740 esm-fingerprint
function isValidSchemaShape(schema, depth = 0) {
  if (typeof schema === "boolean") return true;
  if (!isPlainObject(schema) || depth > MAX_SCHEMA_DEPTH) return false;
  for (let key in schema) {
    let value = schema[key];
    switch (key) {
      case "type":
        if (JSON_SCHEMA_TYPES.has(value)) break;
        if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length) return false;
        for (let typeName of value) if (!JSON_SCHEMA_TYPES.has(typeName)) return false;
        break;
      case "title":
      case "description":
      case "format":
      case "pattern":
      case "$comment":
      case "$schema":
      case "$ref":
      case "$dynamicRef":
      case "$recursiveRef":
      case "contentEncoding":
      case "contentMediaType":
        if (typeof value !== "string") return false;
        break;
      case "$id":
        if (typeof value !== "string" || !ANY_URI_RE.test(value)) return false;
        break;
      case "$anchor":
      case "$dynamicAnchor":
      case "$recursiveAnchor":
        if (typeof value !== "string" || !JSON_POINTER_RE.test(value)) return false;
        break;
      case "properties":
      case "patternProperties":
      case "dependentSchemas":
      case "$defs":
      case "definitions":
        if (!isPlainObject(value)) return false;
        for (let key in value) if (!isValidSchemaShape(value[key], depth + 1)) return false;
        break;
      case "items":
      case "contains":
      case "additionalProperties":
      case "propertyNames":
      case "if":
      case "then":
      case "else":
      case "not":
      case "unevaluatedItems":
      case "unevaluatedProperties":
      case "contentSchema":
        if (!isValidSchemaShape(value, depth + 1)) return false;
        break;
      case "prefixItems":
      case "allOf":
      case "anyOf":
      case "oneOf":
        if (!Array.isArray(value) || value.length === 0) return false;
        for (let v of value) if (!isValidSchemaShape(v, depth + 1)) return false;
        break;
      case "required":
        if (!Array.isArray(value) || new Set(value).size !== value.length) return false;
        for (let v of value) if (typeof v !== "string") return false;
        break;
      case "enum":
      case "examples":
        if (!Array.isArray(value)) return false;
        break;
      case "minimum":
      case "maximum":
      case "exclusiveMinimum":
      case "exclusiveMaximum":
        if (!Number.isFinite(value)) return false;
        break;
      case "maxLength":
      case "minLength":
      case "maxItems":
      case "minItems":
      case "maxContains":
      case "minContains":
      case "maxProperties":
      case "minProperties":
        if (!Number.isInteger(value) || Number(value) < 0) return false;
        break;
      case "uniqueItems":
      case "deprecated":
      case "readOnly":
      case "writeOnly":
        if (typeof value !== "boolean") return false;
        break;
      case "const":
      case "default":
        break;
      case "multipleOf":
        if (!Number.isFinite(value) || Number(value) <= 0) return false;
        break;
      case "dependentRequired":
      case "dependencies":
      case "$vocabulary":
        return false;
      default:
        break;
    }
  }
  return true;
}
export { isValidSchemaShape };
