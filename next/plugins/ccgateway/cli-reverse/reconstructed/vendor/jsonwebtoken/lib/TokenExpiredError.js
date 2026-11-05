/**
 * jsonwebtoken/lib/TokenExpiredError.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_JsonWebTokenError } from "./JsonWebTokenError.js";

//@ chunk-b5df2wx1.js:4325-4528 cjs-fingerprint
var require_TokenExpiredError = __commonJS(function (cjsExports, cjsModule) {
  var JsonWebTokenError = require_JsonWebTokenError();
  var TokenExpiredError = function (message, expiredAt) {
    JsonWebTokenError.call(this, message);
    this.name = "TokenExpiredError";
    this.expiredAt = expiredAt;
  };
  TokenExpiredError.prototype = Object.create(JsonWebTokenError.prototype);
  TokenExpiredError.prototype.constructor = TokenExpiredError;
  cjsModule.exports = TokenExpiredError;
});
export { require_TokenExpiredError };
