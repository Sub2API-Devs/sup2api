/**
 * @smithy/util-base64/dist-cjs/toBase64.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-base64@2.3.0
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { UQt } from "../../util-buffer-from/dist-cjs/index.js";
import { IR } from "../../util-utf8/dist-cjs/index.js";

//@ chunk-wr8v03d0.js:1939-2388 cjs-fingerprint
var H = x(function (S) {
  Object.defineProperty(S, "__esModule", { value: !0 });
  S.toBase64 = void 0;
  var L = UQt(),
    _ = IR(),
    se = (e) => {
      let r;
      if (typeof e === "string") r = _.fromUtf8(e);
      else r = e;
      if (typeof r !== "object" || typeof r.byteOffset !== "number" || typeof r.byteLength !== "number")
        throw Error("@smithy/util-base64: toBase64 encoder function only accepts string | Uint8Array.");
      return L.fromArrayBuffer(r.buffer, r.byteOffset, r.byteLength).toString("base64");
    };
  S.toBase64 = se;
});

export { H };
