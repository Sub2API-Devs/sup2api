/**
 * jws/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { be } from "./lib/sign-stream.js";
import { Le } from "./lib/verify-stream.js";

//@ chunk-82d8c88w.js:10995-11321 cjs-fingerprint
var H6t = x(function (mr) {
  var Re = be(),
    O = Le(),
    dr = [
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
  mr.ALGORITHMS = dr;
  mr.sign = Re.sign;
  mr.verify = O.verify;
  mr.decode = O.decode;
  mr.isValid = O.isValid;
  mr.createSign = function (r) {
    return new Re(r);
  };
  mr.createVerify = function (r) {
    return new O(r);
  };
});

export { H6t };
