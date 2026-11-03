/**
 * utils/randomId.ts
 *
 * 2.1.316 新增：随机 id
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41fxb5qj.js (2)
 * attribution: placement 2
 */
import { randomBytes } from "crypto";
import { UAi } from "./peerMessageHeaders.js";

//@ chunk-41fxb5qj.js:265-277 placement
var n = randomBytes(32);
//@ chunk-41fxb5qj.js:277-309 placement
function lst(o) {
  return UAi(o, n);
}

export { lst };
