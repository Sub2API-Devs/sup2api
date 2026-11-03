/**
 * @azure/identity/dist/esm/credentials/managedIdentityCredential/imdsMsi.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { z } from "../../util/logging.js";
import { eo } from "./utils.js";
import { rr, je } from "../../../../../core-rest-pipeline/dist/esm/policies/retryPolicy.js";
import { Z } from "../../util/tracing.js";
import { Wo } from "../../../../../core-rest-pipeline/dist/esm/util/file.js";

//@ chunk-mrx6y2r5.js:289108-289224 esm-fingerprint
var vt = "ManagedIdentityCredential - IMDS",
  Lr = z(vt),
  HTTP_169_254_169_254 = "http://169.254.169.254",
  nC = "/metadata/identity/oauth2/token";
//@ chunk-mrx6y2r5.js:289224-289480 esm-fingerprint
function oC(e) {
  var t;
  if (!eo(e)) throw Error(`${vt}: Multiple scopes are not supported.`);
  let n = new URL(
      nC,
      (t = process.env.AZURE_POD_IDENTITY_AUTHORITY_HOST) !== null && t !== void 0 ? t : HTTP_169_254_169_254,
    ),
    o = { Accept: "application/json" };
  return { url: `${n}`, method: "GET", headers: rr(o) };
}
//@ chunk-mrx6y2r5.js:289480-290526 esm-fingerprint
var Wf = {
  name: "imdsMsi",
  async isAvailable(e) {
    let { scopes: scopes, identityClient: identityClient, getTokenOptions: getTokenOptions } = e,
      o = eo(scopes);
    if (!o) return (Lr.info(`${vt}: Unavailable. Multiple scopes are not supported.`), !1);
    if (process.env.AZURE_POD_IDENTITY_AUTHORITY_HOST) return !0;
    if (!identityClient) throw Error("Missing IdentityClient");
    let i = oC(o);
    return Z.withSpan(
      "ManagedIdentityCredential-pingImdsEndpoint",
      getTokenOptions !== null && getTokenOptions !== void 0 ? getTokenOptions : {},
      async (s) => {
        var a, c;
        i.tracingOptions = s.tracingOptions;
        let l = je(i);
        ((l.timeout = ((a = s.requestOptions) === null || a === void 0 ? void 0 : a.timeout) || 1000),
          (l.allowInsecureConnection = !0));
        let d;
        try {
          (Lr.info(`${vt}: Pinging the Azure IMDS endpoint`), (d = await identityClient.sendRequest(l)));
        } catch (error) {
          if (Wo(error)) Lr.verbose(`${vt}: Caught error ${error.name}: ${error.message}`);
          return (Lr.info(`${vt}: The Azure IMDS endpoint is unavailable`), !1);
        }
        if (d.status === 403) {
          if ((c = d.bodyAsText) === null || c === void 0 ? void 0 : c.includes("unreachable"))
            return (
              Lr.info(`${vt}: The Azure IMDS endpoint is unavailable`),
              Lr.info(`${vt}: ${d.bodyAsText}`),
              !1
            );
        }
        return (Lr.info(`${vt}: The Azure IMDS endpoint is available`), !0);
      },
    );
  },
};

export { Wf };
