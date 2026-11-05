/**
 * jsonwebtoken/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_decode } from "./decode.js";
import { require_verify } from "./verify.js";
import { require_sign } from "./sign.js";
import { require_JsonWebTokenError } from "./lib/JsonWebTokenError.js";
import { require_NotBeforeError } from "./lib/NotBeforeError.js";
import { require_TokenExpiredError } from "./lib/TokenExpiredError.js";

//@ chunk-b5df2wx1.js:22157-22297 cjs-fingerprint
var require_jsonwebtoken = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    decode: require_decode(),
    verify: require_verify(),
    sign: require_sign(),
    JsonWebTokenError: require_JsonWebTokenError(),
    NotBeforeError: require_NotBeforeError(),
    TokenExpiredError: require_TokenExpiredError(),
  };
});
export { require_jsonwebtoken };
