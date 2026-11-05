/**
 * @opentelemetry/resources/build/src/detectors/platform/node/HostDetector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../runtime/bun-runtime.js";
import { require_semconv_2 } from "../../../semconv.js";
import { require_getMachineId } from "./machine-id/getMachineId.js";
import { require_utils_4 } from "./utils.js";

//@ chunk-7kayq7nc.js:144897-145216 cjs-fingerprint
var require_HostDetector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.hostDetector = undefined;
  var semconv_1 = require_semconv_2();
  var os_1 = importMetaRequire("os");
  var getMachineId_1 = require_getMachineId();
  var utils_1 = require_utils_4();
  class HostDetector {
    detect(_config) {
      return {
        attributes: {
          [semconv_1.ATTR_HOST_NAME]: os_1.hostname(),
          [semconv_1.ATTR_HOST_ARCH]: utils_1.normalizeArch(os_1.arch()),
          [semconv_1.ATTR_HOST_ID]: getMachineId_1.getMachineId(),
        },
      };
    }
  }
  cjsExports.hostDetector = new HostDetector();
});
export { require_HostDetector };
