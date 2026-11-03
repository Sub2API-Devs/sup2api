/**
 * @azure/core-rest-pipeline/dist/esm/policies/userAgentPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Yl, getUserAgentValue } from "../util/userAgent.js";

//@ chunk-mrx6y2r5.js:55718-55751 esm-layout
var UserAgentHeaderName = Yl();
var userAgentPolicyName = "userAgentPolicy";
//@ chunk-mrx6y2r5.js:55751-55897 esm-fingerprint
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
