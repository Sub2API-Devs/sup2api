/**
 * jsonwebtoken/decode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { H6t } from "../jws/index.js";

//@ chunk-mrx6y2r5.js:3532-3839 cjs-fingerprint
var ic = x(function (X0, Mh) {
  var fy = H6t();
  Mh.exports = function (e, t) {
    t = t || {};
    var decode = fy.decode(e, t);
    if (!decode) return null;
    var payload = decode.payload;
    if (typeof payload === "string")
      try {
        var parsed = JSON.parse(payload);
        if (parsed !== null && typeof parsed === "object") payload = parsed;
      } catch (error) {}
    if (t.complete === !0) return { header: decode.header, payload: payload, signature: decode.signature };
    return payload;
  };
});

export { ic };
