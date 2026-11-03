/**
 * @azure/core-util/dist/esm/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-util@1.14.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { tr } from "../../../../@typespec/ts-http-runtime/dist/esm/util/error.js";

//@ chunk-mrx6y2r5.js:56688-56876 esm-fingerprint
function jr(e) {
  if (tr(e)) return e.message;
  else {
    let t;
    try {
      if (typeof e === "object" && e) t = JSON.stringify(e);
      else t = String(e);
    } catch (error) {
      t = "[unable to stringify input]";
    }
    return `Unknown error ${t}`;
  }
}

export { jr };
