/**
 * @opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOffSampler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (1)
 * attribution: esm-fingerprint 1
 */
import { SamplingDecision } from "../Sampler.js";

//@ chunk-3wgj3rdg.js:11531-11621 esm-fingerprint
class AlwaysOffSampler {
  shouldSample() {
    return {
      decision: SamplingDecision.NOT_RECORD,
    };
  }
  toString() {
    return "AlwaysOffSampler";
  }
}
export { AlwaysOffSampler };
