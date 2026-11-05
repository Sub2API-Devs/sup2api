/**
 * @typespec/ts-http-runtime/dist/esm/policies/defaultRetryPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { retryPolicy_2, DEFAULT_RETRY_POLICY_COUNT } from "./retryPolicy.js";
import { throttlingRetryStrategy } from "../retryStrategies/throttlingRetryStrategy.js";
import { exponentialRetryStrategy } from "../retryStrategies/exponentialRetryStrategy.js";

//@ chunk-b5df2wx1.js:46988-47016 esm-fingerprint
var defaultRetryPolicyName = "defaultRetryPolicy";
//@ chunk-b5df2wx1.js:47016-47151 esm-fingerprint
function defaultRetryPolicy(options = {}) {
  var _a;
  return {
    name: defaultRetryPolicyName,
    sendRequest: retryPolicy_2([throttlingRetryStrategy(), exponentialRetryStrategy(options)], {
      maxRetries: (_a = options.maxRetries) !== null && _a !== undefined ? _a : DEFAULT_RETRY_POLICY_COUNT,
    }).sendRequest,
  };
}
export { defaultRetryPolicy };
