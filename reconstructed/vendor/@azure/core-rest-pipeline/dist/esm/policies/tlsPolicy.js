/**
 * @azure/core-rest-pipeline/dist/esm/policies/tlsPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:54960-55072 esm-fingerprint
function fa(e) {
  return {
    name: "tlsPolicy",
    sendRequest: async (t, r) => {
      if (!t.tlsSettings) t.tlsSettings = e;
      return r(t);
    },
  };
}

export { fa };
