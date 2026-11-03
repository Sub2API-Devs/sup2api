/**
 * json-schema-typed/2020_12.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-schema-typed@9.0.0
 * pieces: chunk-1dth5azr.js (3)
 * attribution: affinity 1, esm-fingerprint 2
 */
import { isPlainObject } from "../../src/utils/isPlainObject.js";

//@ chunk-1dth5azr.js:2665-2796 affinity
var w = 32,
  L = new Set(["array", "boolean", "integer", "null", "number", "object", "string"]),
  H = /^[A-Za-z_][-A-Za-z0-9._]*$/u,
  N = /^[^#]*#?$/u;
//@ chunk-1dth5azr.js:2796-4740 esm-fingerprint
function h(e, n = 0) {
  if (typeof e === "boolean") return !0;
  if (!isPlainObject(e) || n > w) return !1;
  for (let key in e) {
    let r = e[key];
    switch (key) {
      case "type":
        if (L.has(r)) break;
        if (!Array.isArray(r) || r.length === 0 || new Set(r).size !== r.length) return !1;
        for (let s of r) if (!L.has(s)) return !1;
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
        if (typeof r !== "string") return !1;
        break;
      case "$id":
        if (typeof r !== "string" || !N.test(r)) return !1;
        break;
      case "$anchor":
      case "$dynamicAnchor":
      case "$recursiveAnchor":
        if (typeof r !== "string" || !H.test(r)) return !1;
        break;
      case "properties":
      case "patternProperties":
      case "dependentSchemas":
      case "$defs":
      case "definitions":
        if (!isPlainObject(r)) return !1;
        for (let key in r) if (!h(r[key], n + 1)) return !1;
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
        if (!h(r, n + 1)) return !1;
        break;
      case "prefixItems":
      case "allOf":
      case "anyOf":
      case "oneOf":
        if (!Array.isArray(r) || r.length === 0) return !1;
        for (let s of r) if (!h(s, n + 1)) return !1;
        break;
      case "required":
        if (!Array.isArray(r) || new Set(r).size !== r.length) return !1;
        for (let s of r) if (typeof s !== "string") return !1;
        break;
      case "enum":
      case "examples":
        if (!Array.isArray(r)) return !1;
        break;
      case "minimum":
      case "maximum":
      case "exclusiveMinimum":
      case "exclusiveMaximum":
        if (!Number.isFinite(r)) return !1;
        break;
      case "maxLength":
      case "minLength":
      case "maxItems":
      case "minItems":
      case "maxContains":
      case "minContains":
      case "maxProperties":
      case "minProperties":
        if (!Number.isInteger(r) || Number(r) < 0) return !1;
        break;
      case "uniqueItems":
      case "deprecated":
      case "readOnly":
      case "writeOnly":
        if (typeof r !== "boolean") return !1;
        break;
      case "const":
      case "default":
        break;
      case "multipleOf":
        if (!Number.isFinite(r) || Number(r) <= 0) return !1;
        break;
      case "dependentRequired":
      case "dependencies":
      case "$vocabulary":
        return !1;
      default:
        break;
    }
  }
  return !0;
}
//@ chunk-1dth5azr.js:4740-4795 esm-fingerprint
var z = "https://json-schema.org/draft/2020-12/schema",
  S;

export { S, z, h };
