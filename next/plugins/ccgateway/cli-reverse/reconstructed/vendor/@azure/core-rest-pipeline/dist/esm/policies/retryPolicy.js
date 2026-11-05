/**
 * @azure/core-rest-pipeline/dist/esm/policies/retryPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-b5df2wx1.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { createHttpHeaders } from "../../../../../@typespec/ts-http-runtime/dist/esm/pipelineRequest.js";
import { createEmptyPipeline } from "../../../../../@typespec/ts-http-runtime/dist/esm/pipeline.js";
import { createClientLogger_2 } from "../../../../logger/dist/esm/index.js";
import { DEFAULT_RETRY_POLICY_COUNT_2 } from "../constants.js";
import { retryPolicy_2 } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/retryPolicy.js";

//@ chunk-b5df2wx1.js:62897-62925 esm-layout
function isCustomRetryPolicy(rawHeaders) {
  return createHttpHeaders(rawHeaders);
}
//@ chunk-b5df2wx1.js:62925-62953 esm-layout
function isExponentialBackoff(requestOptions) {
  return createEmptyPipeline(requestOptions);
}
//@ chunk-b5df2wx1.js:62953-62997 esm-fingerprint
/**
 * 第三方 @azure/core-rest-pipeline retryPolicy 日志器。应归 vendor。
 */
var retryPolicyLogger_2 = createClientLogger_2("core-rest-pipeline retryPolicy");
//@ chunk-b5df2wx1.js:62997-63072 esm-fingerprint
/**
 * 第三方 @azure/core-rest-pipeline 的 retryPolicy 工厂。旧版名 getMaxRetries 为错配；应归 vendor。
 */
function retryPolicy(
  strategies,
  options = {
    maxRetries: DEFAULT_RETRY_POLICY_COUNT_2,
  },
) {
  return retryPolicy_2(
    strategies,
    Object.assign(
      {
        logger: retryPolicyLogger_2,
      },
      options,
    ),
  );
}
export { isExponentialBackoff, isCustomRetryPolicy, retryPolicy };
