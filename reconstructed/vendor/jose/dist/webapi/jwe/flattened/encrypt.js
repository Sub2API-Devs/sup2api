/**
 * jose/dist/webapi/jwe/flattened/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { W, Ze } from "../../lib/helpers.js";
import { c, f_2 } from "../../../node/esm/util/errors.js";
import { _ } from "../../lib/type_checks.js";
import { N } from "../../lib/options.js";
import { B } from "../../lib/check_key_type.js";
import { R } from "../../lib/normalize_key.js";
import { Ct } from "../../lib/key_management.js";
import { y } from "../../util/base64url.js";
import { A, E_2 } from "../../lib/buffer_utils.js";
import { Wt } from "../../lib/deflate.js";
import { we } from "../../lib/content_encryption.js";

//@ chunk-5h78gfwc.js:35279-37807 esm-fingerprint
class Re {
  #e;
  #t;
  #r;
  #n;
  #a;
  #o;
  #s;
  #i;
  constructor(e) {
    if (!(e instanceof Uint8Array)) throw TypeError("plaintext must be an instance of Uint8Array");
    this.#e = e;
  }
  setKeyManagementParameters(e) {
    return (W(this.#i, "setKeyManagementParameters"), (this.#i = e), this);
  }
  setProtectedHeader(e) {
    return (W(this.#t, "setProtectedHeader"), (this.#t = e), this);
  }
  setSharedUnprotectedHeader(e) {
    return (W(this.#r, "setSharedUnprotectedHeader"), (this.#r = e), this);
  }
  setUnprotectedHeader(e) {
    return (W(this.#n, "setUnprotectedHeader"), (this.#n = e), this);
  }
  setAdditionalAuthenticatedData(e) {
    return ((this.#a = e), this);
  }
  setContentEncryptionKey(e) {
    return (W(this.#o, "setContentEncryptionKey"), (this.#o = e), this);
  }
  setInitializationVector(e) {
    return (W(this.#s, "setInitializationVector"), (this.#s = e), this);
  }
  async encrypt(e, t) {
    if (!this.#t && !this.#n && !this.#r)
      throw new c(
        "either setProtectedHeader, setUnprotectedHeader, or sharedUnprotectedHeader must be called before #encrypt()",
      );
    if (!_(this.#t, this.#n, this.#r))
      throw new c(
        "JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint",
      );
    let r = { ...this.#t, ...this.#n, ...this.#r };
    if ((N(c, new Map(), t?.crit, this.#t, r), r.zip !== void 0 && r.zip !== "DEF"))
      throw new f_2('Unsupported JWE "zip" (Compression Algorithm) Header Parameter value.');
    if (r.zip !== void 0 && !this.#t?.zip)
      throw new c('JWE "zip" (Compression Algorithm) Header Parameter MUST be in a protected header.');
    let { alg: alg, enc: enc } = r;
    if (typeof alg !== "string" || !alg)
      throw new c('JWE "alg" (Algorithm) Header Parameter missing or invalid');
    if (typeof enc !== "string" || !enc)
      throw new c('JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid');
    let o;
    if (this.#o && (alg === "dir" || alg === "ECDH-ES"))
      throw TypeError(`setContentEncryptionKey cannot be called with JWE "alg" (Algorithm) Header ${alg}`);
    B(alg === "dir" ? enc : alg, e, "encrypt");
    let a;
    {
      let g,
        ge = await R(e, alg);
      if ((({ cek: a, encryptedKey: o, parameters: g } = await Ct(alg, enc, ge, this.#o, this.#i)), g))
        if (t && Ze in t)
          if (!this.#n) this.setUnprotectedHeader(g);
          else this.#n = { ...this.#n, ...g };
        else if (!this.#t) this.setProtectedHeader(g);
        else this.#t = { ...this.#t, ...g };
    }
    let s, p, d, u;
    if (this.#t) ((p = y(JSON.stringify(this.#t))), (d = A(p)));
    else ((p = ""), (d = new Uint8Array()));
    if (this.#a) {
      u = y(this.#a);
      let g = A(u);
      s = E_2(d, A("."), g);
    } else s = d;
    let m = this.#e;
    if (r.zip === "DEF")
      m = await Wt(m).catch((g) => {
        throw new c("Failed to compress plaintext", { cause: g });
      });
    let { ciphertext: ciphertext, tag: tag, iv: iv } = await we(enc, m, a, this.#s, s),
      l = { ciphertext: y(ciphertext) };
    if (iv) l.iv = y(iv);
    if (tag) l.tag = y(tag);
    if (o) l.encrypted_key = y(o);
    if (u) l.aad = u;
    if (this.#t) l.protected = p;
    if (this.#r) l.unprotected = this.#r;
    if (this.#n) l.header = this.#n;
    return l;
  }
}

export { Re };
