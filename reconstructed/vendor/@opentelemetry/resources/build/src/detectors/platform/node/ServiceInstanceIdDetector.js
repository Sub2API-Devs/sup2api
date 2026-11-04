/**
 * @opentelemetry/resources/build/src/detectors/platform/node/ServiceInstanceIdDetector.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../runtime/bun-runtime.js";
import { require_semconv_2 } from "../../../semconv.js";

//@ chunk-bwbq4xvm.js:146145-146406 cjs-fingerprint
var require_ServiceInstanceIdDetector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.serviceInstanceIdDetector = undefined;
  var semconv_1 = require_semconv_2();
  var crypto_1 = importMetaRequire("crypto");
  class ServiceInstanceIdDetector {
    detect(_config) {
      return {
        attributes: {
          [semconv_1.ATTR_SERVICE_INSTANCE_ID]: crypto_1.randomUUID(),
        },
      };
    }
  }
  cjsExports.serviceInstanceIdDetector = new ServiceInstanceIdDetector();
});
export { require_ServiceInstanceIdDetector };
