/**
 * standardwebhooks/dist/timing_safe_equal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: standardwebhooks@1.0.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-hwmsct5x.js:3818-4328 cjs-fingerprint
var Mu = x(function (xu) {
  Object.defineProperty(xu, "__esModule", { value: !0 });
  xu.timingSafeEqual = void 0;
  function ku(e, n = "") {
    if (!e) throw Error(n);
  }
  function sm(e, n) {
    if (e.byteLength !== n.byteLength) return !1;
    if (!(e instanceof DataView)) e = new DataView(ArrayBuffer.isView(e) ? e.buffer : e);
    if (!(n instanceof DataView)) n = new DataView(ArrayBuffer.isView(n) ? n.buffer : n);
    (ku(e instanceof DataView), ku(n instanceof DataView));
    let byteLength = e.byteLength,
      s = 0,
      h = -1;
    while (++h < byteLength) s |= e.getUint8(h) ^ n.getUint8(h);
    return s === 0;
  }
  xu.timingSafeEqual = sm;
});

export { Mu };
