/**
 * utils/stripAnsi.ts
 *
 * 2.1.316 新增。去除 ANSI。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-58wc6nbw.js (3)
 * attribution: placement 3
 */
import { toWellFormedString } from "./stringUtils.js";

//@ chunk-58wc6nbw.js:227-266 placement
function Yn(r) {
  return Bun.stripANSI(r);
}
//@ chunk-58wc6nbw.js:266-311 placement
function Pje(r) {
  return toWellFormedString(Yn(toWellFormedString(String(r))));
}
//@ chunk-58wc6nbw.js:311-387 placement
function qa(r) {
  return r.replace(/[^\n\r\v\f\x85\u2028\u2029]+/g, (n) => Yn(n));
}

export { Yn, qa, Pje };
