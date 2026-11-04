/**
 * @anthropic-ai/vertex-sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-xa96axyz.js (3)
 * attribution: placement 3
 */
//@ chunk-xa96axyz.js:977-1015 placement
var isArray = (val) => {
  isArray = Array.isArray;
  return isArray(val);
};
var isArray_default = isArray;
//@ chunk-xa96axyz.js:1015-1084 placement
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
//@ chunk-xa96axyz.js:1084-1139 placement
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return;
  }
};
export { isArray_default, safeJSON, isObj };
