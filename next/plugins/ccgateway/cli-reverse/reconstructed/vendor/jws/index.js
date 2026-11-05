/**
 * jws/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-ww3dkdtg.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_sign_stream } from "./lib/sign-stream.js";
import { require_verify_stream } from "./lib/verify-stream.js";

//@ chunk-ww3dkdtg.js:10995-11321 cjs-fingerprint
var require_jws = __commonJS(function (cjsExports) {
  var SignStream = require_sign_stream();
  var VerifyStream = require_verify_stream();
  var ALGORITHMS = [
    "HS256",
    "HS384",
    "HS512",
    "RS256",
    "RS384",
    "RS512",
    "PS256",
    "PS384",
    "PS512",
    "ES256",
    "ES384",
    "ES512",
  ];
  cjsExports.ALGORITHMS = ALGORITHMS;
  cjsExports.sign = SignStream.sign;
  cjsExports.verify = VerifyStream.verify;
  cjsExports.decode = VerifyStream.decode;
  cjsExports.isValid = VerifyStream.isValid;
  cjsExports.createSign = function (opts) {
    return new SignStream(opts);
  };
  cjsExports.createVerify = function (opts) {
    return new VerifyStream(opts);
  };
});
export { require_jws };
