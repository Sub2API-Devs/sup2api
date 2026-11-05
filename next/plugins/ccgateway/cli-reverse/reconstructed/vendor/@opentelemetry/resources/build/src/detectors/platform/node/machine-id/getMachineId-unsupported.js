/**
 * @opentelemetry/resources/build/src/detectors/platform/node/machine-id/getMachineId-unsupported.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/resources@2.2.0
 * pieces: chunk-c31js7xd.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../../../../api/build/src/index.js";

//@ chunk-c31js7xd.js:262-473 cjs-fingerprint
var require_getMachineId_unsupported = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getMachineId = undefined;
  var api_1 = require_api();
  async function getMachineId() {
    api_1.diag.debug("could not read machine-id: unsupported platform");
    return;
  }
  cjsExports.getMachineId = getMachineId;
});
//@ chunk-c31js7xd.js:473-492 affinity
export default require_getMachineId_unsupported();
