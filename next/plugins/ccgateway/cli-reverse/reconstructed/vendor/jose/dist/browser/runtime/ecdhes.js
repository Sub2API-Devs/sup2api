/**
 * jose/dist/browser/runtime/ecdhes.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_content_encryption_6 } from "../../webapi/lib/content_encryption.js";
import { init_buffer_utils, isCryptoKey, cryptoModule } from "../../webapi/lib/buffer_utils.js";
import { noop, keyMustBeTypeError } from "../../node/esm/lib/invalid_key_input.js";
import { noopInit, init_is_key_like, keyObjectTypes } from "./is_key_like.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { concat, lengthAndInput, uint32be, concatKdf } from "../../node/esm/lib/buffer_utils.js";
import { encoder } from "./base64url.js";

//@ chunk-pd6th42n.js:10578-10616 esm-layout
var init_ecdhes = __esm(() => {
  init_content_encryption_6();
  init_buffer_utils();
  noop();
  noopInit();
  init_is_key_like();
});
//@ chunk-pd6th42n.js:10616-11087 esm-fingerprint
async function deriveKey(
  publicKey,
  privateKey,
  algorithm,
  keyLength,
  apu = new Uint8Array(0),
  apv = new Uint8Array(0),
) {
  if (!isCryptoKey(publicKey)) throw TypeError(keyMustBeTypeError(publicKey, ...keyObjectTypes));
  checkEncCryptoKey(publicKey, "ECDH");
  if (!isCryptoKey(privateKey)) throw TypeError(keyMustBeTypeError(privateKey, ...keyObjectTypes));
  checkEncCryptoKey(privateKey, "ECDH", "deriveBits");
  let value = concat(
    lengthAndInput(encoder.encode(algorithm)),
    lengthAndInput(apu),
    lengthAndInput(apv),
    uint32be(keyLength),
  );
  let length;
  if (publicKey.algorithm.name === "X25519") length = 256;
  else if (publicKey.algorithm.name === "X448") length = 448;
  else length = Math.ceil(parseInt(publicKey.algorithm.namedCurve.substr(-3), 10) / 8) << 3;
  let sharedSecret = new Uint8Array(
    await cryptoModule.subtle.deriveBits(
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
//@ chunk-pd6th42n.js:11087-11203 esm-fingerprint
async function generateEpk(key) {
  if (!isCryptoKey(key)) throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes));
  return cryptoModule.subtle.generateKey(key.algorithm, true, ["deriveBits"]);
}
//@ chunk-pd6th42n.js:11203-11375 esm-fingerprint
function ecdhAllowed(key) {
  if (!isCryptoKey(key)) throw TypeError(keyMustBeTypeError(key, ...keyObjectTypes));
  return (
    ["P-256", "P-384", "P-521"].includes(key.algorithm.namedCurve) ||
    key.algorithm.name === "X25519" ||
    key.algorithm.name === "X448"
  );
}
export { init_ecdhes, ecdhAllowed, deriveKey, generateEpk };
