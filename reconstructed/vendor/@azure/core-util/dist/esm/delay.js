/**
 * @azure/core-util/dist/esm/delay.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { createAbortablePromise } from "./createAbortablePromise.js";

//@ chunk-mrx6y2r5.js:56444-56476 esm-fingerprint
var StandardAbortMessage_2 = "The delay was aborted.";
//@ chunk-mrx6y2r5.js:56476-56688 esm-fingerprint
function delay_2(timeInMs, options) {
  let token;
  let { abortSignal, abortErrorMsg } = options !== null && options !== undefined ? options : {};
  return createAbortablePromise(
    (resolve) => {
      token = setTimeout(resolve, timeInMs);
    },
    {
      cleanupBeforeAbort: () => clearTimeout(token),
      abortSignal,
      abortErrorMsg:
        abortErrorMsg !== null && abortErrorMsg !== undefined ? abortErrorMsg : StandardAbortMessage_2,
    },
  );
}
export { delay_2 };
