/**
 * buffer-equal-constant-time/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: buffer-equal-constant-time@1.0.1
 * pieces: chunk-ww3dkdtg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-ww3dkdtg.js:4019-4461 cjs-fingerprint
var require_buffer_equal_constant_time = __commonJS(function (cjsExports, cjsModule) {
  var BufferCtor = importMetaRequire("buffer").Buffer;
  var SlowBuffer = importMetaRequire("buffer").SlowBuffer;
  cjsModule.exports = bufferEq;
  function bufferEq(a, b) {
    if (!BufferCtor.isBuffer(a) || !BufferCtor.isBuffer(b)) return false;
    if (a.length !== b.length) return false;
    var c = 0;
    for (var i = 0; i < a.length; i++) c |= a[i] ^ b[i];
    return c === 0;
  }
  bufferEq.install = function () {
    BufferCtor.prototype.equal = SlowBuffer.prototype.equal = function (that) {
      return bufferEq(this, that);
    };
  };
  var origBufEqual = BufferCtor.prototype.equal;
  var origSlowBufEqual = SlowBuffer.prototype.equal;
  bufferEq.restore = function () {
    BufferCtor.prototype.equal = origBufEqual;
    SlowBuffer.prototype.equal = origSlowBufEqual;
  };
});
export { require_buffer_equal_constant_time };
