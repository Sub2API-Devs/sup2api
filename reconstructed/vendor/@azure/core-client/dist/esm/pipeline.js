/**
 * @azure/core-client/dist/esm/pipeline.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-client@1.9.2..1.10.0
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: esm-fingerprint 1
 */
import { ya } from "../../../core-rest-pipeline/dist/esm/createPipelineFromOptions.js";
import { Zn } from "../../../core-rest-pipeline/dist/esm/policies/bearerTokenAuthenticationPolicy.js";
import { bd } from "../index.js";
import { vd } from "./deserializationPolicy.js";

//@ chunk-mrx6y2r5.js:76618-76933 esm-fingerprint
function Pd(e = {}) {
  let t = ya(e !== null && e !== void 0 ? e : {});
  if (e.credentialOptions)
    t.addPolicy(
      Zn({ credential: e.credentialOptions.credential, scopes: e.credentialOptions.credentialScopes }),
    );
  return (
    t.addPolicy(bd(e.serializationOptions), { phase: "Serialize" }),
    t.addPolicy(vd(e.deserializationOptions), { phase: "Deserialize" }),
    t
  );
}

export { Pd };
