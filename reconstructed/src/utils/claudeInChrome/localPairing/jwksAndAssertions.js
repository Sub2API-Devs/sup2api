/**
 * utils/claudeInChrome/localPairing/jwksAndAssertions.ts
 *
 * 2.1.316 新增：配对 JWKS 缓存与断言校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p7xf186d.js (16)
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

//@ chunk-p7xf186d.js:9412-9510 placement
/**
 * 从 Cache-Control 头里取出指定指令的秒数。
 */
function parseCacheControlSeconds(cacheControl, t, n) {
  let match = new RegExp(`(?:^|,)\\s*${t}=(\\d+)`).exec(cacheControl ?? "");
  return match ? Number(match[1]) : n;
}
//@ chunk-p7xf186d.js:9510-9571 placement
/**
 * 构造 jwks_unavailable 配对错误。
 */
function jwksUnavailableError(e, cause) {
  return new PairingError("jwks_unavailable", e, {
    cause,
  });
}
//@ chunk-p7xf186d.js:9571-11556 placement
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
  constructor(e) {
    this.opts = e;
    this.clock = new PairingClock(e);
    this.floor = MIN_CACHE_MAX_AGE_S;
    this.timeoutSec = e.timeoutSec ?? MAX_TAG_FAILURES;
    this.url = normalizeApiOrigin(e.apiOrigin, e.allowLoopbackHttp).jwks;
  }
  async getKey(e) {
    let t = this.lookup(e);
    if (!t || this.age() > this.maxAge) {
      if (!this.inflight && !this.floored()) {
        if (!t) this.flooredAt = this.clock.stamp();
        this.inflight = this.fetch().finally(() => {
          this.inflight = undefined;
        });
      }
      await this.inflight;
      t = this.lookup(e);
    }
    if (t) return t;
    if (this.keys.size === 0) throw jwksUnavailableError("no verification keys");
    throw new PairingError("unknown_kid", e.slice(0, 32));
  }
  lookup(e) {
    return this.servable().get(e);
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
    let e = await withTimeout_2(this.get(), this.timeoutSec, () => jwksUnavailableError("timed out"));
    if (e.status !== 200) throw jwksUnavailableError(`HTTP ${e.status}`);
    let t;
    try {
      t = JSON.parse(e.text);
    } catch {
      throw jwksUnavailableError("not JSON");
    }
    let keys = t?.keys;
    if (!Array.isArray(keys)) throw jwksUnavailableError("no keys array");
    let r = new Map();
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
        r.set(key.kid, await importEcdhJwk(key.x, key.y));
      } catch {}
    }
    if (r.size === 0) throw jwksUnavailableError("no usable EC P-256 keys");
    this.maxAge = Math.max(
      parseCacheControlSeconds(e.cacheControl, "max-age", DEFAULT_CACHE_MAX_AGE_S),
      this.floor,
    );
    this.staleIfError = parseCacheControlSeconds(e.cacheControl, "stale-if-error", DEFAULT_STALE_IF_ERROR_S);
    this.keys = r;
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
//@ chunk-p7xf186d.js:11556-12038 placement
function canonicalJson(e) {
  if (e === null || typeof e === "boolean" || typeof e === "string") return JSON.stringify(e);
  if (typeof e === "number") {
    if (!Number.isFinite(e)) throw TypeError("canonicalJson: non-finite number");
    return JSON.stringify(e);
  }
  if (Array.isArray(e)) return "[" + e.map((t) => canonicalJson(t)).join(",") + "]";
  if (typeof e === "object") {
    let t = e;
    return (
      "{" +
      Object.keys(t)
        .filter((key) => t[key] !== undefined)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(t[key]))
        .join(",") +
      "}"
    );
  }
  throw TypeError(`canonicalJson: unsupported ${typeof e}`);
}
//@ chunk-p7xf186d.js:12038-13130 placement
function parseStrictJson(e) {
  let t = 0;
  let n = (c) => {
    throw SyntaxError(`strict JSON: ${c} at ${t}`);
  };
  let r = () => {
    while (
      t < e.length &&
      ` 	
\r`.includes(e.charAt(t))
    )
      t++;
  };
  let i = () => {
    let c = t;
    if (e[t] !== '"') n("expected string");
    t++;
    while (t < e.length && e[t] !== '"') {
      if (e[t] === "\\") t++;
      t++;
    }
    if (t >= e.length) n("unterminated string");
    t++;
    return JSON.parse(e.slice(c, t));
  };
  let s = () => {
    r();
    let c = e[t];
    if (c === "{") {
      t++;
      let u = {};
      let l = new Set();
      r();
      if (e[t] === "}") {
        t++;
        return u;
      }
      for (;;) {
        r();
        let p = i();
        if (l.has(p)) n(`duplicate key ${JSON.stringify(p)}`);
        l.add(p);
        r();
        if (e[t] !== ":") n("expected ':'");
        t++;
        Object.defineProperty(u, p, {
          value: s(),
          enumerable: true,
          writable: true,
          configurable: true,
        });
        r();
        if (e[t] === ",") {
          t++;
          continue;
        }
        if (e[t] === "}") {
          t++;
          return u;
        }
        n("expected ',' or '}'");
      }
    }
    if (c === "[") {
      t++;
      let u = [];
      r();
      if (e[t] === "]") {
        t++;
        return u;
      }
      for (;;) {
        u.push(s());
        r();
        if (e[t] === ",") {
          t++;
          continue;
        }
        if (e[t] === "]") {
          t++;
          return u;
        }
        n("expected ',' or ']'");
      }
    }
    if (c === '"') return i();
    let match = /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(e.slice(t));
    if (!match) n("unexpected token");
    t += match[0].length;
    return JSON.parse(match[0]);
  };
  let o = s();
  r();
  if (t !== e.length) n("trailing data");
  return o;
}
//@ chunk-p7xf186d.js:13130-13172 placement
/**
 * 断言 JWT 的 typ 值（local-pairing+jwt）。
 */
var ASSERTION_TYP = "local-pairing+jwt";
var MAX_ASSERTION_CHARS = 4096;
var MAX_KID_CHARS = 256;
//@ chunk-p7xf186d.js:13172-14160 placement
function parseAssertion(e) {
  if (typeof e !== "string" || e.length === 0 || e.length > MAX_ASSERTION_CHARS)
    throw malformedError("assertion missing or too long");
  let parts = e.split(".");
  let [n, r, i] = parts;
  if (parts.length !== 3 || n === undefined || r === undefined || i === undefined)
    throw malformedError("assertion is not a compact JWS");
  let s;
  let o;
  let c;
  try {
    s = parseStrictJson(utf8Decode(base64UrlDecode(n)));
    o = parseStrictJson(utf8Decode(base64UrlDecode(r)));
    c = base64UrlDecode(i);
  } catch (error) {
    throw malformedError(`assertion does not decode: ${String(error)}`);
  }
  if (
    s === null ||
    typeof s !== "object" ||
    Array.isArray(s) ||
    o === null ||
    typeof o !== "object" ||
    Array.isArray(o)
  )
    throw malformedError("assertion header/payload are not objects");
  let a = s;
  if (a.alg !== "ES256") throw new PairingError("bad_signature", `alg ${JSON.stringify(a.alg)} is not ES256`);
  if ("crit" in a) throw malformedError("crit header is not accepted");
  if (a.typ !== ASSERTION_TYP)
    throw new PairingError("wrong_issuer_or_audience", `typ ${JSON.stringify(a.typ)}`);
  if (typeof a.kid !== "string" || a.kid.length === 0 || a.kid.length > MAX_KID_CHARS)
    throw malformedError("kid missing or too long");
  if (c.length !== 64) throw new PairingError("bad_signature", "ES256 signature must be exactly 64 bytes");
  return {
    header: {
      kid: a.kid,
    },
    payload: o,
    signingInput: utf8Encode(`${n}.${r}`),
    signature: c,
  };
}
//@ chunk-p7xf186d.js:14160-14320 placement
async function verifyAssertionSignature(assertion, t) {
  if (
    !(await globalThis.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      t,
      toArrayBuffer(assertion.signature),
      toArrayBuffer(assertion.signingInput),
    ))
  )
    throw new PairingError("bad_signature");
}
//@ chunk-p7xf186d.js:14320-14358 placement
/**
 * 允许的对端类型（desktop、chrome_extension）。
 */
var PEER_KINDS = ["desktop", "chrome_extension"];
//@ chunk-p7xf186d.js:14358-14395 placement
/**
 * 判断对端类型是否允许。
 */
function isKnownPeerKind(e) {
  return PEER_KINDS.includes(e);
}
//@ chunk-p7xf186d.js:14395-14447 placement
/**
 * 断言时间校验允许的时钟偏差（60 秒）。
 */
var ASSERTION_CONSTANTS = "claude-local-pairing/v1";
var ASSERTION_CLOCK_SKEW_S = 60;
var MAX_ASSERTION_LIFETIME_S = 301;
var MAX_TAG_FAILURES_DEFAULT = 30;
//@ chunk-p7xf186d.js:14447-14550 placement
function requireStringClaim(e, t) {
  let n = e[t];
  if (typeof n !== "string" || n.length === 0) throw malformedError(`claim ${t} missing`);
  return n;
}
//@ chunk-p7xf186d.js:14550-14661 placement
function requireNumberClaim(e, t) {
  let n = e[t];
  if (typeof n !== "number" || !Number.isFinite(n)) throw malformedError(`claim ${t} missing`);
  return n;
}
//@ chunk-p7xf186d.js:14661-15071 placement
function validatePeerClaims(payload) {
  let t = requireStringClaim(payload, "client_kind");
  if (!isKnownPeerKind(t)) throw new PairingError("wrong_peer_kind", t);
  let cnf = payload.cnf;
  if (!cnf || typeof cnf !== "object" || Array.isArray(cnf) || typeof cnf.jkt !== "string")
    throw malformedError("cnf.jkt missing");
  return {
    iss: requireStringClaim(payload, "iss"),
    sub: requireStringClaim(payload, "sub"),
    org: requireStringClaim(payload, "org"),
    azp: typeof payload.azp === "string" ? payload.azp : undefined,
    client_kind: t,
    hybrid: payload.hybrid === true,
    cnf: {
      jkt: cnf.jkt,
    },
    iat: requireNumberClaim(payload, "iat"),
    exp: requireNumberClaim(payload, "exp"),
    jti: typeof payload.jti === "string" ? payload.jti : undefined,
  };
}
//@ chunk-p7xf186d.js:15071-15562 placement
async function verifyPeerAssertion(assertion, publicKey, n) {
  let assertion_2 = parseAssertion(assertion);
  let publicKey_2 = parsePublicKey(publicKey);
  let key = await n.jwks.getKey(assertion_2.header.kid);
  await verifyAssertionSignature(assertion_2, key);
  let o = validatePeerClaims(assertion_2.payload);
  let aud = assertion_2.payload.aud;
  let a = aud === ASSERTION_CONSTANTS || (Array.isArray(aud) && aud.includes(ASSERTION_CONSTANTS));
  if (o.iss !== n.expectedIssuer || !a) throw new PairingError("wrong_issuer_or_audience");
  if (o.exp - o.iat > MAX_ASSERTION_LIFETIME_S)
    throw new PairingError("expired", `assertion lifetime exceeds ${MAX_ASSERTION_LIFETIME_S} s`);
  if (o.client_kind !== n.expectedKind) throw new PairingError("wrong_peer_kind", o.client_kind);
  if ((await sha256Base64Url(publicKey_2)) !== o.cnf.jkt) throw new PairingError("key_binding_mismatch");
  return {
    claims: o,
    peerRaw: publicKey_2,
  };
}
//@ chunk-p7xf186d.js:15562-15660 placement
function checkAssertionTimes(claims, t) {
  if (claims.iat > t + ASSERTION_CLOCK_SKEW_S) throw new PairingError("not_yet_valid");
  if (claims.exp + ASSERTION_CLOCK_SKEW_S <= t) throw new PairingError("expired");
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
