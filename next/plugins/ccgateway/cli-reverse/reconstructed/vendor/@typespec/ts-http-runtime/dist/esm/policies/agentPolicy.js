/**
 * @typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-layout 5
 */
import { NodeHttpClient } from "../nodeHttpClient.js";
import { createEmptyPipeline_2 } from "../pipeline.js";
import { createClientLogger_2 } from "../../../../../@azure/logger/dist/esm/index.js";

//@ chunk-mrx6y2r5.js:42736-42764 esm-layout
function createNodeHttpClient() {
  return new NodeHttpClient();
}
//@ chunk-mrx6y2r5.js:42764-42790 esm-layout
function createDefaultHttpClient() {
  return createNodeHttpClient();
}
//@ chunk-mrx6y2r5.js:42790-42816 esm-layout
function createEmptyHttpPipeline() {
  return createEmptyPipeline_2();
}
//@ chunk-mrx6y2r5.js:42816-42848 esm-layout
var coreRestPipelineLogger = createClientLogger_2("core-rest-pipeline");
//@ chunk-mrx6y2r5.js:42848-42950 esm-layout
function agentPolicy(agent) {
  return {
    name: "agentPolicy",
    sendRequest: async (req, next) => {
      if (!req.agent) req.agent = agent;
      return next(req);
    },
  };
}
export { coreRestPipelineLogger, agentPolicy, createEmptyHttpPipeline, createDefaultHttpClient };
