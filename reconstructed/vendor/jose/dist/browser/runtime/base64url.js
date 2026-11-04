/**
 * jose/dist/browser/runtime/base64url.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_buffer_utils_2 } from "../../webapi/lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:1175-1197 esm-layout
var encoder;
var decoder;
var UINT32_RANGE = 4294967296;
//@ chunk-2tyrgda4.js:1197-1254 esm-layout
var init_base64url = __esm(() => {
  init_buffer_utils_2();
  encoder = new TextEncoder();
  decoder = new TextDecoder();
});
//@ chunk-2tyrgda4.js:1254-1828 esm-fingerprint
var encodeBase64 = (input) => {
  let unencoded = input;
  if (typeof unencoded === "string") unencoded = encoder.encode(unencoded);
  let CHUNK_SIZE = 32768;
  let arr = [];
  for (let i = 0; i < unencoded.length; i += CHUNK_SIZE)
    arr.push(String.fromCharCode.apply(null, unencoded.subarray(i, i + CHUNK_SIZE)));
  return btoa(arr.join(""));
};
var encode = (input) => encodeBase64(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
var decodeBase64 = (encoded) => {
  let binary = atob(encoded);
  let bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};
var decode = (input) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) encoded = decoder.decode(encoded);
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch (_a) {
    throw TypeError("The input to be decoded is not correctly encoded.");
  }
};
export { encoder, UINT32_RANGE, init_base64url, encode, decode, decoder };
