/**
 * @anthropic-ai/bedrock-sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-mgs2qfsy.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-mgs2qfsy.js:373-453 esm-fingerprint
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => startsWithSchemeRegexp.test(url);
var isArray = (val) => {
  isArray = Array.isArray;
  return isArray(val);
};
var isArray_default = isArray;
export { isArray_default, isAbsoluteURL };
