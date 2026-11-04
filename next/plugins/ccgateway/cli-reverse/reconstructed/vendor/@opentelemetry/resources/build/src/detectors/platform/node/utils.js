/**
 * @opentelemetry/resources/build/src/detectors/platform/node/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:144428-144795 cjs-fingerprint
var require_utils_4 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.normalizeType = cjsExports.normalizeArch = undefined;
  var normalizeArch = (nodeArchString) => {
    switch (nodeArchString) {
      case "arm":
        return "arm32";
      case "ppc":
        return "ppc32";
      case "x64":
        return "amd64";
      default:
        return nodeArchString;
    }
  };
  cjsExports.normalizeArch = normalizeArch;
  var normalizeType = (nodePlatform) => {
    switch (nodePlatform) {
      case "sunos":
        return "solaris";
      case "win32":
        return "windows";
      default:
        return nodePlatform;
    }
  };
  cjsExports.normalizeType = normalizeType;
});
export { require_utils_4 };
