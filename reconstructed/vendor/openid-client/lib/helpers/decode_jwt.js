/**
 * openid-client/lib/helpers/decode_jwt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { vu } from "./base64url.js";

//@ chunk-1ny7cxrt.js:7617-8029 cjs-fingerprint
var PO = x(function (Tve, EO) {
  var cf = vu();
  EO.exports = (e) => {
    if (typeof e !== "string" || !e) throw TypeError("JWT must be a string");
    let { 0: t, 1: n, 2: o, length: r } = e.split(".");
    if (r === 5) throw TypeError("encrypted JWTs cannot be decoded");
    if (r !== 3) throw Error("JWTs must have three components");
    try {
      return { header: JSON.parse(cf.decode(t)), payload: JSON.parse(cf.decode(n)), signature: o };
    } catch (error) {
      throw Error("JWT is malformed");
    }
  };
});

export { PO };
