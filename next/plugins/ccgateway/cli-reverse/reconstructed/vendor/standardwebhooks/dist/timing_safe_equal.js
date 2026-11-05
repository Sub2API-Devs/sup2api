/**
 * standardwebhooks/dist/timing_safe_equal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: standardwebhooks@1.0.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-vn3g7zt8.js:4161-4671 cjs-fingerprint
var require_timing_safe_equal = __commonJS(function (cjsExports) {
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
