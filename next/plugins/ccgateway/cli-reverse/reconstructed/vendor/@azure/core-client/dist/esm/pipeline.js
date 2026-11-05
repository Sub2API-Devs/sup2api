/**
 * @azure/core-client/dist/esm/pipeline.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 */
import { createPipelineFromOptions } from "../../../core-rest-pipeline/dist/esm/createPipelineFromOptions.js";
import { bearerTokenAuthenticationPolicy } from "../../../core-rest-pipeline/dist/esm/policies/bearerTokenAuthenticationPolicy.js";
import { serializationPolicy } from "../index.js";
import { deserializationPolicy } from "./deserializationPolicy.js";

//@ chunk-b5df2wx1.js:76618-76933 esm-fingerprint
function createClientPipeline(options = {}) {
  let pipeline = createPipelineFromOptions(options !== null && options !== undefined ? options : {});
  if (options.credentialOptions)
    pipeline.addPolicy(
      bearerTokenAuthenticationPolicy({
        credential: options.credentialOptions.credential,
        scopes: options.credentialOptions.credentialScopes,
      }),
    );
  pipeline.addPolicy(serializationPolicy(options.serializationOptions), {
    phase: "Serialize",
  });
  pipeline.addPolicy(deserializationPolicy(options.deserializationOptions), {
    phase: "Deserialize",
  });
  return pipeline;
}
export { createClientPipeline };
