/**
 * @azure/core-rest-pipeline/dist/esm/policies/redirectPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b5df2wx1.js:54403-54425 esm-fingerprint
var allowedRedirect = ["GET", "HEAD"];
//@ chunk-b5df2wx1.js:54425-54554 esm-layout
function redirectPolicy(options = {}) {
  let { maxRetries = 20 } = options;
  return {
    name: "redirectPolicy",
    async sendRequest(request, next) {
      let response = await next(request);
      return handleRedirect(next, response, maxRetries);
    },
  };
}
//@ chunk-b5df2wx1.js:54554-54960 esm-fingerprint
async function handleRedirect(next, response, maxRetries, currentRetries = 0) {
  let { request, status, headers } = response;
  let locationHeader = headers.get("location");
  if (
    locationHeader &&
    (status === 300 ||
      (status === 301 && allowedRedirect.includes(request.method)) ||
      (status === 302 && allowedRedirect.includes(request.method)) ||
      (status === 303 && request.method === "POST") ||
      status === 307) &&
    currentRetries < maxRetries
  ) {
    let url = new URL(locationHeader, request.url);
    request.url = url.toString();
    if (status === 303) {
      request.method = "GET";
      request.headers.delete("Content-Length");
      delete request.body;
    }
    request.headers.delete("Authorization");
    let res = await next(request);
    return handleRedirect(next, res, maxRetries, currentRetries + 1);
  }
  return response;
}
export { redirectPolicy };
