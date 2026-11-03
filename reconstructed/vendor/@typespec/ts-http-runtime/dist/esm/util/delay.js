/**
 * @typespec/ts-http-runtime/dist/esm/util/delay.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:43109-43200 esm-layout
function Ws(e, t) {
  e = Math.ceil(e);
  t = Math.floor(t);
  return Math.floor(Math.random() * (t - e + 1)) + e;
}
//@ chunk-mrx6y2r5.js:43200-43325 esm-fingerprint
function Kn(e, config) {
  let exponentialDelay = config.retryDelayInMs * Math.pow(2, e);
  let clampedDelay = Math.min(config.maxRetryDelayInMs, exponentialDelay);
  return {
    retryAfterInMs: clampedDelay / 2 + Ws(0, clampedDelay / 2),
  };
}
export { Kn };
