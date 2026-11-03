/**
 * jose/dist/webapi/lib/content_encryption.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (14), chunk-5h78gfwc.js (16)
 * attribution: esm-layout 10, esm-fingerprint 20
 */
import { JOSENotSupported, JWEInvalid, JWEDecryptionFailed } from "../../node/esm/util/errors.js";
import { message_3 } from "../../node/esm/lib/invalid_key_input.js";
import { concat, xe, init_buffer_utils, p } from "./buffer_utils.js";
import { checkEncCryptoKey } from "./crypto_key.js";
import { isCryptoKey } from "./key.js";
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { init_base64url } from "../../browser/runtime/base64url.js";

//@ chunk-5h78gfwc.js:7205-7443 esm-fingerprint
function ye(alg) {
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
      throw new JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
  }
}
//@ chunk-5h78gfwc.js:7443-7503 esm-fingerprint
var generateCek = (alg) => crypto.getRandomValues(new Uint8Array(ye(alg) >> 3));
//@ chunk-5h78gfwc.js:7503-7639 esm-fingerprint
function checkCekLength(cek, expected) {
  let actual = cek.byteLength << 3;
  if (actual !== expected)
    throw new JWEInvalid(
      `Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`,
    );
}
//@ chunk-5h78gfwc.js:7639-7891 esm-fingerprint
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
      throw new JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
  }
}
//@ chunk-5h78gfwc.js:7891-7952 esm-fingerprint
var generateIv = (alg) => crypto.getRandomValues(new Uint8Array(ivBitLength(alg) >> 3));
//@ chunk-5h78gfwc.js:7952-8044 esm-fingerprint
function checkIvLength(enc, iv) {
  if (iv.length << 3 !== ivBitLength(enc)) throw new JWEInvalid("Invalid Initialization Vector length");
}
//@ chunk-5h78gfwc.js:8044-8378 esm-fingerprint
async function cbcKeySetup(enc, cek, usage) {
  if (!(cek instanceof Uint8Array)) throw TypeError(message_3(cek, "Uint8Array"));
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
//@ chunk-5h78gfwc.js:8378-8479 esm-fingerprint
async function cbcHmacTag(macKey, macData, keySize) {
  return new Uint8Array((await crypto.subtle.sign("HMAC", macKey, macData)).slice(0, keySize >> 3));
}
//@ chunk-5h78gfwc.js:8479-8715 esm-fingerprint
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
  let macData = concat(aad, iv, ciphertext, xe(aad.length << 3));
  let tag = await cbcHmacTag(macKey, macData, keySize);
  return {
    ciphertext,
    tag,
    iv,
  };
}
//@ chunk-5h78gfwc.js:8715-9133 esm-fingerprint
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
//@ chunk-5h78gfwc.js:9133-9430 esm-fingerprint
async function cbcDecrypt(enc, cek, ciphertext, iv, tag, aad) {
  let { encKey, macKey, keySize } = await cbcKeySetup(enc, cek, "decrypt");
  let macData = concat(aad, iv, ciphertext, xe(aad.length << 3));
  let expectedTag = await cbcHmacTag(macKey, macData, keySize);
  let macCheckPassed;
  try {
    macCheckPassed = await timingSafeEqual(tag, expectedTag);
  } catch {}
  if (!macCheckPassed) throw new JWEDecryptionFailed();
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
  if (!plaintext) throw new JWEDecryptionFailed();
  return plaintext;
}
//@ chunk-5h78gfwc.js:9430-9752 esm-fingerprint
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
//@ chunk-5h78gfwc.js:9752-10045 esm-fingerprint
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
    throw new JWEDecryptionFailed();
  }
}
//@ chunk-5h78gfwc.js:10045-10099 esm-fingerprint
var unsupportedEnc = "Unsupported JWE Content Encryption Algorithm";
//@ chunk-5h78gfwc.js:10099-10561 esm-fingerprint
async function encrypt(enc, plaintext, cek, iv, aad) {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array))
    throw TypeError(message_3(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  if (iv) checkIvLength(enc, iv);
  else iv = generateIv(enc);
  switch (enc) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) checkCekLength(cek, parseInt(enc.slice(-3), 10));
      return cbcEncrypt(enc, plaintext, cek, iv, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) checkCekLength(cek, parseInt(enc.slice(1, 4), 10));
      return gcmEncrypt(enc, plaintext, cek, iv, aad);
    default:
      throw new JOSENotSupported(unsupportedEnc);
  }
}
//@ chunk-5h78gfwc.js:10561-11118 esm-fingerprint
async function decrypt(enc, cek, ciphertext, iv, tag, aad) {
  if (!isCryptoKey(cek) && !(cek instanceof Uint8Array))
    throw TypeError(message_3(cek, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  if (!iv) throw new JWEInvalid("JWE Initialization Vector missing");
  if (!tag) throw new JWEInvalid("JWE Authentication Tag missing");
  switch ((checkIvLength(enc, iv), enc)) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (cek instanceof Uint8Array) checkCekLength(cek, parseInt(enc.slice(-3), 10));
      return cbcDecrypt(enc, cek, ciphertext, iv, tag, aad);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (cek instanceof Uint8Array) checkCekLength(cek, parseInt(enc.slice(1, 4), 10));
      return gcmDecrypt(enc, cek, ciphertext, iv, tag, aad);
    default:
      throw new JOSENotSupported(unsupportedEnc);
  }
}
//@ chunk-2tyrgda4.js:1828-1848 esm-layout
var init_content_encryption = Xa(() => {
  init_base64url();
});
//@ chunk-2tyrgda4.js:1848-1874 esm-layout
var N;
var Q;
var f;
var re;
var s;
var y;
var Te;
var Ue;
var De;
//@ chunk-2tyrgda4.js:1874-3334 esm-layout
var init_content_encryption_2 = Xa(() => {
  N = class N extends Error {
    static get code() {
      return "ERR_JOSE_GENERIC";
    }
    constructor(message) {
      var t;
      super(message);
      this.code = "ERR_JOSE_GENERIC";
      this.name = this.constructor.name;
      if (!((t = Error.captureStackTrace) === null || t === undefined)) t.call(Error, this, this.constructor);
    }
  };
  Q = class Q extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
    }
    static get code() {
      return "ERR_JOSE_ALG_NOT_ALLOWED";
    }
  };
  f = class f extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JOSE_NOT_SUPPORTED";
    }
    static get code() {
      return "ERR_JOSE_NOT_SUPPORTED";
    }
  };
  re = class re extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWE_DECRYPTION_FAILED";
      this.message = "decryption operation failed";
    }
    static get code() {
      return "ERR_JWE_DECRYPTION_FAILED";
    }
  };
  s = class s extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWE_INVALID";
    }
    static get code() {
      return "ERR_JWE_INVALID";
    }
  };
  y = class y extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWS_INVALID";
    }
    static get code() {
      return "ERR_JWS_INVALID";
    }
  };
  Te = class Te extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWT_INVALID";
    }
    static get code() {
      return "ERR_JWT_INVALID";
    }
  };
  Ue = class Ue extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWK_INVALID";
    }
    static get code() {
      return "ERR_JWK_INVALID";
    }
  };
  De = class De extends N {
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
//@ chunk-2tyrgda4.js:3334-3340 esm-layout
var k;
//@ chunk-2tyrgda4.js:3340-3389 esm-layout
var init_content_encryption_3 = Xa(() => {
  init_buffer_utils();
  k = p.getRandomValues.bind(p);
});
//@ chunk-2tyrgda4.js:3389-3641 esm-fingerprint
function Oe(e) {
  switch (e) {
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
      throw new f(`Unsupported JWE Algorithm: ${e}`);
  }
}
//@ chunk-2tyrgda4.js:3641-3681 esm-layout
var Se = (e) => k(new Uint8Array(Oe(e) >> 3));
//@ chunk-2tyrgda4.js:3681-3707 esm-layout
var init_content_encryption_4 = Xa(() => {
  init_content_encryption_2();
  init_content_encryption_3();
});
//@ chunk-2tyrgda4.js:3707-3801 esm-fingerprint
var yr = (e, t) => {
  if (t.length << 3 !== Oe(e)) throw new s("Invalid Initialization Vector length");
};
var ge;
//@ chunk-2tyrgda4.js:3801-3833 esm-layout
var init_content_encryption_5 = Xa(() => {
  init_content_encryption_2();
  init_content_encryption_4();
  ge = yr;
});
//@ chunk-2tyrgda4.js:3833-3970 esm-fingerprint
var wr = (e, expected) => {
  let actual = e.byteLength << 3;
  if (actual !== expected)
    throw new s(`Invalid Content Encryption Key length. Expected ${expected} bits, got ${actual} bits`);
};
var j;
//@ chunk-2tyrgda4.js:9860-9873 esm-layout
var F = () => {};
//@ chunk-2tyrgda4.js:9873-9883 esm-layout
var _r;
var ee;
//@ chunk-2tyrgda4.js:9883-9952 esm-fingerprint
var init_content_encryption_6 = Xa(() => {
  _r = [
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    true,
    ["sign"],
  ];
  ee = _r;
});
export {
  init_content_encryption_2,
  j,
  wr,
  re,
  ge,
  f,
  init_content_encryption_5,
  ee,
  init_content_encryption_6,
  s,
  k,
  decrypt,
  ye,
  generateCek,
  init_content_encryption_3,
  init_content_encryption,
  F,
  Se,
  encrypt,
  init_content_encryption_4,
  Q,
  y,
  De,
  Te,
  Ue,
};
