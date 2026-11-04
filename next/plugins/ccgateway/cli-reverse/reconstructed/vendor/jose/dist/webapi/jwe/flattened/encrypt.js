/**
 * jose/dist/webapi/jwe/flattened/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { assertNotSet, unusedSymbol } from "../../lib/helpers.js";
import { JWEInvalid_2, JOSENotSupported_2 } from "../../../node/esm/util/errors.js";
import { isDisjoint } from "../../lib/type_checks.js";
import { validateCrit } from "../../lib/options.js";
import { checkKeyType } from "../../lib/check_key_type.js";
import { normalizeKey } from "../../lib/normalize_key.js";
import { encryptKeyManagement } from "../../lib/key_management.js";
import { encode_2 } from "../../util/base64url.js";
import { encode, concat } from "../../lib/buffer_utils.js";
import { deflate } from "../../lib/deflate.js";
import { encrypt } from "../../lib/content_encryption.js";

//@ chunk-5h78gfwc.js:35279-37807 esm-fingerprint
class FlattenedEncrypt {
  #e;
  #t;
  #r;
  #n;
  #a;
  #o;
  #s;
  #i;
  constructor(plaintext) {
    if (!(plaintext instanceof Uint8Array)) throw TypeError("plaintext must be an instance of Uint8Array");
    this.#e = plaintext;
  }
  setKeyManagementParameters(parameters) {
    assertNotSet(this.#i, "setKeyManagementParameters");
    this.#i = parameters;
    return this;
  }
  setProtectedHeader(protectedHeader) {
    assertNotSet(this.#t, "setProtectedHeader");
    this.#t = protectedHeader;
    return this;
  }
  setSharedUnprotectedHeader(sharedUnprotectedHeader) {
    assertNotSet(this.#r, "setSharedUnprotectedHeader");
    this.#r = sharedUnprotectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    assertNotSet(this.#n, "setUnprotectedHeader");
    this.#n = unprotectedHeader;
    return this;
  }
  setAdditionalAuthenticatedData(aad) {
    this.#a = aad;
    return this;
  }
  setContentEncryptionKey(cek) {
    assertNotSet(this.#o, "setContentEncryptionKey");
    this.#o = cek;
    return this;
  }
  setInitializationVector(iv) {
    assertNotSet(this.#s, "setInitializationVector");
    this.#s = iv;
    return this;
  }
  async encrypt(key, options) {
    if (!this.#t && !this.#n && !this.#r)
      throw new JWEInvalid_2(
        "either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()",
      );
    if (!isDisjoint(this.#t, this.#n, this.#r))
      throw new JWEInvalid_2(
        "JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint",
      );
    let joseHeader = {
      ...this.#t,
      ...this.#n,
      ...this.#r,
    };
    validateCrit(JWEInvalid_2, new Map(), options?.crit, this.#t, joseHeader);
    if (joseHeader.zip !== undefined && joseHeader.zip !== "DEF")
      throw new JOSENotSupported_2('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
    if (joseHeader.zip !== undefined && !this.#t?.zip)
      throw new JWEInvalid_2(
        'JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.',
      );
    let { alg, enc } = joseHeader;
    if (typeof alg !== "string" || !alg)
      throw new JWEInvalid_2('JWE "alg" (Algorithm) Header Parameter missing or invalid');
    if (typeof enc !== "string" || !enc)
      throw new JWEInvalid_2('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
    let encryptedKey;
    if (this.#o && (alg === "dir" || alg === "ECDH-ES"))
      throw TypeError(`setContentEncryptionKey cannot be called with JWE "alg" (Algorithm) Header ${alg}`);
    checkKeyType(alg === "dir" ? enc : alg, key, "encrypt");
    let cek;
    {
      let parameters;
      let k = await normalizeKey(key, alg);
      ({ cek, encryptedKey, parameters } = await encryptKeyManagement(alg, enc, k, this.#o, this.#i));
      if (parameters)
        if (options && unusedSymbol in options) {
          if (!this.#n) this.setUnprotectedHeader(parameters);
          else
            this.#n = {
              ...this.#n,
              ...parameters,
            };
        } else if (!this.#t) this.setProtectedHeader(parameters);
        else
          this.#t = {
            ...this.#t,
            ...parameters,
          };
    }
    let additionalData;
    let protectedHeaderS;
    let protectedHeaderB;
    let aadMember;
    if (this.#t) {
      protectedHeaderS = encode_2(JSON.stringify(this.#t));
      protectedHeaderB = encode(protectedHeaderS);
    } else {
      protectedHeaderS = "";
      protectedHeaderB = new Uint8Array();
    }
    if (this.#a) {
      aadMember = encode_2(this.#a);
      let aadMemberBytes = encode(aadMember);
      additionalData = concat(protectedHeaderB, encode("."), aadMemberBytes);
    } else additionalData = protectedHeaderB;
    let plaintext = this.#e;
    if (joseHeader.zip === "DEF")
      plaintext = await deflate(plaintext).catch((cause) => {
        throw new JWEInvalid_2("Failed to compress plaintext", {
          cause,
        });
      });
    let { ciphertext, tag, iv } = await encrypt(enc, plaintext, cek, this.#s, additionalData);
    let jwe = {
      ciphertext: encode_2(ciphertext),
    };
    if (iv) jwe.iv = encode_2(iv);
    if (tag) jwe.tag = encode_2(tag);
    if (encryptedKey) jwe.encrypted_key = encode_2(encryptedKey);
    if (aadMember) jwe.aad = aadMember;
    if (this.#t) jwe.protected = protectedHeaderS;
    if (this.#r) jwe.unprotected = this.#r;
    if (this.#n) jwe.header = this.#n;
    return jwe;
  }
}
export { FlattenedEncrypt };
