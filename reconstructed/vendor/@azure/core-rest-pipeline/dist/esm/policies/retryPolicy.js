/**
 * @azure/core-rest-pipeline/dist/esm/policies/retryPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { et } from "../../../../../@typespec/ts-http-runtime/dist/esm/pipelineRequest.js";
import { Bs } from "../../../../../@typespec/ts-http-runtime/dist/esm/pipeline.js";
import { Pt } from "../../../../logger/dist/esm/index.js";
import { jl } from "../constants.js";
import { jn } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/retryPolicy.js";

//@ chunk-mrx6y2r5.js:62897-62925 esm-layout
function rr(e) {
  return et(e);
}
//@ chunk-mrx6y2r5.js:62925-62953 esm-layout
function je(e) {
  return Bs(e);
}
/**
 * 第三方 @azure/core-rest-pipeline retryPolicy 日志器。应归 vendor。
 */
//@ chunk-mrx6y2r5.js:62953-62997 esm-fingerprint
var retryPolicyLogger = Pt("core-rest-pipeline retryPolicy");
/**
 * 第三方 @azure/core-rest-pipeline 的 retryPolicy 工厂。旧版名 getMaxRetries 为错配；应归 vendor。
 */
//@ chunk-mrx6y2r5.js:62997-63072 esm-fingerprint
function retryPolicy(e, t = { maxRetries: jl }) {
  return jn(e, Object.assign({ logger: retryPolicyLogger }, t));
}

export { je, rr, retryPolicy };
