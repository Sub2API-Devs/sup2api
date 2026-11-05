/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire, __toESM } from "../../../../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:143847-144530 cjs-fingerprint
var require_getMachineId = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getMachineId = undefined;
  var processModule = importMetaRequire("process");
  var getMachineIdImpl;
  async function getMachineId() {
    if (!getMachineIdImpl)
      switch (processModule.platform) {
        case "darwin":
          getMachineIdImpl = (await import("./getMachineId-darwin.js").then((mod) => __toESM(mod.default)))
            .getMachineId;
          break;
        case "linux":
          getMachineIdImpl = (await import("./getMachineId-linux.js").then((mod) => __toESM(mod.default)))
            .getMachineId;
          break;
        case "freebsd":
          getMachineIdImpl = (await import("./getMachineId-bsd.js").then((mod) => __toESM(mod.default)))
            .getMachineId;
          break;
        case "win32":
          getMachineIdImpl = (await import("./getMachineId-win.js").then((mod) => __toESM(mod.default)))
            .getMachineId;
          break;
        default:
          getMachineIdImpl = (
            await import("./getMachineId-unsupported.js").then((mod) => __toESM(mod.default))
          ).getMachineId;
          break;
      }
    return getMachineIdImpl();
  }
  cjsExports.getMachineId = getMachineId;
});
export { require_getMachineId };
