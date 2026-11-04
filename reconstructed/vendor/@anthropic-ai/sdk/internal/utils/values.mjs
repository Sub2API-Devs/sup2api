/**
 * @anthropic-ai/sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (7)
 * attribution: esm-fingerprint 4, esm-layout 3
 */
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:16686-16774 esm-fingerprint
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => startsWithSchemeRegexp.test(url);
var isArray = (val) => {
  isArray = Array.isArray;
  return isArray(val);
};
var isArray_default = isArray;
//@ chunk-hwmsct5x.js:16774-16834 esm-layout
function maybeObj(x) {
  if (typeof x !== "object") return {};
  return x ?? {};
}
//@ chunk-hwmsct5x.js:16834-16897 esm-layout
function isEmptyObj(obj) {
  if (!obj) return true;
  for (let key in obj) return false;
  return true;
}
//@ chunk-hwmsct5x.js:16897-16963 esm-fingerprint
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
//@ chunk-hwmsct5x.js:16963-17033 esm-fingerprint
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
//@ chunk-hwmsct5x.js:17033-17198 esm-fingerprint
var validatePositiveInteger = (name, timeout) => {
  if (typeof timeout !== "number" || !Number.isInteger(timeout))
    throw new AnthropicError(`${name} must be an integer`);
  if (timeout < 0) throw new AnthropicError(`${name} must be a positive integer`);
  return timeout;
};
//@ chunk-hwmsct5x.js:17198-17254 esm-layout
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
