/**
 * jose/dist/webapi/util/base64url.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { textDecoder, textEncoder } from "../lib/buffer_utils.js";
import { decodeBase64, encodeBase64 } from "../lib/base64.js";

//@ chunk-0f6azspv.js:1615-1923 esm-fingerprint
function decode(input) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(typeof input === "string" ? input : textDecoder.decode(input), {
      alphabet: "base64url",
    });
  let encoded = input;
  if (encoded instanceof Uint8Array) encoded = textDecoder.decode(encoded);
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeBase64(encoded);
  } catch {
    throw TypeError("The input to be decoded is not correctly encoded.");
  }
}
//@ chunk-0f6azspv.js:1923-2140 esm-fingerprint
function encode_2(input) {
  let unencoded = input;
  if (typeof unencoded === "string") unencoded = textEncoder.encode(unencoded);
  if (Uint8Array.prototype.toBase64)
    return unencoded.toBase64({
      alphabet: "base64url",
      omitPadding: true,
    });
  return encodeBase64(unencoded).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
export { decode, encode_2 };
