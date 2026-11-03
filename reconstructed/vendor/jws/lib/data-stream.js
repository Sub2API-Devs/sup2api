/**
 * jws/lib/data-stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { d } from "../../safe-buffer/index.js";

//@ chunk-82d8c88w.js:3287-4019 cjs-fingerprint
var N = x(function (Ir, te) {
  var I = d().Buffer,
    je = importMetaRequire("stream"),
    Ce = importMetaRequire("util");
  function P(e) {
    if (((this.buffer = null), (this.writable = !0), (this.readable = !0), !e))
      return ((this.buffer = I.alloc(0)), this);
    if (typeof e.pipe === "function") return ((this.buffer = I.alloc(0)), e.pipe(this), this);
    if (e.length || typeof e === "object")
      return (
        (this.buffer = e),
        (this.writable = !1),
        process.nextTick(
          function () {
            (this.emit("end", e), (this.readable = !1), this.emit("close"));
          }.bind(this),
        ),
        this
      );
    throw TypeError("Unexpected data type (" + typeof e + ")");
  }
  Ce.inherits(P, je);
  P.prototype.write = function (r) {
    ((this.buffer = I.concat([this.buffer, I.from(r)])), this.emit("data", r));
  };
  P.prototype.end = function (r) {
    if (r) this.write(r);
    (this.emit("end", r), this.emit("close"), (this.writable = !1), (this.readable = !1));
  };
  te.exports = P;
});

export { N };
