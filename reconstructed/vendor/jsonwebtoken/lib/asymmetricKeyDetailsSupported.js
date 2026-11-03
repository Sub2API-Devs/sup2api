/**
 * jsonwebtoken/lib/asymmetricKeyDetailsSupported.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../semver/index.js";

//@ chunk-mrx6y2r5.js:4769-4860 cjs-fingerprint
var require_asymmetricKeyDetailsSupported = x(function (cjsExports, cjsModule) {
  var semver = require_semver_3();
  cjsModule.exports = semver.satisfies(process.version, ">=15.7.0");
});
export { require_asymmetricKeyDetailsSupported };
