/**
 * graceful-fs/legacy-streams.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: graceful-fs@4.2.11
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:4288-5806 cjs-fingerprint
var Ae = x(function (Jt, Ue) {
  var Stream = importMetaRequire("stream").Stream;
  Ue.exports = mt;
  function mt(e) {
    return { ReadStream: r, WriteStream: n };
    function r(i, u) {
      if (!(this instanceof r)) return new r(i, u);
      Stream.call(this);
      var c = this;
      ((this.path = i),
        (this.fd = null),
        (this.readable = !0),
        (this.paused = !1),
        (this.flags = "r"),
        (this.mode = 438),
        (this.bufferSize = 65536),
        (u = u || {}));
      var keys = Object.keys(u);
      for (var m = 0, E = keys.length; m < E; m++) {
        var b = keys[m];
        this[b] = u[b];
      }
      if (this.encoding) this.setEncoding(this.encoding);
      if (this.start !== void 0) {
        if (typeof this.start !== "number") throw TypeError("start must be a Number");
        if (this.end === void 0) this.end = 1 / 0;
        else if (typeof this.end !== "number") throw TypeError("end must be a Number");
        if (this.start > this.end) throw Error("start must be <= end");
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function () {
          c._read();
        });
        return;
      }
      e.open(this.path, this.flags, this.mode, function (o, p) {
        if (o) {
          (c.emit("error", o), (c.readable = !1));
          return;
        }
        ((c.fd = p), c.emit("open", p), c._read());
      });
    }
    function n(i, u) {
      if (!(this instanceof n)) return new n(i, u);
      (Stream.call(this),
        (this.path = i),
        (this.fd = null),
        (this.writable = !0),
        (this.flags = "w"),
        (this.encoding = "binary"),
        (this.mode = 438),
        (this.bytesWritten = 0),
        (u = u || {}));
      var keys = Object.keys(u);
      for (var h = 0, m = keys.length; h < m; h++) {
        var E = keys[h];
        this[E] = u[E];
      }
      if (this.start !== void 0) {
        if (typeof this.start !== "number") throw TypeError("start must be a Number");
        if (this.start < 0) throw Error("start must be >= zero");
        this.pos = this.start;
      }
      if (((this.busy = !1), (this._queue = []), this.fd === null))
        ((this._open = e.open),
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]),
          this.flush());
    }
  }
});

export { Ae };
