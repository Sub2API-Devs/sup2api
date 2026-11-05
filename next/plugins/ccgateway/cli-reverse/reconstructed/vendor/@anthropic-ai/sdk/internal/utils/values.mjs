/**
 * @anthropic-ai/sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (7)
 * attribution: esm-fingerprint 4, esm-layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-vn3g7zt8.js:17054-17142 esm-fingerprint
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => startsWithSchemeRegexp.test(url);
var isArray = (val) => {
  isArray = Array.isArray;
  return isArray(val);
};
var isArray_default = isArray;
//@ chunk-vn3g7zt8.js:17142-17202 esm-layout
function maybeObj(x) {
  if (typeof x !== "object") return {};
  return x ?? {};
}
//@ chunk-vn3g7zt8.js:17202-17265 esm-layout
function isEmptyObj(obj) {
  if (!obj) return true;
  for (let key in obj) return false;
  return true;
}
//@ chunk-vn3g7zt8.js:17265-17331 esm-fingerprint
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
//@ chunk-vn3g7zt8.js:17331-17401 esm-fingerprint
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
//@ chunk-vn3g7zt8.js:17401-17566 esm-fingerprint
var validatePositiveInteger = (name, timeout) => {
  if (typeof timeout !== "number" || !Number.isInteger(timeout))
    throw new AnthropicError(`${name} must be an integer`);
  if (timeout < 0) throw new AnthropicError(`${name} must be a positive integer`);
  return timeout;
};
//@ chunk-vn3g7zt8.js:17566-17622 esm-layout
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return;
  }
};
export {
  isArray,
  hasOwn,
  safeJSON,
  maybeObj,
  isArray_default,
  isObj,
  validatePositiveInteger,
  isAbsoluteURL,
  isEmptyObj,
};
