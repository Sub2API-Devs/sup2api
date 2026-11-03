/**
 * follow-redirects/debug.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: follow-redirects@1.16.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { pMn } from "../debug/src/index.js";

//@ chunk-h6b7mazd.js:37343-37518 cjs-fingerprint
var Gs = x(function (Nd, Ws) {
  var at;
  Ws.exports = function () {
    if (!at) {
      try {
        at = pMn()("follow-redirects");
      } catch (error) {}
      if (typeof at !== "function") at = function () {};
    }
    at.apply(null, arguments);
  };
});

export { Gs };
