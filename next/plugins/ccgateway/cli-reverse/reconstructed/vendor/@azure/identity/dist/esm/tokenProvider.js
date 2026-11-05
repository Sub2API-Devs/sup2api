/**
 * @azure/identity/dist/esm/tokenProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createEmptyHttpPipeline } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { bearerTokenAuthenticationPolicy } from "../../../core-rest-pipeline/dist/esm/policies/bearerTokenAuthenticationPolicy.js";
import { isExponentialBackoff } from "../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";

//@ chunk-b5df2wx1.js:331737-332181 esm-fingerprint
function getBearerTokenProvider(credential, scopes, options) {
  let { abortSignal, tracingOptions } = options || {};
  let pipeline = createEmptyHttpPipeline();
  pipeline.addPolicy(
    bearerTokenAuthenticationPolicy({
      credential,
      scopes,
    }),
  );
  async function getRefreshedToken() {
    var _a;
    let accessToken =
      (_a = (
        await pipeline.sendRequest(
          {
            sendRequest: (request) =>
              Promise.resolve({
                request,
                status: 200,
                headers: request.headers,
              }),
          },
          isExponentialBackoff({
            url: "https://example.com",
            abortSignal,
            tracingOptions,
          }),
        )
      ).headers.get("authorization")) === null || _a === undefined
        ? undefined
        : _a.split(" ")[1];
    if (!accessToken) throw Error("Failed to get access token");
    return accessToken;
  }
  return getRefreshedToken;
}
export { getBearerTokenProvider };
