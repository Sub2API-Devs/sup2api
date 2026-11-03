/**
 * jose/dist/webapi/lib/jwt_claims_set.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (2), chunk-5h78gfwc.js (6)
 * attribution: esm-layout 1, esm-fingerprint 7
 */
import { textDecoder, textEncoder } from "./buffer_utils.js";
import { b } from "./type_checks.js";
import { O, z5, j } from "../../node/esm/util/errors.js";
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { jt } from "../../node/esm/jws/compact/sign.js";

//@ chunk-5h78gfwc.js:40204-40424 esm-fingerprint
var L = (e) => Math.floor(e.getTime() / 1000),
  Dt = 60,
  Ut = Dt * 60,
  De = Ut * 24,
  pr = De * 7,
  dr = De * 365.25,
  fr =
    /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
//@ chunk-5h78gfwc.js:40424-40999 esm-fingerprint
function pe(e) {
  let match = fr.exec(e);
  if (!match || (match[4] && match[1])) throw TypeError("Invalid time period format");
  let r = parseFloat(match[2]),
    lower = match[3].toLowerCase(),
    i;
  switch (lower) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      i = Math.round(r);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      i = Math.round(r * Dt);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      i = Math.round(r * Ut);
      break;
    case "day":
    case "days":
    case "d":
      i = Math.round(r * De);
      break;
    case "week":
    case "weeks":
    case "w":
      i = Math.round(r * pr);
      break;
    default:
      i = Math.round(r * dr);
      break;
  }
  if (match[1] === "-" || match[4] === "ago") return -i;
  return i;
}
//@ chunk-5h78gfwc.js:40999-41085 esm-fingerprint
function F(e, t) {
  if (!Number.isFinite(t)) throw TypeError(`Invalid ${e} input`);
  return t;
}
//@ chunk-5h78gfwc.js:41085-41315 esm-fingerprint
var Rt = (e) => {
    if (e.includes("/")) return e.toLowerCase();
    return `application/${e.toLowerCase()}`;
  },
  ur = (e, t) => {
    if (typeof e === "string") return t.includes(e);
    if (Array.isArray(e)) return t.some(Set.prototype.has.bind(new Set(e)));
    return !1;
  };
//@ chunk-5h78gfwc.js:41315-43218 esm-fingerprint
function Ae(e, t, r = {}) {
  let n;
  try {
    n = JSON.parse(textDecoder.decode(t));
  } catch {}
  if (!b(n)) throw new O("JWT Claims Set must be a top-level JSON object");
  let { typ: typ } = r;
  if (typ && (typeof e.typ !== "string" || Rt(e.typ) !== Rt(typ)))
    throw new z5('unexpected "typ" JWT header value', n, "typ", "check_failed");
  let {
      requiredClaims: requiredClaims = [],
      issuer: issuer,
      subject: subject,
      audience: audience,
      maxTokenAge: maxTokenAge,
    } = r,
    u = [...requiredClaims];
  if (maxTokenAge !== void 0) u.push("iat");
  if (audience !== void 0) u.push("aud");
  if (subject !== void 0) u.push("sub");
  if (issuer !== void 0) u.push("iss");
  for (let S of new Set(u.reverse()))
    if (!(S in n)) throw new z5(`missing required "${S}" claim`, n, S, "missing");
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(n.iss))
    throw new z5('unexpected "iss" claim value', n, "iss", "check_failed");
  if (subject && n.sub !== subject) throw new z5('unexpected "sub" claim value', n, "sub", "check_failed");
  if (audience && !ur(n.aud, typeof audience === "string" ? [audience] : audience))
    throw new z5('unexpected "aud" claim value', n, "aud", "check_failed");
  let m;
  switch (typeof r.clockTolerance) {
    case "string":
      m = pe(r.clockTolerance);
      break;
    case "number":
      m = r.clockTolerance;
      break;
    case "undefined":
      m = 0;
      break;
    default:
      throw TypeError("Invalid clockTolerance option type");
  }
  let { currentDate: currentDate } = r,
    K = L(currentDate || new Date());
  if ((n.iat !== void 0 || maxTokenAge) && typeof n.iat !== "number")
    throw new z5('"iat" claim must be a number', n, "iat", "invalid");
  if (n.nbf !== void 0) {
    if (typeof n.nbf !== "number") throw new z5('"nbf" claim must be a number', n, "nbf", "invalid");
    if (n.nbf > K + m) throw new z5('"nbf" claim timestamp check failed', n, "nbf", "check_failed");
  }
  if (n.exp !== void 0) {
    if (typeof n.exp !== "number") throw new z5('"exp" claim must be a number', n, "exp", "invalid");
    if (n.exp <= K - m) throw new j('"exp" claim timestamp check failed', n, "exp", "check_failed");
  }
  if (maxTokenAge) {
    let S = K - n.iat,
      l = typeof maxTokenAge === "number" ? maxTokenAge : pe(maxTokenAge);
    if (S - m > l)
      throw new j('"iat" claim timestamp check failed (too far in the past)', n, "iat", "check_failed");
    if (S < 0 - m)
      throw new z5('"iat" claim timestamp check failed (it should be in the past)', n, "iat", "check_failed");
  }
  return n;
}
//@ chunk-5h78gfwc.js:43218-44123 esm-fingerprint
class de {
  #e;
  constructor(e) {
    if (!b(e)) throw TypeError("JWT Claims Set MUST be an object");
    this.#e = structuredClone(e);
  }
  data() {
    return textEncoder.encode(JSON.stringify(this.#e));
  }
  get iss() {
    return this.#e.iss;
  }
  set iss(e) {
    this.#e.iss = e;
  }
  get sub() {
    return this.#e.sub;
  }
  set sub(e) {
    this.#e.sub = e;
  }
  get aud() {
    return this.#e.aud;
  }
  set aud(e) {
    this.#e.aud = e;
  }
  set jti(e) {
    this.#e.jti = e;
  }
  set nbf(e) {
    if (typeof e === "number") this.#e.nbf = F("setNotBefore", e);
    else if (e instanceof Date) this.#e.nbf = F("setNotBefore", L(e));
    else this.#e.nbf = L(new Date()) + pe(e);
  }
  set exp(e) {
    if (typeof e === "number") this.#e.exp = F("setExpirationTime", e);
    else if (e instanceof Date) this.#e.exp = F("setExpirationTime", L(e));
    else this.#e.exp = L(new Date()) + pe(e);
  }
  set iat(e) {
    if (e === void 0) this.#e.iat = L(new Date());
    else if (e instanceof Date) this.#e.iat = F("setIssuedAt", L(e));
    else if (typeof e === "string") this.#e.iat = F("setIssuedAt", L(new Date()) + pe(e));
    else this.#e.iat = F("setIssuedAt", e);
  }
}
//@ chunk-2tyrgda4.js:38804-38826 esm-layout
var st = Xa(() => {
  jt();
});
//@ chunk-2tyrgda4.js:38826-38867 esm-fingerprint
var Pe = (e) => Math.floor(e.getTime() / 1000);

export { Pe, st, Ae, de };
