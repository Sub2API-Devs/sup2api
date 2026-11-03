/**
 * utils/claudeInChrome/localPairing/encoding.ts
 *
 * 2.1.316 新增：本地配对的编码与密码学辅助（base64url、ECDH、SHA-256）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p7xf186d.js (25)
 * attribution: placement 25
 */
import { LOOPBACK_HOSTS, malformedError } from "./pairingErrors.js";

//@ chunk-p7xf186d.js:6058-6487 placement
function normalizeApiOrigin(e, t = !1) {
  let n;
  try {
    n = new URL(e);
  } catch {
    throw TypeError(`pairing apiOrigin is not a URL: ${e}`);
  }
  if (
    !(n.protocol === "https:" || (t && n.protocol === "http:" && LOOPBACK_HOSTS.has(n.hostname))) ||
    n.username ||
    n.password ||
    (n.pathname !== "/" && n.pathname !== "") ||
    n.search ||
    n.hash
  )
    throw TypeError(`pairing apiOrigin must be a bare https origin: ${e}`);
  let i = `${n.origin}/api/oauth/local_pairing`;
  return { issuer: i, attest: `${i}/attest`, jwks: `${i}/jwks.json` };
}
//@ chunk-p7xf186d.js:6487-6577 placement
var PAIRING_PROTOCOL = "claude-local-pairing/v1",
  textEncoder = new TextEncoder(),
  textDecoder = new TextDecoder("utf-8", { fatal: !0 });
//@ chunk-p7xf186d.js:6577-6611 placement
function utf8Encode(e) {
  return textEncoder.encode(e);
}
//@ chunk-p7xf186d.js:6611-6645 placement
function utf8Decode(e) {
  return textDecoder.decode(e);
}
//@ chunk-p7xf186d.js:6645-6674 placement
function concatBytesArgs(...e) {
  return concatBytes(e);
}
//@ chunk-p7xf186d.js:6674-6798 placement
function concatBytes(e) {
  let t = 0;
  for (let i of e) t += i.length;
  let uint8Array = new Uint8Array(t),
    r = 0;
  for (let i of e) (uint8Array.set(i, r), (r += i.length));
  return uint8Array;
}
//@ chunk-p7xf186d.js:6798-6942 placement
function lengthPrefixed(e) {
  let t = typeof e === "string" ? utf8Encode(e) : e,
    uint8Array = new Uint8Array(4 + t.length);
  return (new DataView(uint8Array.buffer).setUint32(0, t.length, !1), uint8Array.set(t, 4), uint8Array);
}
//@ chunk-p7xf186d.js:6942-7014 placement
function isNonNegativeSafeInt(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0;
}
//@ chunk-p7xf186d.js:7014-7181 placement
function u64be(e) {
  if (!isNonNegativeSafeInt(e)) throw RangeError("u64be: not a non-negative safe integer");
  let uint8Array = new Uint8Array(8);
  return (new DataView(uint8Array.buffer).setBigUint64(0, BigInt(e), !1), uint8Array);
}
//@ chunk-p7xf186d.js:7181-7277 placement
var ht = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  gt = /^[A-Za-z0-9_-]*$/;
//@ chunk-p7xf186d.js:7277-7650 placement
function base64UrlDecode(e) {
  let t = e.length % 4;
  if (!gt.test(e) || t === 1) throw SyntaxError("not unpadded base64url");
  if (t !== 0) {
    if ((ht.indexOf(e.charAt(e.length - 1)) & (t === 2 ? 15 : 3)) !== 0)
      throw SyntaxError("non-canonical base64url");
  }
  let n = e.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((e.length + 3) % 4),
    r = atob(n),
    uint8Array = new Uint8Array(r.length);
  for (let s = 0; s < r.length; s++) uint8Array[s] = r.charCodeAt(s);
  return uint8Array;
}
//@ chunk-p7xf186d.js:7650-7833 placement
function bytesToBinaryString(e) {
  let t = "";
  for (let n = 0; n < e.length; n += 32768) t += String.fromCharCode.apply(null, e.subarray(n, n + 32768));
  return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
//@ chunk-p7xf186d.js:7833-7953 placement
function constantTimeEqual(e, t) {
  if (e.length !== t.length) return !1;
  let n = 0;
  for (let r = 0; r < e.length; r++) n |= (e[r] ?? 0) ^ (t[r] ?? 0);
  return n === 0;
}
//@ chunk-p7xf186d.js:7953-8038 placement
function randomBytes(e) {
  let uint8Array = new Uint8Array(e);
  return (globalThis.crypto.getRandomValues(uint8Array), uint8Array);
}
//@ chunk-p7xf186d.js:8038-8114 placement
function toArrayBuffer(e) {
  return e.buffer.slice(e.byteOffset, e.byteOffset + e.byteLength);
}
//@ chunk-p7xf186d.js:8114-8211 placement
async function sha256(e) {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", toArrayBuffer(e)));
}
//@ chunk-p7xf186d.js:8211-8221 placement
var mt = 87;
//@ chunk-p7xf186d.js:8221-8479 placement
function parsePublicKey(e) {
  if (typeof e !== "string" || e.length !== mt) throw malformedError("public_key must be 87 base64url chars");
  let t;
  try {
    t = base64UrlDecode(e);
  } catch {
    throw malformedError("public_key is not base64url");
  }
  if (t.length !== 65 || t[0] !== 4) throw malformedError("public_key must be an uncompressed P-256 point");
  return t;
}
//@ chunk-p7xf186d.js:8479-8600 placement
function p256PointToJwkJson(e) {
  let t = bytesToBinaryString(e.subarray(1, 33)),
    n = bytesToBinaryString(e.subarray(33, 65));
  return `{"crv":"P-256","kty":"EC","x":"${t}","y":"${n}"}`;
}
//@ chunk-p7xf186d.js:8600-8648 placement
async function sha256Base64Url(e) {
  return bytesToBinaryString(await sha256(utf8Encode(p256PointToJwkJson(e))));
}
//@ chunk-p7xf186d.js:8648-8825 placement
async function importEcdhPublicKey(e) {
  try {
    return await globalThis.crypto.subtle.importKey(
      "raw",
      toArrayBuffer(e),
      { name: "ECDH", namedCurve: "P-256" },
      !1,
      [],
    );
  } catch {
    throw malformedError("public_key is not a point on P-256");
  }
}
//@ chunk-p7xf186d.js:8825-8983 placement
async function importEcdhJwk(e, t) {
  return globalThis.crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: e, y: t, ext: !0 },
    { name: "ECDSA", namedCurve: "P-256" },
    !1,
    ["verify"],
  );
}
//@ chunk-p7xf186d.js:8983-9230 placement
async function generateEcdhKeyPair() {
  let generateKey = await globalThis.crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, !1, [
      "deriveBits",
    ]),
    uint8Array = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", generateKey.publicKey));
  return {
    keyPair: generateKey,
    publicKey: bytesToBinaryString(uint8Array),
    jkt: await sha256Base64Url(uint8Array),
  };
}
//@ chunk-p7xf186d.js:9230-9239 placement
var MAX_TAG_FAILURES = 10;
//@ chunk-p7xf186d.js:9387-9412 placement
var wt = 60,
  pe = 300,
  fe = 3600;

export {
  pe,
  fe,
  wt,
  MAX_TAG_FAILURES,
  normalizeApiOrigin,
  importEcdhJwk,
  utf8Decode,
  base64UrlDecode,
  utf8Encode,
  toArrayBuffer,
  parsePublicKey,
  sha256Base64Url,
  generateEcdhKeyPair,
  sha256,
  concatBytesArgs,
  lengthPrefixed,
  PAIRING_PROTOCOL,
  isNonNegativeSafeInt,
  u64be,
  bytesToBinaryString,
  concatBytes,
  randomBytes,
  constantTimeEqual,
  importEcdhPublicKey,
};
