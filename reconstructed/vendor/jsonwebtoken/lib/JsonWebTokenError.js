/**
 * jsonwebtoken/lib/JsonWebTokenError.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:3839-4130 cjs-fingerprint
var vo = x(function (Z0, Dh) {
  var cs = function (e, t) {
    if ((Error.call(this, e), Error.captureStackTrace)) Error.captureStackTrace(this, this.constructor);
    if (((this.name = "JsonWebTokenError"), (this.message = e), t)) this.inner = t;
  };
  cs.prototype = Object.create(Error.prototype);
  cs.prototype.constructor = cs;
  Dh.exports = cs;
});

export { vo };
