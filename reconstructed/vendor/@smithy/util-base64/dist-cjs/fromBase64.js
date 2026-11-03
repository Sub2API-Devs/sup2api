/**
 * @smithy/util-base64/dist-cjs/fromBase64.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-base64@2.3.0
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { UQt } from "../../util-buffer-from/dist-cjs/index.js";

//@ chunk-wr8v03d0.js:877-1251 cjs-fingerprint
var U = x(function (R) {
  Object.defineProperty(R, "__esModule", { value: !0 });
  R.fromBase64 = void 0;
  var P = UQt(),
    K = /^[A-Za-z0-9+/]*={0,2}$/,
    W = (e) => {
      if ((e.length * 3) % 4 !== 0) throw TypeError("Incorrect padding on base64 string.");
      if (!K.exec(e)) throw TypeError("Invalid base64 string.");
      let fromString = P.fromString(e, "base64");
      return new Uint8Array(fromString.buffer, fromString.byteOffset, fromString.byteLength);
    };
  R.fromBase64 = W;
});

export { U };
