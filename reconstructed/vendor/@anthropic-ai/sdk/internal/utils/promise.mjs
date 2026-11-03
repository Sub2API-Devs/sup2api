/**
 * @anthropic-ai/sdk/internal/utils/promise.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-hwmsct5x.js:104825-104913 esm-fingerprint
function SEn() {
  let resolve;
  let reject;
  return {
    promise: new Promise((res, reject_2) => {
      resolve = res;
      reject = reject_2;
    }),
    resolve,
    reject,
  };
}
export { SEn };
