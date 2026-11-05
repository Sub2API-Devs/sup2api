/**
 * @opentelemetry/sdk-trace-base/build/esm/sampler/AlwaysOnSampler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SamplingDecision } from "../Sampler.js";

//@ chunk-3wgj3rdg.js:11621-11718 esm-fingerprint
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
