/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/util.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-q87n5wsq.js:8315-8669 cjs-fingerprint
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
