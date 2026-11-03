/**
 * zod/v4/core/api.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (64), chunk-dcmhvw5a.js (1)
 * attribution: esm-layout 8, esm-fingerprint 57
 */
import { normalizeParams, slugify, issue } from "./util.js";
import {
  $ZodCheckLessThan,
  $ZodCheckGreaterThan,
  $ZodCheckMultipleOf,
  Ur,
  $ZodCheckMinLength,
  $ZodCheckLengthEquals,
  $ZodCheckRegex,
  $ZodCheckLowerCase,
  $ZodCheckUpperCase,
  $ZodCheckIncludes,
  $ZodCheckStartsWith,
  $ZodCheckEndsWith,
  Xr,
} from "./checks.js";
import { Rs } from "../classic/schemas.js";
import { Kp, Aw } from "./json-schema-processors.js";
import { zodChecksOf } from "../../../../src/utils/settings/schemaOutput.js";

//@ chunk-7vp249v4.js:51186-51242 esm-layout
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51242-51309 esm-fingerprint
function _coercedString(Class, params) {
  return new Class({
    type: "string",
    coerce: true,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51309-51411 esm-fingerprint
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51411-51512 esm-fingerprint
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51512-51613 esm-fingerprint
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51613-51727 esm-fingerprint
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51727-51841 esm-fingerprint
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51841-51955 esm-fingerprint
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:51955-52055 esm-fingerprint
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52055-52157 esm-fingerprint
function _emoji_2(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52157-52260 esm-fingerprint
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52260-52361 esm-fingerprint
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52361-52463 esm-fingerprint
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52463-52564 esm-fingerprint
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52564-52664 esm-fingerprint
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52664-52766 esm-fingerprint
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52766-52867 esm-fingerprint
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52867-52968 esm-fingerprint
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:52968-53071 esm-fingerprint
function _mac(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53071-53174 esm-fingerprint
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53174-53277 esm-fingerprint
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53277-53383 esm-fingerprint
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53383-53484 esm-fingerprint
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53484-53584 esm-fingerprint
function _creditCard(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53584-53650 esm-fingerprint
var TimePrecision = {
  Any: null,
  Minute: -1,
  Second: 0,
  Millisecond: 3,
  Microsecond: 6,
};
//@ chunk-7vp249v4.js:53650-53781 esm-fingerprint
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53781-53874 esm-fingerprint
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53874-53981 esm-fingerprint
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:53981-54077 esm-fingerprint
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54077-54143 esm-fingerprint
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54143-54220 esm-fingerprint
function _coercedNumber(Class, params) {
  return new Class({
    type: "number",
    coerce: true,
    checks: [],
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54220-54324 esm-fingerprint
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54324-54426 esm-fingerprint
function _float32(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "int32",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54426-54483 esm-layout
function _uint32(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54483-54551 esm-fingerprint
function _coercedBoolean(Class, params) {
  return new Class({
    type: "boolean",
    coerce: true,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54551-54610 esm-layout
function _bigint(Class, params) {
  return new Class({
    type: "undefined",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54610-54664 esm-layout
function _null_2(Class, params) {
  return new Class({
    type: "null",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54664-54706 esm-fingerprint
function qn(Class) {
  return new Class({
    type: "any",
  });
}
//@ chunk-7vp249v4.js:54706-54752 esm-fingerprint
function _unknown(Class) {
  return new Class({
    type: "unknown",
  });
}
//@ chunk-7vp249v4.js:54752-54807 esm-fingerprint
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:54807-54889 esm-fingerprint
function ye(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false,
  });
}
//@ chunk-7vp249v4.js:54889-54970 esm-fingerprint
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true,
  });
}
//@ chunk-7vp249v4.js:54970-55055 esm-fingerprint
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false,
  });
}
//@ chunk-7vp249v4.js:55055-55139 esm-fingerprint
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true,
  });
}
//@ chunk-7vp249v4.js:55139-55210 esm-fingerprint
function ze(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value,
  });
}
//@ chunk-7vp249v4.js:55210-55283 esm-fingerprint
function _maxSize(maximum, params) {
  return new Ur({
    check: "max_length",
    ...normalizeParams(params),
    maximum,
  });
}
//@ chunk-7vp249v4.js:55283-55354 esm-fingerprint
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum,
  });
}
//@ chunk-7vp249v4.js:55354-55428 esm-fingerprint
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length,
  });
}
//@ chunk-7vp249v4.js:55428-55518 esm-fingerprint
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern,
  });
}
//@ chunk-7vp249v4.js:55518-55600 esm-fingerprint
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:55600-55682 esm-fingerprint
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:55682-55776 esm-fingerprint
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes,
  });
}
//@ chunk-7vp249v4.js:55776-55871 esm-fingerprint
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix,
  });
}
//@ chunk-7vp249v4.js:55871-55964 esm-fingerprint
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix,
  });
}
//@ chunk-7vp249v4.js:55964-56018 esm-fingerprint
function _overwrite(tx) {
  return new Xr({
    check: "overwrite",
    tx,
  });
}
//@ chunk-7vp249v4.js:56018-56063 esm-fingerprint
function _normalize(form) {
  return _overwrite((input) => input.normalize(form));
}
//@ chunk-7vp249v4.js:56063-56101 esm-layout
function ut() {
  return _overwrite((input) => input.trim());
}
//@ chunk-7vp249v4.js:56101-56146 esm-layout
function _toLowerCase() {
  return _overwrite((input) => input.toLowerCase());
}
//@ chunk-7vp249v4.js:56146-56191 esm-layout
function _toUpperCase() {
  return _overwrite((input) => input.toUpperCase());
}
//@ chunk-7vp249v4.js:56191-56227 esm-layout
function pt() {
  return _overwrite((input) => slugify(input));
}
//@ chunk-7vp249v4.js:56227-56294 esm-fingerprint
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    ...normalizeParams(params),
  });
}
//@ chunk-7vp249v4.js:56294-56402 esm-fingerprint
function Qn(e, fn, params) {
  let n = normalizeParams(params);
  n.abort ?? (n.abort = true);
  return new e({
    type: "custom",
    check: "custom",
    fn,
    ...n,
  });
}
//@ chunk-7vp249v4.js:56402-56480 esm-fingerprint
function _refine(Class, fn, r) {
  return new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(r),
  });
}
//@ chunk-7vp249v4.js:56480-56803 esm-fingerprint
function _superRefine(fn, t) {
  let ch = Rs((payload) => {
    payload.addIssue = (issue_2) => {
      if (typeof issue_2 === "string") payload.issues.push(issue(issue_2, payload.value, ch._zod.def));
      else {
        let _issue = issue_2;
        if (_issue.fatal) _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        if (!("input" in _issue)) _issue.input = payload.value;
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, t);
  return ch;
}
//@ chunk-dcmhvw5a.js:431399-431646 esm-fingerprint
function kw(jsonSchema, params) {
  if (typeof jsonSchema.format !== "string" || !Kp.has(jsonSchema.format)) return;
  let r;
  for (let a of zodChecksOf(params))
    if (a.check === "string_format" && a.format !== undefined && !Kp.has(a.format)) r = a.format;
  let s = r === undefined ? "" : (Aw[r] ?? r);
  if (s === "") delete jsonSchema.format;
  else jsonSchema.format = s;
}
export {
  _coercedString,
  _coercedNumber,
  _coercedBoolean,
  _overwrite,
  _regex,
  _includes,
  _startsWith,
  _endsWith,
  _minLength,
  _maxSize,
  _length,
  _lowercase,
  _uppercase,
  ut,
  _normalize,
  _toLowerCase,
  _toUpperCase,
  pt,
  _email,
  _url,
  _creditCard,
  _emoji_2,
  _guid,
  _uuid,
  _uuidv4,
  _uuidv6,
  _uuidv7,
  _nanoid,
  _cuid,
  _cuid2,
  _ulid,
  _base64,
  _base64url,
  _xid,
  _ksuid,
  _ipv4,
  _ipv6,
  _mac,
  _cidrv6,
  _e164,
  _isoDateTime,
  _isoDate,
  _isoTime,
  _isoDuration,
  _string,
  _gt,
  _gte,
  ye,
  _lte,
  ze,
  _number,
  _int,
  _float32,
  _uint32,
  _bigint,
  _null_2,
  qn,
  _unknown,
  _never,
  _array,
  Qn,
  _refine,
  _superRefine,
  kw,
  TimePrecision,
};
