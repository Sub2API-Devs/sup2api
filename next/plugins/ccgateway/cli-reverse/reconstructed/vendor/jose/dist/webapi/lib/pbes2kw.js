/**
 * jose/dist/webapi/lib/pbes2kw.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (3)
 * attribution: esm-fingerprint 3
 */
import { checkEncCryptoKey } from "./crypto_key.js";
import { concat, encode } from "./buffer_utils.js";
import { JWEInvalid_2 } from "../../node/esm/util/errors.js";

//@ chunk-5h78gfwc.js:13647-13787 esm-fingerprint
function getCryptoKey(key, alg) {
  if (key instanceof Uint8Array) return crypto.subtle.importKey("raw", key, "PBKDF2", false, ["deriveBits"]);
  checkEncCryptoKey(key, alg, "deriveBits");
  return key;
}
//@ chunk-5h78gfwc.js:13787-13828 esm-fingerprint
var concatSalt = (alg, p2sInput) => concat(encode(alg), Uint8Array.of(0), p2sInput);
//@ chunk-5h78gfwc.js:13828-14141 esm-fingerprint
async function deriveKey_2(p2s, alg, p2c, key) {
  if (!(p2s instanceof Uint8Array) || p2s.length < 8)
    throw new JWEInvalid_2("PBES2 Salt Input must be 8 or more octets");
  let salt = concatSalt(alg, p2s);
  let keyLength = parseInt(alg.slice(13, 16), 10);
  let subtleAlg = {
    hash: `SHA-${alg.slice(8, 11)}`,
    iterations: p2c,
    name: "PBKDF2",
    salt,
  };
  let cryptoKey = await getCryptoKey(key, alg);
  return new Uint8Array(await crypto.subtle.deriveBits(subtleAlg, cryptoKey, keyLength));
}
export { deriveKey_2 };
