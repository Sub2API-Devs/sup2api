/**
 * jose/dist/browser/runtime/base64url.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-pd6th42n.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_buffer_utils_2 } from "../../webapi/lib/buffer_utils.js";

//@ chunk-pd6th42n.js:1175-1197 esm-layout
var encoder;
var decoder;
var UINT32_RANGE = 4294967296;
//@ chunk-pd6th42n.js:1197-1254 esm-layout
var init_base64url = __esm(() => {
  init_buffer_utils_2();
  encoder = new TextEncoder();
  decoder = new TextDecoder();
});
//@ chunk-pd6th42n.js:1254-1828 esm-fingerprint
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
var decode_2 = (input) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) encoded = decoder.decode(encoded);
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch (_a) {
    throw TypeError("The input to be decoded is not correctly encoded.");
  }
};
export { init_base64url, encode, decoder, decode_2, encoder, UINT32_RANGE };
