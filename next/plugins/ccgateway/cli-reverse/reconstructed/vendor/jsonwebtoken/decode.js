/**
 * jsonwebtoken/decode.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_jws } from "../jws/index.js";

//@ chunk-b5df2wx1.js:3532-3839 cjs-fingerprint
var require_decode = __commonJS(function (cjsExports, cjsModule) {
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
