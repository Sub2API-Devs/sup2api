/**
 * jose/dist/webapi/key/export.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { ee, D } from "../lib/key.js";
import { y } from "../util/base64url.js";
import { U } from "../../node/esm/lib/invalid_key_input.js";

//@ chunk-5h78gfwc.js:23388-23811 esm-fingerprint
async function Et(e) {
  if (ee(e))
    if (e.type === "secret") e = e.export();
    else return e.export({ format: "jwk" });
  if (e instanceof Uint8Array) return { kty: "oct", k: y(e) };
  if (!D(e)) throw TypeError(U(e, "CryptoKey", "KeyObject", "Uint8Array"));
  if (!e.extractable) throw TypeError("non-extractable CryptoKey cannot be exported as a JWK");
  let { ext: ext, key_ops: key_ops, alg: alg, use: use, ...o } = await crypto.subtle.exportKey("jwk", e);
  if (o.kty === "AKP") o.alg = alg;
  return o;
}

export { Et };
