/**
 * @typespec/ts-http-runtime/dist/esm/policies/logPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-fingerprint 2
 */
import { logger_2 } from "../log.js";
import { Sanitizer } from "../util/sanitizer.js";

//@ chunk-b5df2wx1.js:49396-49415 esm-fingerprint
var logPolicyName = "logPolicy";
//@ chunk-b5df2wx1.js:49415-49828 esm-fingerprint
function logPolicy(options = {}) {
  var _a;
  let logger = (_a = options.logger) !== null && _a !== undefined ? _a : logger_2.info;
  let sanitizer = new Sanitizer({
    additionalAllowedHeaderNames: options.additionalAllowedHeaderNames,
    additionalAllowedQueryParameters: options.additionalAllowedQueryParameters,
  });
  return {
    name: logPolicyName,
    async sendRequest(request, next) {
      if (!logger.enabled) return next(request);
      logger(`Request: ${sanitizer.sanitize(request)}`);
      let response = await next(request);
      logger(`Response status code: ${response.status}`);
      logger(`Headers: ${sanitizer.sanitize(response.headers)}`);
      return response;
    },
  };
}
export { logPolicy };
