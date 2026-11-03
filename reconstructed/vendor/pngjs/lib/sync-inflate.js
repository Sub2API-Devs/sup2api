/**
 * pngjs/lib/sync-inflate.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:43714-45541 cjs-fingerprint
var dn = x(function (ye, cn) {
  var ok = importMetaRequire("assert").ok,
    R = importMetaRequire("zlib"),
    an = importMetaRequire("util"),
    kMaxLength = importMetaRequire("buffer").kMaxLength;
  function v(t) {
    if (!(this instanceof v)) return new v(t);
    if (t && t.chunkSize < R.Z_MIN_CHUNK) t.chunkSize = R.Z_MIN_CHUNK;
    if (
      (R.Inflate.call(this, t),
      (this._offset = this._offset === void 0 ? this._outOffset : this._offset),
      (this._buffer = this._buffer || this._outBuffer),
      t && t.maxLength != null)
    )
      this._maxLength = t.maxLength;
  }
  function us(t) {
    return new v(t);
  }
  function fn(t, e) {
    if (e) process.nextTick(e);
    if (!t._handle) return;
    (t._handle.close(), (t._handle = null));
  }
  v.prototype._processChunk = function (t, e, r) {
    if (typeof r === "function") return R.Inflate._processChunk.call(this, t, e, r);
    let n = this,
      i = t && t.length,
      o = this._chunkSize - this._offset,
      _maxLength = this._maxLength,
      l = 0,
      u = [],
      f = 0,
      a;
    this.on("error", function (_) {
      a = _;
    });
    function h(_, w) {
      if (n._hadError) return;
      let m = o - w;
      if ((ok(m >= 0, "have should not go down"), m > 0)) {
        let sliced = n._buffer.slice(n._offset, n._offset + m);
        if (((n._offset += m), sliced.length > _maxLength)) sliced = sliced.slice(0, _maxLength);
        if ((u.push(sliced), (f += sliced.length), (_maxLength -= sliced.length), _maxLength === 0))
          return !1;
      }
      if (w === 0 || n._offset >= n._chunkSize)
        ((o = n._chunkSize), (n._offset = 0), (n._buffer = Buffer.allocUnsafe(n._chunkSize)));
      if (w === 0) return ((l += i - _), (i = _), !0);
      return !1;
    }
    ok(this._handle, "zlib binding closed");
    let c;
    do ((c = this._handle.writeSync(e, t, l, i, this._buffer, this._offset, o)), (c = c || this._writeState));
    while (!this._hadError && h(c[0], c[1]));
    if (this._hadError) throw a;
    if (f >= kMaxLength)
      throw (
        fn(this),
        RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes",
        )
      );
    let buffer = Buffer.concat(u, f);
    return (fn(this), buffer);
  };
  an.inherits(v, R.Inflate);
  function fs(t, e) {
    if (typeof e === "string") e = Buffer.from(e);
    if (!(e instanceof Buffer)) throw TypeError("Not a string or buffer");
    let _finishFlushFlag = t._finishFlushFlag;
    if (_finishFlushFlag == null) _finishFlushFlag = R.Z_FINISH;
    return t._processChunk(e, _finishFlushFlag);
  }
  function hn(t, e) {
    return fs(new v(e), t);
  }
  cn.exports = ye = hn;
  ye.Inflate = v;
  ye.createInflate = us;
  ye.inflateSync = hn;
});

export { dn };
