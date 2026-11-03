/**
 * @azure/core-rest-pipeline/dist/esm/policies/multipartPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { isNodeReadableStream, rawContent } from "../util/file.js";
import {
  multipartPolicyName,
  multipartPolicy,
} from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/multipartPolicy.js";

//@ chunk-mrx6y2r5.js:57028-57081 esm-layout
function ed(body) {
  if (isNodeReadableStream(body)) return body[rawContent]();
  else return body;
}
//@ chunk-mrx6y2r5.js:57081-57091 esm-layout
var multipartPolicyName_2 = multipartPolicyName;
//@ chunk-mrx6y2r5.js:57091-57271 esm-fingerprint
function td() {
  let tspPolicy = multipartPolicy();
  return {
    name: multipartPolicyName_2,
    sendRequest: async (request, next) => {
      if (request.multipartBody) {
        for (let part of request.multipartBody.parts)
          if (isNodeReadableStream(part.body)) part.body = ed(part.body);
      }
      return tspPolicy.sendRequest(request, next);
    },
  };
}
export { multipartPolicyName_2, td };
