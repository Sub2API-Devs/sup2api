/**
 * asynckit/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-h6b7mazd.js (2)
 * attribution: cjs-layout 1, cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_defer } from "./lib/defer.js";
import { require_state_3 } from "./lib/state.js";
import { require_serial } from "./serial.js";
import { require_serialOrdered } from "./serialOrdered.js";

//@ chunk-h6b7mazd.js:5492-5653 cjs-layout
var require_asynckit = x(function (cjsExports, cjsModule) {
  var Cn = require_defer();
  cjsModule.exports = Ta;
  function Ta(e) {
    var t = false;
    Cn(function () {
      t = true;
    });
    return function (n, o) {
      if (t) e(n, o);
      else
        Cn(function () {
          e(n, o);
        });
    };
  }
});
//@ chunk-h6b7mazd.js:7348-7433 cjs-fingerprint
var require_asynckit_2 = x(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    parallel: require_state_3(),
    serial: require_serial(),
    serialOrdered: require_serialOrdered(),
  };
});
export { require_asynckit, require_asynckit_2 };
