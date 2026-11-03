/**
 * pngjs/lib/chunkstream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:20975-23141 cjs-fingerprint
var st = x(function (Dl, Pr) {
  var Sr = importMetaRequire("util"),
    ot = importMetaRequire("stream"),
    S = (Pr.exports = function () {
      (ot.call(this),
        (this._buffers = []),
        (this._buffered = 0),
        (this._reads = []),
        (this._paused = !1),
        (this._encoding = "utf8"),
        (this.writable = !0));
    });
  Sr.inherits(S, ot);
  S.prototype.read = function (t, e) {
    (this._reads.push({ length: Math.abs(t), allowLess: t < 0, func: e }),
      process.nextTick(
        function () {
          if ((this._process(), this._paused && this._reads && this._reads.length > 0))
            ((this._paused = !1), this.emit("drain"));
        }.bind(this),
      ));
  };
  S.prototype.write = function (t, e) {
    if (!this.writable) return (this.emit("error", Error("Stream not writable")), !1);
    let r;
    if (Buffer.isBuffer(t)) r = t;
    else r = Buffer.from(t, e || this._encoding);
    if (
      (this._buffers.push(r),
      (this._buffered += r.length),
      this._process(),
      this._reads && this._reads.length === 0)
    )
      this._paused = !0;
    return this.writable && !this._paused;
  };
  S.prototype.end = function (t, e) {
    if (t) this.write(t, e);
    if (((this.writable = !1), !this._buffers)) return;
    if (this._buffers.length === 0) this._end();
    else (this._buffers.push(null), this._process());
  };
  S.prototype.destroySoon = S.prototype.end;
  S.prototype._end = function () {
    if (this._reads.length > 0) this.emit("error", Error("Unexpected end of input"));
    this.destroy();
  };
  S.prototype.destroy = function () {
    if (!this._buffers) return;
    ((this.writable = !1), (this._reads = null), (this._buffers = null), this.emit("close"));
  };
  S.prototype._processReadAllowingLess = function (t) {
    this._reads.shift();
    let e = this._buffers[0];
    if (e.length > t.length)
      ((this._buffered -= t.length),
        (this._buffers[0] = e.slice(t.length)),
        t.func.call(this, e.slice(0, t.length)));
    else ((this._buffered -= e.length), this._buffers.shift(), t.func.call(this, e));
  };
  S.prototype._processRead = function (t) {
    this._reads.shift();
    let e = 0,
      r = 0,
      alloc = Buffer.alloc(t.length);
    while (e < t.length) {
      let i = this._buffers[r++],
        min = Math.min(i.length, t.length - e);
      if ((i.copy(alloc, e, 0, min), (e += min), min !== i.length)) this._buffers[--r] = i.slice(min);
    }
    if (r > 0) this._buffers.splice(0, r);
    ((this._buffered -= t.length), t.func.call(this, alloc));
  };
  S.prototype._process = function () {
    try {
      while (this._buffered > 0 && this._reads && this._reads.length > 0) {
        let t = this._reads[0];
        if (t.allowLess) this._processReadAllowingLess(t);
        else if (this._buffered >= t.length) this._processRead(t);
        else break;
      }
      if (this._buffers && !this.writable) this._end();
    } catch (error) {
      this.emit("error", error);
    }
  };
});

export { st };
