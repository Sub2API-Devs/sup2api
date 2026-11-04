/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire, __toESM } from "../../../../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:143745-144428 cjs-fingerprint
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
