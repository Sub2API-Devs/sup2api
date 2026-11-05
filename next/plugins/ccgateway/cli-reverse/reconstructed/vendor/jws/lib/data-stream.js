/**
 * jws/lib/data-stream.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-ww3dkdtg.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_safe_buffer } from "../../safe-buffer/index.js";

//@ chunk-ww3dkdtg.js:3287-4019 cjs-fingerprint
var require_data_stream = __commonJS(function (cjsExports, cjsModule) {
  var BufferCtor = require_safe_buffer().Buffer;
  var Stream = importMetaRequire("stream");
  var util = importMetaRequire("util");
  function DataStream(data) {
    this.buffer = null;
    this.writable = true;
    this.readable = true;
    if (!data) {
      this.buffer = BufferCtor.alloc(0);
      return this;
    }
    if (typeof data.pipe === "function") {
      this.buffer = BufferCtor.alloc(0);
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
    this.buffer = BufferCtor.concat([this.buffer, BufferCtor.from(data)]);
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
