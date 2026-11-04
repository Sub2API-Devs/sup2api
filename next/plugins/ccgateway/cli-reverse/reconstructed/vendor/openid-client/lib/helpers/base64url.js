/**
 * openid-client/lib/helpers/base64url.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:7302-7617 cjs-fingerprint
var require_base64url = __commonJS(function (cjsExports, cjsModule) {
  var encode;
  if (Buffer.isEncoding("base64url"))
    encode = (input, encoding = "utf8") => Buffer.from(input, encoding).toString("base64url");
  else {
    let fromBase64 = (base64) => base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    encode = (input, encoding = "utf8") => fromBase64(Buffer.from(input, encoding).toString("base64"));
  }
  var decode = (input) => Buffer.from(input, "base64");
  cjsExports.decode = decode;
  cjsExports.encode = encode;
});
export { require_base64url };
