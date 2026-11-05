/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-decode.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (7)
 * attribution: esm-fingerprint 7
 */
import { SENTINEL_PREFIX } from "./credential-sentinel.js";

//@ chunk-qg41pqt6.js:710022-710085 esm-fingerprint
var JWT_DEFAULT_EXTRACT_PATTERN = "(eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)";
//@ chunk-qg41pqt6.js:710085-710181 esm-fingerprint
function decodeSegment(segment) {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    return;
  }
}
//@ chunk-qg41pqt6.js:710181-710336 esm-fingerprint
function verifyJwt(candidate) {
  let parts = candidate.split(".");
  if (parts.length !== 3) return false;
  let header = decodeSegment(parts[0]);
  if (typeof header !== "object" || header === null || !("alg" in header)) return false;
  return decodeSegment(parts[1]) !== undefined;
}
//@ chunk-qg41pqt6.js:710336-710371 esm-fingerprint
var FAKE_JWT_EXP = 9999999999;
var FAKE_JWT_SIGNATURE = "c3J0LWZha2U";
//@ chunk-qg41pqt6.js:710371-710437 esm-fingerprint
function base64url(s) {
  return Buffer.from(s, "utf8").toString("base64url");
}
//@ chunk-qg41pqt6.js:710437-710566 esm-fingerprint
function mintFakeJwt(uuid) {
  let header = base64url(
    JSON.stringify({
      alg: "HS256",
      typ: "JWT",
    }),
  );
  let payload = base64url(
    JSON.stringify({
      sub: SENTINEL_PREFIX + uuid,
      exp: FAKE_JWT_EXP,
    }),
  );
  return `${header}.${payload}.${FAKE_JWT_SIGNATURE}`;
}
//@ chunk-qg41pqt6.js:710566-710923 esm-fingerprint
function maskJwtClaims(token, claims, sentinelFor) {
  let [headerSeg, payloadSeg] = token.split(".");
  let payload = decodeSegment(payloadSeg ?? "");
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  let record = payload;
  let matched = [];
  for (let claim of claims) {
    let value = record[claim];
    if (typeof value === "string") matched.push([claim, value]);
  }
  if (matched.length === 0) return null;
  let claimSentinels = new Map();
  for (let [claim, value] of matched) {
    let sentinel = sentinelFor(claim, value);
    record[claim] = sentinel;
    claimSentinels.set(claim, sentinel);
  }
  return {
    fakeToken: `${headerSeg}.${base64url(JSON.stringify(record))}.${FAKE_JWT_SIGNATURE}`,
    claimSentinels,
  };
}
export { JWT_DEFAULT_EXTRACT_PATTERN, verifyJwt, maskJwtClaims, mintFakeJwt };
