/**
 * jws/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_sign_stream } from "./lib/sign-stream.js";
import { require_verify_stream } from "./lib/verify-stream.js";

//@ chunk-82d8c88w.js:10995-11321 cjs-fingerprint
var require_jws = x(function (cjsExports) {
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
