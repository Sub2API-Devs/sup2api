/**
 * jose/dist/browser/runtime/ecdhes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_content_encryption_6 } from "../../webapi/lib/content_encryption.js";
import { init_buffer_utils, g, p } from "../../webapi/lib/buffer_utils.js";
import { L, A } from "../../node/esm/lib/invalid_key_input.js";
import { O, init_is_key_like, m } from "./is_key_like.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { concat, lengthAndInput, uint32be, concatKdf } from "../../node/esm/lib/buffer_utils.js";
import { l } from "./base64url.js";

//@ chunk-2tyrgda4.js:10578-10616 esm-layout
var init_ecdhes = Xa(() => {
  init_content_encryption_6();
  init_buffer_utils();
  L();
  O();
  init_is_key_like();
});
//@ chunk-2tyrgda4.js:10616-11087 esm-fingerprint
async function deriveKey(
  publicKey,
  privateKey,
  algorithm,
  keyLength,
  apu = new Uint8Array(0),
  apv = new Uint8Array(0),
) {
  if (!g(publicKey)) throw TypeError(A(publicKey, ...m));
  checkEncCryptoKey(publicKey, "ECDH");
  if (!g(privateKey)) throw TypeError(A(privateKey, ...m));
  checkEncCryptoKey(privateKey, "ECDH", "deriveBits");
  let value = concat(
    lengthAndInput(l.encode(algorithm)),
    lengthAndInput(apu),
    lengthAndInput(apv),
    uint32be(keyLength),
  );
  let length;
  if (publicKey.algorithm.name === "X25519") length = 256;
  else if (publicKey.algorithm.name === "X448") length = 448;
  else length = Math.ceil(parseInt(publicKey.algorithm.namedCurve.substr(-3), 10) / 8) << 3;
  let sharedSecret = new Uint8Array(
    await p.subtle.deriveBits(
      {
        name: publicKey.algorithm.name,
        public: publicKey,
      },
      privateKey,
      length,
    ),
  );
  return concatKdf(sharedSecret, keyLength, value);
}
//@ chunk-2tyrgda4.js:11087-11203 esm-fingerprint
async function generateEpk(key) {
  if (!g(key)) throw TypeError(A(key, ...m));
  return p.subtle.generateKey(key.algorithm, true, ["deriveBits"]);
}
//@ chunk-2tyrgda4.js:11203-11375 esm-fingerprint
function ecdhAllowed(key) {
  if (!g(key)) throw TypeError(A(key, ...m));
  return (
    ["P-256", "P-384", "P-521"].includes(key.algorithm.namedCurve) ||
    key.algorithm.name === "X25519" ||
    key.algorithm.name === "X448"
  );
}
export { init_ecdhes, ecdhAllowed, deriveKey, generateEpk };
