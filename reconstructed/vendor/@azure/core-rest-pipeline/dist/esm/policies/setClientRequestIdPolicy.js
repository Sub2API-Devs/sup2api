/**
 * @azure/core-rest-pipeline/dist/esm/policies/setClientRequestIdPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-layout 4, esm-fingerprint 1
 */
import { Ys } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/decompressResponsePolicy.js";
import { Xs } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/defaultRetryPolicy.js";
import { oa } from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/formDataPolicy.js";
import { ua } from "../../../../../@typespec/ts-http-runtime/dist/commonjs/policies/proxyPolicy.js";

//@ chunk-mrx6y2r5.js:57271-57297 esm-layout
function rd() {
  return Ys();
}
//@ chunk-mrx6y2r5.js:57297-57328 esm-layout
function nd(e = {}) {
  return Xs(e);
}
//@ chunk-mrx6y2r5.js:57328-57354 esm-layout
function od() {
  return oa();
}
//@ chunk-mrx6y2r5.js:57354-57386 esm-layout
function id(e, t) {
  return ua(e, t);
}
//@ chunk-mrx6y2r5.js:57386-57552 esm-fingerprint
function sd(e = "x-ms-client-request-id") {
  return {
    name: "setClientRequestIdPolicy",
    async sendRequest(t, r) {
      if (!t.headers.has(e)) t.headers.set(e, t.requestId);
      return r(t);
    },
  };
}

export { id, rd, od, sd, nd };
