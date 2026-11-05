/**
 * @azure/core-util/dist/esm/error.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 */
import { isError } from "../../../../@typespec/ts-http-runtime/dist/esm/util/error.js";

//@ chunk-b5df2wx1.js:56688-56876 esm-fingerprint
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
