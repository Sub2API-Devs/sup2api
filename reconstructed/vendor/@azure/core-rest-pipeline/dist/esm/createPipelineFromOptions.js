/**
 * @azure/core-rest-pipeline/dist/esm/createPipelineFromOptions.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { qn } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { Yn } from "./util/file.js";
import { ad, cd } from "../../../core-tracing/dist/esm/tracingContext.js";
import { id, rd, od, sd, nd } from "./policies/setClientRequestIdPolicy.js";
import { pd } from "./policies/wrapAbortSignalLikePolicy.js";
import { ga, td } from "./policies/multipartPolicy.js";
import { Ql } from "./policies/userAgentPolicy.js";
import { md } from "./policies/tracingPolicy.js";
import { ql } from "./util/userAgentPlatform.js";
import { Gl } from "./policies/logPolicy.js";

//@ chunk-mrx6y2r5.js:62009-62693 esm-fingerprint
function ya(e) {
  var t;
  let r = qn();
  if (Yn) {
    if (e.agent) r.addPolicy(ad(e.agent));
    if (e.tlsOptions) r.addPolicy(cd(e.tlsOptions));
    (r.addPolicy(id(e.proxyOptions)), r.addPolicy(rd()));
  }
  if (
    (r.addPolicy(pd()),
    r.addPolicy(od(), { beforePolicies: [ga] }),
    r.addPolicy(Ql(e.userAgentOptions)),
    r.addPolicy(sd((t = e.telemetryOptions) === null || t === void 0 ? void 0 : t.clientRequestIdHeaderName)),
    r.addPolicy(td(), { afterPhase: "Deserialize" }),
    r.addPolicy(nd(e.retryOptions), { phase: "Retry" }),
    r.addPolicy(md(Object.assign(Object.assign({}, e.userAgentOptions), e.loggingOptions)), {
      afterPhase: "Retry",
    }),
    Yn)
  )
    r.addPolicy(ql(e.redirectOptions), { afterPhase: "Retry" });
  return (r.addPolicy(Gl(e.loggingOptions), { afterPhase: "Sign" }), r);
}

export { ya };
