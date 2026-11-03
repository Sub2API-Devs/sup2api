/**
 * jsonwebtoken/decode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_jws } from "../jws/index.js";

//@ chunk-mrx6y2r5.js:3532-3839 cjs-fingerprint
var require_decode = x(function (cjsExports, cjsModule) {
  var jws = require_jws();
  cjsModule.exports = function (jwt, options) {
    options = options || {};
    var decoded = jws.decode(jwt, options);
    if (!decoded) return null;
    var payload = decoded.payload;
    if (typeof payload === "string")
      try {
        var obj = JSON.parse(payload);
        if (obj !== null && typeof obj === "object") payload = obj;
      } catch (e) {}
    if (options.complete === true)
      return {
        header: decoded.header,
        payload,
        signature: decoded.signature,
      };
    return payload;
  };
});
export { require_decode };
