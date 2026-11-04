/**
 * protobufjs/src/reader_buffer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_reader } from "./reader.js";
import { require_minimal } from "./util/minimal.js";

//@ chunk-798ashq9.js:39108-39586 cjs-fingerprint
var require_reader_buffer = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = BufferReader;
  var Reader = require_reader();
  (BufferReader.prototype = Object.create(Reader.prototype)).constructor = BufferReader;
  var util = require_minimal();
  function BufferReader(buffer) {
    Reader.call(this, buffer);
  }
  BufferReader._configure = function () {
    if (util.Buffer) BufferReader.prototype._slice = util.Buffer.prototype.slice;
  };
  BufferReader.prototype.string = function () {
    var len = this.uint32();
    return this.buf.utf8Slice
      ? this.buf.utf8Slice(this.pos, (this.pos = Math.min(this.pos + len, this.len)))
      : this.buf.toString("utf-8", this.pos, (this.pos = Math.min(this.pos + len, this.len)));
  };
  BufferReader._configure();
});
export { require_reader_buffer };
