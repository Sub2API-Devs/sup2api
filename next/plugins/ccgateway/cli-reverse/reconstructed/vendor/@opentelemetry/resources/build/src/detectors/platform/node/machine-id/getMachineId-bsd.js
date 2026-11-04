/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-bsd.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-mbd7cz0s.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_execAsync } from "./execAsync.js";
import { require_api } from "../../../../../../../api/build/src/index.js";

//@ chunk-mbd7cz0s.js:302-732 cjs-fingerprint
var require_getMachineId_bsd = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getMachineId = undefined;
  var fs_1 = importMetaRequire("fs");
  var execAsync_1 = require_execAsync();
  var api_1 = require_api();
  async function getMachineId() {
    try {
      return (
        await fs_1.promises.readFile("/etc/hostid", {
          encoding: "utf8",
        })
      ).trim();
    } catch (error) {
      api_1.diag.debug(`error reading machine id: ${error}`);
    }
    try {
      return (await execAsync_1.execAsync("kenv -q smbios.system.uuid")).stdout.trim();
    } catch (error) {
      api_1.diag.debug(`error reading machine id: ${error}`);
    }
    return;
  }
  cjsExports.getMachineId = getMachineId;
});
//@ chunk-mbd7cz0s.js:732-751 affinity
export default require_getMachineId_bsd();
