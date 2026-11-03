/**
 * escape-string-regexp/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: escape-string-regexp@2.0.0
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-bzr73sfg.js:126116-126279 cjs-fingerprint
var jg = x(function (GA, Yg) {
  var G1 = /[|\\{}()[\]^$+*?.-]/g;
  Yg.exports = (n) => {
    if (typeof n !== "string") throw TypeError("Expected a string");
    return n.replace(G1, "\\$&");
  };
});

export { jg };
