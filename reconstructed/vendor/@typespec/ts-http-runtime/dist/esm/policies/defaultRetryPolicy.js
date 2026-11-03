/**
 * @typespec/ts-http-runtime/dist/esm/policies/defaultRetryPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { jn, Vn } from "./retryPolicy.js";
import { Al } from "../retryStrategies/throttlingRetryStrategy.js";
import { Il } from "../retryStrategies/exponentialRetryStrategy.js";

//@ chunk-mrx6y2r5.js:46988-47016 esm-fingerprint
var DEFAULTRETRYPOLICY = "defaultRetryPolicy";
//@ chunk-mrx6y2r5.js:47016-47151 esm-fingerprint
function Xs(e = {}) {
  var t;
  return {
    name: DEFAULTRETRYPOLICY,
    sendRequest: jn([Al(), Il(e)], { maxRetries: (t = e.maxRetries) !== null && t !== void 0 ? t : Vn })
      .sendRequest,
  };
}

export { Xs };
