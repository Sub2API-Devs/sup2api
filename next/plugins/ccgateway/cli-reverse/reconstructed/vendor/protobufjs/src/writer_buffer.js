/**
 * protobufjs/src/writer_buffer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_writer } from "./writer.js";
import { require_minimal } from "./util/minimal.js";

//@ chunk-vxhm2nqe.js:34145-34984 cjs-fingerprint
var require_writer_buffer = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = BufferWriter;
  var Writer = require_writer();
  (BufferWriter.prototype = Object.create(Writer.prototype)).constructor = BufferWriter;
  var util = require_minimal();
  function BufferWriter() {
    Writer.call(this);
  }
  BufferWriter._configure = function () {
    BufferWriter.alloc = util._Buffer_allocUnsafe;
    BufferWriter.writeBytesBuffer =
      util.Buffer && util.Buffer.prototype instanceof Uint8Array && util.Buffer.prototype.set.name === "set"
        ? function (val, buf, pos) {
            buf.set(val, pos);
          }
        : function (val, buf, pos) {
            if (val.copy) val.copy(buf, pos, 0, val.length);
            else for (var idx = 0; idx < val.length;) buf[pos++] = val[idx++];
          };
  };
  BufferWriter.prototype.bytes = function (value) {
    if (util.isString(value)) value = util._Buffer_from(value, "base64");
    var len = value.length >>> 0;
    this.uint32(len);
    if (len) this._push(BufferWriter.writeBytesBuffer, len, value);
    return this;
  };
  function writeStringBuffer(val, buf, pos) {
    if (val.length < 40) util.utf8.write(val, buf, pos);
    else if (buf.utf8Write) buf.utf8Write(val, pos);
    else buf.write(val, pos);
  }
  BufferWriter.prototype.string = function (value) {
    var len = util.Buffer.byteLength(value);
    this.uint32(len);
    if (len) this._push(writeStringBuffer, len, value);
    return this;
  };
  BufferWriter._configure();
});
export { require_writer_buffer };
