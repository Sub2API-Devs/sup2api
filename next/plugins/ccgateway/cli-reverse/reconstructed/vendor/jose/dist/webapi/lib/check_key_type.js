/**
 * jose/dist/webapi/lib/check_key_type.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2)
 * attribution: esm-layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isJWK, isSecretJWK, isPrivateJWK, isPublicJWK } from "./type_checks.js";
import { isKeyLike } from "./key.js";
import { withAlg } from "../../node/esm/lib/invalid_key_input.js";

//@ chunk-0f6azspv.js:28225-30586 esm-layout
var tag_2 = (key) => key?.[Symbol.toStringTag];
var jwkMatchesOp = (alg, key, usage) => {
  if (key.use !== undefined) {
    let expected;
    switch (usage) {
      case "sign":
      case "verify":
        expected = "sig";
        break;
      case "encrypt":
      case "decrypt":
        expected = "enc";
        break;
    }
    if (key.use !== expected)
      throw TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
  }
  if (key.alg !== undefined && key.alg !== alg)
    throw TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  if (Array.isArray(key.key_ops)) {
    let expectedKeyOp;
    switch (true) {
      case usage === "sign" || usage === "verify":
      case alg === "dir":
      case alg.includes("CBC-HS"):
        expectedKeyOp = usage;
        break;
      case alg.startsWith("PBES2"):
        expectedKeyOp = "deriveBits";
        break;
      case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
        if (!alg.includes("GCM") && alg.endsWith("KW"))
          expectedKeyOp = usage === "encrypt" ? "wrapKey" : "unwrapKey";
        else expectedKeyOp = usage;
        break;
      case usage === "encrypt" && alg.startsWith("RSA"):
        expectedKeyOp = "wrapKey";
        break;
      case usage === "decrypt":
        expectedKeyOp = alg.startsWith("RSA") ? "unwrapKey" : "deriveBits";
        break;
    }
    if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false)
      throw TypeError(
        `Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`,
      );
  }
  return true;
};
var symmetricTypeCheck = (alg, key, usage) => {
  if (key instanceof Uint8Array) return;
  if (isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage)) return;
    throw TypeError(
      'JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present',
    );
  }
  if (!isKeyLike(key))
    throw TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array"));
  if (key.type !== "secret")
    throw TypeError(`${tag_2(key)} instances for symmetric algorithms must be of type "secret"`);
};
var asymmetricTypeCheck = (alg, key, usage) => {
  if (isJWK(key))
    switch (usage) {
      case "decrypt":
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw TypeError("JSON Web Key for this operation must be a private JWK");
      case "encrypt":
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw TypeError("JSON Web Key for this operation must be a public JWK");
    }
  if (!isKeyLike(key)) throw TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key"));
  if (key.type === "secret")
    throw TypeError(`${tag_2(key)} instances for asymmetric algorithms must not be of type "secret"`);
  if (key.type === "public")
    switch (usage) {
      case "sign":
        throw TypeError(`${tag_2(key)} instances for asymmetric algorithm signing must be of type "private"`);
      case "decrypt":
        throw TypeError(
          `${tag_2(key)} instances for asymmetric algorithm decryption must be of type "private"`,
        );
    }
  if (key.type === "private")
    switch (usage) {
      case "verify":
        throw TypeError(
          `${tag_2(key)} instances for asymmetric algorithm verifying must be of type "public"`,
        );
      case "encrypt":
        throw TypeError(
          `${tag_2(key)} instances for asymmetric algorithm encryption must be of type "public"`,
        );
    }
};
//@ chunk-0f6azspv.js:30586-30709 esm-layout
function checkKeyType(alg, key, usage) {
  switch (alg.substring(0, 2)) {
    case "A1":
    case "A2":
    case "di":
    case "HS":
    case "PB":
      symmetricTypeCheck(alg, key, usage);
      break;
    default:
      asymmetricTypeCheck(alg, key, usage);
  }
}
export { checkKeyType };
