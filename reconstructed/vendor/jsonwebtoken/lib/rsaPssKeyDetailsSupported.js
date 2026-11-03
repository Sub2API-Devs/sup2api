/**
 * jsonwebtoken/lib/rsaPssKeyDetailsSupported.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../semver/index.js";

//@ chunk-mrx6y2r5.js:4860-4951 cjs-fingerprint
var require_rsaPssKeyDetailsSupported = x(function (cjsExports, cjsModule) {
  var semver = require_semver_3();
  cjsModule.exports = semver.satisfies(process.version, ">=16.9.0");
});
export { require_rsaPssKeyDetailsSupported };
