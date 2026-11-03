/**
 * protobufjs/src/reader_buffer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { _Hr } from "./reader.js";
import { QGe } from "./util/minimal.js";

//@ chunk-798ashq9.js:39108-39586 cjs-fingerprint
var Fr = x(function (gc, Hr) {
  Hr.exports = at;
  var qr = _Hr();
  (at.prototype = Object.create(qr.prototype)).constructor = at;
  var Br = QGe();
  function at(l) {
    qr.call(this, l);
  }
  at._configure = function () {
    if (Br.Buffer) at.prototype._slice = Br.Buffer.prototype.slice;
  };
  at.prototype.string = function () {
    var uint32 = this.uint32();
    return this.buf.utf8Slice
      ? this.buf.utf8Slice(this.pos, (this.pos = Math.min(this.pos + uint32, this.len)))
      : this.buf.toString("utf-8", this.pos, (this.pos = Math.min(this.pos + uint32, this.len)));
  };
  at._configure();
});

export { Fr };
