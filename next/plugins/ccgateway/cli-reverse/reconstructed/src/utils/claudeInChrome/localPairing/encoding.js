/**
 * utils/claudeInChrome/localPairing/encoding.ts
 *
 * 2.1.316 新增：本地配对的编码与密码学辅助（base64url、ECDH、SHA-256）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-290tacpj.js (25)
 * attribution: placement 25
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { LOOPBACK_HOSTS, malformedError } from "./pairingErrors.js";

//@ chunk-290tacpj.js:6058-6487 placement
function normalizeApiOrigin(apiOrigin, allowLoopbackHttp = false) {
  let parsed;
  try {
    parsed = new URL(apiOrigin);
  } catch {
    throw TypeError(`pairing apiOrigin is not a URL: ${apiOrigin}`);
  }
  if (
    !(
      parsed.protocol === "https:" ||
      (allowLoopbackHttp && parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname))
    ) ||
    parsed.username ||
    parsed.password ||
    (parsed.pathname !== "/" && parsed.pathname !== "") ||
    parsed.search ||
    parsed.hash
  )
    throw TypeError(`pairing apiOrigin must be a bare https origin: ${apiOrigin}`);
  let endpoint = `${parsed.origin}/api/oauth/local_pairing`;
  return {
    issuer: endpoint,
    attest: `${endpoint}/attest`,
    jwks: `${endpoint}/jwks.json`,
  };
}
//@ chunk-290tacpj.js:6487-6577 placement
var PAIRING_PROTOCOL = "claude-local-pairing/v1";
var textEncoder = new TextEncoder();
var textDecoder = new TextDecoder("utf-8", {
  fatal: true,
});
//@ chunk-290tacpj.js:6577-6611 placement
function utf8Encode(text) {
  return textEncoder.encode(text);
}
//@ chunk-290tacpj.js:6611-6645 placement
function utf8Decode(bytes) {
  return textDecoder.decode(bytes);
}
//@ chunk-290tacpj.js:6645-6674 placement
function concatBytesArgs(...parts) {
  return concatBytes(parts);
}
//@ chunk-290tacpj.js:6674-6798 placement
function concatBytes(parts) {
  let totalLength = 0;
  for (let part of parts) totalLength += part.length;
  let uint8Array = new Uint8Array(totalLength);
  let offset = 0;
  for (let part of parts) {
    uint8Array.set(part, offset);
    offset += part.length;
  }
  return uint8Array;
}
//@ chunk-290tacpj.js:6798-6942 placement
function lengthPrefixed(value) {
  let bytes = typeof value === "string" ? utf8Encode(value) : value;
  let uint8Array = new Uint8Array(4 + bytes.length);
  new DataView(uint8Array.buffer).setUint32(0, bytes.length, false);
  uint8Array.set(bytes, 4);
  return uint8Array;
}
//@ chunk-290tacpj.js:6942-7014 placement
function isNonNegativeSafeInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
//@ chunk-290tacpj.js:7014-7181 placement
function u64be(value) {
  if (!isNonNegativeSafeInt(value)) throw RangeError("u64be: not a non-negative safe integer");
  let uint8Array = new Uint8Array(8);
  new DataView(uint8Array.buffer).setBigUint64(0, BigInt(value), false);
  return uint8Array;
}
//@ chunk-290tacpj.js:7181-7277 placement
/**
 * base64url 的字母表。
 */
var BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
var BASE64URL_RE = /^[A-Za-z0-9_-]*$/;
//@ chunk-290tacpj.js:7277-7650 placement
function base64UrlDecode(text) {
  let remainder = text.length % 4;
  if (!BASE64URL_RE.test(text) || remainder === 1) throw SyntaxError("not unpadded base64url");
  if (remainder !== 0) {
    if ((BASE64URL_ALPHABET.indexOf(text.charAt(text.length - 1)) & (remainder === 2 ? 15 : 3)) !== 0)
      throw SyntaxError("non-canonical base64url");
  }
  let padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  let binary = atob(padded);
  let uint8Array = new Uint8Array(binary.length);
  for (let idx = 0; idx < binary.length; idx++) uint8Array[idx] = binary.charCodeAt(idx);
  return uint8Array;
}
//@ chunk-290tacpj.js:7650-7833 placement
function bytesToBinaryString(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 32768));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
//@ chunk-290tacpj.js:7833-7953 placement
function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
//@ chunk-290tacpj.js:7953-8038 placement
function randomBytes(length) {
  let uint8Array = new Uint8Array(length);
  globalThis.crypto.getRandomValues(uint8Array);
  return uint8Array;
}
//@ chunk-290tacpj.js:8038-8114 placement
function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
//@ chunk-290tacpj.js:8114-8211 placement
async function sha256(bytes) {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
}
//@ chunk-290tacpj.js:8211-8221 placement
/**
 * P-256 公钥的 base64url 长度（87）。
 */
var P256_PUBLIC_KEY_CHARS = 87;
//@ chunk-290tacpj.js:8221-8479 placement
function parsePublicKey(text) {
  if (typeof text !== "string" || text.length !== P256_PUBLIC_KEY_CHARS)
    throw malformedError("public_key must be 87 base64url chars");
  let bytes;
  try {
    bytes = base64UrlDecode(text);
  } catch {
    throw malformedError("public_key is not base64url");
  }
  if (bytes.length !== 65 || bytes[0] !== 4)
    throw malformedError("public_key must be an uncompressed P-256 point");
  return bytes;
}
//@ chunk-290tacpj.js:8479-8600 placement
function p256PointToJwkJson(point) {
  let x = bytesToBinaryString(point.subarray(1, 33));
  let y = bytesToBinaryString(point.subarray(33, 65));
  return `{"crv":"P-256","kty":"EC","x":"${x}","y":"${y}"}`;
}
//@ chunk-290tacpj.js:8600-8648 placement
async function sha256Base64Url(point) {
  return bytesToBinaryString(await sha256(utf8Encode(p256PointToJwkJson(point))));
}
//@ chunk-290tacpj.js:8648-8825 placement
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
//@ chunk-290tacpj.js:8825-8983 placement
async function importEcdhJwk(x, y) {
  return globalThis.crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x,
      y,
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
//@ chunk-290tacpj.js:8983-9230 placement
async function generateEcdhKeyPair() {
  let keyPair = await globalThis.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    false,
    ["deriveBits"],
  );
  let uint8Array = new Uint8Array(await globalThis.crypto.subtle.exportKey("raw", keyPair.publicKey));
  return {
    keyPair,
    publicKey: bytesToBinaryString(uint8Array),
    jkt: await sha256Base64Url(uint8Array),
  };
}
//@ chunk-290tacpj.js:9230-9239 placement
var MAX_TAG_FAILURES = 10;
//@ chunk-290tacpj.js:9387-9412 placement
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
