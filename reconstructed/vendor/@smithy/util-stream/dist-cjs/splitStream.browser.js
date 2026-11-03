/**
 * @smithy/util-stream/dist-cjs/splitStream.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-wjd9n4jx.js:10211-10385 cjs-fingerprint
var Qt = x(function (Vt) {
  Object.defineProperty(Vt, "__esModule", { value: !0 });
  Vt.splitStream = Kr;
  async function Kr(e) {
    if (typeof e.stream === "function") e = e.stream();
    return e.tee();
  }
});

export { Qt };
