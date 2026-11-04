/**
 * @azure/core-util/dist/esm/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { isError } from "../../../../@typespec/ts-http-runtime/dist/esm/util/error.js";

//@ chunk-mrx6y2r5.js:56688-56876 esm-fingerprint
function getErrorMessage(error) {
  if (isError(error)) return error.message;
  else {
    let stringified;
    try {
      if (typeof error === "object" && error) stringified = JSON.stringify(error);
      else stringified = String(error);
    } catch (err) {
      stringified = "[unable to stringify input]";
    }
    return `Unknown error ${stringified}`;
  }
}
export { getErrorMessage };
