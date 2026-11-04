/**
 * @typespec/ts-http-runtime/dist/esm/util/delay.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:43109-43200 esm-layout
function getRandomIntegerInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
//@ chunk-mrx6y2r5.js:43200-43325 esm-fingerprint
function calculateRetryDelay(retryAttempt, config) {
  let exponentialDelay = config.retryDelayInMs * Math.pow(2, retryAttempt);
  let clampedDelay = Math.min(config.maxRetryDelayInMs, exponentialDelay);
  return {
    retryAfterInMs: clampedDelay / 2 + getRandomIntegerInclusive(0, clampedDelay / 2),
  };
}
export { calculateRetryDelay };
