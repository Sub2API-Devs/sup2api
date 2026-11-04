/**
 * @azure/core-rest-pipeline/dist/esm/defaultHttpClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { createDefaultHttpClient } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { wrapAbortSignalLike } from "./util/wrapAbortSignal.js";

//@ chunk-mrx6y2r5.js:62693-62897 esm-fingerprint
function createDefaultHttpClient_2() {
  let client = createDefaultHttpClient();
  return {
    async sendRequest(request) {
      let { abortSignal, cleanup } = request.abortSignal ? wrapAbortSignalLike(request.abortSignal) : {};
      try {
        request.abortSignal = abortSignal;
        return await client.sendRequest(request);
      } finally {
        if (!(cleanup === null || cleanup === undefined)) cleanup();
      }
    },
  };
}
export { createDefaultHttpClient_2 };
