/**
 * @azure/core-rest-pipeline/dist/esm/policies/userAgentPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Yl, Yo } from "../util/userAgent.js";

//@ chunk-mrx6y2r5.js:55718-55751 esm-layout
var Wl = Yl(),
  USERAGENTPOLICY = "userAgentPolicy";
//@ chunk-mrx6y2r5.js:55751-55897 esm-fingerprint
function Ql(e = {}) {
  let t = Yo(e.userAgentPrefix);
  return {
    name: USERAGENTPOLICY,
    async sendRequest(r, n) {
      if (!r.headers.has(Wl)) r.headers.set(Wl, await t);
      return n(r);
    },
  };
}

export { Ql };
