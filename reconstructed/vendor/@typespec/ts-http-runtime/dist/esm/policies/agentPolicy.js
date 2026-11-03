/**
 * @typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-layout 5
 */
import { pl } from "../nodeHttpClient.js";
import { zs } from "../pipeline.js";
import { Pt } from "../../../../../@azure/logger/dist/esm/index.js";

//@ chunk-mrx6y2r5.js:42736-42764 esm-layout
function gl() {
  return new pl();
}
//@ chunk-mrx6y2r5.js:42764-42790 esm-layout
function Vs() {
  return gl();
}
//@ chunk-mrx6y2r5.js:42790-42816 esm-layout
function qn() {
  return zs();
}
//@ chunk-mrx6y2r5.js:42816-42848 esm-layout
var ut = Pt("core-rest-pipeline");
//@ chunk-mrx6y2r5.js:42848-42950 esm-layout
function js(e) {
  return {
    name: "agentPolicy",
    sendRequest: async (t, r) => {
      if (!t.agent) t.agent = e;
      return r(t);
    },
  };
}

export { ut, js, qn, Vs };
