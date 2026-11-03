/**
 * @azure/identity/dist/esm/tokenProvider.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { qn } from "../../../../@typespec/ts-http-runtime/dist/esm/policies/agentPolicy.js";
import { Zn } from "../../../core-rest-pipeline/dist/esm/policies/bearerTokenAuthenticationPolicy.js";
import { je } from "../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";

//@ chunk-mrx6y2r5.js:331737-332181 esm-fingerprint
function kC(e, t, r) {
  let { abortSignal: abortSignal, tracingOptions: tracingOptions } = r || {},
    i = qn();
  i.addPolicy(Zn({ credential: e, scopes: t }));
  async function s() {
    var a;
    let l =
      (a = (
        await i.sendRequest(
          { sendRequest: (d) => Promise.resolve({ request: d, status: 200, headers: d.headers }) },
          je({ url: "https://example.com", abortSignal: abortSignal, tracingOptions: tracingOptions }),
        )
      ).headers.get("authorization")) === null || a === void 0
        ? void 0
        : a.split(" ")[1];
    if (!l) throw Error("Failed to get access token");
    return l;
  }
  return s;
}
