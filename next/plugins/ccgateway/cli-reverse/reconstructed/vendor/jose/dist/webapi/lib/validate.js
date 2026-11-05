/**
 * jose/dist/webapi/lib/validate.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_content_encryption_2 } from "./content_encryption.js";

//@ chunk-pd6th42n.js:9302-9323 esm-layout
var init_validate = __esm(() => {
  init_content_encryption_2();
});
//@ chunk-pd6th42n.js:9323-9545 esm-layout
var validateCritDuplicates = (...objects) => {
  let filtered = objects.filter(Boolean);
  if (filtered.length === 0 || filtered.length === 1) return true;
  let seen;
  for (let obj of filtered) {
    let keys = Object.keys(obj);
    if (!seen || seen.size === 0) {
      seen = new Set(keys);
      continue;
    }
    for (let key of keys) {
      if (seen.has(key)) return false;
      seen.add(key);
    }
  }
  return true;
};
var validateCrit;
//@ chunk-pd6th42n.js:9545-9567 esm-layout
var init_validate_2 = __esm(() => {
  validateCrit = validateCritDuplicates;
});
//@ chunk-pd6th42n.js:9567-9619 esm-layout
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-pd6th42n.js:9619-9860 esm-fingerprint
function isPlainObject(value) {
  if (!isObjectLike(value) || Object.prototype.toString.call(value) !== "[object Object]") return false;
  if (Object.getPrototypeOf(value) === null) return true;
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) proto = Object.getPrototypeOf(proto);
  return Object.getPrototypeOf(value) === proto;
}
export { init_validate, init_validate_2, isPlainObject, validateCrit };
