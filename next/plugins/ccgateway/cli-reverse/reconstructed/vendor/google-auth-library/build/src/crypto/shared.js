/**
 * google-auth-library/build/src/crypto/shared.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-na3pph4p.js:56876-57080 cjs-fingerprint
var require_shared = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.fromArrayBufferToHex = fromArrayBufferToHex;
  function fromArrayBufferToHex(arrayBuffer) {
    return Array.from(new Uint8Array(arrayBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
});
export { require_shared };
