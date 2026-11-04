/**
 * jsonwebtoken/lib/JsonWebTokenError.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-mrx6y2r5.js:3839-4130 cjs-fingerprint
var require_JsonWebTokenError = __commonJS(function (cjsExports, cjsModule) {
  var JsonWebTokenError = function (message, error) {
    Error.call(this, message);
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
    this.name = "JsonWebTokenError";
    this.message = message;
    if (error) this.inner = error;
  };
  JsonWebTokenError.prototype = Object.create(Error.prototype);
  JsonWebTokenError.prototype.constructor = JsonWebTokenError;
  cjsModule.exports = JsonWebTokenError;
});
export { require_JsonWebTokenError };
