/**
 * @azure/core-rest-pipeline/dist/esm/util/wrapAbortSignal.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:61450-61768 esm-fingerprint
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
