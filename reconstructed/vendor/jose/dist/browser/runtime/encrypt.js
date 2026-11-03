/**
 * jose/dist/browser/runtime/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { O, init_is_key_like, m } from "./is_key_like.js";
import { z, Jr } from "../../node/esm/lib/check_key_type.js";
import { A } from "../../node/esm/lib/invalid_key_input.js";
import { p, g } from "../../webapi/lib/buffer_utils.js";
import { concat, he } from "../../node/esm/lib/buffer_utils.js";
import { checkEncCryptoKey } from "../../node/esm/lib/crypto_key.js";
import { ge, j, f } from "../../webapi/lib/content_encryption.js";

//@ chunk-2tyrgda4.js:18405-18435 esm-layout
var init_encrypt = Xa(() => {
  O();
  init_is_key_like();
  z = Jr;
});
//@ chunk-2tyrgda4.js:18435-18923 esm-fingerprint
async function cbcEncrypt(enc, plaintext, cek, iv, aad) {
  if (!(cek instanceof Uint8Array)) throw TypeError(A(cek, "Uint8Array"));
  let keySize = parseInt(enc.slice(1, 4), 10);
  let encKey = await p.subtle.importKey("raw", cek.subarray(keySize >> 3), "AES-CBC", false, ["encrypt"]);
  let macKey = await p.subtle.importKey(
    "raw",
    cek.subarray(0, keySize >> 3),
    {
      hash: `SHA-${keySize << 1}`,
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  let ciphertext = new Uint8Array(
    await p.subtle.encrypt(
      {
        iv,
        name: "AES-CBC",
      },
      encKey,
      plaintext,
    ),
  );
  let macData = concat(aad, iv, ciphertext, he(aad.length << 3));
  let tag = new Uint8Array((await p.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3));
  return {
    ciphertext,
    tag,
  };
}
//@ chunk-2tyrgda4.js:18923-19230 esm-fingerprint
async function gcmEncrypt(enc, plaintext, cek, iv, aad) {
  let encKey;
  if (cek instanceof Uint8Array) encKey = await p.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  else {
    checkEncCryptoKey(cek, enc, "encrypt");
    encKey = cek;
  }
  let encrypted = new Uint8Array(
    await p.subtle.encrypt(
      {
        additionalData: aad,
        iv,
        name: "AES-GCM",
        tagLength: 128,
      },
      encKey,
      plaintext,
    ),
  );
  let tag = encrypted.slice(-16);
  return {
    ciphertext: encrypted.slice(0, -16),
    tag,
  };
}
//@ chunk-2tyrgda4.js:19230-19683 esm-fingerprint
var encrypt_3 = async (enc, plaintext, cek, iv, aad) => {
  if (!g(cek) && !(cek instanceof Uint8Array)) throw TypeError(A(cek, ...m, "Uint8Array"));
  switch ((ge(enc, iv), enc)) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) j(cek, parseInt(enc.slice(-3), 10));
      return cbcEncrypt(enc, plaintext, cek, iv, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) j(cek, parseInt(enc.slice(1, 4), 10));
      return gcmEncrypt(enc, plaintext, cek, iv, aad);
    default:
      throw new f("Unsupported JWE Content Encryption Algorithm");
  }
};
var encrypt_default;
export { encrypt_default, encrypt_3, init_encrypt };
