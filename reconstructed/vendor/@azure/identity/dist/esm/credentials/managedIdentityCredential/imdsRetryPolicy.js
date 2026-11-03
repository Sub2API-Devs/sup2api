/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/imdsRetryPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { retryPolicy } from "../../../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";
import { Xl } from "../../../../../core-rest-pipeline/dist/esm/util/file.js";

//@ chunk-mrx6y2r5.js:288839-288852 esm-layout
var tC = 64000;
//@ chunk-mrx6y2r5.js:288852-289108 esm-fingerprint
function Yf(e) {
  return retryPolicy(
    [
      {
        name: "imdsRetryPolicy",
        retry: ({ retryCount: retryCount, response: response }) => {
          if ((response === null || response === void 0 ? void 0 : response.status) !== 404)
            return { skipStrategy: !0 };
          return Xl(retryCount, { retryDelayInMs: e.startDelayInMs, maxRetryDelayInMs: tC });
        },
      },
    ],
    { maxRetries: e.maxRetries },
  );
}

export { Yf };
