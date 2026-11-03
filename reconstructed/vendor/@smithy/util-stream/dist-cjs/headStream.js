/**
 * @smithy/util-stream/dist-cjs/headStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Et } from "./headStream.browser.js";
import { B } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:7005-7747 cjs-fingerprint
var Bt = x(function ($t) {
  Object.defineProperty($t, "__esModule", { value: !0 });
  $t.headStream = void 0;
  var _t = importMetaRequire("stream"),
    Mt = Et(),
    Ct = B(),
    Gr = (e, t) => {
      if (Ct.isReadableStream(e)) return Mt.headStream(e, t);
      return new Promise((r, s) => {
        let n = new Ot();
        ((n.limit = t),
          e.pipe(n),
          e.on("error", (i) => {
            (n.end(), s(i));
          }),
          n.on("error", s),
          n.on("finish", function () {
            let uint8Array = new Uint8Array(Buffer.concat(this.buffers));
            r(uint8Array);
          }));
      });
    };
  $t.headStream = Gr;
  class Ot extends _t.Writable {
    buffers = [];
    limit = 1 / 0;
    bytesBuffered = 0;
    _write(e, t, r) {
      if (
        (this.buffers.push(e), (this.bytesBuffered += e.byteLength ?? 0), this.bytesBuffered >= this.limit)
      ) {
        let s = this.bytesBuffered - this.limit,
          n = this.buffers[this.buffers.length - 1];
        ((this.buffers[this.buffers.length - 1] = n.subarray(0, n.byteLength - s)), this.emit("finish"));
      }
      r();
    }
  }
});

export { Bt };
