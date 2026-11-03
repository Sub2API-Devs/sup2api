/**
 * asynckit/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (2)
 * attribution: cjs-layout 1, cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { On } from "./lib/defer.js";
import { Dn } from "./lib/state.js";
import { kn } from "./serial.js";
import { Zt } from "./serialOrdered.js";

//@ chunk-h6b7mazd.js:5492-5653 cjs-layout
var Jt = x(function (Pl, vn) {
  var Cn = On();
  vn.exports = Ta;
  function Ta(e) {
    var t = !1;
    return (
      Cn(function () {
        t = !0;
      }),
      function (n, o) {
        if (t) e(n, o);
        else
          Cn(function () {
            e(n, o);
          });
      }
    );
  }
});
//@ chunk-h6b7mazd.js:7348-7433 cjs-fingerprint
var Mn = x(function (Il, jn) {
  jn.exports = { parallel: Dn(), serial: kn(), serialOrdered: Zt() };
});

export { Jt, Mn };
