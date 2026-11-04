/**
 * @opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOnSampler.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-9vvvg0d3.js (1)
 * attribution: esm-fingerprint 1
 */
import { SamplingDecision } from "../Sampler.js";

//@ chunk-9vvvg0d3.js:11249-11346 esm-fingerprint
class AlwaysOnSampler {
  shouldSample() {
    return {
      decision: SamplingDecision.RECORD_AND_SAMPLED,
    };
  }
  toString() {
    return "AlwaysOnSampler";
  }
}
export { AlwaysOnSampler };
