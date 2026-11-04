/**
 * @azure/core-rest-pipeline/dist/esm/policies/logPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { logPolicy } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/logPolicy.js";
import { coreRestPipelineLogger } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";

//@ chunk-mrx6y2r5.js:55072-55135 esm-fingerprint
function logPolicy_2(options = {}) {
  return logPolicy(
    Object.assign(
      {
        logger: coreRestPipelineLogger.info,
      },
      options,
    ),
  );
}
export { logPolicy_2 };
