/**
 * utils/claudeInChrome/localPairing/jwksAndAssertions.ts
 *
 * 2.1.316 新增：配对 JWKS 缓存与断言校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-290tacpj.js (16)
 * attribution: placement 16
 */
import { PairingError, PairingClock, malformedError } from "./pairingErrors.js";
import {
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
} from "./encoding.js";
import { withTimeout_2 } from "../../sleep.js";

//@ chunk-290tacpj.js:9412-9510 placement
/**
 * 从 Cache-Control 头里取出指定指令的秒数。
 */
function parseCacheControlSeconds(cacheControl, directive, fallback) {
  let match = new RegExp(`(?:^|,)\\s*${directive}=(\\d+)`).exec(cacheControl ?? "");
  return match ? Number(match[1]) : fallback;
}
//@ chunk-290tacpj.js:9510-9571 placement
/**
 * 构造 jwks_unavailable 配对错误。
 */
function jwksUnavailableError(message, cause) {
  return new PairingError("jwks_unavailable", message, {
    cause,
  });
}
//@ chunk-290tacpj.js:9571-11556 placement
/**
 * 缓存配对签名公钥集（JWKS），支持最大存活、出错时使用旧值与最小刷新间隔。
 */
class JwksCache {
  opts;
  keys = new Map();
  fetchedAt;
  maxAge = DEFAULT_CACHE_MAX_AGE_S;
  staleIfError = DEFAULT_STALE_IF_ERROR_S;
  flooredAt;
  inflight;
  clock;
  floor;
  timeoutSec;
  url;
  constructor(options) {
    this.opts = options;
    this.clock = new PairingClock(options);
    this.floor = MIN_CACHE_MAX_AGE_S;
    this.timeoutSec = options.timeoutSec ?? MAX_TAG_FAILURES;
    this.url = normalizeApiOrigin(options.apiOrigin, options.allowLoopbackHttp).jwks;
  }
  async getKey(kid) {
    let key = this.lookup(kid);
    if (!key || this.age() > this.maxAge) {
      if (!this.inflight && !this.floored()) {
        if (!key) this.flooredAt = this.clock.stamp();
        this.inflight = this.fetch().finally(() => {
          this.inflight = undefined;
        });
      }
      await this.inflight;
      key = this.lookup(kid);
    }
    if (key) return key;
    if (this.keys.size === 0) throw jwksUnavailableError("no verification keys");
    throw new PairingError("unknown_kid", kid.slice(0, 32));
  }
  lookup(kid) {
    return this.servable().get(kid);
  }
  servable() {
    if (this.age() > this.maxAge + this.staleIfError) this.keys = new Map();
    return this.keys;
  }
  age() {
    return this.fetchedAt ? this.clock.since(this.fetchedAt) : 1 / 0;
  }
  floored() {
    return this.flooredAt !== undefined && this.clock.since(this.flooredAt) < this.floor;
  }
  async fetch() {
    try {
      await this.load();
    } catch (error) {
      this.flooredAt = this.clock.stamp();
      if (this.servable().size > 0) return;
      throw error instanceof PairingError ? error : jwksUnavailableError("fetch failed", error);
    }
  }
  async load() {
    let response = await withTimeout_2(this.get(), this.timeoutSec, () => jwksUnavailableError("timed out"));
    if (response.status !== 200) throw jwksUnavailableError(`HTTP ${response.status}`);
    let body;
    try {
      body = JSON.parse(response.text);
    } catch {
      throw jwksUnavailableError("not JSON");
    }
    let keys = body?.keys;
    if (!Array.isArray(keys)) throw jwksUnavailableError("no keys array");
    let keys_2 = new Map();
    for (let key of keys) {
      if (
        key?.kty !== "EC" ||
        key.crv !== "P-256" ||
        typeof key.kid !== "string" ||
        typeof key.x !== "string" ||
        typeof key.y !== "string" ||
        (key.alg !== undefined && key.alg !== "ES256") ||
        (key.use !== undefined && key.use !== "sig")
      )
        continue;
      try {
        keys_2.set(key.kid, await importEcdhJwk(key.x, key.y));
      } catch {}
    }
    if (keys_2.size === 0) throw jwksUnavailableError("no usable EC P-256 keys");
    this.maxAge = Math.max(
      parseCacheControlSeconds(response.cacheControl, "max-age", DEFAULT_CACHE_MAX_AGE_S),
      this.floor,
    );
    this.staleIfError = parseCacheControlSeconds(
      response.cacheControl,
      "stale-if-error",
      DEFAULT_STALE_IF_ERROR_S,
    );
    this.keys = keys_2;
    this.fetchedAt = this.clock.stamp();
  }
  async get() {
    let impl = await this.opts.fetchImpl(this.url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "cache-control": "no-cache",
      },
    });
    let status = impl.status;
    let cacheControl = impl.headers.get("cache-control");
    return {
      status,
      cacheControl,
      text: status === 200 ? await impl.text() : "",
    };
  }
}
//@ chunk-290tacpj.js:11556-12038 placement
function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw TypeError("canonicalJson: non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map((item) => canonicalJson(item)).join(",") + "]";
  if (typeof value === "object") {
    let object = value;
    return (
      "{" +
      Object.keys(object)
        .filter((key) => object[key] !== undefined)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(object[key]))
        .join(",") +
      "}"
    );
  }
  throw TypeError(`canonicalJson: unsupported ${typeof value}`);
}
//@ chunk-290tacpj.js:12038-13130 placement
function parseStrictJson(text) {
  let cursor = 0;
  let fail = (message) => {
    throw SyntaxError(`strict JSON: ${message} at ${cursor}`);
  };
  let skipWhitespace = () => {
    while (
      cursor < text.length &&
      ` 	
\r`.includes(text.charAt(cursor))
    )
      cursor++;
  };
  let parseString = () => {
    let start = cursor;
    if (text[cursor] !== '"') fail("expected string");
    cursor++;
    while (cursor < text.length && text[cursor] !== '"') {
      if (text[cursor] === "\\") cursor++;
      cursor++;
    }
    if (cursor >= text.length) fail("unterminated string");
    cursor++;
    return JSON.parse(text.slice(start, cursor));
  };
  let parseValue = () => {
    skipWhitespace();
    let char = text[cursor];
    if (char === "{") {
      cursor++;
      let object = {};
      let seenKeys = new Set();
      skipWhitespace();
      if (text[cursor] === "}") {
        cursor++;
        return object;
      }
      for (;;) {
        skipWhitespace();
        let key = parseString();
        if (seenKeys.has(key)) fail(`duplicate key ${JSON.stringify(key)}`);
        seenKeys.add(key);
        skipWhitespace();
        if (text[cursor] !== ":") fail("expected ':'");
        cursor++;
        Object.defineProperty(object, key, {
          value: parseValue(),
          enumerable: true,
          writable: true,
          configurable: true,
        });
        skipWhitespace();
        if (text[cursor] === ",") {
          cursor++;
          continue;
        }
        if (text[cursor] === "}") {
          cursor++;
          return object;
        }
        fail("expected ',' or '}'");
      }
    }
    if (char === "[") {
      cursor++;
      let array = [];
      skipWhitespace();
      if (text[cursor] === "]") {
        cursor++;
        return array;
      }
      for (;;) {
        array.push(parseValue());
        skipWhitespace();
        if (text[cursor] === ",") {
          cursor++;
          continue;
        }
        if (text[cursor] === "]") {
          cursor++;
          return array;
        }
        fail("expected ',' or ']'");
      }
    }
    if (char === '"') return parseString();
    let match = /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(cursor));
    if (!match) fail("unexpected token");
    cursor += match[0].length;
    return JSON.parse(match[0]);
  };
  let value = parseValue();
  skipWhitespace();
  if (cursor !== text.length) fail("trailing data");
  return value;
}
//@ chunk-290tacpj.js:13130-13172 placement
/**
 * 断言 JWT 的 typ 值（local-pairing+jwt）。
 */
var ASSERTION_TYP = "local-pairing+jwt";
var MAX_ASSERTION_CHARS = 4096;
var MAX_KID_CHARS = 256;
//@ chunk-290tacpj.js:13172-14160 placement
function parseAssertion(token) {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_ASSERTION_CHARS)
    throw malformedError("assertion missing or too long");
  let parts = token.split(".");
  let [headerPart, payloadPart, signaturePart] = parts;
  if (
    parts.length !== 3 ||
    headerPart === undefined ||
    payloadPart === undefined ||
    signaturePart === undefined
  )
    throw malformedError("assertion is not a compact JWS");
  let header;
  let payload;
  let signature;
  try {
    header = parseStrictJson(utf8Decode(base64UrlDecode(headerPart)));
    payload = parseStrictJson(utf8Decode(base64UrlDecode(payloadPart)));
    signature = base64UrlDecode(signaturePart);
  } catch (error) {
    throw malformedError(`assertion does not decode: ${String(error)}`);
  }
  if (
    header === null ||
    typeof header !== "object" ||
    Array.isArray(header) ||
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  )
    throw malformedError("assertion header/payload are not objects");
  let headerObject = header;
  if (headerObject.alg !== "ES256")
    throw new PairingError("bad_signature", `alg ${JSON.stringify(headerObject.alg)} is not ES256`);
  if ("crit" in headerObject) throw malformedError("crit header is not accepted");
  if (headerObject.typ !== ASSERTION_TYP)
    throw new PairingError("wrong_issuer_or_audience", `typ ${JSON.stringify(headerObject.typ)}`);
  if (
    typeof headerObject.kid !== "string" ||
    headerObject.kid.length === 0 ||
    headerObject.kid.length > MAX_KID_CHARS
  )
    throw malformedError("kid missing or too long");
  if (signature.length !== 64)
    throw new PairingError("bad_signature", "ES256 signature must be exactly 64 bytes");
  return {
    header: {
      kid: headerObject.kid,
    },
    payload,
    signingInput: utf8Encode(`${headerPart}.${payloadPart}`),
    signature,
  };
}
//@ chunk-290tacpj.js:14160-14320 placement
async function verifyAssertionSignature(assertion, context) {
  if (
    !(await globalThis.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      context,
      toArrayBuffer(assertion.signature),
      toArrayBuffer(assertion.signingInput),
    ))
  )
    throw new PairingError("bad_signature");
}
//@ chunk-290tacpj.js:14320-14358 placement
/**
 * 允许的对端类型（desktop、chrome_extension）。
 */
var PEER_KINDS = ["desktop", "chrome_extension"];
//@ chunk-290tacpj.js:14358-14395 placement
/**
 * 判断对端类型是否允许。
 */
function isKnownPeerKind(kind) {
  return PEER_KINDS.includes(kind);
}
//@ chunk-290tacpj.js:14395-14447 placement
/**
 * 断言时间校验允许的时钟偏差（60 秒）。
 */
var ASSERTION_CONSTANTS = "claude-local-pairing/v1";
var ASSERTION_CLOCK_SKEW_S = 60;
var MAX_ASSERTION_LIFETIME_S = 301;
var MAX_TAG_FAILURES_DEFAULT = 30;
//@ chunk-290tacpj.js:14447-14550 placement
function requireStringClaim(payload, field) {
  let value = payload[field];
  if (typeof value !== "string" || value.length === 0) throw malformedError(`claim ${field} missing`);
  return value;
}
//@ chunk-290tacpj.js:14550-14661 placement
function requireNumberClaim(payload, field) {
  let value = payload[field];
  if (typeof value !== "number" || !Number.isFinite(value)) throw malformedError(`claim ${field} missing`);
  return value;
}
//@ chunk-290tacpj.js:14661-15071 placement
function validatePeerClaims(payload) {
  let clientKind = requireStringClaim(payload, "client_kind");
  if (!isKnownPeerKind(clientKind)) throw new PairingError("wrong_peer_kind", clientKind);
  let cnf = payload.cnf;
  if (!cnf || typeof cnf !== "object" || Array.isArray(cnf) || typeof cnf.jkt !== "string")
    throw malformedError("cnf.jkt missing");
  return {
    iss: requireStringClaim(payload, "iss"),
    sub: requireStringClaim(payload, "sub"),
    org: requireStringClaim(payload, "org"),
    azp: typeof payload.azp === "string" ? payload.azp : undefined,
    client_kind: clientKind,
    hybrid: payload.hybrid === true,
    cnf: {
      jkt: cnf.jkt,
    },
    iat: requireNumberClaim(payload, "iat"),
    exp: requireNumberClaim(payload, "exp"),
    jti: typeof payload.jti === "string" ? payload.jti : undefined,
  };
}
//@ chunk-290tacpj.js:15071-15562 placement
async function verifyPeerAssertion(token, text, policy) {
  let assertion = parseAssertion(token);
  let point = parsePublicKey(text);
  let context = await policy.jwks.getKey(assertion.header.kid);
  await verifyAssertionSignature(assertion, context);
  let claims = validatePeerClaims(assertion.payload);
  let aud = assertion.payload.aud;
  let audienceOk = aud === ASSERTION_CONSTANTS || (Array.isArray(aud) && aud.includes(ASSERTION_CONSTANTS));
  if (claims.iss !== policy.expectedIssuer || !audienceOk) throw new PairingError("wrong_issuer_or_audience");
  if (claims.exp - claims.iat > MAX_ASSERTION_LIFETIME_S)
    throw new PairingError("expired", `assertion lifetime exceeds ${MAX_ASSERTION_LIFETIME_S} s`);
  if (claims.client_kind !== policy.expectedKind)
    throw new PairingError("wrong_peer_kind", claims.client_kind);
  if ((await sha256Base64Url(point)) !== claims.cnf.jkt) throw new PairingError("key_binding_mismatch");
  return {
    claims,
    peerRaw: point,
  };
}
//@ chunk-290tacpj.js:15562-15660 placement
function checkAssertionTimes(claims, serverTime) {
  if (claims.iat > serverTime + ASSERTION_CLOCK_SKEW_S) throw new PairingError("not_yet_valid");
  if (claims.exp + ASSERTION_CLOCK_SKEW_S <= serverTime) throw new PairingError("expired");
}
export {
  MAX_TAG_FAILURES_DEFAULT,
  validatePeerClaims,
  parseAssertion,
  canonicalJson,
  verifyPeerAssertion,
  checkAssertionTimes,
  JwksCache,
};
