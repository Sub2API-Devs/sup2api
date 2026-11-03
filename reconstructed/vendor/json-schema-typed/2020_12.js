/**
 * json-schema-typed/2020_12.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-schema-typed@9.0.0
 * pieces: chunk-1dth5azr.js (3)
 * attribution: affinity 1, esm-fingerprint 2
 */
import { isPlainObject } from "../../src/utils/isPlainObject.js";

//@ chunk-1dth5azr.js:2665-2796 affinity
var w = 32;
var L = new Set(["array", "boolean", "integer", "null", "number", "object", "string"]);
var H = /^[A-Za-z_][-A-Za-z0-9._]*$/u;
var N = /^[^#]*#?$/u;
//@ chunk-1dth5azr.js:2796-4740 esm-fingerprint
function h(e, n = 0) {
  if (typeof e === "boolean") return true;
  if (!isPlainObject(e) || n > w) return false;
  for (let key in e) {
    let r = e[key];
    switch (key) {
      case "type":
        if (L.has(r)) break;
        if (!Array.isArray(r) || r.length === 0 || new Set(r).size !== r.length) return false;
        for (let s of r) if (!L.has(s)) return false;
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
        if (typeof r !== "string") return false;
        break;
      case "$id":
        if (typeof r !== "string" || !N.test(r)) return false;
        break;
      case "$anchor":
      case "$dynamicAnchor":
      case "$recursiveAnchor":
        if (typeof r !== "string" || !H.test(r)) return false;
        break;
      case "properties":
      case "patternProperties":
      case "dependentSchemas":
      case "$defs":
      case "definitions":
        if (!isPlainObject(r)) return false;
        for (let key in r) if (!h(r[key], n + 1)) return false;
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
        if (!h(r, n + 1)) return false;
        break;
      case "prefixItems":
      case "allOf":
      case "anyOf":
      case "oneOf":
        if (!Array.isArray(r) || r.length === 0) return false;
        for (let s of r) if (!h(s, n + 1)) return false;
        break;
      case "required":
        if (!Array.isArray(r) || new Set(r).size !== r.length) return false;
        for (let s of r) if (typeof s !== "string") return false;
        break;
      case "enum":
      case "examples":
        if (!Array.isArray(r)) return false;
        break;
      case "minimum":
      case "maximum":
      case "exclusiveMinimum":
      case "exclusiveMaximum":
        if (!Number.isFinite(r)) return false;
        break;
      case "maxLength":
      case "minLength":
      case "maxItems":
      case "minItems":
      case "maxContains":
      case "minContains":
      case "maxProperties":
      case "minProperties":
        if (!Number.isInteger(r) || Number(r) < 0) return false;
        break;
      case "uniqueItems":
      case "deprecated":
      case "readOnly":
      case "writeOnly":
        if (typeof r !== "boolean") return false;
        break;
      case "const":
      case "default":
        break;
      case "multipleOf":
        if (!Number.isFinite(r) || Number(r) <= 0) return false;
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
//@ chunk-1dth5azr.js:4740-4795 esm-fingerprint
var z = "https://json-schema.org/draft/2020-12/schema";
var S;
export { S, z, h };
