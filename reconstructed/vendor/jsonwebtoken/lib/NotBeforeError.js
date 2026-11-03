/**
 * jsonwebtoken/lib/NotBeforeError.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_JsonWebTokenError } from "./JsonWebTokenError.js";

//@ chunk-mrx6y2r5.js:4130-4325 cjs-fingerprint
var require_NotBeforeError = x(function (cjsExports, cjsModule) {
  var JsonWebTokenError = require_JsonWebTokenError();
  var NotBeforeError = function (message, date) {
    JsonWebTokenError.call(this, message);
    this.name = "NotBeforeError";
    this.date = date;
  };
  NotBeforeError.prototype = Object.create(JsonWebTokenError.prototype);
  NotBeforeError.prototype.constructor = NotBeforeError;
  cjsModule.exports = NotBeforeError;
});
export { require_NotBeforeError };
