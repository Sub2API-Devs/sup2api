/**
 * @opentelemetry/api/build/src/trace/SamplingResult.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:43491-43765 cjs-fingerprint
var require_SamplingResult = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SamplingDecision = undefined;
  var SamplingDecision;
  (function (SamplingDecision) {
    SamplingDecision[(SamplingDecision.NOT_RECORD = 0)] = "NOT_RECORD";
    SamplingDecision[(SamplingDecision.RECORD = 1)] = "RECORD";
    SamplingDecision[(SamplingDecision.RECORD_AND_SAMPLED = 2)] = "RECORD_AND_SAMPLED";
  })((SamplingDecision = cjsExports.SamplingDecision || (cjsExports.SamplingDecision = {})));
});
export { require_SamplingResult };
