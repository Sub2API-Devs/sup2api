/**
 * node-forge/lib/mgf.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_mgf1 } from "./mgf1.js";

//@ chunk-qg41pqt6.js:158634-158728 cjs-fingerprint
var require_mgf = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_mgf1();
  cjsModule.exports = forge.mgf = forge.mgf || {};
  forge.mgf.mgf1 = forge.mgf1;
});
export { require_mgf };
