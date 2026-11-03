/**
 * debug/src/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: debug@4.4.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Is } from "./browser.js";
import { Vs } from "./node.js";

//@ chunk-h6b7mazd.js:37209-37343 cjs-fingerprint
var pMn = x(function (Bd, Lr) {
  if (typeof process > "u" || process.type === "renderer" || !1 || process.__nwjs) Lr.exports = Is();
  else Lr.exports = Vs();
});

export { pMn };
