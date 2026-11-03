/**
 * has-flag/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: has-flag@4.0.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:33381-33555 cjs-fingerprint
var clo = x(function (Td, ks) {
  ks.exports = (e, t = process.argv) => {
    let r = e.startsWith("-") ? "" : e.length === 1 ? "-" : "--",
      index = t.indexOf(r + e),
      index_2 = t.indexOf("--");
    return index !== -1 && (index_2 === -1 || index < index_2);
  };
});

export { clo };
