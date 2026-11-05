/**
 * @azure/core-rest-pipeline/dist/esm/policies/setClientRequestIdPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { decompressResponsePolicy } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/decompressResponsePolicy.js";
import { defaultRetryPolicy } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/defaultRetryPolicy.js";
import { formDataPolicy } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/formDataPolicy.js";
import { proxyPolicy } from "../../../../../@typespec/ts-http-runtime/dist/commonjs/policies/proxyPolicy.js";

//@ chunk-b5df2wx1.js:57271-57297 esm-layout
function generateRequestId() {
  return decompressResponsePolicy();
}
//@ chunk-b5df2wx1.js:57297-57328 esm-layout
function getDefaultRequestIdHeader(options = {}) {
  return defaultRetryPolicy(options);
}
//@ chunk-b5df2wx1.js:57328-57354 esm-layout
function getRequestIdHeaderName() {
  return formDataPolicy();
}
//@ chunk-b5df2wx1.js:57354-57386 esm-layout
function withHeaderName(proxySettings, requestIdHeaderName) {
  return proxyPolicy(proxySettings, requestIdHeaderName);
}
//@ chunk-b5df2wx1.js:57386-57552 esm-fingerprint
function setClientRequestIdPolicy(requestIdHeaderName = "x-ms-client-request-id") {
  return {
    name: "setClientRequestIdPolicy",
    async sendRequest(request, next) {
      if (!request.headers.has(requestIdHeaderName))
        request.headers.set(requestIdHeaderName, request.requestId);
      return next(request);
    },
  };
}
export {
  withHeaderName,
  generateRequestId,
  getRequestIdHeaderName,
  setClientRequestIdPolicy,
  getDefaultRequestIdHeader,
};
