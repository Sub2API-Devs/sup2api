/**
 * @azure/core-rest-pipeline/dist/esm/util/wrapAbortSignal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:61450-61768 esm-fingerprint
function wrapAbortSignalLike(abortSignalLike) {
  if (abortSignalLike instanceof AbortSignal)
    return {
      abortSignal: abortSignalLike,
    };
  if (abortSignalLike.aborted)
    return {
      abortSignal: AbortSignal.abort(abortSignalLike.reason),
    };
  let controller = new AbortController();
  let needsCleanup = true;
  function cleanup() {
    if (needsCleanup) {
      abortSignalLike.removeEventListener("abort", listener);
      needsCleanup = false;
    }
  }
  function listener() {
    controller.abort(abortSignalLike.reason);
    cleanup();
  }
  abortSignalLike.addEventListener("abort", listener);
  return {
    abortSignal: controller.signal,
    cleanup,
  };
}
export { wrapAbortSignalLike };
