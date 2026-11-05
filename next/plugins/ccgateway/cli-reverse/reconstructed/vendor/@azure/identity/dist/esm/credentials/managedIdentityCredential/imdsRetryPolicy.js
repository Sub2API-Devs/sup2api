/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/imdsRetryPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { retryPolicy } from "../../../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";
import { readFileBody } from "../../../../../core-rest-pipeline/dist/esm/util/file.js";

//@ chunk-b5df2wx1.js:288839-288852 esm-layout
var DEFAULT_CLIENT_MAX_RETRY_INTERVAL_2 = 64000;
//@ chunk-b5df2wx1.js:288852-289108 esm-fingerprint
function imdsRetryPolicy(msiRetryConfig) {
  return retryPolicy(
    [
      {
        name: "imdsRetryPolicy",
        retry: ({ retryCount, response }) => {
          if ((response === null || response === undefined ? undefined : response.status) !== 404)
            return {
              skipStrategy: true,
            };
          return readFileBody(retryCount, {
            retryDelayInMs: msiRetryConfig.startDelayInMs,
            maxRetryDelayInMs: DEFAULT_CLIENT_MAX_RETRY_INTERVAL_2,
          });
        },
      },
    ],
    {
      maxRetries: msiRetryConfig.maxRetries,
    },
  );
}
export { imdsRetryPolicy };
