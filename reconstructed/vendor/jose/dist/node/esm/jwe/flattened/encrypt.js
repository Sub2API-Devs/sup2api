/**
 * jose/dist/node/esm/jwe/flattened/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { Ce } from "../../../../browser/runtime/ecdhes.js";
import { Ve } from "../../lib/check_p2s.js";
import { Xe } from "../../../../webapi/lib/key_management.js";
import { Ye } from "../../lib/cek.js";
import { P, E, s, f, Se } from "../../../../webapi/lib/content_encryption.js";
import { We } from "../../../../browser/runtime/jwk_to_key.js";
import { nt, $r } from "../../lib/encrypt_key_management.js";
import { se, ce } from "../../../../browser/runtime/encrypt.js";
import { je } from "../../lib/decrypt_key_management.js";
import { G } from "../../../../webapi/lib/validate.js";
import { X } from "../../../../webapi/lib/options.js";
import { Gr } from "../compact/encrypt.js";
import { l, w, C } from "../../../../browser/runtime/base64url.js";
import { _ } from "../../lib/buffer_utils.js";
import { St } from "../../../../browser/runtime/zlib.js";

//@ chunk-2tyrgda4.js:32529-32536 esm-layout
var zt;
//@ chunk-2tyrgda4.js:32536-32607 esm-layout
var Xt = Xa(() => {
  Ce();
  Ve();
  Xe();
  Ye();
  P();
  We();
  E();
  nt();
  se();
  je();
  zt = $r;
});
//@ chunk-2tyrgda4.js:32607-36110 esm-fingerprint
class at {
  constructor(e) {
    if (!(e instanceof Uint8Array)) throw TypeError("plaintext must be an instance of Uint8Array");
    this._plaintext = e;
  }
  setKeyManagementParameters(e) {
    if (this._keyManagementParameters) throw TypeError("setKeyManagementParameters can only be called once");
    return ((this._keyManagementParameters = e), this);
  }
  setProtectedHeader(e) {
    if (this._protectedHeader) throw TypeError("setProtectedHeader can only be called once");
    return ((this._protectedHeader = e), this);
  }
  setSharedUnprotectedHeader(e) {
    if (this._sharedUnprotectedHeader) throw TypeError("setSharedUnprotectedHeader can only be called once");
    return ((this._sharedUnprotectedHeader = e), this);
  }
  setUnprotectedHeader(e) {
    if (this._unprotectedHeader) throw TypeError("setUnprotectedHeader can only be called once");
    return ((this._unprotectedHeader = e), this);
  }
  setAdditionalAuthenticatedData(e) {
    return ((this._aad = e), this);
  }
  setContentEncryptionKey(e) {
    if (this._cek) throw TypeError("setContentEncryptionKey can only be called once");
    return ((this._cek = e), this);
  }
  setInitializationVector(e) {
    if (this._iv) throw TypeError("setInitializationVector can only be called once");
    return ((this._iv = e), this);
  }
  async encrypt(e, t) {
    if (!this._protectedHeader && !this._unprotectedHeader && !this._sharedUnprotectedHeader)
      throw new s(
        "either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()",
      );
    if (!G(this._protectedHeader, this._unprotectedHeader, this._sharedUnprotectedHeader))
      throw new s(
        "JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint",
      );
    let r = { ...this._protectedHeader, ...this._unprotectedHeader, ...this._sharedUnprotectedHeader };
    if (
      (X(s, new Map(), t === null || t === void 0 ? void 0 : t.crit, this._protectedHeader, r),
      r.zip !== void 0)
    ) {
      if (!this._protectedHeader || !this._protectedHeader.zip)
        throw new s('JWE "zip" (Compression Algorithm) Header MUST be integrity protected');
      if (r.zip !== "DEF")
        throw new f('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value');
    }
    let { alg: alg, enc: enc } = r;
    if (typeof alg !== "string" || !alg)
      throw new s('JWE "alg" (Algorithm) Header Parameter missing or invalid');
    if (typeof enc !== "string" || !enc)
      throw new s('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
    let a;
    if (alg === "dir") {
      if (this._cek) throw TypeError("setContentEncryptionKey cannot be called when using Direct Encryption");
    } else if (alg === "ECDH-ES") {
      if (this._cek)
        throw TypeError("setContentEncryptionKey cannot be called when using Direct Key Agreement");
    }
    let i;
    {
      let H;
      if (
        (({
          cek: i,
          encryptedKey: a,
          parameters: H,
        } = await zt(alg, enc, e, this._cek, this._keyManagementParameters)),
        H)
      )
        if (t && Gr in t)
          if (!this._unprotectedHeader) this.setUnprotectedHeader(H);
          else this._unprotectedHeader = { ...this._unprotectedHeader, ...H };
        else if (!this._protectedHeader) this.setProtectedHeader(H);
        else this._protectedHeader = { ...this._protectedHeader, ...H };
    }
    this._iv || (this._iv = Se(enc));
    let c, d, u;
    if (this._protectedHeader) d = l.encode(w(JSON.stringify(this._protectedHeader)));
    else d = l.encode("");
    if (this._aad) ((u = w(this._aad)), (c = _(d, l.encode("."), l.encode(u))));
    else c = d;
    let h, I;
    if (r.zip === "DEF") {
      let H = await ((t === null || t === void 0 ? void 0 : t.deflateRaw) || St)(this._plaintext);
      ({ ciphertext: h, tag: I } = await ce(enc, H, i, this._iv, c));
    } else ({ ciphertext: h, tag: I } = await ce(enc, this._plaintext, i, this._iv, c));
    let b = { ciphertext: w(h), iv: w(this._iv), tag: w(I) };
    if (a) b.encrypted_key = w(a);
    if (u) b.aad = u;
    if (this._protectedHeader) b.protected = C.decode(d);
    if (this._sharedUnprotectedHeader) b.unprotected = this._sharedUnprotectedHeader;
    if (this._unprotectedHeader) b.header = this._unprotectedHeader;
    return b;
  }
}

export { Xt, at };
