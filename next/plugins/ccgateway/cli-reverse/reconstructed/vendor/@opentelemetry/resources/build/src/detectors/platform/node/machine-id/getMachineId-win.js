/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-win.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-e1xkd7nr.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_execAsync } from "./execAsync.js";
import { require_api } from "../../../../../../../api/build/src/index.js";

//@ chunk-e1xkd7nr.js:302-828 cjs-fingerprint
var require_getMachineId_win = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getMachineId = undefined;
  var processModule = importMetaRequire("process");
  var execAsync_1 = require_execAsync();
  var api_1 = require_api();
  async function getMachineId() {
    let command = "%windir%\\System32\\REG.exe";
    if (processModule.arch === "ia32" && "PROCESSOR_ARCHITEW6432" in processModule.env)
      command = "%windir%\\sysnative\\cmd.exe /c " + command;
    try {
      let parts = (
        await execAsync_1.execAsync(
          `${command} QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid`,
        )
      ).stdout.split("REG_SZ");
      if (parts.length === 2) return parts[1].trim();
    } catch (e) {
      api_1.diag.debug(`error reading machine id: ${e}`);
    }
    return;
  }
  cjsExports.getMachineId = getMachineId;
});
//@ chunk-e1xkd7nr.js:828-847 affinity
export default require_getMachineId_win();
