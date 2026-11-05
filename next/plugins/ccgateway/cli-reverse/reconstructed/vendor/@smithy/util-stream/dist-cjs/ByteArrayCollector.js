/**
 * @smithy/util-stream/dist-cjs/ByteArrayCollector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-1fkvp0h1.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1fkvp0h1.js:3243-3816 cjs-fingerprint
var require_ByteArrayCollector = __commonJS(function (cjsExports) {
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
