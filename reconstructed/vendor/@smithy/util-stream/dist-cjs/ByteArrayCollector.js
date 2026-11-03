/**
 * @smithy/util-stream/dist-cjs/ByteArrayCollector.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:3243-3816 cjs-fingerprint
var le = x(function (it) {
  Object.defineProperty(it, "__esModule", { value: !0 });
  it.ByteArrayCollector = void 0;
  class nt {
    allocByteArray;
    byteLength = 0;
    byteArrays = [];
    constructor(e) {
      this.allocByteArray = e;
    }
    push(e) {
      (this.byteArrays.push(e), (this.byteLength += e.byteLength));
    }
    flush() {
      if (this.byteArrays.length === 1) {
        let r = this.byteArrays[0];
        return (this.reset(), r);
      }
      let allocByteArray = this.allocByteArray(this.byteLength),
        t = 0;
      for (let r = 0; r < this.byteArrays.length; ++r) {
        let s = this.byteArrays[r];
        (allocByteArray.set(s, t), (t += s.byteLength));
      }
      return (this.reset(), allocByteArray);
    }
    reset() {
      ((this.byteArrays = []), (this.byteLength = 0));
    }
  }
  it.ByteArrayCollector = nt;
});

export { le };
