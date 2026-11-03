/**
 * has-symbols/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: has-symbols@1.1.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { rr } from "./shams.js";

//@ chunk-h6b7mazd.js:9455-9716 cjs-fingerprint
var Co = x(function (sp, Oo) {
  var Ao = typeof Symbol < "u" && Symbol,
    Ya = rr();
  Oo.exports = function () {
    if (typeof Ao !== "function") return !1;
    if (typeof Symbol !== "function") return !1;
    if (typeof Ao("foo") !== "symbol") return !1;
    if (typeof Symbol("bar") !== "symbol") return !1;
    return Ya();
  };
});

export { Co };
