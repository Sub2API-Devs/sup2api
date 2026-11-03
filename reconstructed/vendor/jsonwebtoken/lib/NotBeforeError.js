/**
 * jsonwebtoken/lib/NotBeforeError.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { vo } from "./JsonWebTokenError.js";

//@ chunk-mrx6y2r5.js:4130-4325 cjs-fingerprint
var sc = x(function (eL, Lh) {
  var Uh = vo(),
    ls = function (e, t) {
      (Uh.call(this, e), (this.name = "NotBeforeError"), (this.date = t));
    };
  ls.prototype = Object.create(Uh.prototype);
  ls.prototype.constructor = ls;
  Lh.exports = ls;
});

export { sc };
