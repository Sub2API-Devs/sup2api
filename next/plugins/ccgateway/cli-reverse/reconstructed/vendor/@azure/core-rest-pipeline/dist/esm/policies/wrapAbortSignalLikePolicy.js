/**
 * @azure/core-rest-pipeline/dist/esm/policies/wrapAbortSignalLikePolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { wrapAbortSignalLike } from "../util/wrapAbortSignal.js";

//@ chunk-b5df2wx1.js:61768-61803 esm-fingerprint
var wrapAbortSignalLikePolicyName = "wrapAbortSignalLikePolicy";
//@ chunk-b5df2wx1.js:61803-62009 esm-fingerprint
function wrapAbortSignalLikePolicy() {
  return {
    name: wrapAbortSignalLikePolicyName,
    sendRequest: async (request, next) => {
      if (!request.abortSignal) return next(request);
      let { abortSignal, cleanup } = wrapAbortSignalLike(request.abortSignal);
      request.abortSignal = abortSignal;
      try {
        return await next(request);
      } finally {
        if (!(cleanup === null || cleanup === undefined)) cleanup();
      }
    },
  };
}
export { wrapAbortSignalLikePolicy };
