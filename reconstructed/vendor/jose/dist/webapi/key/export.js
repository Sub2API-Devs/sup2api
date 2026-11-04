/**
 * jose/dist/webapi/key/export.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { isKeyObject, isCryptoKey } from "../lib/key.js";
import { encode_2 } from "../util/base64url.js";
import { message_3 } from "../../node/esm/lib/invalid_key_input.js";

//@ chunk-5h78gfwc.js:23388-23811 esm-fingerprint
async function keyToJWK(key) {
  if (isKeyObject(key))
    if (key.type === "secret") key = key.export();
    else
      return key.export({
        format: "jwk",
      });
  if (key instanceof Uint8Array)
    return {
      kty: "oct",
      k: encode_2(key),
    };
  if (!isCryptoKey(key)) throw TypeError(message_3(key, "CryptoKey", "KeyObject", "Uint8Array"));
  if (!key.extractable) throw TypeError("non-extractable CryptoKey cannot be exported as a JWK");
  let { ext, key_ops, alg, use, ...jwk } = await crypto.subtle.exportKey("jwk", key);
  if (jwk.kty === "AKP") jwk.alg = alg;
  return jwk;
}
export { keyToJWK };
