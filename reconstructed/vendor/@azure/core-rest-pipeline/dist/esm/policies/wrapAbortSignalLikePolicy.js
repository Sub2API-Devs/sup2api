/**
 * @azure/core-rest-pipeline/dist/esm/policies/wrapAbortSignalLikePolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { Xo } from "../util/wrapAbortSignal.js";

//@ chunk-mrx6y2r5.js:61768-61803 esm-fingerprint
var WRAPABORTSIGNALLIKEPOLICY = "wrapAbortSignalLikePolicy";
//@ chunk-mrx6y2r5.js:61803-62009 esm-fingerprint
function pd() {
  return {
    name: WRAPABORTSIGNALLIKEPOLICY,
    sendRequest: async (e, t) => {
      if (!e.abortSignal) return t(e);
      let { abortSignal: abortSignal, cleanup: cleanup } = Xo(e.abortSignal);
      e.abortSignal = abortSignal;
      try {
        return await t(e);
      } finally {
        cleanup === null || cleanup === void 0 || cleanup();
      }
    },
  };
}

export { pd };
