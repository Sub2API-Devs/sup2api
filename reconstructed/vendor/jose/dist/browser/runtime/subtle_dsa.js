/**
 * jose/dist/browser/runtime/subtle_dsa.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { Ot } from "../../node/esm/jwe/compact/decrypt.js";
import { E, f } from "../../webapi/lib/content_encryption.js";
import { v } from "./base64url.js";

//@ chunk-2tyrgda4.js:27304-27334 esm-layout
var Mt = Xa(() => {
  Ot();
  E();
  v();
});
//@ chunk-2tyrgda4.js:27334-27831 esm-fingerprint
function fe(e, t) {
  let r = `SHA-${e.slice(-3)}`;
  switch (e) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash: r, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash: r, name: "RSA-PSS", saltLength: e.slice(-3) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash: r, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash: r, name: "ECDSA", namedCurve: t.namedCurve };
    case "EdDSA":
      return { name: t.name };
    default:
      throw new f(`alg ${e} is not supported either by JOSE or your javascript runtime`);
  }
}

export { fe, Mt };
