/**
 * @azure/core-util/dist/esm/createAbortablePromise.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { AbortError } from "../../../abort-controller/AbortError.js";

//@ chunk-mrx6y2r5.js:55968-56444 esm-fingerprint
function createAbortablePromise(buildPromise, options) {
  let { cleanupBeforeAbort, abortSignal, abortErrorMsg } =
    options !== null && options !== undefined ? options : {};
  return new Promise((resolve, reject) => {
    function rejectOnAbort() {
      reject(
        new AbortError(
          abortErrorMsg !== null && abortErrorMsg !== undefined
            ? abortErrorMsg
            : "The operation was aborted.",
        ),
      );
    }
    function removeListeners() {
      if (!(abortSignal === null || abortSignal === undefined))
        abortSignal.removeEventListener("abort", onAbort);
    }
    function onAbort() {
      if (!(cleanupBeforeAbort === null || cleanupBeforeAbort === undefined)) cleanupBeforeAbort();
      removeListeners();
      rejectOnAbort();
    }
    if (abortSignal === null || abortSignal === undefined ? undefined : abortSignal.aborted)
      return rejectOnAbort();
    try {
      buildPromise(
        (x) => {
          removeListeners();
          resolve(x);
        },
        (x) => {
          removeListeners();
          reject(x);
        },
      );
    } catch (err) {
      reject(err);
    }
    if (!(abortSignal === null || abortSignal === undefined)) abortSignal.addEventListener("abort", onAbort);
  });
}
export { createAbortablePromise };
