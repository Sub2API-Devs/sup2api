/**
 * @anthropic-ai/bedrock-sdk/internal/qs/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (2)
 * attribution: esm-layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-b8zxeazh.js:6701-6739 esm-layout
var has = (val) => {
  has = Array.isArray;
  return has(val);
};
var has_default = has;
//@ chunk-b8zxeazh.js:6739-6808 esm-layout
function is_buffer(parsed) {
  return parsed != null && typeof parsed === "object" && !Array.isArray(parsed);
}
export { is_buffer, has_default };
