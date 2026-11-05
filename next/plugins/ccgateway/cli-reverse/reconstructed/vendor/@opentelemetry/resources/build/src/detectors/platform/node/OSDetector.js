/**
 * @opentelemetry/resources/build/src/detectors/platform/node/OSDetector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../runtime/bun-runtime.js";
import { require_semconv_2 } from "../../../semconv.js";
import { require_utils_4 } from "./utils.js";

//@ chunk-7kayq7nc.js:145216-145489 cjs-fingerprint
var require_OSDetector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.osDetector = undefined;
  var semconv_1 = require_semconv_2();
  var os_1 = importMetaRequire("os");
  var utils_1 = require_utils_4();
  class OSDetector {
    detect(_config) {
      return {
        attributes: {
          [semconv_1.ATTR_OS_TYPE]: utils_1.normalizeType(os_1.platform()),
          [semconv_1.ATTR_OS_VERSION]: os_1.release(),
        },
      };
    }
  }
  cjsExports.osDetector = new OSDetector();
});
export { require_OSDetector };
