/**
 * asynckit/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: asynckit@0.4.0..0.5.0
 * pieces: chunk-ww9agm6g.js (2)
 * attribution: cjs-layout 1, cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_defer } from "./lib/defer.js";
import { require_state_2 } from "./lib/state.js";
import { require_serial } from "./serial.js";
import { require_serialOrdered } from "./serialOrdered.js";

//@ chunk-ww9agm6g.js:5492-5653 cjs-layout
var require_asynckit = __commonJS(function (cjsExports, cjsModule) {
  var deferModule = require_defer();
  cjsModule.exports = asyncify;
  function asyncify(callback) {
    var isAsync = false;
    deferModule(function () {
      isAsync = true;
    });
    return function (err, result) {
      if (isAsync) callback(err, result);
      else
        deferModule(function () {
          callback(err, result);
        });
    };
  }
});
//@ chunk-ww9agm6g.js:7348-7433 cjs-fingerprint
var require_asynckit_2 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    parallel: require_state_2(),
    serial: require_serial(),
    serialOrdered: require_serialOrdered(),
  };
});
export { require_asynckit, require_asynckit_2 };
