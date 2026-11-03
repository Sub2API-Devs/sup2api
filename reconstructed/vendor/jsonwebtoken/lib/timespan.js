/**
 * jsonwebtoken/lib/timespan.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { ihs } from "../../ms/index.js";

//@ chunk-mrx6y2r5.js:4528-4769 cjs-fingerprint
var cc = x(function (rL, $h) {
  var my = ihs();
  $h.exports = function (e, t) {
    var r = t || Math.floor(Date.now() / 1000);
    if (typeof e === "string") {
      var n = my(e);
      if (typeof n > "u") return;
      return Math.floor(r + n / 1000);
    } else if (typeof e === "number") return r + e;
    else return;
  };
});

export { cc };
