/**
 * @aws-sdk/credential-provider-web-identity/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-web-identity@3.936.0
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { U } from "../../../@smithy/util-base64/dist-cjs/fromBase64.js";
import { H } from "../../../@smithy/util-base64/dist-cjs/toBase64.js";

//@ chunk-wr8v03d0.js:2388-2765 cjs-fingerprint
var base64Module = x(function (h) {
  var C = U(),
    k = H();
  Object.keys(C).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(h, e))
      Object.defineProperty(h, e, {
        enumerable: !0,
        get: function () {
          return C[e];
        },
      });
  });
  Object.keys(k).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(h, e))
      Object.defineProperty(h, e, {
        enumerable: !0,
        get: function () {
          return k[e];
        },
      });
  });
});

export { base64Module };
