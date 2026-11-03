/**
 * jose/dist/webapi/lib/key_management.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2), chunk-5h78gfwc.js (14)
 * attribution: esm-layout 3, esm-fingerprint 13
 */
import { H } from "./crypto_key.js";
import { at } from "./pbes2kw.js";
import { y } from "../util/base64url.js";
import { f_2, c } from "../../node/esm/util/errors.js";
import { ie } from "./signing.js";
import { Se_5h78, ye, M_2, Ee, P, f } from "./content_encryption.js";
import { b } from "./type_checks.js";
import { X } from "./key.js";
import { Je, He } from "./ecdhes.js";
import { importJWK } from "../key/import.js";
import { I } from "./helpers.js";
import { R } from "./normalize_key.js";
import { At, gt } from "../../browser/lib/aesgcmkw.js";
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { v } from "../../browser/runtime/base64url.js";
import { Ce } from "../../browser/runtime/ecdhes.js";
import { Ct_2 } from "../../browser/runtime/pbes2kw.js";
import { W } from "./buffer_utils.js";
import { L } from "../../node/esm/lib/invalid_key_input.js";
import { O, M } from "../../browser/runtime/is_key_like.js";

//@ chunk-5h78gfwc.js:12131-12248 esm-fingerprint
function nt(e, t) {
  if (e.algorithm.length !== parseInt(t.slice(1, 4), 10)) throw TypeError(`Invalid key size for alg: ${t}`);
}
//@ chunk-5h78gfwc.js:12248-12368 esm-fingerprint
function it(e, t, r) {
  if (e instanceof Uint8Array) return crypto.subtle.importKey("raw", e, "AES-KW", !0, [r]);
  return (H(e, t, r), e);
}
//@ chunk-5h78gfwc.js:12368-12588 esm-fingerprint
async function re(e, t, r) {
  let n = await it(t, e, "wrapKey");
  nt(n, e);
  let importKey = await crypto.subtle.importKey("raw", r, { hash: "SHA-256", name: "HMAC" }, !0, ["sign"]);
  return new Uint8Array(await crypto.subtle.wrapKey("raw", importKey, n, "AES-KW"));
}
//@ chunk-5h78gfwc.js:12588-12812 esm-fingerprint
async function ne(e, t, r) {
  let n = await it(t, e, "unwrapKey");
  nt(n, e);
  let unwrapKey = await crypto.subtle.unwrapKey(
    "raw",
    r,
    n,
    "AES-KW",
    { hash: "SHA-256", name: "HMAC" },
    !0,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.exportKey("raw", unwrapKey));
}
//@ chunk-5h78gfwc.js:14141-14304 esm-fingerprint
async function st(e, t, r, n = 2048, i = crypto.getRandomValues(new Uint8Array(16))) {
  let o = await at(i, e, n, t);
  return { encryptedKey: await re(e.slice(-6), o, r), p2c: n, p2s: y(i) };
}
//@ chunk-5h78gfwc.js:14304-14384 esm-layout
async function ct(e, t, r, n, i) {
  let o = await at(i, e, n, t);
  return ne(e.slice(-6), o, r);
}
//@ chunk-5h78gfwc.js:15709-15914 esm-fingerprint
var ht = (e) => {
  switch (e) {
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      return "RSA-OAEP";
    default:
      throw new f_2(`alg ${e} is not supported either by JOSE or your javascript runtime`);
  }
};
//@ chunk-5h78gfwc.js:15914-16026 esm-fingerprint
async function mt(e, t, r) {
  return (H(t, e, "encrypt"), ie(e, t), new Uint8Array(await crypto.subtle.encrypt(ht(e), t, r)));
}
//@ chunk-5h78gfwc.js:16026-16138 esm-fingerprint
async function lt(e, t, r) {
  return (H(t, e, "decrypt"), ie(e, t), new Uint8Array(await crypto.subtle.decrypt(ht(e), t, r)));
}
//@ chunk-5h78gfwc.js:23984-24068 esm-layout
async function bt(e, t, r, n, i) {
  let sliced = e.slice(0, 7);
  return Se_5h78(sliced, t, r, n, i, new Uint8Array());
}
//@ chunk-5h78gfwc.js:24068-24135 esm-fingerprint
var Kt = 'Invalid or unsupported "alg" (JWE Algorithm) header value';
//@ chunk-5h78gfwc.js:24135-24205 esm-fingerprint
function se(e) {
  if (e === void 0) throw new c("JWE Encrypted Key missing");
}
//@ chunk-5h78gfwc.js:24205-26082 esm-fingerprint
async function xt(e, t, r, n, i) {
  switch (e) {
    case "dir": {
      if (r !== void 0) throw new c("Encountered unexpected JWE Encrypted Key");
      return t;
    }
    case "ECDH-ES":
      if (r !== void 0) throw new c("Encountered unexpected JWE Encrypted Key");
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if (!b(n.epk)) throw new c('JOSE Header "epk" (Ephemeral Public Key) missing or invalid');
      if ((X(t), !Je(t)))
        throw new f_2(
          "ECDH with the provided key is not allowed or not supported by your javascript runtime",
        );
      let o = await importJWK(n.epk, e);
      X(o);
      let a, s;
      if (n.apu !== void 0) {
        if (typeof n.apu !== "string") throw new c('JOSE Header "apu" (Agreement PartyUInfo) invalid');
        a = I(n.apu, "apu", c);
      }
      if (n.apv !== void 0) {
        if (typeof n.apv !== "string") throw new c('JOSE Header "apv" (Agreement PartyVInfo) invalid');
        s = I(n.apv, "apv", c);
      }
      let p = await He(
        o,
        t,
        e === "ECDH-ES" ? n.enc : e,
        e === "ECDH-ES" ? ye(n.enc) : parseInt(e.slice(-5, -2), 10),
        a,
        s,
      );
      if (e === "ECDH-ES") return p;
      return (se(r), ne(e.slice(-6), p, r));
    }
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      return (se(r), X(t), lt(e, t, r));
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      if ((se(r), typeof n.p2c !== "number"))
        throw new c('JOSE Header "p2c" (PBES2 Count) missing or invalid');
      let o = i?.maxPBES2Count || 1e4;
      if (n.p2c > o) throw new c('JOSE Header "p2c" (PBES2 Count) out is of acceptable bounds');
      if (typeof n.p2s !== "string") throw new c('JOSE Header "p2s" (PBES2 Salt) missing or invalid');
      let a;
      return ((a = I(n.p2s, "p2s", c)), ct(e, t, r, n.p2c, a));
    }
    case "A128KW":
    case "A192KW":
    case "A256KW":
      return (se(r), ne(e, t, r));
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      if ((se(r), typeof n.iv !== "string"))
        throw new c('JOSE Header "iv" (Initialization Vector) missing or invalid');
      if (typeof n.tag !== "string") throw new c('JOSE Header "tag" (Authentication Tag) missing or invalid');
      let o;
      o = I(n.iv, "iv", c);
      let a;
      return ((a = I(n.tag, "tag", c)), bt(e, t, r, o, a));
    }
    default:
      throw new f_2(Kt);
  }
}
//@ chunk-5h78gfwc.js:26082-27290 esm-fingerprint
async function Ct(e, t, r, n, i = {}) {
  let o, a, s;
  switch (e) {
    case "dir": {
      s = r;
      break;
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      if ((X(r), !Je(r)))
        throw new f_2(
          "ECDH with the provided key is not allowed or not supported by your javascript runtime",
        );
      let { apu: apu, apv: apv } = i,
        u;
      if (i.epk) u = await R(i.epk, e);
      else u = (await crypto.subtle.generateKey(r.algorithm, !0, ["deriveBits"])).privateKey;
      let { x: m, y: w, crv: crv, kty: kty } = await At(u),
        l = await He(
          r,
          u,
          e === "ECDH-ES" ? t : e,
          e === "ECDH-ES" ? ye(t) : parseInt(e.slice(-5, -2), 10),
          apu,
          apv,
        );
      if (((a = { epk: { x: m, crv: crv, kty: kty } }), kty === "EC")) a.epk.y = w;
      if (apu) a.apu = y(apu);
      if (apv) a.apv = y(apv);
      if (e === "ECDH-ES") {
        s = l;
        break;
      }
      s = n || M_2(t);
      let sliced = e.slice(-6);
      o = await re(sliced, l, s);
      break;
    }
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      ((s = n || M_2(t)), X(r), (o = await mt(e, r, s)));
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW": {
      s = n || M_2(t);
      let { p2c: p2c, p2s: p2s } = i;
      ({ encryptedKey: o, ...a } = await st(e, r, s, p2c, p2s));
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      ((s = n || M_2(t)), (o = await re(e, r, s)));
      break;
    }
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW": {
      s = n || M_2(t);
      let { iv: iv } = i;
      ({ encryptedKey: o, ...a } = await gt(e, r, s, iv));
      break;
    }
    default:
      throw new f_2(Kt);
  }
  return { cek: s, encryptedKey: o, parameters: a };
}
//@ chunk-2tyrgda4.js:12407-12463 esm-layout
var Xe = Xa(() => {
  Ee();
  v();
  P();
  Ce();
  Ct_2();
  W();
  L();
  O();
  M();
});
//@ chunk-2tyrgda4.js:12463-12669 esm-fingerprint
function te(e) {
  switch (e) {
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      return "RSA-OAEP";
    default:
      throw new f(`alg ${e} is not supported either by JOSE or your javascript runtime`);
  }
}

export { te, Xe, xt, Ct };
