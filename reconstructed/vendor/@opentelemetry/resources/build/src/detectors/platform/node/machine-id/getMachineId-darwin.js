/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-darwin.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-tr8w0a3y.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 */
import { __commonJS } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_execAsync } from "./execAsync.js";
import { require_api } from "../../../../../../../api/build/src/index.js";

//@ chunk-tr8w0a3y.js:299-716 cjs-fingerprint
var require_getMachineId_darwin = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getMachineId = undefined;
  var execAsync_1 = require_execAsync();
  var api_1 = require_api();
  async function getMachineId() {
    try {
      let idLine = (await execAsync_1.execAsync('ioreg -rd1 -c "IOPlatformExpertDevice"')).stdout
        .split(
          `
`,
        )
        .find((line) => line.includes("IOPlatformUUID"));
      if (!idLine) return;
      let parts = idLine.split('" = "');
      if (parts.length === 2) return parts[1].slice(0, -1);
    } catch (error) {
      api_1.diag.debug(`error reading machine id: ${error}`);
    }
    return;
  }
  cjsExports.getMachineId = getMachineId;
});
//@ chunk-tr8w0a3y.js:716-735 affinity
export default require_getMachineId_darwin();
