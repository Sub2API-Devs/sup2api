/**
 * jose/dist/webapi/lib/signing.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (6), chunk-5h78gfwc.js (5)
 * attribution: esm-layout 3, esm-fingerprint 8
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { E } from "./content_encryption.js";
import { W, p } from "./buffer_utils.js";
import { L, U } from "../../node/esm/lib/invalid_key_input.js";
import { O, M } from "../../browser/runtime/is_key_like.js";
import { me } from "../../browser/runtime/get_sign_verify_key.js";
import { fe } from "../../browser/runtime/subtle_dsa.js";
import { Yt } from "../../node/esm/jwe/compact/encrypt.js";
import { f_2 } from "../../node/esm/util/errors.js";
import { Be } from "./crypto_key.js";

//@ chunk-2tyrgda4.js:12669-12690 esm-layout
var Wt = Xa(() => {
  E();
});
//@ chunk-2tyrgda4.js:12690-12890 esm-fingerprint
var q = (e, t) => {
  if (e.startsWith("RS") || e.startsWith("PS")) {
    let { modulusLength: modulusLength } = t.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048)
      throw TypeError(`${e} requires key modulusLength to be 2048 bits or larger`);
  }
};
//@ chunk-2tyrgda4.js:28098-28131 esm-layout
var rt = Xa(() => {
  W();
  L();
  O();
  M();
});
//@ chunk-2tyrgda4.js:28131-28280 esm-fingerprint
var Nr = async (e, t, r, o) => {
    let n = await me(e, t, "verify");
    q(e, n);
    let a = fe(e, n.algorithm);
    try {
      return await p.subtle.verify(a, n, r, o);
    } catch (error) {
      return !1;
    }
  },
  Nt;
//@ chunk-2tyrgda4.js:36693-36715 esm-layout
var Zt = Xa(() => {
  Yt();
});
//@ chunk-2tyrgda4.js:36715-36849 esm-fingerprint
var Fr = async (e, t, r) => {
    let o = await me(e, t, "sign");
    q(e, o);
    let sign = await p.subtle.sign(fe(e, o.algorithm), o, r);
    return new Uint8Array(sign);
  },
  Qt;
//@ chunk-5h78gfwc.js:14384-14586 esm-fingerprint
function ie(e, t) {
  if (e.startsWith("RS") || e.startsWith("PS")) {
    let { modulusLength: modulusLength } = t.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048)
      throw TypeError(`${e} requires key modulusLength to be 2048 bits or larger`);
  }
}
//@ chunk-5h78gfwc.js:14586-15176 esm-fingerprint
function pt(e, t) {
  let r = `SHA-${e.slice(-3)}`;
  switch (e) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash: r, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash: r, name: "RSA-PSS", saltLength: parseInt(e.slice(-3), 10) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash: r, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash: r, name: "ECDSA", namedCurve: t.namedCurve };
    case "Ed25519":
    case "EdDSA":
      return { name: "Ed25519" };
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      return { name: e };
    default:
      throw new f_2(`alg ${e} is not supported either by JOSE or your javascript runtime`);
  }
}
//@ chunk-5h78gfwc.js:15176-15419 esm-fingerprint
async function dt(e, t, r) {
  if (t instanceof Uint8Array) {
    if (!e.startsWith("HS")) throw TypeError(U(t, "CryptoKey", "KeyObject", "JSON Web Key"));
    return crypto.subtle.importKey("raw", t, { hash: `SHA-${e.slice(-3)}`, name: "HMAC" }, !1, [r]);
  }
  return (Be(t, e, r), t);
}
//@ chunk-5h78gfwc.js:15419-15558 esm-fingerprint
async function ft(e, t, r) {
  let n = await dt(e, t, "sign");
  ie(e, n);
  let sign = await crypto.subtle.sign(pt(e, n.algorithm), n, r);
  return new Uint8Array(sign);
}
//@ chunk-5h78gfwc.js:15558-15709 esm-fingerprint
async function ut(e, t, r, n) {
  let i = await dt(e, t, "verify");
  ie(e, i);
  let o = pt(e, i.algorithm);
  try {
    return await crypto.subtle.verify(o, i, r, n);
  } catch {
    return !1;
  }
}

export { ie, q, Wt, rt, Nt, Nr, Qt, Fr, Zt, ut, ft };
