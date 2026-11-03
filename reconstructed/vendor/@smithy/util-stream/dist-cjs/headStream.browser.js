/**
 * @smithy/util-stream/dist-cjs/headStream.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:6573-7005 cjs-fingerprint
var Et = x(function (Tt) {
  Object.defineProperty(Tt, "__esModule", { value: !0 });
  Tt.headStream = Vr;
  async function Vr(e, t) {
    let r = 0,
      s = [],
      reader = e.getReader(),
      i = !1;
    while (!i) {
      let { done: c, value: u } = await reader.read();
      if (u) (s.push(u), (r += u?.byteLength ?? 0));
      if (r >= t) break;
      i = c;
    }
    reader.releaseLock();
    let uint8Array = new Uint8Array(Math.min(t, r)),
      o = 0;
    for (let c of s) {
      if (c.byteLength > uint8Array.byteLength - o) {
        uint8Array.set(c.subarray(0, uint8Array.byteLength - o), o);
        break;
      } else uint8Array.set(c, o);
      o += c.length;
    }
    return uint8Array;
  }
});

export { Et };
