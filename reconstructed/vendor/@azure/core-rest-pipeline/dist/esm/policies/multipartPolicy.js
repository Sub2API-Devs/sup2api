/**
 * @azure/core-rest-pipeline/dist/esm/policies/multipartPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { pa, Zl } from "../util/file.js";
import {
  MULTIPARTPOLICY,
  ca,
} from "../../../../../@typespec/ts-http-runtime/dist/esm/policies/multipartPolicy.js";

//@ chunk-mrx6y2r5.js:57028-57081 esm-layout
function ed(e) {
  if (pa(e)) return e[Zl]();
  else return e;
}
//@ chunk-mrx6y2r5.js:57081-57091 esm-layout
var ga = MULTIPARTPOLICY;
//@ chunk-mrx6y2r5.js:57091-57271 esm-fingerprint
function td() {
  let e = ca();
  return {
    name: ga,
    sendRequest: async (t, r) => {
      if (t.multipartBody) {
        for (let part of t.multipartBody.parts) if (pa(part.body)) part.body = ed(part.body);
      }
      return e.sendRequest(t, r);
    },
  };
}

export { ga, td };
