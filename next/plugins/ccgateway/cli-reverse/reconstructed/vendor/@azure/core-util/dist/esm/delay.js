/**
 * @azure/core-util/dist/esm/delay.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createAbortablePromise } from "./createAbortablePromise.js";

//@ chunk-b5df2wx1.js:56444-56476 esm-fingerprint
var StandardAbortMessage_2 = "The delay was aborted.";
//@ chunk-b5df2wx1.js:56476-56688 esm-fingerprint
function delay_3(timeInMs, options) {
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
export { delay_3 };
