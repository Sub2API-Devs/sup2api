/**
 * standardwebhooks/dist/timing_safe_equal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: standardwebhooks@1.0.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-hwmsct5x.js:3818-4328 cjs-fingerprint
var require_timing_safe_equal = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.timingSafeEqual = undefined;
  function assert(expr, msg = "") {
    if (!expr) throw Error(msg);
  }
  function timingSafeEqual(a, b) {
    if (a.byteLength !== b.byteLength) return false;
    if (!(a instanceof DataView)) a = new DataView(ArrayBuffer.isView(a) ? a.buffer : a);
    if (!(b instanceof DataView)) b = new DataView(ArrayBuffer.isView(b) ? b.buffer : b);
    assert(a instanceof DataView);
    assert(b instanceof DataView);
    let length = a.byteLength;
    let out = 0;
    let i = -1;
    while (++i < length) out |= a.getUint8(i) ^ b.getUint8(i);
    return out === 0;
  }
  cjsExports.timingSafeEqual = timingSafeEqual;
});
export { require_timing_safe_equal };
