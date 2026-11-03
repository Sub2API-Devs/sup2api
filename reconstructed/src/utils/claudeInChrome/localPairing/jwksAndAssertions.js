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
} from "./encoding.js";
import { withTimeout_2 } from "../../sleep.js";

//@ chunk-p7xf186d.js:9412-9510 placement
function he(e, t, n) {
  let match = new RegExp(`(?:^|,)\\s*${t}=(\\d+)`).exec(e ?? "");
  return match ? Number(match[1]) : n;
}
//@ chunk-p7xf186d.js:9510-9571 placement
function S(e, t) {
  return new PairingError("jwks_unavailable", e, { cause: t });
}
/**
 * 缓存配对签名公钥集（JWKS），支持最大存活、出错时使用旧值与最小刷新间隔。
 */
//@ chunk-p7xf186d.js:9571-11556 placement
class JwksCache {
  opts;
  keys = new Map();
  fetchedAt;
  maxAge = pe;
  staleIfError = fe;
  flooredAt;
  inflight;
  clock;
  floor;
  timeoutSec;
  url;
  constructor(e) {
    this.opts = e;
    ((this.clock = new PairingClock(e)),
      (this.floor = wt),
      (this.timeoutSec = e.timeoutSec ?? MAX_TAG_FAILURES),
      (this.url = normalizeApiOrigin(e.apiOrigin, e.allowLoopbackHttp).jwks));
  }
  async getKey(e) {
    let lookup = this.lookup(e);
    if (!lookup || this.age() > this.maxAge) {
      if (!this.inflight && !this.floored()) {
        if (!lookup) this.flooredAt = this.clock.stamp();
        this.inflight = this.fetch().finally(() => {
          this.inflight = void 0;
        });
      }
      (await this.inflight, (lookup = this.lookup(e)));
    }
    if (lookup) return lookup;
    if (this.keys.size === 0) throw S("no verification keys");
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
    return this.flooredAt !== void 0 && this.clock.since(this.flooredAt) < this.floor;
  }
  async fetch() {
    try {
      await this.load();
    } catch (error) {
      if (((this.flooredAt = this.clock.stamp()), this.servable().size > 0)) return;
      throw error instanceof PairingError ? error : S("fetch failed", error);
    }
  }
  async load() {
    let e = await withTimeout_2(this.get(), this.timeoutSec, () => S("timed out"));
    if (e.status !== 200) throw S(`HTTP ${e.status}`);
    let t;
    try {
      t = JSON.parse(e.text);
    } catch {
      throw S("not JSON");
    }
    let n = t?.keys;
    if (!Array.isArray(n)) throw S("no keys array");
    let r = new Map();
    for (let i of n) {
      if (
        i?.kty !== "EC" ||
        i.crv !== "P-256" ||
        typeof i.kid !== "string" ||
        typeof i.x !== "string" ||
        typeof i.y !== "string" ||
        (i.alg !== void 0 && i.alg !== "ES256") ||
        (i.use !== void 0 && i.use !== "sig")
      )
        continue;
      try {
        r.set(i.kid, await importEcdhJwk(i.x, i.y));
      } catch {}
    }
    if (r.size === 0) throw S("no usable EC P-256 keys");
    ((this.maxAge = Math.max(he(e.cacheControl, "max-age", pe), this.floor)),
      (this.staleIfError = he(e.cacheControl, "stale-if-error", fe)),
      (this.keys = r),
      (this.fetchedAt = this.clock.stamp()));
  }
  async get() {
    let impl = await this.opts.fetchImpl(this.url, {
        method: "GET",
        headers: { accept: "application/json", "cache-control": "no-cache" },
      }),
      status = impl.status,
      n = impl.headers.get("cache-control");
    return { status: status, cacheControl: n, text: status === 200 ? await impl.text() : "" };
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
        .filter((r) => t[r] !== void 0)
        .sort()
        .map((r) => JSON.stringify(r) + ":" + canonicalJson(t[r]))
        .join(",") +
      "}"
    );
  }
  throw TypeError(`canonicalJson: unsupported ${typeof e}`);
}
//@ chunk-p7xf186d.js:12038-13130 placement
function parseStrictJson(e) {
  let t = 0,
    n = (c) => {
      throw SyntaxError(`strict JSON: ${c} at ${t}`);
    },
    r = () => {
      while (
        t < e.length &&
        ` 	
\r`.includes(e.charAt(t))
      )
        t++;
    },
    i = () => {
      let c = t;
      if (e[t] !== '"') n("expected string");
      t++;
      while (t < e.length && e[t] !== '"') {
        if (e[t] === "\\") t++;
        t++;
      }
      if (t >= e.length) n("unterminated string");
      return (t++, JSON.parse(e.slice(c, t)));
    },
    s = () => {
      r();
      let c = e[t];
      if (c === "{") {
        t++;
        let u = {},
          l = new Set();
        if ((r(), e[t] === "}")) return (t++, u);
        for (;;) {
          r();
          let p = i();
          if (l.has(p)) n(`duplicate key ${JSON.stringify(p)}`);
          if ((l.add(p), r(), e[t] !== ":")) n("expected ':'");
          if (
            (t++,
            Object.defineProperty(u, p, { value: s(), enumerable: !0, writable: !0, configurable: !0 }),
            r(),
            e[t] === ",")
          ) {
            t++;
            continue;
          }
          if (e[t] === "}") return (t++, u);
          n("expected ',' or '}'");
        }
      }
      if (c === "[") {
        t++;
        let u = [];
        if ((r(), e[t] === "]")) return (t++, u);
        for (;;) {
          if ((u.push(s()), r(), e[t] === ",")) {
            t++;
            continue;
          }
          if (e[t] === "]") return (t++, u);
          n("expected ',' or ']'");
        }
      }
      if (c === '"') return i();
      let match = /^(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(e.slice(t));
      if (!match) n("unexpected token");
      return ((t += match[0].length), JSON.parse(match[0]));
    },
    o = s();
  if ((r(), t !== e.length)) n("trailing data");
  return o;
}
//@ chunk-p7xf186d.js:13130-13172 placement
var _t = "local-pairing+jwt",
  kt = 4096,
  bt = 256;
//@ chunk-p7xf186d.js:13172-14160 placement
function parseAssertion(e) {
  if (typeof e !== "string" || e.length === 0 || e.length > kt)
    throw malformedError("assertion missing or too long");
  let parts = e.split("."),
    [n, r, i] = parts;
  if (parts.length !== 3 || n === void 0 || r === void 0 || i === void 0)
    throw malformedError("assertion is not a compact JWS");
  let s, o, c;
  try {
    ((s = parseStrictJson(utf8Decode(base64UrlDecode(n)))),
      (o = parseStrictJson(utf8Decode(base64UrlDecode(r)))),
      (c = base64UrlDecode(i)));
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
  if (a.typ !== _t) throw new PairingError("wrong_issuer_or_audience", `typ ${JSON.stringify(a.typ)}`);
  if (typeof a.kid !== "string" || a.kid.length === 0 || a.kid.length > bt)
    throw malformedError("kid missing or too long");
  if (c.length !== 64) throw new PairingError("bad_signature", "ES256 signature must be exactly 64 bytes");
  return { header: { kid: a.kid }, payload: o, signingInput: utf8Encode(`${n}.${r}`), signature: c };
}
//@ chunk-p7xf186d.js:14160-14320 placement
async function verifyAssertionSignature(e, t) {
  if (
    !(await globalThis.crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      t,
      toArrayBuffer(e.signature),
      toArrayBuffer(e.signingInput),
    ))
  )
    throw new PairingError("bad_signature");
}
//@ chunk-p7xf186d.js:14320-14358 placement
var Pt = ["desktop", "chrome_extension"];
//@ chunk-p7xf186d.js:14358-14395 placement
function xt(e) {
  return Pt.includes(e);
}
//@ chunk-p7xf186d.js:14395-14447 placement
var ASSERTION_CONSTANTS = "claude-local-pairing/v1",
  ye = 60,
  we = 301,
  vt = 30;
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
function validatePeerClaims(e) {
  let t = requireStringClaim(e, "client_kind");
  if (!xt(t)) throw new PairingError("wrong_peer_kind", t);
  let cnf = e.cnf;
  if (!cnf || typeof cnf !== "object" || Array.isArray(cnf) || typeof cnf.jkt !== "string")
    throw malformedError("cnf.jkt missing");
  return {
    iss: requireStringClaim(e, "iss"),
    sub: requireStringClaim(e, "sub"),
    org: requireStringClaim(e, "org"),
    azp: typeof e.azp === "string" ? e.azp : void 0,
    client_kind: t,
    hybrid: e.hybrid === !0,
    cnf: { jkt: cnf.jkt },
    iat: requireNumberClaim(e, "iat"),
    exp: requireNumberClaim(e, "exp"),
    jti: typeof e.jti === "string" ? e.jti : void 0,
  };
}
//@ chunk-p7xf186d.js:15071-15562 placement
async function verifyPeerAssertion(e, t, n) {
  let r = parseAssertion(e),
    i = parsePublicKey(t),
    key = await n.jwks.getKey(r.header.kid);
  await verifyAssertionSignature(r, key);
  let o = validatePeerClaims(r.payload),
    aud = r.payload.aud,
    a = aud === ASSERTION_CONSTANTS || (Array.isArray(aud) && aud.includes(ASSERTION_CONSTANTS));
  if (o.iss !== n.expectedIssuer || !a) throw new PairingError("wrong_issuer_or_audience");
  if (o.exp - o.iat > we) throw new PairingError("expired", `assertion lifetime exceeds ${we} s`);
  if (o.client_kind !== n.expectedKind) throw new PairingError("wrong_peer_kind", o.client_kind);
  if ((await sha256Base64Url(i)) !== o.cnf.jkt) throw new PairingError("key_binding_mismatch");
  return { claims: o, peerRaw: i };
}
//@ chunk-p7xf186d.js:15562-15660 placement
function checkAssertionTimes(e, t) {
  if (e.iat > t + ye) throw new PairingError("not_yet_valid");
  if (e.exp + ye <= t) throw new PairingError("expired");
}

export {
  vt,
  validatePeerClaims,
  parseAssertion,
  canonicalJson,
  verifyPeerAssertion,
  checkAssertionTimes,
  JwksCache,
};
