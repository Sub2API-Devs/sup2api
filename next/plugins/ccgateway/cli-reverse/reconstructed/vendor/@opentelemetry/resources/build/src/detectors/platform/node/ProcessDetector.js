/**
 * @opentelemetry/resources/build/src/detectors/platform/node/ProcessDetector.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../../../api/build/src/index.js";
import { require_semconv_2 } from "../../../semconv.js";

//@ chunk-7kayq7nc.js:145489-146247 cjs-fingerprint
var require_ProcessDetector = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.processDetector = undefined;
  var api_1 = require_api();
  var semconv_1 = require_semconv_2();
  var os = importMetaRequire("os");
  class ProcessDetector {
    detect(_config) {
      let attributes = {
        [semconv_1.ATTR_PROCESS_PID]: process.pid,
        [semconv_1.ATTR_PROCESS_EXECUTABLE_NAME]: process.title,
        [semconv_1.ATTR_PROCESS_EXECUTABLE_PATH]: process.execPath,
        [semconv_1.ATTR_PROCESS_COMMAND_ARGS]: [
          process.argv[0],
          ...process.execArgv,
          ...process.argv.slice(1),
        ],
        [semconv_1.ATTR_PROCESS_RUNTIME_VERSION]: process.versions.node,
        [semconv_1.ATTR_PROCESS_RUNTIME_NAME]: "nodejs",
        [semconv_1.ATTR_PROCESS_RUNTIME_DESCRIPTION]: "Node.js",
      };
      if (process.argv.length > 1) attributes[semconv_1.ATTR_PROCESS_COMMAND] = process.argv[1];
      try {
        let userInfo = os.userInfo();
        attributes[semconv_1.ATTR_PROCESS_OWNER] = userInfo.username;
      } catch (e) {
        api_1.diag.debug(`error obtaining process owner: ${e}`);
      }
      return {
        attributes,
      };
    }
  }
  cjsExports.processDetector = new ProcessDetector();
});
export { require_ProcessDetector };
