/**
 * @smithy/util-buffer-from/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-buffer-from@2.2.0..3.0.0
 * pieces: chunk-wr8v03d0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { s_s } from "../../is-array-buffer/dist-cjs/index.js";

//@ chunk-wr8v03d0.js:440-877 cjs-fingerprint
var UQt = x(function (X) {
  var z = s_s(),
    g = importMetaRequire("buffer"),
    Q = (e, r = 0, t = e.byteLength - r) => {
      if (!z.isArrayBuffer(e))
        throw TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof e} (${e})`);
      return g.Buffer.from(e, r, t);
    },
    V = (e, r) => {
      if (typeof e !== "string")
        throw TypeError(`The "input" argument must be of type string. Received type ${typeof e} (${e})`);
      return r ? g.Buffer.from(e, r) : g.Buffer.from(e);
    };
  X.fromArrayBuffer = Q;
  X.fromString = V;
});

export { UQt };
