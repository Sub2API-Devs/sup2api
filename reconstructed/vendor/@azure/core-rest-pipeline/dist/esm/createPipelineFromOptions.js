/**
 * @azure/core-rest-pipeline/dist/esm/createPipelineFromOptions.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { qn } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { isNodeLike_default_2 } from "./util/file.js";
import { ad, cd } from "../../../core-tracing/dist/esm/tracingContext.js";
import { id, rd, od, sd, nd } from "./policies/setClientRequestIdPolicy.js";
import { wrapAbortSignalLikePolicy } from "./policies/wrapAbortSignalLikePolicy.js";
import { multipartPolicyName_2, td } from "./policies/multipartPolicy.js";
import { userAgentPolicy } from "./policies/userAgentPolicy.js";
import { tracingPolicy } from "./policies/tracingPolicy.js";
import { ql } from "./util/userAgentPlatform.js";
import { logPolicy_2 } from "./policies/logPolicy.js";

//@ chunk-mrx6y2r5.js:62009-62693 esm-fingerprint
function createPipelineFromOptions(options) {
  var _a;
  let pipeline = qn();
  if (isNodeLike_default_2) {
    if (options.agent) pipeline.addPolicy(ad(options.agent));
    if (options.tlsOptions) pipeline.addPolicy(cd(options.tlsOptions));
    pipeline.addPolicy(id(options.proxyOptions));
    pipeline.addPolicy(rd());
  }
  pipeline.addPolicy(wrapAbortSignalLikePolicy());
  pipeline.addPolicy(od(), {
    beforePolicies: [multipartPolicyName_2],
  });
  pipeline.addPolicy(userAgentPolicy(options.userAgentOptions));
  pipeline.addPolicy(
    sd(
      (_a = options.telemetryOptions) === null || _a === undefined ? undefined : _a.clientRequestIdHeaderName,
    ),
  );
  pipeline.addPolicy(td(), {
    afterPhase: "Deserialize",
  });
  pipeline.addPolicy(nd(options.retryOptions), {
    phase: "Retry",
  });
  pipeline.addPolicy(
    tracingPolicy(Object.assign(Object.assign({}, options.userAgentOptions), options.loggingOptions)),
    {
      afterPhase: "Retry",
    },
  );
  if (isNodeLike_default_2)
    pipeline.addPolicy(ql(options.redirectOptions), {
      afterPhase: "Retry",
    });
  pipeline.addPolicy(logPolicy_2(options.loggingOptions), {
    afterPhase: "Sign",
  });
  return pipeline;
}
export { createPipelineFromOptions };
