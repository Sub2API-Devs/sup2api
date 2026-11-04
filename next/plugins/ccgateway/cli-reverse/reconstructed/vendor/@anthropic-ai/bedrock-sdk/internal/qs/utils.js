/**
 * @anthropic-ai/bedrock-sdk/internal/qs/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (2)
 * attribution: esm-layout 2
 */
//@ chunk-h87x8cg3.js:6701-6739 esm-layout
var has = (val) => {
  has = Array.isArray;
  return has(val);
};
var has_default = has;
//@ chunk-h87x8cg3.js:6739-6808 esm-layout
function is_buffer(parsed) {
  return parsed != null && typeof parsed === "object" && !Array.isArray(parsed);
}
export { has_default, is_buffer };
