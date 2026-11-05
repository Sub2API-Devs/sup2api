/**
 * jose/dist/browser/runtime/subtle_dsa.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_decrypt_2 } from "../../node/esm/jwe/compact/decrypt.js";
import { init_content_encryption_2, JOSENotSupported_3 } from "../../webapi/lib/content_encryption.js";
import { init_base64url } from "./base64url.js";

//@ chunk-pd6th42n.js:27304-27334 esm-layout
var init_subtle_dsa = __esm(() => {
  init_decrypt_2();
  init_content_encryption_2();
  init_base64url();
});
//@ chunk-pd6th42n.js:27334-27831 esm-fingerprint
function subtleDsa(alg, algorithm) {
  let hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return {
        hash,
        name: "HMAC",
      };
    case "PS256":
    case "PS384":
    case "PS512":
      return {
        hash,
        name: "RSA-PSS",
        saltLength: alg.slice(-3) >> 3,
      };
    case "RS256":
    case "RS384":
    case "RS512":
      return {
        hash,
        name: "RSASSA-PKCS1-v1_5",
      };
    case "ES256":
    case "ES384":
    case "ES512":
      return {
        hash,
        name: "ECDSA",
        namedCurve: algorithm.namedCurve,
      };
    case "EdDSA":
      return {
        name: algorithm.name,
      };
    default:
      throw new JOSENotSupported_3(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
export { subtleDsa, init_subtle_dsa };
