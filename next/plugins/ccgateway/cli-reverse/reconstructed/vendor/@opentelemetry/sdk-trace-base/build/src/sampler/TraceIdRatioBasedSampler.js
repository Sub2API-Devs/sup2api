/**
 * @opentelemetry/sdk-trace-base/build/src/sampler/TraceIdRatioBasedSampler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";
import { SamplingDecision } from "../../esm/Sampler.js";

//@ chunk-3wgj3rdg.js:13005-13021 esm-layout
var import_api_6 = __toESM(require_api());
//@ chunk-3wgj3rdg.js:13021-13538 esm-fingerprint
class TraceIdRatioBasedSampler {
  _ratio;
  _upperBound;
  constructor(_ratio = 0) {
    this._ratio = _ratio;
    this._ratio = this._normalize(_ratio);
    this._upperBound = Math.floor(this._ratio * 4294967295);
  }
  shouldSample(context, traceId) {
    return {
      decision:
        import_api_6.isValidTraceId(traceId) && this._accumulate(traceId) < this._upperBound
          ? SamplingDecision.RECORD_AND_SAMPLED
          : SamplingDecision.NOT_RECORD,
    };
  }
  toString() {
    return `TraceIdRatioBased{${this._ratio}}`;
  }
  _normalize(ratio) {
    if (typeof ratio !== "number" || isNaN(ratio)) return 0;
    return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
  }
  _accumulate(traceId) {
    let accumulation = 0;
    for (let i = 0; i < traceId.length / 8; i++) {
      let pos = i * 8;
      let part = parseInt(traceId.slice(pos, pos + 8), 16);
      accumulation = (accumulation ^ part) >>> 0;
    }
    return accumulation;
  }
}
export { TraceIdRatioBasedSampler };
