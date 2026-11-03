/**
 * jose/dist/webapi/lib/normalize_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-fingerprint 2
 */
import { Y } from "./jwk_to_key.js";
import { D, ee } from "./key.js";
import { te } from "./type_checks.js";
import { v_2 } from "../util/base64url.js";

//@ chunk-5h78gfwc.js:17878-19745 esm-fingerprint
var q = "given KeyObject instance cannot be used for this algorithm",
  Q,
  yt = async (e, t, r, n = !1) => {
    Q ||= new WeakMap();
    let i = Q.get(e);
    if (i?.[r]) return i[r];
    let o = await Y({ ...t, alg: r });
    if (n) Object.freeze(e);
    if (!i) Q.set(e, { [r]: o });
    else i[r] = o;
    return o;
  },
  er = (e, t) => {
    Q ||= new WeakMap();
    let r = Q.get(e);
    if (r?.[t]) return r[t];
    let n = e.type === "public",
      i = n ? !0 : !1,
      o;
    if (e.asymmetricKeyType === "x25519") {
      switch (t) {
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          break;
        default:
          throw TypeError(q);
      }
      o = e.toCryptoKey(e.asymmetricKeyType, i, n ? [] : ["deriveBits"]);
    }
    if (e.asymmetricKeyType === "ed25519") {
      if (t !== "EdDSA" && t !== "Ed25519") throw TypeError(q);
      o = e.toCryptoKey(e.asymmetricKeyType, i, [n ? "verify" : "sign"]);
    }
    switch (e.asymmetricKeyType) {
      case "ml-dsa-44":
      case "ml-dsa-65":
      case "ml-dsa-87": {
        if (t !== e.asymmetricKeyType.toUpperCase()) throw TypeError(q);
        o = e.toCryptoKey(e.asymmetricKeyType, i, [n ? "verify" : "sign"]);
      }
    }
    if (e.asymmetricKeyType === "rsa") {
      let a;
      switch (t) {
        case "RSA-OAEP":
          a = "SHA-1";
          break;
        case "RS256":
        case "PS256":
        case "RSA-OAEP-256":
          a = "SHA-256";
          break;
        case "RS384":
        case "PS384":
        case "RSA-OAEP-384":
          a = "SHA-384";
          break;
        case "RS512":
        case "PS512":
        case "RSA-OAEP-512":
          a = "SHA-512";
          break;
        default:
          throw TypeError(q);
      }
      if (t.startsWith("RSA-OAEP"))
        return e.toCryptoKey({ name: "RSA-OAEP", hash: a }, i, n ? ["encrypt"] : ["decrypt"]);
      o = e.toCryptoKey({ name: t.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: a }, i, [
        n ? "verify" : "sign",
      ]);
    }
    if (e.asymmetricKeyType === "ec") {
      let s = new Map([
        ["prime256v1", "P-256"],
        ["secp384r1", "P-384"],
        ["secp521r1", "P-521"],
      ]).get(e.asymmetricKeyDetails?.namedCurve);
      if (!s) throw TypeError(q);
      let p = { ES256: "P-256", ES384: "P-384", ES512: "P-521" };
      if (p[t] && s === p[t]) o = e.toCryptoKey({ name: "ECDSA", namedCurve: s }, i, [n ? "verify" : "sign"]);
      if (t.startsWith("ECDH-ES"))
        o = e.toCryptoKey({ name: "ECDH", namedCurve: s }, i, n ? [] : ["deriveBits"]);
    }
    if (!o) throw TypeError(q);
    if (!r) Q.set(e, { [t]: o });
    else r[t] = o;
    return o;
  };
//@ chunk-5h78gfwc.js:19745-20113 esm-fingerprint
async function R(e, t) {
  if (e instanceof Uint8Array) return e;
  if (D(e)) return e;
  if (ee(e)) {
    if (e.type === "secret") return e.export();
    if ("toCryptoKey" in e && typeof e.toCryptoKey === "function")
      try {
        return er(e, t);
      } catch (error) {
        if (error instanceof TypeError) throw error;
      }
    let r = e.export({ format: "jwk" });
    return yt(e, r, t);
  }
  if (te(e)) {
    if (e.k) return v_2(e.k);
    return yt(e, e, t, !0);
  }
  throw Error("unreachable");
}

export { R };
