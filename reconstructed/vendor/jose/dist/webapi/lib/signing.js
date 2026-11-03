/**
 * jose/dist/webapi/lib/signing.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (6), chunk-5h78gfwc.js (5)
 * attribution: esm-layout 3, esm-fingerprint 8
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_content_encryption_2 } from "./content_encryption.js";
import { init_buffer_utils, p } from "./buffer_utils.js";
import { L, message_3 } from "../../node/esm/lib/invalid_key_input.js";
import { O, init_is_key_like } from "../../browser/runtime/is_key_like.js";
import { getCryptoKey_3 } from "../../browser/runtime/get_sign_verify_key.js";
import { subtleDsa } from "../../browser/runtime/subtle_dsa.js";
import { init_encrypt_3 } from "../../node/esm/jwe/compact/encrypt.js";
import { JOSENotSupported } from "../../node/esm/util/errors.js";
import { checkSigCryptoKey } from "./crypto_key.js";

//@ chunk-2tyrgda4.js:12669-12690 esm-layout
var init_signing = Xa(() => {
  init_content_encryption_2();
});
//@ chunk-2tyrgda4.js:12690-12890 esm-fingerprint
var checkKeyLength_2 = (alg, key) => {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    let { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048)
      throw TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
  }
};
//@ chunk-2tyrgda4.js:28098-28131 esm-layout
var init_signing_2 = Xa(() => {
  init_buffer_utils();
  L();
  O();
  init_is_key_like();
});
//@ chunk-2tyrgda4.js:28131-28280 esm-fingerprint
var Nr = async (alg, key, r, o) => {
  let cryptoKey = await getCryptoKey_3(alg, key, "verify");
  checkKeyLength_2(alg, cryptoKey);
  let a = subtleDsa(alg, cryptoKey.algorithm);
  try {
    return await p.subtle.verify(a, cryptoKey, r, o);
  } catch (error) {
    return false;
  }
};
var Nt;
//@ chunk-2tyrgda4.js:36693-36715 esm-layout
var init_signing_3 = Xa(() => {
  init_encrypt_3();
});
//@ chunk-2tyrgda4.js:36715-36849 esm-fingerprint
var Fr = async (alg, key, r) => {
  let cryptoKey = await getCryptoKey_3(alg, key, "sign");
  checkKeyLength_2(alg, cryptoKey);
  let signature = await p.subtle.sign(subtleDsa(alg, cryptoKey.algorithm), cryptoKey, r);
  return new Uint8Array(signature);
};
var Qt;
//@ chunk-5h78gfwc.js:14384-14586 esm-fingerprint
function checkKeyLength(alg, key) {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    let { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048)
      throw TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
  }
}
//@ chunk-5h78gfwc.js:14586-15176 esm-fingerprint
function subtleAlgorithm(alg, algorithm) {
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
        saltLength: parseInt(alg.slice(-3), 10) >> 3,
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
    case "Ed25519":
    case "EdDSA":
      return {
        name: "Ed25519",
      };
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      return {
        name: alg,
      };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
//@ chunk-5h78gfwc.js:15176-15419 esm-fingerprint
async function getSigKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) throw TypeError(message_3(key, "CryptoKey", "KeyObject", "JSON Web Key"));
    return crypto.subtle.importKey(
      "raw",
      key,
      {
        hash: `SHA-${alg.slice(-3)}`,
        name: "HMAC",
      },
      false,
      [usage],
    );
  }
  checkSigCryptoKey(key, alg, usage);
  return key;
}
//@ chunk-5h78gfwc.js:15419-15558 esm-fingerprint
async function sign(alg, key, data) {
  let cryptoKey = await getSigKey(alg, key, "sign");
  checkKeyLength(alg, cryptoKey);
  let signature = await crypto.subtle.sign(subtleAlgorithm(alg, cryptoKey.algorithm), cryptoKey, data);
  return new Uint8Array(signature);
}
//@ chunk-5h78gfwc.js:15558-15709 esm-fingerprint
async function verify(alg, key, signature, data) {
  let cryptoKey = await getSigKey(alg, key, "verify");
  checkKeyLength(alg, cryptoKey);
  let algorithm = subtleAlgorithm(alg, cryptoKey.algorithm);
  try {
    return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}
export {
  checkKeyLength,
  checkKeyLength_2,
  init_signing,
  init_signing_2,
  Nt,
  Nr,
  Qt,
  Fr,
  init_signing_3,
  verify,
  sign,
};
