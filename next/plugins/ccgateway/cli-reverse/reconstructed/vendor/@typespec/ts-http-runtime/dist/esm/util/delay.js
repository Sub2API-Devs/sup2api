/**
 * @typespec/ts-http-runtime/dist/esm/util/delay.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:43109-43200 esm-layout
function getRandomIntegerInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
//@ chunk-b5df2wx1.js:43200-43325 esm-fingerprint
function calculateRetryDelay(retryAttempt, config) {
  let exponentialDelay = config.retryDelayInMs * Math.pow(2, retryAttempt);
  let clampedDelay = Math.min(config.maxRetryDelayInMs, exponentialDelay);
  return {
    retryAfterInMs: clampedDelay / 2 + getRandomIntegerInclusive(0, clampedDelay / 2),
  };
}
export { calculateRetryDelay };
