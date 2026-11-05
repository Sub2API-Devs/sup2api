/**
 * @opentelemetry/resources/build/src/default-service-name.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:136051-136426 cjs-fingerprint
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
