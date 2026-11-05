/**
 * @azure/core-rest-pipeline/dist/esm/policies/userAgentPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { getUserAgentHeader, getUserAgentValue } from "../util/userAgent.js";

//@ chunk-b5df2wx1.js:55718-55751 esm-layout
var UserAgentHeaderName = getUserAgentHeader();
var userAgentPolicyName = "userAgentPolicy";
//@ chunk-b5df2wx1.js:55751-55897 esm-fingerprint
function userAgentPolicy(options = {}) {
  let userAgentValue = getUserAgentValue(options.userAgentPrefix);
  return {
    name: userAgentPolicyName,
    async sendRequest(request, next) {
      if (!request.headers.has(UserAgentHeaderName))
        request.headers.set(UserAgentHeaderName, await userAgentValue);
      return next(request);
    },
  };
}
export { userAgentPolicy };
