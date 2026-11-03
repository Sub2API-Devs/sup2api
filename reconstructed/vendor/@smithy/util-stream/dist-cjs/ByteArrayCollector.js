/**
 * @smithy/util-stream/dist-cjs/ByteArrayCollector.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:3243-3816 cjs-fingerprint
var require_ByteArrayCollector = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ByteArrayCollector = undefined;
  class ByteArrayCollector {
    allocByteArray;
    byteLength = 0;
    byteArrays = [];
    constructor(allocByteArray) {
      this.allocByteArray = allocByteArray;
    }
    push(byteArray) {
      this.byteArrays.push(byteArray);
      this.byteLength += byteArray.byteLength;
    }
    flush() {
      if (this.byteArrays.length === 1) {
        let bytes = this.byteArrays[0];
        this.reset();
        return bytes;
      }
      let aggregation = this.allocByteArray(this.byteLength);
      let cursor = 0;
      for (let i = 0; i < this.byteArrays.length; ++i) {
        let bytes = this.byteArrays[i];
        aggregation.set(bytes, cursor);
        cursor += bytes.byteLength;
      }
      this.reset();
      return aggregation;
    }
    reset() {
      this.byteArrays = [];
      this.byteLength = 0;
    }
  }
  cjsExports.ByteArrayCollector = ByteArrayCollector;
});
export { require_ByteArrayCollector };
