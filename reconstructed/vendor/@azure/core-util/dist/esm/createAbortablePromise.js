/**
 * @azure/core-util/dist/esm/createAbortablePromise.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { AbortError } from "../../../abort-controller/AbortError.js";

//@ chunk-mrx6y2r5.js:55968-56444 esm-fingerprint
function Jl(e, t) {
  let {
    cleanupBeforeAbort: cleanupBeforeAbort,
    abortSignal: abortSignal,
    abortErrorMsg: abortErrorMsg,
  } = t !== null && t !== void 0 ? t : {};
  return new Promise((i, s) => {
    function a() {
      s(
        new AbortError(
          abortErrorMsg !== null && abortErrorMsg !== void 0 ? abortErrorMsg : "The operation was aborted.",
        ),
      );
    }
    function c() {
      abortSignal === null || abortSignal === void 0 || abortSignal.removeEventListener("abort", l);
    }
    function l() {
      (cleanupBeforeAbort === null || cleanupBeforeAbort === void 0 || cleanupBeforeAbort(), c(), a());
    }
    if (abortSignal === null || abortSignal === void 0 ? void 0 : abortSignal.aborted) return a();
    try {
      e(
        (d) => {
          (c(), i(d));
        },
        (d) => {
          (c(), s(d));
        },
      );
    } catch (error) {
      s(error);
    }
    abortSignal === null || abortSignal === void 0 || abortSignal.addEventListener("abort", l);
  });
}

export { Jl };
