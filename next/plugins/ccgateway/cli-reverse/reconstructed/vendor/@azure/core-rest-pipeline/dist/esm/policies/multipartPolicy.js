/**
 * @azure/core-rest-pipeline/dist/esm/policies/multipartPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isNodeReadableStream, rawContent } from "../util/file.js";
import {
  multipartPolicyName,
  multipartPolicy_2,
} from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/multipartPolicy.js";

//@ chunk-b5df2wx1.js:57028-57081 esm-layout
function toRawBody(body) {
  if (isNodeReadableStream(body)) return body[rawContent]();
  else return body;
}
//@ chunk-b5df2wx1.js:57081-57091 esm-layout
var multipartPolicyName_2 = multipartPolicyName;
//@ chunk-b5df2wx1.js:57091-57271 esm-fingerprint
function multipartPolicy() {
  let tspPolicy = multipartPolicy_2();
  return {
    name: multipartPolicyName_2,
    sendRequest: async (request, next) => {
      if (request.multipartBody) {
        for (let part of request.multipartBody.parts)
          if (isNodeReadableStream(part.body)) part.body = toRawBody(part.body);
      }
      return tspPolicy.sendRequest(request, next);
    },
  };
}
export { multipartPolicyName_2, multipartPolicy };
