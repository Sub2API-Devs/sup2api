/**
 * openid-client/lib/helpers/decode_jwt.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_base64url } from "./base64url.js";

//@ chunk-1hnjmk23.js:7986-8398 cjs-fingerprint
var require_decode_jwt = __commonJS(function (cjsExports, cjsModule) {
  var base64url = require_base64url();
  cjsModule.exports = (token) => {
    if (typeof token !== "string" || !token) throw TypeError("JWT must be a string");
    let { 0: header, 1: payload, 2: signature, length } = token.split(".");
    if (length === 5) throw TypeError("encrypted JWTs cannot be decoded");
    if (length !== 3) throw Error("JWTs must have three components");
    try {
      return {
        header: JSON.parse(base64url.decode(header)),
        payload: JSON.parse(base64url.decode(payload)),
        signature,
      };
    } catch (err) {
      throw Error("JWT is malformed");
    }
  };
});
export { require_decode_jwt };
