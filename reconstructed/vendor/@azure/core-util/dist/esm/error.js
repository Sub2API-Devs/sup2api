/**
 * @azure/core-util/dist/esm/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { tr } from "../../../../@typespec/ts-http-runtime/dist/esm/util/error.js";

//@ chunk-mrx6y2r5.js:56688-56876 esm-fingerprint
function getErrorMessage(e) {
  if (tr(e)) return e.message;
  else {
    let stringified;
    try {
      if (typeof e === "object" && e) stringified = JSON.stringify(e);
      else stringified = String(e);
    } catch (err) {
      stringified = "[unable to stringify input]";
    }
    return `Unknown error ${stringified}`;
  }
}
export { getErrorMessage };
