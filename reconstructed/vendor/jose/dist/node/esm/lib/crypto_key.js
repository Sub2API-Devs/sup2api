/**
 * jose/dist/node/esm/lib/crypto_key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (8)
 * attribution: esm-layout 3, esm-fingerprint 5
 */
import { Xa } from "../../../../../../runtime/bun-runtime.js";
import { ut, Er } from "../../../browser/runtime/timing_safe_equal.js";

//@ chunk-2tyrgda4.js:4322-4345 esm-layout
var lt = Xa(() => {
  ut = Er;
});
//@ chunk-2tyrgda4.js:4345-4463 esm-fingerprint
function x(e, t = "algorithm.name") {
  return TypeError(`CryptoKey does not support this operation, its ${t} must be ${e}`);
}
//@ chunk-2tyrgda4.js:4463-4497 esm-layout
function B(e, t) {
  return e.name === t;
}
//@ chunk-2tyrgda4.js:4497-4548 esm-layout
function be(e) {
  return parseInt(e.name.slice(4), 10);
}
//@ chunk-2tyrgda4.js:4548-4687 esm-fingerprint
function Sr(e) {
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
//@ chunk-2tyrgda4.js:4687-4988 esm-fingerprint
function ht(e, t) {
  if (t.length && !t.some((r) => e.usages.includes(r))) {
    let r = "CryptoKey does not support this operation, its usages must include ";
    if (t.length > 2) {
      let o = t.pop();
      r += `one of ${t.join(", ")}, or ${o}.`;
    } else if (t.length === 2) r += `one of ${t[0]} or ${t[1]}.`;
    else r += `${t[0]}.`;
    throw TypeError(r);
  }
}
//@ chunk-2tyrgda4.js:4988-5939 esm-fingerprint
function yt(e, t, ...r) {
  switch (t) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!B(e.algorithm, "HMAC")) throw x("HMAC");
      let o = parseInt(t.slice(2), 10);
      if (be(e.algorithm.hash) !== o) throw x(`SHA-${o}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!B(e.algorithm, "RSASSA-PKCS1-v1_5")) throw x("RSASSA-PKCS1-v1_5");
      let o = parseInt(t.slice(2), 10);
      if (be(e.algorithm.hash) !== o) throw x(`SHA-${o}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!B(e.algorithm, "RSA-PSS")) throw x("RSA-PSS");
      let o = parseInt(t.slice(2), 10);
      if (be(e.algorithm.hash) !== o) throw x(`SHA-${o}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (e.algorithm.name !== "Ed25519" && e.algorithm.name !== "Ed448") throw x("Ed25519 or Ed448");
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!B(e.algorithm, "ECDSA")) throw x("ECDSA");
      let o = Sr(t);
      if (e.algorithm.namedCurve !== o) throw x(o, "algorithm.namedCurve");
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  ht(e, r);
}
//@ chunk-2tyrgda4.js:5939-6891 esm-fingerprint
function J(e, t, ...r) {
  switch (t) {
    case "A128GCM":
    case "A192GCM":
    case "A256GCM": {
      if (!B(e.algorithm, "AES-GCM")) throw x("AES-GCM");
      let o = parseInt(t.slice(1, 4), 10);
      if (e.algorithm.length !== o) throw x(o, "algorithm.length");
      break;
    }
    case "A128KW":
    case "A192KW":
    case "A256KW": {
      if (!B(e.algorithm, "AES-KW")) throw x("AES-KW");
      let o = parseInt(t.slice(1, 4), 10);
      if (e.algorithm.length !== o) throw x(o, "algorithm.length");
      break;
    }
    case "ECDH": {
      switch (e.algorithm.name) {
        case "ECDH":
        case "X25519":
        case "X448":
          break;
        default:
          throw x("ECDH, X25519, or X448");
      }
      break;
    }
    case "PBES2-HS256+A128KW":
    case "PBES2-HS384+A192KW":
    case "PBES2-HS512+A256KW":
      if (!B(e.algorithm, "PBKDF2")) throw x("PBKDF2");
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512": {
      if (!B(e.algorithm, "RSA-OAEP")) throw x("RSA-OAEP");
      let o = parseInt(t.slice(9), 10) || 1;
      if (be(e.algorithm.hash) !== o) throw x(`SHA-${o}`, "algorithm.hash");
      break;
    }
    default:
      throw TypeError("CryptoKey does not support this operation");
  }
  ht(e, r);
}

export { J, lt, yt };
