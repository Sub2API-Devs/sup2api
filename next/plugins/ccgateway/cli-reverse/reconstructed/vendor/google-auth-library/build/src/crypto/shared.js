/**
 * google-auth-library/build/src/crypto/shared.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:56876-57080 cjs-fingerprint
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
