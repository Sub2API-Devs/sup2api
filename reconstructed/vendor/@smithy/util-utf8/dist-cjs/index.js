/**
 * @smithy/util-utf8/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-utf8@2.3.0..3.0.0
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { UQt } from "../../util-buffer-from/dist-cjs/index.js";

//@ chunk-wr8v03d0.js:1251-1939 cjs-fingerprint
var IR = x(function (te) {
  var O = UQt(),
    q = (e) => {
      let fromString = O.fromString(e, "utf8");
      return new Uint8Array(
        fromString.buffer,
        fromString.byteOffset,
        fromString.byteLength / Uint8Array.BYTES_PER_ELEMENT,
      );
    },
    ee = (e) => {
      if (typeof e === "string") return q(e);
      if (ArrayBuffer.isView(e))
        return new Uint8Array(e.buffer, e.byteOffset, e.byteLength / Uint8Array.BYTES_PER_ELEMENT);
      return new Uint8Array(e);
    },
    re = (e) => {
      if (typeof e === "string") return e;
      if (typeof e !== "object" || typeof e.byteOffset !== "number" || typeof e.byteLength !== "number")
        throw Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
      return O.fromArrayBuffer(e.buffer, e.byteOffset, e.byteLength).toString("utf8");
    };
  te.fromUtf8 = q;
  te.toUint8Array = ee;
  te.toUtf8 = re;
});

export { IR };
