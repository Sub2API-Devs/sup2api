/**
 * jsonwebtoken/lib/psSupported.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../semver/index.js";

//@ chunk-b5df2wx1.js:5992-6093 cjs-fingerprint
var require_psSupported = __commonJS(function (cjsExports, cjsModule) {
  var semver = require_semver_3();
  cjsModule.exports = semver.satisfies(process.version, "^6.12.0 || >=8.0.0");
});
export { require_psSupported };
