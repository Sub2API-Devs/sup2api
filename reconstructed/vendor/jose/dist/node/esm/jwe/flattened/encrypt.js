/**
 * jose/dist/node/esm/jwe/flattened/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { init_ecdhes } from "../../../../browser/runtime/ecdhes.js";
import { init_check_p2s } from "../../lib/check_p2s.js";
import { init_key_management } from "../../../../webapi/lib/key_management.js";
import { init_cek } from "../../lib/cek.js";
import {
  init_content_encryption,
  init_content_encryption_2,
  s,
  f,
  Se,
} from "../../../../webapi/lib/content_encryption.js";
import { init_jwk_to_key } from "../../../../browser/runtime/jwk_to_key.js";
import { init_encrypt_key_management_2, encryptKeyManagement } from "../../lib/encrypt_key_management.js";
import { init_encrypt, encrypt_default } from "../../../../browser/runtime/encrypt.js";
import { init_decrypt_key_management } from "../../lib/decrypt_key_management.js";
import { G } from "../../../../webapi/lib/validate.js";
import { X } from "../../../../webapi/lib/options.js";
import { Gr } from "../compact/encrypt.js";
import { l, encode, C } from "../../../../browser/runtime/base64url.js";
import { concat } from "../../lib/buffer_utils.js";
import { deflate } from "../../../../browser/runtime/zlib.js";

//@ chunk-2tyrgda4.js:32529-32536 esm-layout
var encryptKeyManagement_default;
//@ chunk-2tyrgda4.js:32536-32607 esm-layout
var init_encrypt_2 = Xa(() => {
  init_ecdhes();
  init_check_p2s();
  init_key_management();
  init_cek();
  init_content_encryption();
  init_jwk_to_key();
  init_content_encryption_2();
  init_encrypt_key_management_2();
  init_encrypt();
  init_decrypt_key_management();
  encryptKeyManagement_default = encryptKeyManagement;
});
//@ chunk-2tyrgda4.js:32607-36110 esm-fingerprint
class FlattenedEncrypt {
  constructor(plaintext) {
    if (!(plaintext instanceof Uint8Array)) throw TypeError("plaintext must be an instance of Uint8Array");
    this._plaintext = plaintext;
  }
  setKeyManagementParameters(parameters) {
    if (this._keyManagementParameters) throw TypeError("setKeyManagementParameters can only be called once");
    this._keyManagementParameters = parameters;
    return this;
  }
  setProtectedHeader(protectedHeader) {
    if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
    this._protectedHeader = protectedHeader;
    return this;
  }
  setSharedUnprotectedHeader(sharedUnprotectedHeader) {
    if (this._sharedUnprotectedHeader) throw TypeError("setSharedUnprotectedHeader can only be called once");
    this._sharedUnprotectedHeader = sharedUnprotectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
    this._unprotectedHeader = unprotectedHeader;
    return this;
  }
  setAdditionalAuthenticatedData(aad) {
    this._aad = aad;
    return this;
  }
  setContentEncryptionKey(cek) {
    if (this._cek) throw TypeError("setContentEncryptionKey can only be called once");
    this._cek = cek;
    return this;
  }
  setInitializationVector(iv) {
    if (this._iv) throw TypeError("setInitializationVector can only be called once");
    this._iv = iv;
    return this;
  }
  async encrypt(key, options) {
    if (!this._protectedHeader && !this._unprotectedHeader && !this._sharedUnprotectedHeader)
      throw new s(
        "either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()",
      );
    if (!G(this._protectedHeader, this._unprotectedHeader, this._sharedUnprotectedHeader))
      throw new s(
        "JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint",
      );
    let joseHeader = {
      ...this._protectedHeader,
      ...this._unprotectedHeader,
      ...this._sharedUnprotectedHeader,
    };
    X(
      s,
      new Map(),
      options === null || options === undefined ? undefined : options.crit,
      this._protectedHeader,
      joseHeader,
    );
    if (joseHeader.zip !== undefined) {
      if (!this._protectedHeader || !this._protectedHeader.zip)
        throw new s('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
      if (joseHeader.zip !== "DEF")
        throw new f('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value');
    }
    let { alg, enc } = joseHeader;
    if (typeof alg !== "string" || !alg)
      throw new s('JWE "alg" (Algorithm) Header Parameter missing or invalid');
    if (typeof enc !== "string" || !enc)
      throw new s('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
    let encryptedKey;
    if (alg === "dir") {
      if (this._cek) throw TypeError("setContentEncryptionKey cannot be called when using Direct Encryption");
    } else if (alg === "ECDH-ES") {
      if (this._cek)
        throw TypeError("setContentEncryptionKey cannot be called when using Direct Key Agreement");
    }
    let cek;
    {
      let parameters;
      ({ cek, encryptedKey, parameters } = await encryptKeyManagement_default(
        alg,
        enc,
        key,
        this._cek,
        this._keyManagementParameters,
      ));
      if (parameters)
        if (options && Gr in options) {
          if (!this._unprotectedHeader) this.setUnprotectedHeader(parameters);
          else
            this._unprotectedHeader = {
              ...this._unprotectedHeader,
              ...parameters,
            };
        } else if (!this._protectedHeader) this.setProtectedHeader(parameters);
        else
          this._protectedHeader = {
            ...this._protectedHeader,
            ...parameters,
          };
    }
    if (!this._iv) this._iv = Se(enc);
    let additionalData;
    let protectedHeader;
    let aadMember;
    if (this._protectedHeader) protectedHeader = l.encode(encode(JSON.stringify(this._protectedHeader)));
    else protectedHeader = l.encode("");
    if (this._aad) {
      aadMember = encode(this._aad);
      additionalData = concat(protectedHeader, l.encode("."), l.encode(aadMember));
    } else additionalData = protectedHeader;
    let ciphertext;
    let tag;
    if (joseHeader.zip === "DEF") {
      let deflated = await (
        (options === null || options === undefined ? undefined : options.deflateRaw) || deflate
      )(this._plaintext);
      ({ ciphertext, tag } = await encrypt_default(enc, deflated, cek, this._iv, additionalData));
    } else ({ ciphertext, tag } = await encrypt_default(enc, this._plaintext, cek, this._iv, additionalData));
    let jwe = {
      ciphertext: encode(ciphertext),
      iv: encode(this._iv),
      tag: encode(tag),
    };
    if (encryptedKey) jwe.encrypted_key = encode(encryptedKey);
    if (aadMember) jwe.aad = aadMember;
    if (this._protectedHeader) jwe.protected = C.decode(protectedHeader);
    if (this._sharedUnprotectedHeader) jwe.unprotected = this._sharedUnprotectedHeader;
    if (this._unprotectedHeader) jwe.header = this._unprotectedHeader;
    return jwe;
  }
}
export { init_encrypt_2, FlattenedEncrypt };
