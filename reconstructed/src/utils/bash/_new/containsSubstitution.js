/**
 * utils/bash/_new/containsSubstitution.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-38axkkfw.js (3)
 * attribution: sole-consumer-new 3
 */
import { SUBSTITUTION_LIKE_TYPES } from "../parser.js";

//@ chunk-38axkkfw.js:4738-4804 sole-consumer-new
function containsSubstitution(e) {
  if (SUBSTITUTION_LIKE_TYPES.has(e.type)) return !0;
  return e.children.some(containsSubstitution);
}
//@ chunk-38axkkfw.js:4804-4857 sole-consumer-new
var z = new Set(["ansi_c_string", "translated_string"]);
//@ chunk-38axkkfw.js:4857-4923 sole-consumer-new
function N(e) {
  if (z.has(e.type)) return !0;
  return e.children.some(N);
}

export { containsSubstitution, N };
