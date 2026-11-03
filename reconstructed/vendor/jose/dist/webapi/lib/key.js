/**
 * jose/dist/webapi/lib/key.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-5h78gfwc.js:6960-7026 esm-fingerprint
function tag(key) {
  if (!isCryptoKey(key)) throw Error("CryptoKey instance expected");
}
//@ chunk-5h78gfwc.js:7026-7205 esm-fingerprint
var isCryptoKey = (key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey") return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
};
var isKeyObject = (key) => key?.[Symbol.toStringTag] === "KeyObject";
var We = (key) => isCryptoKey(key) || isKeyObject(key);
export { isCryptoKey, tag, isKeyObject, We };
