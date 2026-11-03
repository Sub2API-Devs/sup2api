/**
 * zod/v4/core/regexes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (21)
 * attribution: esm-layout 6, esm-fingerprint 15
 */
import { ae } from "./parse.js";

//@ chunk-7vp249v4.js:5287-5326 esm-layout
var ur = (e) => async (t, r, n) => ae(e)(t, r, n);
//@ chunk-7vp249v4.js:5326-5490 esm-fingerprint
var ar = /^[cC][0-9a-z]{6,}$/,
  lr = /^[0-9a-z]+$/,
  pr = /^[0-7][0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{25}$/,
  fr = /^[0-9a-vA-V]{20}$/,
  dr = /^[A-Za-z0-9]{27}$/,
  mr = /^[a-zA-Z0-9_-]{21}$/;
//@ chunk-7vp249v4.js:5490-5548 esm-fingerprint
function hr(e) {
  return new RegExp(`^[a-zA-Z0-9_-]{${e}}$`);
}
//@ chunk-7vp249v4.js:5548-5651 esm-fingerprint
var _r = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
//@ chunk-7vp249v4.js:5651-6044 esm-fingerprint
var gr = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  Ee = (e) => {
    if (!e)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(
      `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
    );
  };
//@ chunk-7vp249v4.js:6044-6156 esm-fingerprint
var xr =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
//@ chunk-7vp249v4.js:6156-6288 esm-fingerprint
var ms =
  "^(?=[\\s\\S]*[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\u20E3])[\\p{Extended_Pictographic}\\p{Emoji_Component}]+$";
//@ chunk-7vp249v4.js:6288-6328 esm-layout
function vr() {
  return new RegExp(ms, "u");
}
//@ chunk-7vp249v4.js:6328-6839 esm-fingerprint
var yr =
    /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  $r =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
//@ chunk-7vp249v4.js:6839-7538 esm-fingerprint
var zr =
    /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,
  br =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  kr = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,
  Zr = /^(?:[A-Za-z0-9_-]{4})*(?:[A-Za-z0-9_-]{2,3})?$/;
//@ chunk-7vp249v4.js:7538-7579 esm-fingerprint
var wr = /^https?$/,
  Pr = /^\+[1-9]\d{6,14}$/;
//@ chunk-7vp249v4.js:7579-7800 esm-fingerprint
var Sr =
  "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
//@ chunk-7vp249v4.js:7800-7843 esm-layout
function hs(e) {
  return new RegExp(`^${e}$`);
}
//@ chunk-7vp249v4.js:7843-7857 esm-layout
var Or = hs(Sr);
//@ chunk-7vp249v4.js:7857-8189 esm-layout
function Ae(e) {
  return typeof e.precision === "number"
    ? e.precision === -1
      ? "(?:[01]\\d|2[0-3]):[0-5]\\d"
      : e.precision === 0
        ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d"
        : `(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d\\.\\d{${e.precision}}`
    : e.seconds
      ? "(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?"
      : "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?";
}
//@ chunk-7vp249v4.js:8189-8236 esm-layout
function Ar(e) {
  return new RegExp(`^${Ae(e)}$`);
}
//@ chunk-7vp249v4.js:8236-8475 esm-fingerprint
function Er(e) {
  let t = ["Z"];
  if (e.offset) t.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  let r = `${Ae({ precision: e.precision, seconds: !0 })}(?:${t.join("|")})`,
    n = e.local ? `${r}|${Ae({ precision: e.precision })}` : r;
  return new RegExp(`^${Sr}T(?:${n})$`);
}
//@ chunk-7vp249v4.js:8475-8497 esm-fingerprint
var Tr = /^[\s\S]{0,}$/;
//@ chunk-7vp249v4.js:8497-8572 esm-fingerprint
var Te = /^-?\d+$/,
  V = /^-?\d+(?:\.\d+)?$/,
  Nr = /^(?:true|false)$/i,
  Cr = /^null$/i;
//@ chunk-7vp249v4.js:8572-8594 esm-fingerprint
var Rr = /^undefined$/i;
//@ chunk-7vp249v4.js:8594-8628 esm-fingerprint
var Dr = /^[^A-Z]*$/,
  jr = /^[^a-z]*$/;

export {
  Dr,
  jr,
  Tr,
  gr,
  Ee,
  xr,
  wr,
  vr,
  mr,
  hr,
  ar,
  lr,
  pr,
  fr,
  dr,
  Er,
  Or,
  Ar,
  _r,
  yr,
  $r,
  zr,
  br,
  Pr,
  V,
  Nr,
  Rr,
  Cr,
  kr,
  Zr,
  Te,
  ur,
};
