/**
 * @azure/core-rest-pipeline/dist/esm/createPipelineFromOptions.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { createEmptyHttpPipeline } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { isNodeLike_default_2 } from "./util/file.js";
import { setSpanContext, getSpanContext } from "../../../core-tracing/dist/esm/tracingContext.js";
import {
  withHeaderName,
  generateRequestId,
  getRequestIdHeaderName,
  setClientRequestIdPolicy,
  getDefaultRequestIdHeader,
} from "./policies/setClientRequestIdPolicy.js";
import { wrapAbortSignalLikePolicy } from "./policies/wrapAbortSignalLikePolicy.js";
import { multipartPolicyName_2, multipartPolicy } from "./policies/multipartPolicy.js";
import { userAgentPolicy } from "./policies/userAgentPolicy.js";
import { tracingPolicy } from "./policies/tracingPolicy.js";
import { getUserAgentPlatform } from "./util/userAgentPlatform.js";
import { logPolicy_2 } from "./policies/logPolicy.js";

//@ chunk-mrx6y2r5.js:62009-62693 esm-fingerprint
function createPipelineFromOptions(options) {
  var _a;
  let pipeline = createEmptyHttpPipeline();
  if (isNodeLike_default_2) {
    if (options.agent) pipeline.addPolicy(setSpanContext(options.agent));
    if (options.tlsOptions) pipeline.addPolicy(getSpanContext(options.tlsOptions));
    pipeline.addPolicy(withHeaderName(options.proxyOptions));
    pipeline.addPolicy(generateRequestId());
  }
  pipeline.addPolicy(wrapAbortSignalLikePolicy());
  pipeline.addPolicy(getRequestIdHeaderName(), {
    beforePolicies: [multipartPolicyName_2],
  });
  pipeline.addPolicy(userAgentPolicy(options.userAgentOptions));
  pipeline.addPolicy(
    setClientRequestIdPolicy(
      (_a = options.telemetryOptions) === null || _a === undefined ? undefined : _a.clientRequestIdHeaderName,
    ),
  );
  pipeline.addPolicy(multipartPolicy(), {
    afterPhase: "Deserialize",
  });
  pipeline.addPolicy(getDefaultRequestIdHeader(options.retryOptions), {
    phase: "Retry",
  });
  pipeline.addPolicy(
    tracingPolicy(Object.assign(Object.assign({}, options.userAgentOptions), options.loggingOptions)),
    {
      afterPhase: "Retry",
    },
  );
  if (isNodeLike_default_2)
    pipeline.addPolicy(getUserAgentPlatform(options.redirectOptions), {
      afterPhase: "Retry",
    });
  pipeline.addPolicy(logPolicy_2(options.loggingOptions), {
    afterPhase: "Sign",
  });
  return pipeline;
}
export { createPipelineFromOptions };
