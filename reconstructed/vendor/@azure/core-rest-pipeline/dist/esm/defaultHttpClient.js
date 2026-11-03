/**
 * @azure/core-rest-pipeline/dist/esm/defaultHttpClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { Vs } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { Xo } from "./util/wrapAbortSignal.js";

//@ chunk-mrx6y2r5.js:62693-62897 esm-fingerprint
function Ta() {
  let e = Vs();
  return {
    async sendRequest(t) {
      let { abortSignal: abortSignal, cleanup: cleanup } = t.abortSignal ? Xo(t.abortSignal) : {};
      try {
        return ((t.abortSignal = abortSignal), await e.sendRequest(t));
      } finally {
        cleanup === null || cleanup === void 0 || cleanup();
      }
    },
  };
}

export { Ta };
