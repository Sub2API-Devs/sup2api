/**
 * jose/dist/node/esm/lib/encrypt_key_management.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (4)
 * attribution: esm-layout 3, esm-fingerprint 1
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { init_buffer_utils } from "../../../webapi/lib/buffer_utils.js";
import { O, init_is_key_like } from "../../../browser/runtime/is_key_like.js";
import { init_content_encryption, f } from "../../../webapi/lib/content_encryption.js";
import { keyToJWK_default, keyToJWK } from "../../../browser/runtime/key_to_jwk.js";
import { z } from "./check_key_type.js";
import { ecdhAllowed, generateEpk, deriveKey } from "../../../browser/runtime/ecdhes.js";
import { bitLength } from "./cek.js";
import { encode } from "../../../browser/runtime/base64url.js";
import { V } from "../../../browser/runtime/jwk_to_key.js";
import { wrap } from "../../../browser/runtime/aeskw.js";
import { encrypt_2 } from "../../../browser/runtime/rsaes.js";
import { encrypt } from "../../../browser/runtime/pbes2kw.js";
import { wrap_2 } from "../../../browser/lib/aesgcmkw.js";

//@ chunk-2tyrgda4.js:31220-31259 esm-layout
var init_encrypt_key_management = Xa(() => {
  init_buffer_utils();
  O();
  init_content_encryption();
  init_is_key_like();
  keyToJWK_default = keyToJWK;
});
//@ chunk-2tyrgda4.js:31259-31293 esm-layout
async function ot(ephemeralKey) {
  return keyToJWK_default(ephemeralKey);
}
//@ chunk-2tyrgda4.js:31293-31315 esm-layout
var init_encrypt_key_management_2 = Xa(() => {
  init_encrypt_key_management();
});
//@ chunk-2tyrgda4.js:31315-32529 esm-fingerprint
async function encryptKeyManagement(alg, enc, key, providedCek, providedParameters = {}) {
  let encryptedKey;
  let parameters;
  let cek;
  switch ((z(alg, key, "encrypt"), alg)) {
    case "dir": {
      cek = key;
      break;
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!ecdhAllowed(key))
        throw new f("ECDH with the provided key is not allowed or not supported by your javascript runtime");
      let { apu, apv } = providedParameters;
      let { epk: ephemeralKey } = providedParameters;
      if (!ephemeralKey) ephemeralKey = (await generateEpk(key)).privateKey;
      let { x, y, crv, kty } = await ot(ephemeralKey);
      let sharedSecret = await deriveKey(
        key,
        ephemeralKey,
        alg === "ECDH-ES" ? enc : alg,
        alg === "ECDH-ES" ? bitLength(enc) : parseInt(alg.slice(-5, -2), 10),
        apu,
        apv,
      );
      parameters = {
        epk: {
          x,
          crv,
          kty,
        },
      };
      if (kty === "EC") parameters.epk.y = y;
      if (apu) parameters.apu = encode(apu);
      if (apv) parameters.apv = encode(apv);
      if (alg === "ECDH-ES") {
        cek = sharedSecret;
        break;
      }
      cek = providedCek || V(enc);
      let kwAlg = alg.slice(-6);
      encryptedKey = await wrap(kwAlg, sharedSecret, cek);
      break;
    }
    case "RSA1_5":
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      cek = providedCek || V(enc);
      encryptedKey = await encrypt_2(alg, key, cek);
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      cek = providedCek || V(enc);
      let { p2c, p2s } = providedParameters;
      ({ encryptedKey, ...parameters } = await encrypt(alg, key, cek, p2c, p2s));
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      cek = providedCek || V(enc);
      encryptedKey = await wrap(alg, key, cek);
      break;
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      cek = providedCek || V(enc);
      let { iv } = providedParameters;
      ({ encryptedKey, ...parameters } = await wrap_2(alg, key, cek, iv));
      break;
    }
    default:
      throw new f('Invalid or unsupported "alg" (JWE Algorithm) header value');
  }
  return {
    cek,
    encryptedKey,
    parameters,
  };
}
export { init_encrypt_key_management_2, encryptKeyManagement };
