/**
 * buffer-equal-constant-time/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: buffer-equal-constant-time@1.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-82d8c88w.js:4019-4461 cjs-fingerprint
var ie = x(function (xr, ne) {
  var w = importMetaRequire("buffer").Buffer,
    SlowBuffer = importMetaRequire("buffer").SlowBuffer;
  ne.exports = L;
  function L(e, r) {
    if (!w.isBuffer(e) || !w.isBuffer(r)) return !1;
    if (e.length !== r.length) return !1;
    var t = 0;
    for (var n = 0; n < e.length; n++) t |= e[n] ^ r[n];
    return t === 0;
  }
  L.install = function () {
    w.prototype.equal = SlowBuffer.prototype.equal = function (r) {
      return L(this, r);
    };
  };
  var equal = w.prototype.equal,
    equal_2 = SlowBuffer.prototype.equal;
  L.restore = function () {
    ((w.prototype.equal = equal), (SlowBuffer.prototype.equal = equal_2));
  };
});

export { ie };
