/**
 * @smithy/util-stream/dist-cjs/headStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_headStream_browser } from "./headStream.browser.js";
import { require_stream_type_check } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:7005-7747 cjs-fingerprint
var require_headStream = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.headStream = undefined;
  var stream_1 = importMetaRequire("stream");
  var headStream_browser_1 = require_headStream_browser();
  var stream_type_check_1 = require_stream_type_check();
  var headStream = (stream, bytes) => {
    if (stream_type_check_1.isReadableStream(stream)) return headStream_browser_1.headStream(stream, bytes);
    return new Promise((resolve, reject) => {
      let collector = new Collector();
      collector.limit = bytes;
      stream.pipe(collector);
      stream.on("error", (err) => {
        collector.end();
        reject(err);
      });
      collector.on("error", reject);
      collector.on("finish", function () {
        let bytes = new Uint8Array(Buffer.concat(this.buffers));
        resolve(bytes);
      });
    });
  };
  cjsExports.headStream = headStream;
  class Collector extends stream_1.Writable {
    buffers = [];
    limit = 1 / 0;
    bytesBuffered = 0;
    _write(chunk, encoding, callback) {
      this.buffers.push(chunk);
      this.bytesBuffered += chunk.byteLength ?? 0;
      if (this.bytesBuffered >= this.limit) {
        let excess = this.bytesBuffered - this.limit;
        let tailBuffer = this.buffers[this.buffers.length - 1];
        this.buffers[this.buffers.length - 1] = tailBuffer.subarray(0, tailBuffer.byteLength - excess);
        this.emit("finish");
      }
      callback();
    }
  }
});
export { require_headStream };
