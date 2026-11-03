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
function normalizeApiOrigin(apiOrigin, allowLoopbackHttp = false) {
  let n;
  try {
    n = new URL(apiOrigin);
  } catch {
    throw TypeError(`pairing apiOrigin is not a URL: ${apiOrigin}`);
  }
  if (
    !(
      n.protocol === "https:" ||
      (allowLoopbackHttp && n.protocol === "http:" && LOOPBACK_HOSTS.has(n.hostname))
    ) ||
    n.username ||
    n.password ||
    (n.pathname !== "/" && n.pathname !== "") ||
    n.search ||
    n.hash
  )
    throw TypeError(`pairing apiOrigin must be a bare https origin: ${apiOrigin}`);
  let i = `${n.origin}/api/oauth/local_pairing`;
  return {
    issuer: i,
    attest: `${i}/attest`,
    jwks: `${i}/jwks.json`,
  };
}
//@ chunk-p7xf186d.js:6487-6577 placement
var PAIRING_PROTOCOL = "claude-local-pairing/v1";
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder("utf-8", {
  fatal: true,
});
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
  let uint8Array = new Uint8Array(t);
  let r = 0;
  for (let i of e) {
    uint8Array.set(i, r);
    r += i.length;
  }
  return uint8Array;
}
//@ chunk-p7xf186d.js:6798-6942 placement
function lengthPrefixed(e) {
  let t = typeof e === "string" ? utf8Encode(e) : e;
  let uint8Array = new Uint8Array(4 + t.length);
  new DataView(uint8Array.buffer).setUint32(0, t.length, false);
  uint8Array.set(t, 4);
  return uint8Array;
}
//@ chunk-p7xf186d.js:6942-7014 placement
function isNonNegativeSafeInt(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0;
}
//@ chunk-p7xf186d.js:7014-7181 placement
function u64be(e) {
  if (!isNonNegativeSafeInt(e)) throw RangeError("u64be: not a non-negative safe integer");
  let uint8Array = new Uint8Array(8);
  new DataView(uint8Array.buffer).setBigUint64(0, BigInt(e), false);
  return uint8Array;
}
//@ chunk-p7xf186d.js:7181-7277 placement
/**
 * base64url 的字母表。
 */
var BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
var BASE64URL_RE = /^[A-Za-z0-9_-]*$/;
//@ chunk-p7xf186d.js:7277-7650 placement
function base64UrlDecode(e) {
  let t = e.length % 4;
  if (!BASE64URL_RE.test(e) || t === 1) throw SyntaxError("not unpadded base64url");
  if (t !== 0) {
    if ((BASE64URL_ALPHABET.indexOf(e.charAt(e.length - 1)) & (t === 2 ? 15 : 3)) !== 0)
      throw SyntaxError("non-canonical base64url");
  }
  let n = e.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((e.length + 3) % 4);
  let r = atob(n);
  let uint8Array = new Uint8Array(r.length);
  for (let idx = 0; idx < r.length; idx++) uint8Array[idx] = r.charCodeAt(idx);
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
  if (e.length !== t.length) return false;
  let n = 0;
  for (let i = 0; i < e.length; i++) n |= (e[i] ?? 0) ^ (t[i] ?? 0);
  return n === 0;
}
//@ chunk-p7xf186d.js:7953-8038 placement
function randomBytes(e) {
  let uint8Array = new Uint8Array(e);
  globalThis.crypto.getRandomValues(uint8Array);
  return uint8Array;
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
/**
 * P-256 公钥的 base64url 长度（87）。
 */
var P256_PUBLIC_KEY_CHARS = 87;
//@ chunk-p7xf186d.js:8221-8479 placement
function parsePublicKey(e) {
  if (typeof e !== "string" || e.length !== P256_PUBLIC_KEY_CHARS)
    throw malformedError("public_key must be 87 base64url chars");
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
  let t = bytesToBinaryString(e.subarray(1, 33));
  let n = bytesToBinaryString(e.subarray(33, 65));
  return `{"crv":"P-256","kty":"EC","x":"${t}","y":"${n}"}`;
}
//@ chunk-p7xf186d.js:8600-8648 placement
async function sha256Base64Url(e) {
  return bytesToBinaryString(await sha256(utf8Encode(p256PointToJwkJson(e))));
}
//@ chunk-p7xf186d.js:8648-8825 placement
async function importEcdhPublicKey(peerRaw) {
  try {
    return await globalThis.crypto.subtle.importKey(
      "raw",
      toArrayBuffer(peerRaw),
      {
        name: "ECDH",
        namedCurve: "P-256",
      },
      false,
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
    {
      kty: "EC",
      crv: "P-256",
      x: e,
      y: t,
      ext: true,
    },
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["verify"],
  );
}
//@ chunk-p7xf186d.js:8983-9230 placement
async function generateEcdhKeyPair() {
  let e = await globalThis.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    ["deriveBits"],
  );
  let uint8Array = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", e.publicKey));
  return {
    keyPair: e,
    publicKey: bytesToBinaryString(uint8Array),
    jkt: await sha256Base64Url(uint8Array),
  };
}
//@ chunk-p7xf186d.js:9230-9239 placement
var MAX_TAG_FAILURES = 10;
//@ chunk-p7xf186d.js:9387-9412 placement
/**
 * JWKS 缓存的最小存活秒数（60）。
 */
var MIN_CACHE_MAX_AGE_S = 60;
var DEFAULT_CACHE_MAX_AGE_S = 300;
var DEFAULT_STALE_IF_ERROR_S = 3600;
export {
  DEFAULT_CACHE_MAX_AGE_S,
  DEFAULT_STALE_IF_ERROR_S,
  MIN_CACHE_MAX_AGE_S,
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
