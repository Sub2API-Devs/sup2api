/**
 * oidc-token-hash/lib/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: oidc-token-hash@5.0.3..5.1.0
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_shake256 } from "./shake256.js";

//@ chunk-1hnjmk23.js:6010-7540 cjs-fingerprint
var require_oidc_token_hash = __commonJS(function (cjsExports, cjsModule) {
  var { strict: assert } = importMetaRequire("assert");
  var { createHash } = importMetaRequire("crypto");
  var { format } = importMetaRequire("util");
  var shake256 = require_shake256();
  var encode;
  if (Buffer.isEncoding("base64url")) encode = (input) => input.toString("base64url");
  else {
    let fromBase64 = (base64) => base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    encode = (input) => fromBase64(input.toString("base64"));
  }
  function getHash(alg, crv) {
    switch (alg) {
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
        switch (crv) {
          case "Ed25519":
            return createHash("sha512");
          case "Ed448":
            if (!shake256)
              throw TypeError("Ed448 *_hash calculation is not supported in your Node.js runtime version");
            return createHash("shake256", {
              outputLength: 114,
            });
          default:
            throw TypeError("unrecognized or invalid EdDSA curve provided");
        }
      default:
        throw TypeError("unrecognized or invalid JWS algorithm provided");
    }
  }
  function generate(token, alg, crv) {
    let digest = getHash(alg, crv).update(token).digest();
    return encode(digest.slice(0, digest.length / 2));
  }
  function validate(names, actual, source, alg, crv) {
    if (typeof names.claim !== "string" || !names.claim)
      throw TypeError("names.claim must be a non-empty string");
    if (typeof names.source !== "string" || !names.source)
      throw TypeError("names.source must be a non-empty string");
    assert(typeof actual === "string" && actual, `${names.claim} must be a non-empty string`);
    assert(typeof source === "string" && source, `${names.source} must be a non-empty string`);
    let expected;
    let msg;
    try {
      expected = generate(source, alg, crv);
    } catch (err) {
      msg = format("%s could not be validated (%s)", names.claim, err.message);
    }
    msg = msg || format("%s mismatch, expected %s, got: %s", names.claim, expected, actual);
    assert.equal(expected, actual, msg);
  }
  cjsModule.exports = {
    validate,
    generate,
  };
});
export { require_oidc_token_hash };
