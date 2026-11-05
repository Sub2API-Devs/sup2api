/**
 * @opentelemetry/sdk-trace-base/build/esm/Sampler.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../api/build/src/index.js";
import { require_core } from "../../../core/build/src/index.js";

//@ chunk-3wgj3rdg.js:11371-11398 esm-layout
var import_api_4 = __toESM(require_api());
var import_core_6 = __toESM(require_core());
//@ chunk-3wgj3rdg.js:11398-11404 esm-layout
var SamplingDecision;
//@ chunk-3wgj3rdg.js:11404-11531 esm-fingerprint
(function (SamplingDecision) {
  SamplingDecision[(SamplingDecision.NOT_RECORD = 0)] = "NOT_RECORD";
  SamplingDecision[(SamplingDecision.RECORD = 1)] = "RECORD";
  SamplingDecision[(SamplingDecision.RECORD_AND_SAMPLED = 2)] = "RECORD_AND_SAMPLED";
})(SamplingDecision || (SamplingDecision = {}));
export { SamplingDecision, import_core_6, import_api_4 };
