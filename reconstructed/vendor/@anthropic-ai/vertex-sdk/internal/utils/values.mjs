/**
 * @anthropic-ai/vertex-sdk/internal/utils/values.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-xa96axyz.js (3)
 * attribution: placement 3
 */

//@ chunk-xa96axyz.js:977-1015 placement
var d = (e) => ((d = Array.isArray), d(e)),
  f = d;
//@ chunk-xa96axyz.js:1015-1084 placement
function b(e) {
  return e != null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-xa96axyz.js:1084-1139 placement
var w = (e) => {
  try {
    return JSON.parse(e);
  } catch (error) {
    return;
  }
};

export { f, w, b };
