/**
 * oidc-token-hash/lib/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: oidc-token-hash@5.0.3..5.1.0
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { gO } from "./shake256.js";

//@ chunk-1ny7cxrt.js:5641-7171 cjs-fingerprint
var vO = x(function (Ive, bO) {
  var { strict: strict } = importMetaRequire("assert"),
    { createHash: createHash } = importMetaRequire("crypto"),
    { format: format } = importMetaRequire("util"),
    nF = gO(),
    ny;
  if (Buffer.isEncoding("base64url")) ny = (e) => e.toString("base64url");
  else {
    let e = (t) => t.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    ny = (t) => e(t.toString("base64"));
  }
  function rF(e, t) {
    switch (e) {
      case "HS256":
      case "RS256":
      case "PS256":
      case "ES256":
      case "ES256K":
        return createHash("sha256");
      case "HS384":
      case "RS384":
      case "PS384":
      case "ES384":
        return createHash("sha384");
      case "HS512":
      case "RS512":
      case "PS512":
      case "ES512":
        return createHash("sha512");
      case "EdDSA":
        switch (t) {
          case "Ed25519":
            return createHash("sha512");
          case "Ed448":
            if (!nF)
              throw TypeError("Ed448 *_hash calculation is not supported in your Node.js runtime version");
            return createHash("shake256", { outputLength: 114 });
          default:
            throw TypeError("unrecognized or invalid EdDSA curve provided");
        }
      default:
        throw TypeError("unrecognized or invalid JWS algorithm provided");
    }
  }
  function _O(e, t, n) {
    let digest = rF(t, n).update(e).digest();
    return ny(digest.slice(0, digest.length / 2));
  }
  function iF(e, t, n, o, r) {
    if (typeof e.claim !== "string" || !e.claim) throw TypeError("names.claim must be a non-empty string");
    if (typeof e.source !== "string" || !e.source) throw TypeError("names.source must be a non-empty string");
    (strict(typeof t === "string" && t, `${e.claim} must be a non-empty string`),
      strict(typeof n === "string" && n, `${e.source} must be a non-empty string`));
    let s, a;
    try {
      s = _O(n, o, r);
    } catch (error) {
      a = format("%s could not be validated (%s)", e.claim, error.message);
    }
    ((a = a || format("%s mismatch, expected %s, got: %s", e.claim, s, t)), strict.equal(s, t, a));
  }
  bO.exports = { validate: iF, generate: _O };
});

export { vO };
