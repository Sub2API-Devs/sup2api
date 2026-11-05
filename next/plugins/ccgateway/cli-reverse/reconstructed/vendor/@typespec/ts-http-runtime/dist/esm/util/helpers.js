/**
 * @typespec/ts-http-runtime/dist/esm/util/helpers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AbortError_2 } from "../restError.js";

//@ chunk-b5df2wx1.js:43325-43361 esm-fingerprint
var StandardAbortMessage = "The operation was aborted.";
//@ chunk-b5df2wx1.js:43361-43887 esm-fingerprint
function delay_2(delayInMs, value, options) {
  return new Promise((resolve, reject) => {
    let timer = undefined;
    let onAborted = undefined;
    let rejectOnAbort = () =>
      reject(
        new AbortError_2(
          (options === null || options === undefined ? undefined : options.abortErrorMsg)
            ? options === null || options === undefined
              ? undefined
              : options.abortErrorMsg
            : StandardAbortMessage,
        ),
      );
    let removeListeners = () => {
      if ((options === null || options === undefined ? undefined : options.abortSignal) && onAborted)
        options.abortSignal.removeEventListener("abort", onAborted);
    };
    onAborted = () => {
      if (timer) clearTimeout(timer);
      removeListeners();
      return rejectOnAbort();
    };
    if (
      (options === null || options === undefined ? undefined : options.abortSignal) &&
      options.abortSignal.aborted
    )
      return rejectOnAbort();
    timer = setTimeout(() => {
      removeListeners();
      resolve(value);
    }, delayInMs);
    if (options === null || options === undefined ? undefined : options.abortSignal)
      options.abortSignal.addEventListener("abort", onAborted);
  });
}
//@ chunk-b5df2wx1.js:43887-43991 esm-fingerprint
function parseHeaderValueAsNumber(response, headerName) {
  let value = response.headers.get(headerName);
  if (!value) return;
  let valueAsNum = Number(value);
  if (Number.isNaN(valueAsNum)) return;
  return valueAsNum;
}
export { parseHeaderValueAsNumber, delay_2 };
