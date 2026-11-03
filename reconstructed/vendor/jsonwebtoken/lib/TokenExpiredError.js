/**
 * jsonwebtoken/lib/TokenExpiredError.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { vo } from "./JsonWebTokenError.js";

//@ chunk-mrx6y2r5.js:4325-4528 cjs-fingerprint
var ac = x(function (tL, Fh) {
  var Hh = vo(),
    ds = function (e, t) {
      (Hh.call(this, e), (this.name = "TokenExpiredError"), (this.expiredAt = t));
    };
  ds.prototype = Object.create(Hh.prototype);
  ds.prototype.constructor = ds;
  Fh.exports = ds;
});

export { ac };
