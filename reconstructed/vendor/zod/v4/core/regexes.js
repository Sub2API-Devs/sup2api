/**
 * zod/v4/core/regexes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (21)
 * attribution: esm-layout 6, esm-fingerprint 15
 */
import { _safeParseAsync } from "./parse.js";

//@ chunk-7vp249v4.js:5287-5326 esm-layout
var ur = (e) => async (t, r, n) => _safeParseAsync(e)(t, r, n);
//@ chunk-7vp249v4.js:5326-5490 esm-fingerprint
var ar = /^[cC][0-9a-z]{6,}$/;
var cuid2 = /^[0-9a-z]+$/;
var ulid = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/;
var xid = /^[0-9a-vA-V]{20}$/;
var ksuid = /^[A-Za-z0-9]{27}$/;
var nanoid = /^[a-zA-Z0-9_-]{21}$/;
//@ chunk-7vp249v4.js:5490-5548 esm-fingerprint
function hr(length) {
  return new RegExp(`^[a-zA-Z0-9_-]{${length}}$`);
}
//@ chunk-7vp249v4.js:5548-5651 esm-fingerprint
var duration =
  /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
//@ chunk-7vp249v4.js:5651-6044 esm-fingerprint
var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
var uuid = (version) => {
  if (!version)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(
    `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
  );
};
//@ chunk-7vp249v4.js:6044-6156 esm-fingerprint
var email =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
//@ chunk-7vp249v4.js:6156-6288 esm-fingerprint
var _emoji =
  "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
//@ chunk-7vp249v4.js:6288-6328 esm-layout
function vr() {
  return new RegExp(_emoji, "u");
}
//@ chunk-7vp249v4.js:6328-6839 esm-fingerprint
var ipv4 =
  /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6 =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
//@ chunk-7vp249v4.js:6839-7538 esm-fingerprint
var cidrv4 =
  /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
var cidrv6 =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
var base64url = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
//@ chunk-7vp249v4.js:7538-7579 esm-fingerprint
var httpProtocol = /^https?$/;
var e164 = /^\+[1-9]\d{6,14}$/;
//@ chunk-7vp249v4.js:7579-7800 esm-fingerprint
var dateSource =
  "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
//@ chunk-7vp249v4.js:7800-7843 esm-layout
function anchor(source) {
  return new RegExp(`^${source}$`);
}
//@ chunk-7vp249v4.js:7843-7857 esm-layout
var Or = anchor(dateSource);
//@ chunk-7vp249v4.js:7857-8189 esm-layout
function timeSource(args) {
  return typeof args.precision === "number"
    ? args.precision === -1
      ? "(?:[01]\\d|2[0-3]):[0-5]\\d"
      : args.precision === 0
        ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d"
        : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${args.precision}}`
    : args.seconds
      ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?"
      : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
}
//@ chunk-7vp249v4.js:8189-8236 esm-layout
function Ar(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
//@ chunk-7vp249v4.js:8236-8475 esm-fingerprint
function datetime(args) {
  let opts = ["Z"];
  if (args.offset) opts.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  let qualified = `${timeSource({
    precision: args.precision,
    seconds: true,
  })}(?:${opts.join("|")})`;
  let timeRegex = args.local
    ? `${qualified}|${timeSource({
        precision: args.precision,
      })}`
    : qualified;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
//@ chunk-7vp249v4.js:8475-8497 esm-fingerprint
var anyString = /^[\s\S]{0,}$/;
//@ chunk-7vp249v4.js:8497-8572 esm-fingerprint
var integer = /^-?\d+$/;
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;
var _null = /^null$/i;
//@ chunk-7vp249v4.js:8572-8594 esm-fingerprint
var _undefined = /^undefined$/i;
//@ chunk-7vp249v4.js:8594-8628 esm-fingerprint
var lowercase = /^[^A-Z]*$/;
var uppercase = /^[^a-z]*$/;
export {
  lowercase,
  uppercase,
  anyString,
  guid,
  uuid,
  email,
  httpProtocol,
  vr,
  nanoid,
  hr,
  ar,
  cuid2,
  ulid,
  xid,
  ksuid,
  datetime,
  Or,
  Ar,
  duration,
  ipv4,
  ipv6,
  cidrv4,
  cidrv6,
  e164,
  number,
  boolean,
  _undefined,
  _null,
  base64,
  base64url,
  integer,
  ur,
};
