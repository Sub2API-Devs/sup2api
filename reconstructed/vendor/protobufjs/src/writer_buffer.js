/**
 * protobufjs/src/writer_buffer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { yHr } from "./writer.js";
import { QGe } from "./util/minimal.js";

//@ chunk-798ashq9.js:34145-34984 cjs-fingerprint
var Rr = x(function (xc, Lr) {
  Lr.exports = W;
  var Ar = yHr();
  (W.prototype = Object.create(Ar.prototype)).constructor = W;
  var ot = QGe();
  function W() {
    Ar.call(this);
  }
  W._configure = function () {
    ((W.alloc = ot._Buffer_allocUnsafe),
      (W.writeBytesBuffer =
        ot.Buffer && ot.Buffer.prototype instanceof Uint8Array && ot.Buffer.prototype.set.name === "set"
          ? function (u, f, d) {
              f.set(u, d);
            }
          : function (u, f, d) {
              if (u.copy) u.copy(f, d, 0, u.length);
              else for (var i = 0; i < u.length;) f[d++] = u[i++];
            }));
  };
  W.prototype.bytes = function (u) {
    if (ot.isString(u)) u = ot._Buffer_from(u, "base64");
    var f = u.length >>> 0;
    if ((this.uint32(f), f)) this._push(W.writeBytesBuffer, f, u);
    return this;
  };
  function zi(l, u, f) {
    if (l.length < 40) ot.utf8.write(l, u, f);
    else if (u.utf8Write) u.utf8Write(l, f);
    else u.write(l, f);
  }
  W.prototype.string = function (u) {
    var byteLength = ot.Buffer.byteLength(u);
    if ((this.uint32(byteLength), byteLength)) this._push(zi, byteLength, u);
    return this;
  };
  W._configure();
});

export { Rr };
