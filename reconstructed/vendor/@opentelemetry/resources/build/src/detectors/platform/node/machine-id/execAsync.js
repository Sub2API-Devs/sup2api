/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/execAsync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-np4q44aj.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../../runtime/bun-runtime.js";

//@ chunk-np4q44aj.js:229-392 cjs-fingerprint
var require_execAsync = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.execAsync = undefined;
  var child_process = importMetaRequire("child_process");
  var util = importMetaRequire("util");
  cjsExports.execAsync = util.promisify(child_process.exec);
});
export { require_execAsync };
