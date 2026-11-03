/**
 * jose/dist/webapi/lib/crypto_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */

//@ chunk-5h78gfwc.js:2140-2268 esm-fingerprint
var P = (e, t = "algorithm.name") =>
    TypeError(`CryptoKey does not support this operation, its ${t} must be ${e}`),
  T = (e, t) => e.name === t;
//@ chunk-5h78gfwc.js:2268-2319 esm-layout
function Ot(e) {
  return parseInt(e.name.slice(4), 10);
}
//@ chunk-5h78gfwc.js:2319-2391 esm-fingerprint
function he(e, t) {
  if (Ot(e.hash) !== t) throw P(`SHA-${t}`, "algorithm.hash");
}
//@ chunk-5h78gfwc.js:2391-2530 esm-fingerprint
function Mt(e) {
  switch (e) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw Error("unreachable");
  }
}
//@ chunk-5h78gfwc.js:2530-2667 esm-fingerprint
function Ne(e, t) {
  if (t && !e.usages.includes(t))
    throw TypeError(`CryptoKey does not support this operation, its usages must include ${t}.`);
}
//@ chunk-5h78gfwc.js:2667-3511 esm-fingerprint
function Be(e, t, r) {
  switch (t) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!T(e.algorithm, "HMAC")) throw P("HMAC");
      he(e.algorithm, parseInt(t.slice(2), 10));
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!T(e.algorithm, "RSASSA-PKCS1-v1_5")) throw P("RSASSA-PKCS1-v1_5");
      he(e.algorithm, parseInt(t.slice(2), 10));
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!T(e.algorithm, "RSA-PSS")) throw P("RSA-PSS");
      he(e.algorithm, parseInt(t.slice(2), 10));
      break;
    }
    case "Ed25519":
    case "EdDSA": {
      if (!T(e.algorithm, "Ed25519")) throw P("Ed25519");
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      if (!T(e.algorithm, t)) throw P(t);
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!T(e.algorithm, "ECDSA")) throw P("ECDSA");
      let n = Mt(t);
      if (e.algorithm.namedCurve !== n) throw P(n, "algorithm.namedCurve");
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  Ne(e, r);
}
//@ chunk-5h78gfwc.js:3511-4387 esm-fingerprint
function H(e, t, r) {
  switch (t) {
    case "A128GCM":
    case "A192GCM":
    case "A256GCM": {
      if (!T(e.algorithm, "AES-GCM")) throw P("AES-GCM");
      let n = parseInt(t.slice(1, 4), 10);
      if (e.algorithm.length !== n) throw P(n, "algorithm.length");
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (!T(e.algorithm, "AES-KW")) throw P("AES-KW");
      let n = parseInt(t.slice(1, 4), 10);
      if (e.algorithm.length !== n) throw P(n, "algorithm.length");
      break;
    }
    case "ECDH": {
      switch (e.algorithm.name) {
        case "ECDH":
        case "X25519":
          break;
        default:
          throw P("ECDH or X25519");
      }
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW":
      if (!T(e.algorithm, "PBKDF2")) throw P("PBKDF2");
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (!T(e.algorithm, "RSA-OAEP")) throw P("RSA-OAEP");
      he(e.algorithm, parseInt(t.slice(9), 10) || 1);
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  Ne(e, r);
}

export { H, Be };
