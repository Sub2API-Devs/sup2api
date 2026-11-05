/**
 * @anthropic-ai/sdk/internal/utils/promise.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-vn3g7zt8.js:105205-105293 esm-fingerprint
function promiseWithResolvers() {
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
export { promiseWithResolvers };
