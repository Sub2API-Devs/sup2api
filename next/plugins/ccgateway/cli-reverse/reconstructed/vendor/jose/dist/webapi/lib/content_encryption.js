/**
 * jose/dist/webapi/lib/content_encryption.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (16), chunk-pd6th42n.js (15)
 * attribution: esm-fingerprint 20, esm-layout 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { JOSENotSupported_2, JWEInvalid_2, JWEDecryptionFailed_2 } from "../../node/esm/util/errors.js";
import { message_2 } from "../../node/esm/lib/invalid_key_input.js";
import { concat, uint64be, init_buffer_utils, cryptoModule } from "./buffer_utils.js";
import { checkEncCryptoKey } from "./crypto_key.js";
import { isCryptoKey } from "./key.js";
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_base64url } from "../../browser/runtime/base64url.js";

//@ chunk-0f6azspv.js:7205-7443 esm-fingerprint
function cekBitsForAlg(alg) {
  switch (alg) {
    case "A128GCM":
      return 128;
    case "A192GCM":
      return 192;
    case "A256GCM":
    case "A128CBC-HS256":
      return 256;
    case "A192CBC-HS384":
      return 384;
    case "A256CBC-HS512":
      return 512;
    default:
      throw new JOSENotSupported_2(`Unsupported JWE Algorithm: ${alg}`);
  }
}
//@ chunk-0f6azspv.js:7443-7503 esm-fingerprint
var generateCek_2 = (alg) => crypto.getRandomValues(new Uint8Array(cekBitsForAlg(alg) >> 3));
//@ chunk-0f6azspv.js:7503-7639 esm-fingerprint
function checkCekLength_2(cek, expected) {
  let actual = cek.byteLength << 3;
  if (actual !== expected)
    throw new JWEInvalid_2(
      `Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`,
    );
}
//@ chunk-0f6azspv.js:7639-7891 esm-fingerprint
function ivBitLength(alg) {
  switch (alg) {
    case "A128GCM":
    case "A128GCMKW":
    case "A192GCM":
    case "A192GCMKW":
    case "A256GCM":
    case "A256GCMKW":
      return 96;
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      return 128;
    default:
      throw new JOSENotSupported_2(`Unsupported JWE Algorithm: ${alg}`);
  }
}
//@ chunk-0f6azspv.js:7891-7952 esm-fingerprint
var generateIv_2 = (alg) => crypto.getRandomValues(new Uint8Array(ivBitLength(alg) >> 3));
//@ chunk-0f6azspv.js:7952-8044 esm-fingerprint
function checkIvLength_2(enc, iv) {
  if (iv.length << 3 !== ivBitLength(enc)) throw new JWEInvalid_2("Invalid Initialization Vector length");
}
//@ chunk-0f6azspv.js:8044-8378 esm-fingerprint
async function cbcKeySetup(enc, cek, usage) {
  if (!(cek instanceof Uint8Array)) throw TypeError(message_2(cek, "Uint8Array"));
  let keySize = parseInt(enc.slice(1, 4), 10);
  let encKey = await crypto.subtle.importKey("raw", cek.subarray(keySize >> 3), "AES-CBC", false, [usage]);
  let macKey = await crypto.subtle.importKey(
    "raw",
    cek.subarray(0, keySize >> 3),
    {
      hash: `SHA-${keySize << 1}`,
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  return {
    encKey,
    macKey,
    keySize,
  };
}
//@ chunk-0f6azspv.js:8378-8479 esm-fingerprint
async function cbcHmacTag(macKey, macData, keySize) {
  return new Uint8Array((await crypto.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3));
}
//@ chunk-0f6azspv.js:8479-8715 esm-fingerprint
async function cbcEncrypt(enc, plaintext, cek, iv, aad) {
  let { encKey, macKey, keySize } = await cbcKeySetup(enc, cek, "encrypt");
  let ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        iv,
        name: "AES-CBC",
      },
      encKey,
      plaintext,
    ),
  );
  let macData = concat(aad, iv, ciphertext, uint64be(aad.length << 3));
  let tag = await cbcHmacTag(macKey, macData, keySize);
  return {
    ciphertext,
    tag,
    iv,
  };
}
//@ chunk-0f6azspv.js:8715-9133 esm-fingerprint
async function timingSafeEqual(a_2, b) {
  if (!(a_2 instanceof Uint8Array)) throw TypeError("First argument must be a buffer");
  if (!(b instanceof Uint8Array)) throw TypeError("Second argument must be a buffer");
  let algorithm = {
    name: "HMAC",
    hash: "SHA-256",
  };
  let key = await crypto.subtle.generateKey(algorithm, false, ["sign"]);
  let aHmac = new Uint8Array(await crypto.subtle.sign(algorithm, key, a_2));
  let bHmac = new Uint8Array(await crypto.subtle.sign(algorithm, key, b));
  let out = 0;
  let i = -1;
  while (++i < 32) out |= aHmac[i] ^ bHmac[i];
  return out === 0;
}
//@ chunk-0f6azspv.js:9133-9430 esm-fingerprint
async function cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) {
  let { encKey, macKey, keySize } = await cbcKeySetup(enc, cek, "decrypt");
  let macData = concat(aad, iv, ciphertext, uint64be(aad.length << 3));
  let expectedTag = await cbcHmacTag(macKey, macData, keySize);
  let macCheckPassed;
  try {
    macCheckPassed = await timingSafeEqual(tag, expectedTag);
  } catch {}
  if (!macCheckPassed) throw new JWEDecryptionFailed_2();
  let plaintext;
  try {
    plaintext = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          iv,
          name: "AES-CBC",
        },
        encKey,
        ciphertext,
      ),
    );
  } catch {}
  if (!plaintext) throw new JWEDecryptionFailed_2();
  return plaintext;
}
//@ chunk-0f6azspv.js:9430-9752 esm-fingerprint
async function gcmEncrypt(enc, plaintext, cek, iv, aad) {
  let encKey;
  if (cek instanceof Uint8Array)
    encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  else {
    checkEncCryptoKey(cek, enc, "encrypt");
    encKey = cek;
  }
  let encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
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
    iv,
  };
}
//@ chunk-0f6azspv.js:9752-10045 esm-fingerprint
async function gcmDecrypt(enc, cek, ciphertext, iv, tag, aad) {
  let encKey;
  if (cek instanceof Uint8Array)
    encKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  else {
    checkEncCryptoKey(cek, enc, "decrypt");
    encKey = cek;
  }
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        {
          additionalData: aad,
          iv,
          name: "AES-GCM",
          tagLength: 128,
        },
        encKey,
        concat(ciphertext, tag),
      ),
    );
  } catch {
    throw new JWEDecryptionFailed_2();
  }
}
//@ chunk-0f6azspv.js:10045-10099 esm-fingerprint
var unsupportedEnc = "Unsupported JWE Content Encryption Algorithm";
//@ chunk-0f6azspv.js:10099-10561 esm-fingerprint
async function encrypt(enc, plaintext, cek, iv, aad) {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array))
    throw TypeError(message_2(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  if (iv) checkIvLength_2(enc, iv);
  else iv = generateIv_2(enc);
  switch (enc) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) checkCekLength_2(cek, parseInt(enc.slice(-3), 10));
      return cbcEncrypt(enc, plaintext, cek, iv, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) checkCekLength_2(cek, parseInt(enc.slice(1, 4), 10));
      return gcmEncrypt(enc, plaintext, cek, iv, aad);
    default:
      throw new JOSENotSupported_2(unsupportedEnc);
  }
}
//@ chunk-0f6azspv.js:10561-11118 esm-fingerprint
async function decrypt(enc, cek, ciphertext, iv, tag, aad) {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array))
    throw TypeError(message_2(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  if (!iv) throw new JWEInvalid_2("JWE Initialization Vector missing");
  if (!tag) throw new JWEInvalid_2("JWE Authentication Tag missing");
  switch ((checkIvLength_2(enc, iv), enc)) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) checkCekLength_2(cek, parseInt(enc.slice(-3), 10));
      return cbcDecrypt(enc, cek, ciphertext, iv, tag, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) checkCekLength_2(cek, parseInt(enc.slice(1, 4), 10));
      return gcmDecrypt(enc, cek, ciphertext, iv, tag, aad);
    default:
      throw new JOSENotSupported_2(unsupportedEnc);
  }
}
//@ chunk-pd6th42n.js:1828-1848 esm-layout
var init_content_encryption = __esm(() => {
  init_base64url();
});
//@ chunk-pd6th42n.js:1848-1874 esm-layout
var JOSEError;
var JOSEAlgNotAllowed;
var JOSENotSupported_3;
var JWEDecryptionFailed;
var JWEInvalid_3;
var JWSInvalid_2;
var JWTInvalid;
var JWKInvalid;
var JWSSignatureVerificationFailed;
//@ chunk-pd6th42n.js:1874-3334 esm-layout
var init_content_encryption_2 = __esm(() => {
  JOSEError = class JOSEError extends Error {
    static get code() {
      return "ERR_JOSE_GENERIC";
    }
    constructor(message) {
      var ErrorCtor;
      super(message);
      this.code = "ERR_JOSE_GENERIC";
      this.name = this.constructor.name;
      if (!((ErrorCtor = Error.captureStackTrace) === null || ErrorCtor === undefined))
        ErrorCtor.call(Error, this, this.constructor);
    }
  };
  JOSEAlgNotAllowed = class JOSEAlgNotAllowed extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
    }
    static get code() {
      return "ERR_JOSE_ALG_NOT_ALLOWED";
    }
  };
  JOSENotSupported_3 = class JOSENotSupported extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JOSE_NOT_SUPPORTED";
    }
    static get code() {
      return "ERR_JOSE_NOT_SUPPORTED";
    }
  };
  JWEDecryptionFailed = class JWEDecryptionFailed extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWE_DECRYPTION_FAILED";
      this.message = "decryption operation failed";
    }
    static get code() {
      return "ERR_JWE_DECRYPTION_FAILED";
    }
  };
  JWEInvalid_3 = class JWEInvalid extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWE_INVALID";
    }
    static get code() {
      return "ERR_JWE_INVALID";
    }
  };
  JWSInvalid_2 = class JWSInvalid extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWS_INVALID";
    }
    static get code() {
      return "ERR_JWS_INVALID";
    }
  };
  JWTInvalid = class JWTInvalid extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWT_INVALID";
    }
    static get code() {
      return "ERR_JWT_INVALID";
    }
  };
  JWKInvalid = class JWKInvalid extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWK_INVALID";
    }
    static get code() {
      return "ERR_JWK_INVALID";
    }
  };
  JWSSignatureVerificationFailed = class JWSSignatureVerificationFailed extends JOSEError {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
      this.message = "signature verification failed";
    }
    static get code() {
      return "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
    }
  };
});
//@ chunk-pd6th42n.js:3334-3340 esm-layout
var generateCek;
//@ chunk-pd6th42n.js:3340-3389 esm-layout
var init_content_encryption_3 = __esm(() => {
  init_buffer_utils();
  generateCek = cryptoModule.getRandomValues.bind(cryptoModule);
});
//@ chunk-pd6th42n.js:3389-3641 esm-fingerprint
function cekBits(enc) {
  switch (enc) {
    case "A128GCM":
    case "A128GCMKW":
    case "A192GCM":
    case "A192GCMKW":
    case "A256GCM":
    case "A256GCMKW":
      return 96;
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      return 128;
    default:
      throw new JOSENotSupported_3(`Unsupported JWE Algorithm: ${enc}`);
  }
}
//@ chunk-pd6th42n.js:3641-3681 esm-layout
var generateIv = (enc) => generateCek(new Uint8Array(cekBits(enc) >> 3));
//@ chunk-pd6th42n.js:3681-3707 esm-layout
var init_content_encryption_4 = __esm(() => {
  init_content_encryption_2();
  init_content_encryption_3();
});
//@ chunk-pd6th42n.js:3707-3801 esm-fingerprint
var checkIvLength = (enc, iv) => {
  if (iv.length << 3 !== cekBits(enc)) throw new JWEInvalid_3("Invalid Initialization Vector length");
};
var checkIvLengthInit;
//@ chunk-pd6th42n.js:3801-3833 esm-layout
var init_content_encryption_5 = __esm(() => {
  init_content_encryption_2();
  init_content_encryption_4();
  checkIvLengthInit = checkIvLength;
});
//@ chunk-pd6th42n.js:3833-3970 esm-fingerprint
var checkCekLength = (cek, expected) => {
  let actual = cek.byteLength << 3;
  if (actual !== expected)
    throw new JWEInvalid_3(
      `Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`,
    );
};
var checkCekLengthInit;
//@ chunk-pd6th42n.js:3970-3996 esm-layout (moved: shares a binding it assigns)
var init_timing_safe_equal = __esm(() => {
  init_content_encryption_2();
  checkCekLengthInit = checkCekLength;
});
//@ chunk-pd6th42n.js:9860-9873 esm-layout
var noopClaims = () => {};
//@ chunk-pd6th42n.js:9873-9883 esm-layout
var hmacAlgorithm;
var hmacSubmitAlgorithm;
//@ chunk-pd6th42n.js:9883-9952 esm-fingerprint
var init_content_encryption_6 = __esm(() => {
  hmacAlgorithm = [
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    true,
    ["sign"],
  ];
  hmacSubmitAlgorithm = hmacAlgorithm;
});
export {
  decrypt,
  cekBitsForAlg,
  generateCek_2,
  init_content_encryption_3,
  init_content_encryption,
  JOSENotSupported_3,
  init_content_encryption_2,
  encrypt,
  generateIv,
  noopClaims,
  JWEInvalid_3,
  JWSInvalid_2,
  JWEDecryptionFailed,
  checkIvLengthInit,
  checkCekLengthInit,
  init_content_encryption_5,
  init_timing_safe_equal,
  hmacSubmitAlgorithm,
  init_content_encryption_6,
  generateCek,
  init_content_encryption_4,
  JOSEAlgNotAllowed,
  JWSSignatureVerificationFailed,
  JWTInvalid,
  JWKInvalid,
};
