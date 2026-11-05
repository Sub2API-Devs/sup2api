/**
 * jose/dist/webapi/lib/key.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-0f6azspv.js:6960-7026 esm-fingerprint
function tag(key) {
  if (!isCryptoKey(key)) throw Error("CryptoKey instance expected");
}
//@ chunk-0f6azspv.js:7026-7205 esm-fingerprint
var isCryptoKey = (key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey") return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
};
var isKeyObject = (key) => key?.[Symbol.toStringTag] === "KeyObject";
var isKeyLike = (key) => isCryptoKey(key) || isKeyObject(key);
export { isCryptoKey, tag, isKeyObject, isKeyLike };
