/**
 * @typespec/ts-http-runtime/dist/esm/policies/decompressResponsePolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:42950-43109 esm-fingerprint
function Ys() {
  return {
    name: "decompressResponsePolicy",
    async sendRequest(e, t) {
      if (e.method !== "HEAD") e.headers.set("Accept-Encoding", "gzip,deflate");
      return t(e);
    },
  };
}

export { Ys };
