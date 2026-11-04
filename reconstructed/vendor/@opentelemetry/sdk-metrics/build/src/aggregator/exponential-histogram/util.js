/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-wrv5s6k4.js:8315-8669 cjs-fingerprint
var require_util = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.nextGreaterSquare = cjsExports.ldexp = undefined;
  function ldexp(frac, exp) {
    if (
      frac === 0 ||
      frac === Number.POSITIVE_INFINITY ||
      frac === Number.NEGATIVE_INFINITY ||
      Number.isNaN(frac)
    )
      return frac;
    return frac * Math.pow(2, exp);
  }
  cjsExports.ldexp = ldexp;
  function nextGreaterSquare(v) {
    v--;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v++;
    return v;
  }
  cjsExports.nextGreaterSquare = nextGreaterSquare;
});
export { require_util };
