/**
 * @anthropic-ai/vertex-sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-1vqm62xf.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-1vqm62xf.js:977-1015 placement
var isArray = (val) => {
  isArray = Array.isArray;
  return isArray(val);
};
var isArray_default = isArray;
//@ chunk-1vqm62xf.js:1015-1084 placement
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
//@ chunk-1vqm62xf.js:1084-1139 placement
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return;
  }
};
export { isArray_default, safeJSON, isObj };
