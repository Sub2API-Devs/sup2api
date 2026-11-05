/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-linux.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-k65kq7qy.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../../../../api/build/src/index.js";

//@ chunk-k65kq7qy.js:265-613 cjs-fingerprint
var require_getMachineId_linux = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getMachineId = undefined;
  var fs_1 = importMetaRequire("fs");
  var api_1 = require_api();
  async function getMachineId() {
    let paths = ["/etc/machine-id", "/var/lib/dbus/machine-id"];
    for (let path of paths)
      try {
        return (
          await fs_1.promises.readFile(path, {
            encoding: "utf8",
          })
        ).trim();
      } catch (error) {
        api_1.diag.debug(`error reading machine id: ${error}`);
      }
    return;
  }
  cjsExports.getMachineId = getMachineId;
});
//@ chunk-k65kq7qy.js:613-632 affinity
export default require_getMachineId_linux();
