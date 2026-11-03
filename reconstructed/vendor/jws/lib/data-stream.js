/**
 * jws/lib/data-stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_safe_buffer } from "../../safe-buffer/index.js";

//@ chunk-82d8c88w.js:3287-4019 cjs-fingerprint
var require_data_stream = x(function (cjsExports, cjsModule) {
  var I = require_safe_buffer().Buffer;
  var Stream = importMetaRequire("stream");
  var util = importMetaRequire("util");
  function DataStream(data) {
    this.buffer = null;
    this.writable = true;
    this.readable = true;
    if (!data) {
      this.buffer = I.alloc(0);
      return this;
    }
    if (typeof data.pipe === "function") {
      this.buffer = I.alloc(0);
      data.pipe(this);
      return this;
    }
    if (data.length || typeof data === "object") {
      this.buffer = data;
      this.writable = false;
      process.nextTick(
        function () {
          this.emit("end", data);
          this.readable = false;
          this.emit("close");
        }.bind(this),
      );
      return this;
    }
    throw TypeError("Unexpected data type (" + typeof data + ")");
  }
  util.inherits(DataStream, Stream);
  DataStream.prototype.write = function (data) {
    this.buffer = I.concat([this.buffer, I.from(data)]);
    this.emit("data", data);
  };
  DataStream.prototype.end = function (data) {
    if (data) this.write(data);
    this.emit("end", data);
    this.emit("close");
    this.writable = false;
    this.readable = false;
  };
  cjsModule.exports = DataStream;
});
export { require_data_stream };
