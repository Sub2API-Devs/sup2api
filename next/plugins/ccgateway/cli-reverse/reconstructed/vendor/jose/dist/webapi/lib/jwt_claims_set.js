/**
 * jose/dist/webapi/lib/jwt_claims_set.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (6), chunk-pd6th42n.js (2)
 * attribution: esm-fingerprint 7, esm-layout 1
 */
import { textDecoder, textEncoder } from "./buffer_utils.js";
import { isObject } from "./type_checks.js";
import { JWTInvalid, JWTClaimValidationFailed, JWTExpired } from "../../node/esm/util/errors.js";
import { __esm } from "../../../../../runtime/bun-runtime.js";
import { init_sign_2 } from "../../node/esm/jws/compact/sign.js";

//@ chunk-0f6azspv.js:40204-40424 esm-fingerprint
var epoch = (date) => Math.floor(date.getTime() / 1000);
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX =
  /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
//@ chunk-0f6azspv.js:40424-40999 esm-fingerprint
function secs(str) {
  let matched = REGEX.exec(str);
  if (!matched || (matched[4] && matched[1])) throw TypeError("Invalid time period format");
  let value = parseFloat(matched[2]);
  let unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") return -numericDate;
  return numericDate;
}
//@ chunk-0f6azspv.js:40999-41085 esm-fingerprint
function validateInput(label, input) {
  if (!Number.isFinite(input)) throw TypeError(`Invalid ${label} input`);
  return input;
}
//@ chunk-0f6azspv.js:41085-41315 esm-fingerprint
var normalizeTyp = (value) => {
  if (value.includes("/")) return value.toLowerCase();
  return `application/${value.toLowerCase()}`;
};
var checkAudiencePresence = (audPayload, audOption) => {
  if (typeof audPayload === "string") return audOption.includes(audPayload);
  if (Array.isArray(audPayload)) return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  return false;
};
//@ chunk-0f6azspv.js:41315-43218 esm-fingerprint
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(textDecoder.decode(encodedPayload));
  } catch {}
  if (!isObject(payload)) throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  let { typ } = options;
  if (
    typ &&
    (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))
  )
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  let { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  let presenceCheck = [...requiredClaims];
  if (maxTokenAge !== undefined) presenceCheck.push("iat");
  if (audience !== undefined) presenceCheck.push("aud");
  if (subject !== undefined) presenceCheck.push("sub");
  if (issuer !== undefined) presenceCheck.push("iss");
  for (let claim of new Set(presenceCheck.reverse()))
    if (!(claim in payload))
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss))
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  if (subject && payload.sub !== subject)
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience))
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw TypeError("Invalid clockTolerance option type");
  }
  let { currentDate } = options;
  let now = epoch(currentDate || new Date());
  if ((payload.iat !== undefined || maxTokenAge) && typeof payload.iat !== "number")
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  if (payload.nbf !== undefined) {
    if (typeof payload.nbf !== "number")
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    if (payload.nbf > now + tolerance)
      throw new JWTClaimValidationFailed(
        '"nbf" claim timestamp check failed',
        payload,
        "nbf",
        "check_failed",
      );
  }
  if (payload.exp !== undefined) {
    if (typeof payload.exp !== "number")
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    if (payload.exp <= now - tolerance)
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
  }
  if (maxTokenAge) {
    let age = now - payload.iat;
    let max = typeof maxTokenAge === "number" ? maxTokenAge : secs(maxTokenAge);
    if (age - tolerance > max)
      throw new JWTExpired(
        '"iat" claim timestamp check failed (too far in the past)',
        payload,
        "iat",
        "check_failed",
      );
    if (age < 0 - tolerance)
      throw new JWTClaimValidationFailed(
        '"iat" claim timestamp check failed (it should be in the past)',
        payload,
        "iat",
        "check_failed",
      );
  }
  return payload;
}
//@ chunk-0f6azspv.js:43218-44123 esm-fingerprint
class JWTClaimsSetVerifier {
  #e;
  constructor(payload) {
    if (!isObject(payload)) throw TypeError("JWT Claims Set MUST be an object");
    this.#e = structuredClone(payload);
  }
  data() {
    return textEncoder.encode(JSON.stringify(this.#e));
  }
  get iss() {
    return this.#e.iss;
  }
  set iss(value) {
    this.#e.iss = value;
  }
  get sub() {
    return this.#e.sub;
  }
  set sub(value) {
    this.#e.sub = value;
  }
  get aud() {
    return this.#e.aud;
  }
  set aud(value) {
    this.#e.aud = value;
  }
  set jti(value) {
    this.#e.jti = value;
  }
  set nbf(value) {
    if (typeof value === "number") this.#e.nbf = validateInput("setNotBefore", value);
    else if (value instanceof Date) this.#e.nbf = validateInput("setNotBefore", epoch(value));
    else this.#e.nbf = epoch(new Date()) + secs(value);
  }
  set exp(value) {
    if (typeof value === "number") this.#e.exp = validateInput("setExpirationTime", value);
    else if (value instanceof Date) this.#e.exp = validateInput("setExpirationTime", epoch(value));
    else this.#e.exp = epoch(new Date()) + secs(value);
  }
  set iat(value) {
    if (value === undefined) this.#e.iat = epoch(new Date());
    else if (value instanceof Date) this.#e.iat = validateInput("setIssuedAt", epoch(value));
    else if (typeof value === "string")
      this.#e.iat = validateInput("setIssuedAt", epoch(new Date()) + secs(value));
    else this.#e.iat = validateInput("setIssuedAt", value);
  }
}
//@ chunk-pd6th42n.js:38804-38826 esm-layout
var init_jwt_claims_set = __esm(() => {
  init_sign_2();
});
//@ chunk-pd6th42n.js:38826-38867 esm-fingerprint
var epoch_2 = (date) => Math.floor(date.getTime() / 1000);
export { validateClaimsSet, JWTClaimsSetVerifier, epoch_2, init_jwt_claims_set };
