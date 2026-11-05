/**
 * @typespec/ts-http-runtime/dist/esm/policies/decompressResponsePolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:42950-43109 esm-fingerprint
function decompressResponsePolicy() {
  return {
    name: "decompressResponsePolicy",
    async sendRequest(request, next) {
      if (request.method !== "HEAD") request.headers.set("Accept-Encoding", "gzip,deflate");
      return next(request);
    },
  };
}
export { decompressResponsePolicy };
