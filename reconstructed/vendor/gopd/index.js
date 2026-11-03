/**
 * gopd/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: gopd@1.2.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_gOPD } from "./gOPD.js";

//@ chunk-h6b7mazd.js:8355-8451 cjs-fingerprint
var require_gopd = x(function (cjsExports, cjsModule) {
  var $gOPD = require_gOPD();
  if ($gOPD)
    try {
      $gOPD([], "length");
    } catch (error) {
      $gOPD = null;
    }
  cjsModule.exports = $gOPD;
});
export { require_gopd };
