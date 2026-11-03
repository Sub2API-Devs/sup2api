/**
 * jose/dist/node/esm/jws/flattened/verify.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { Xa } from "../../../../../../../runtime/bun-runtime.js";
import { init_get_sign_verify_key } from "../../../../browser/runtime/get_sign_verify_key.js";
import { init_buffer_utils } from "../../../../webapi/lib/buffer_utils.js";
import { He } from "../../../../browser/runtime/rsaes.js";
import { init_signing_2, Nt, Nr } from "../../../../webapi/lib/signing.js";
import { K, G } from "../../../../webapi/lib/validate.js";
import { y, Q, De } from "../../../../webapi/lib/content_encryption.js";
import { decode, C, l } from "../../../../browser/runtime/base64url.js";
import { X, validateAlgorithms_default } from "../../../../webapi/lib/options.js";
import { z } from "../../lib/check_key_type.js";
import { concat } from "../../lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:28280-28322 esm-layout
var init_verify = Xa(() => {
  init_get_sign_verify_key();
  init_buffer_utils();
  He();
  init_signing_2();
  Nt = Nr;
});
//@ chunk-2tyrgda4.js:28322-30438 esm-fingerprint
async function flattenedVerify(jws, key, options) {
  var _a;
  if (!K(jws)) throw new y("Flattened JWS must be an object");
  if (jws.protected === undefined && jws.header === undefined)
    throw new y('Flattened JWS must have either of the "protected" or "header" members');
  if (jws.protected !== undefined && typeof jws.protected !== "string")
    throw new y("JWS Protected Header incorrect type");
  if (jws.payload === undefined) throw new y("JWS Payload missing");
  if (typeof jws.signature !== "string") throw new y("JWS Signature missing or incorrect type");
  if (jws.header !== undefined && !K(jws.header)) throw new y("JWS Unprotected Header incorrect type");
  let parsedProt = {};
  if (jws.protected)
    try {
      let protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(C.decode(protectedHeader));
    } catch (error) {
      throw new y("JWS Protected Header is invalid");
    }
  if (!G(parsedProt, jws.header))
    throw new y("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  let joseHeader = {
    ...parsedProt,
    ...jws.header,
  };
  let extensions = X(
    y,
    new Map([["b64", true]]),
    options === null || options === undefined ? undefined : options.crit,
    parsedProt,
    joseHeader,
  );
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean")
      throw new y('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
  }
  let { alg } = joseHeader;
  if (typeof alg !== "string" || !alg)
    throw new y('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  let algorithms = options && validateAlgorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) throw new Q('"alg" (Algorithm) Header Parameter not allowed');
  if (b64) {
    if (typeof jws.payload !== "string") throw new y("JWS Payload must be a string");
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array))
    throw new y("JWS Payload must be a string or an Uint8Array instance");
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  z(alg, key, "verify");
  let I = concat(
    l.encode((_a = jws.protected) !== null && _a !== undefined ? _a : ""),
    l.encode("."),
    typeof jws.payload === "string" ? l.encode(jws.payload) : jws.payload,
  );
  let signature;
  try {
    signature = decode(jws.signature);
  } catch (error) {
    throw new y("Failed to base64url decode the signature");
  }
  if (!(await Nt(alg, key, signature, I))) throw new De();
  let payload;
  if (b64)
    try {
      payload = decode(jws.payload);
    } catch (error) {
      throw new y("Failed to base64url decode the payload");
    }
  else if (typeof jws.payload === "string") payload = l.encode(jws.payload);
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
export { init_verify, flattenedVerify };
