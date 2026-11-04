/**
 * @aws-sdk/credential-provider-web-identity/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-web-identity@3.936.0
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_fromBase64 } from "../../../@smithy/util-base64/dist-cjs/fromBase64.js";
import { require_toBase64 } from "../../../@smithy/util-base64/dist-cjs/toBase64.js";

//@ chunk-wr8v03d0.js:2388-2765 cjs-fingerprint
var base64Module = __commonJS(function (cjsExports) {
  var fromTokenFile = require_fromBase64();
  var fromWebToken = require_toBase64();
  Object.keys(fromTokenFile).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return fromTokenFile[k];
        },
      });
  });
  Object.keys(fromWebToken).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return fromWebToken[k];
        },
      });
  });
});
export { base64Module };
