/**
 * jose/dist/webapi/lib/asn1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (4)
 * attribution: esm-fingerprint 4
 */
import { f_2 } from "../../node/esm/util/errors.js";
import { ue } from "./base64.js";

//@ chunk-5h78gfwc.js:20113-20373 esm-fingerprint
var ve = (e, t) => {
    if (e.byteLength !== t.length) return !1;
    for (let r = 0; r < e.byteLength; r++) if (e[r] !== t[r]) return !1;
    return !0;
  },
  tr = (e) => ({ data: e, pos: 0 }),
  oe = (e) => {
    let t = e.data[e.pos++];
    if (t & 128) {
      let r = t & 127,
        n = 0;
      for (let i = 0; i < r; i++) n = (n << 8) | e.data[e.pos++];
      return n;
    }
    return t;
  };
//@ chunk-5h78gfwc.js:20373-20566 esm-fingerprint
var ae = (e, t, r) => {
    if (e.data[e.pos++] !== t) throw Error(r);
  },
  wt = (e, t) => {
    let chunk = e.data.subarray(e.pos, e.pos + t);
    return ((e.pos += t), chunk);
  },
  rr = (e) => {
    ae(e, 6, "Expected algorithm OID");
    let t = oe(e);
    return wt(e, t);
  };
//@ chunk-5h78gfwc.js:20566-20769 esm-fingerprint
function nr(e) {
  (ae(e, 48, "Invalid PKCS#8 structure"), oe(e), ae(e, 2, "Expected version field"));
  let t = oe(e);
  ((e.pos += t), ae(e, 48, "Expected algorithm identifier"));
  let r = oe(e);
  return { algIdStart: e.pos, algIdLength: r };
}
//@ chunk-5h78gfwc.js:20769-22492 esm-fingerprint
var ir = (e) => {
    let t = rr(e);
    if (ve(t, [43, 101, 110])) return "X25519";
    if (!ve(t, [42, 134, 72, 206, 61, 2, 1])) throw Error("Unsupported key algorithm");
    ae(e, 6, "Expected curve OID");
    let r = oe(e),
      n = wt(e, r);
    for (let { name: i, oid: oid } of [
      { name: "P-256", oid: [42, 134, 72, 206, 61, 3, 1, 7] },
      { name: "P-384", oid: [43, 129, 4, 0, 34] },
      { name: "P-521", oid: [43, 129, 4, 0, 35] },
    ])
      if (ve(n, oid)) return i;
    throw Error("Unsupported named curve");
  },
  or = async (e, t, r, n) => {
    let i,
      o,
      a = e === "spki",
      s = () => (a ? ["verify"] : ["sign"]),
      p = () => (a ? ["encrypt", "wrapKey"] : ["decrypt", "unwrapKey"]);
    switch (r) {
      case "PS256":
      case "PS384":
      case "PS512":
        ((i = { name: "RSA-PSS", hash: `SHA-${r.slice(-3)}` }), (o = s()));
        break;
      case "RS256":
      case "RS384":
      case "RS512":
        ((i = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${r.slice(-3)}` }), (o = s()));
        break;
      case "RSA-OAEP":
      case "RSA-OAEP-256":
      case "RSA-OAEP-384":
      case "RSA-OAEP-512":
        ((i = { name: "RSA-OAEP", hash: `SHA-${parseInt(r.slice(-3), 10) || 1}` }), (o = p()));
        break;
      case "ES256":
      case "ES384":
      case "ES512": {
        ((i = { name: "ECDSA", namedCurve: { ES256: "P-256", ES384: "P-384", ES512: "P-521" }[r] }),
          (o = s()));
        break;
      }
      case "ECDH-ES":
      case "ECDH-ES+A128KW":
      case "ECDH-ES+A192KW":
      case "ECDH-ES+A256KW": {
        try {
          let namedCurve = n.getNamedCurve(t);
          i = namedCurve === "X25519" ? { name: "X25519" } : { name: "ECDH", namedCurve: namedCurve };
        } catch (error) {
          throw new f_2("Invalid or unsupported key format");
        }
        o = a ? [] : ["deriveBits"];
        break;
      }
      case "Ed25519":
      case "EdDSA":
        ((i = { name: "Ed25519" }), (o = s()));
        break;
      case "ML-DSA-44":
      case "ML-DSA-65":
      case "ML-DSA-87":
        ((i = { name: r }), (o = s()));
        break;
      default:
        throw new f_2('Invalid or unsupported "alg" (Algorithm) value');
    }
    return crypto.subtle.importKey(e, t, i, n?.extractable ?? (a ? !0 : !1), o);
  },
  ar = (e, t) => ue(e.replace(t, "")),
  St = (e, t, r) => {
    let n = ar(e, /(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g),
      i = r;
    if (t?.startsWith?.("ECDH-ES"))
      ((i ||= {}),
        (i.getNamedCurve = (o) => {
          let a = tr(o);
          return (nr(a), ir(a));
        }));
    return or("pkcs8", n, t, i);
  };

export { St };
