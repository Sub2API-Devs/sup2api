/**
 * jose/dist/webapi/jws/flattened/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { isObject, isDisjoint } from "../../lib/type_checks.js";
import {
  JWSInvalid,
  JOSEAlgNotAllowed,
  JWSSignatureVerificationFailed,
} from "../../../node/esm/util/errors.js";
import { decode_2 } from "../../util/base64url.js";
import { textDecoder, concat, encode, textEncoder } from "../../lib/buffer_utils.js";
import { N, validateAlgorithms_2 } from "../../lib/options.js";
import { checkKeyType } from "../../lib/check_key_type.js";
import { decodeBase64url } from "../../lib/helpers.js";
import { normalizeKey } from "../../lib/normalize_key.js";
import { verify } from "../../lib/signing.js";

//@ chunk-5h78gfwc.js:37807-39805 esm-fingerprint
async function flattenedVerify_2(jws, key, options) {
  if (!isObject(jws)) throw new JWSInvalid("Flattened JWS must be an object");
  if (jws.protected === undefined && jws.header === undefined)
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  if (jws.protected !== undefined && typeof jws.protected !== "string")
    throw new JWSInvalid("JWS Protected Header incorrect type");
  if (jws.payload === undefined) throw new JWSInvalid("JWS Payload missing");
  if (typeof jws.signature !== "string") throw new JWSInvalid("JWS Signature missing or incorrect type");
  if (jws.header !== undefined && !isObject(jws.header))
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  let parsedProt = {};
  if (jws.protected)
    try {
      let protectedHeader = decode_2(jws.protected);
      parsedProt = JSON.parse(textDecoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  if (!isDisjoint(parsedProt, jws.header))
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  let joseHeader = {
    ...parsedProt,
    ...jws.header,
  };
  let extensions = N(JWSInvalid, new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean")
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
  }
  let { alg } = joseHeader;
  if (typeof alg !== "string" || !alg)
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  let algorithms = options && validateAlgorithms_2("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  if (b64) {
    if (typeof jws.payload !== "string") throw new JWSInvalid("JWS Payload must be a string");
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array))
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  checkKeyType(alg, key, "verify");
  let u = concat(
    jws.protected !== undefined ? encode(jws.protected) : new Uint8Array(),
    encode("."),
    typeof jws.payload === "string"
      ? b64
        ? encode(jws.payload)
        : textEncoder.encode(jws.payload)
      : jws.payload,
  );
  let signature = decodeBase64url(jws.signature, "signature", JWSInvalid);
  let k = await normalizeKey(key, alg);
  if (!(await verify(alg, k, signature, u))) throw new JWSSignatureVerificationFailed();
  let payload;
  if (b64) payload = decodeBase64url(jws.payload, "payload", JWSInvalid);
  else if (typeof jws.payload === "string") payload = textEncoder.encode(jws.payload);
  else payload = jws.payload;
  let result = {
    payload,
  };
  if (jws.protected !== undefined) result.protectedHeader = parsedProt;
  if (jws.header !== undefined) result.unprotectedHeader = jws.header;
  if (resolvedKey)
    return {
      ...result,
      key: k,
    };
  return result;
}
export { flattenedVerify_2 };
