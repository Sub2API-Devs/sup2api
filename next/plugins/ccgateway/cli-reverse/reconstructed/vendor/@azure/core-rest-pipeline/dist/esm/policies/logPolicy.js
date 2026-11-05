/**
 * @azure/core-rest-pipeline/dist/esm/policies/logPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 */
import { logPolicy } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/logPolicy.js";
import { coreRestPipelineLogger } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";

//@ chunk-b5df2wx1.js:55072-55135 esm-fingerprint
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
