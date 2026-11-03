/**
 * utils/shortHash.ts
 *
 * 2.1.316 新增：12 位短哈希
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-smzk8psk.js (3)
 * attribution: placement 3
 */
import { fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../services/analytics/safeMetadata.js";
import { computeContentHash } from "./commitAttribution.js";

//@ chunk-smzk8psk.js:263-307 placement
function gn(r) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(computeContentHash(r).slice(0, 12));
}
//@ chunk-smzk8psk.js:307-330 placement
var t = /^[0-9a-f]{12}$/;
//@ chunk-smzk8psk.js:330-376 placement
function kXt(r) {
  return t.test(r) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(r) : void 0;
}

export { gn, kXt };
