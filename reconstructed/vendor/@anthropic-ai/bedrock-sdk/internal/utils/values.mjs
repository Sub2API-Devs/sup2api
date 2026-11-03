/**
 * @anthropic-ai/bedrock-sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-e7naa6k8.js (1)
 * attribution: esm-fingerprint 1
 */
//@ chunk-e7naa6k8.js:373-453 esm-fingerprint
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var D = (url) => startsWithSchemeRegexp.test(url);
var isArray = (val) => {
  isArray = Array.isArray;
  return isArray(val);
};
var isArray_default = isArray;
export { isArray_default, D };
