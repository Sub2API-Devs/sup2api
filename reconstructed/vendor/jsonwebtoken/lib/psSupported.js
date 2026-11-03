/**
 * jsonwebtoken/lib/psSupported.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Vy } from "../../semver/index.js";

//@ chunk-mrx6y2r5.js:5992-6093 cjs-fingerprint
var dc = x(function (sL, Yh) {
  var Ey = Vy();
  Yh.exports = Ey.satisfies(process.version, "^6.12.0 || >=8.0.0");
});

export { dc };
