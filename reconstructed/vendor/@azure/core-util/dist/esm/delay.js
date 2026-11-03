/**
 * @azure/core-util/dist/esm/delay.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { Jl } from "./createAbortablePromise.js";

//@ chunk-mrx6y2r5.js:56444-56476 esm-fingerprint
var vp = "The delay was aborted.";
//@ chunk-mrx6y2r5.js:56476-56688 esm-fingerprint
function ma(e, t) {
  let r,
    { abortSignal: abortSignal, abortErrorMsg: abortErrorMsg } = t !== null && t !== void 0 ? t : {};
  return Jl(
    (i) => {
      r = setTimeout(i, e);
    },
    {
      cleanupBeforeAbort: () => clearTimeout(r),
      abortSignal: abortSignal,
      abortErrorMsg: abortErrorMsg !== null && abortErrorMsg !== void 0 ? abortErrorMsg : vp,
    },
  );
}

export { ma };
