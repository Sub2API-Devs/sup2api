/**
 * tools/AppifactReplTool/_new/hasNoZeroWidthChars.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (1)
 * attribution: sole-consumer-new 1
 */
import { findZeroWidthCodePoint } from "../../../ink/stringWidth.js";

//@ chunk-t0gq9gyw.js:5373-5412 sole-consumer-new
function hasNoZeroWidthChars(e) {
  return findZeroWidthCodePoint(e) === void 0;
}

export { hasNoZeroWidthChars };
