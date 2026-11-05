/**
 * jose/dist/node/esm/jws/flattened/verify.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (1)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { isPlainObject, validateCrit } from "../../../../webapi/lib/validate.js";
import {
  JWSInvalid_2,
  JOSEAlgNotAllowed,
  JWSSignatureVerificationFailed,
} from "../../../../webapi/lib/content_encryption.js";
import { decode_2, decoder, encoder } from "../../../../browser/runtime/base64url.js";
import { validateCritInit, validateAlgorithms_default } from "../../../../webapi/lib/options.js";
import { checkKeyTypeInit } from "../../lib/check_key_type.js";
import { concat } from "../../lib/buffer_utils.js";
import { verifyInit } from "../../../../webapi/lib/signing.js";

//@ chunk-pd6th42n.js:28322-30438 esm-fingerprint
async function flattenedVerify_2(jws, key, options) {
  var _a;
  if (!isPlainObject(jws)) throw new JWSInvalid_2("Flattened JWS must be an object");
  if (jws.protected === undefined && jws.header === undefined)
    throw new JWSInvalid_2('Flattened JWS must have either of the "protected" or "header" members');
  if (jws.protected !== undefined && typeof jws.protected !== "string")
    throw new JWSInvalid_2("JWS Protected Header incorrect type");
  if (jws.payload === undefined) throw new JWSInvalid_2("JWS Payload missing");
  if (typeof jws.signature !== "string") throw new JWSInvalid_2("JWS Signature missing or incorrect type");
  if (jws.header !== undefined && !isPlainObject(jws.header))
    throw new JWSInvalid_2("JWS Unprotected Header incorrect type");
  let parsedProt = {};
  if (jws.protected)
    try {
      let protectedHeader = decode_2(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch (error) {
      throw new JWSInvalid_2("JWS Protected Header is invalid");
    }
  if (!validateCrit(parsedProt, jws.header))
    throw new JWSInvalid_2("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  let joseHeader = {
    ...parsedProt,
    ...jws.header,
  };
  let extensions = validateCritInit(
    JWSInvalid_2,
    new Map([["b64", true]]),
    options === null || options === undefined ? undefined : options.crit,
    parsedProt,
    joseHeader,
  );
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean")
      throw new JWSInvalid_2('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
  }
  let { alg } = joseHeader;
  if (typeof alg !== "string" || !alg)
    throw new JWSInvalid_2('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  let algorithms = options && validateAlgorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter not allowed');
  if (b64) {
    if (typeof jws.payload !== "string") throw new JWSInvalid_2("JWS Payload must be a string");
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array))
    throw new JWSInvalid_2("JWS Payload must be a string or an Uint8Array instance");
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  checkKeyTypeInit(alg, key, "verify");
  let signingInput = concat(
    encoder.encode((_a = jws.protected) !== null && _a !== undefined ? _a : ""),
    encoder.encode("."),
    typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload,
  );
  let signature;
  try {
    signature = decode_2(jws.signature);
  } catch (error) {
    throw new JWSInvalid_2("Failed to base64url decode the signature");
  }
  if (!(await verifyInit(alg, key, signature, signingInput))) throw new JWSSignatureVerificationFailed();
  let payload;
  if (b64)
    try {
      payload = decode_2(jws.payload);
    } catch (error) {
      throw new JWSInvalid_2("Failed to base64url decode the payload");
    }
  else if (typeof jws.payload === "string") payload = encoder.encode(jws.payload);
  else payload = jws.payload;
  let result = {
    payload,
  };
  if (jws.protected !== undefined) result.protectedHeader = parsedProt;
  if (jws.header !== undefined) result.unprotectedHeader = jws.header;
  if (resolvedKey)
    return {
      ...result,
      key,
    };
  return result;
}
export { flattenedVerify_2 };
