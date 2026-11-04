/**
 * @opentelemetry/resources/build/src/default-service-name.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:135957-136332 cjs-fingerprint
var require_default_service_name = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports._clearDefaultServiceNameCache = cjsExports.defaultServiceName = undefined;
  var serviceName;
  function defaultServiceName() {
    if (serviceName === undefined)
      try {
        let argv0 = globalThis.process.argv0;
        serviceName = argv0 ? `unknown_service:${argv0}` : "unknown_service";
      } catch {
        serviceName = "unknown_service";
      }
    return serviceName;
  }
  cjsExports.defaultServiceName = defaultServiceName;
  function _clearDefaultServiceNameCache() {
    serviceName = undefined;
  }
  cjsExports._clearDefaultServiceNameCache = _clearDefaultServiceNameCache;
});
export { require_default_service_name };
