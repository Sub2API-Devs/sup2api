/**
 * zod/v4/core/api.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (64), chunk-dcmhvw5a.js (1)
 * attribution: esm-layout 8, esm-fingerprint 57
 */
import { Ld, TIi, YJt } from "./util.js";
import { Re, De, Lr, Ur, Jr, Br, Vr, Kr, Wr, Gr, qr, Yr, Xr } from "./checks.js";
import { Rs } from "../classic/schemas.js";
import { Kp, Aw } from "./json-schema-processors.js";
import { zodChecksOf } from "../../../../src/utils/settings/schemaOutput.js";

//@ chunk-7vp249v4.js:51186-51242 esm-layout
function bn(e, t) {
  return new e({ type: "string", ...Ld(t) });
}
//@ chunk-7vp249v4.js:51242-51309 esm-fingerprint
function mIi(e, t) {
  return new e({ type: "string", coerce: !0, ...Ld(t) });
}
//@ chunk-7vp249v4.js:51309-51411 esm-fingerprint
function Ye(e, t) {
  return new e({ type: "string", format: "email", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:51411-51512 esm-fingerprint
function Xe(e, t) {
  return new e({ type: "string", format: "guid", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:51512-51613 esm-fingerprint
function He(e, t) {
  return new e({ type: "string", format: "uuid", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:51613-51727 esm-fingerprint
function kn(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...Ld(t),
  });
}
//@ chunk-7vp249v4.js:51727-51841 esm-fingerprint
function Zn(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...Ld(t),
  });
}
//@ chunk-7vp249v4.js:51841-51955 esm-fingerprint
function wn(e, t) {
  return new e({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...Ld(t),
  });
}
//@ chunk-7vp249v4.js:51955-52055 esm-fingerprint
function Qe(e, t) {
  return new e({ type: "string", format: "url", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52055-52157 esm-fingerprint
function Pn(e, t) {
  return new e({ type: "string", format: "emoji", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52157-52260 esm-fingerprint
function Sn(e, t) {
  return new e({ type: "string", format: "nanoid", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52260-52361 esm-fingerprint
function In(e, t) {
  return new e({ type: "string", format: "cuid", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52361-52463 esm-fingerprint
function On(e, t) {
  return new e({ type: "string", format: "cuid2", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52463-52564 esm-fingerprint
function An(e, t) {
  return new e({ type: "string", format: "ulid", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52564-52664 esm-fingerprint
function En(e, t) {
  return new e({ type: "string", format: "xid", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52664-52766 esm-fingerprint
function Tn(e, t) {
  return new e({ type: "string", format: "ksuid", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52766-52867 esm-fingerprint
function Nn(e, t) {
  return new e({ type: "string", format: "ipv4", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52867-52968 esm-fingerprint
function Cn(e, t) {
  return new e({ type: "string", format: "ipv6", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:52968-53071 esm-fingerprint
function Rn(e, t) {
  return new e({ type: "string", format: "cidrv4", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:53071-53174 esm-fingerprint
function Dn(e, t) {
  return new e({ type: "string", format: "cidrv6", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:53174-53277 esm-fingerprint
function et(e, t) {
  return new e({ type: "string", format: "base64", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:53277-53383 esm-fingerprint
function jn(e, t) {
  return new e({ type: "string", format: "base64url", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:53383-53484 esm-fingerprint
function Ln(e, t) {
  return new e({ type: "string", format: "e164", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:53484-53584 esm-fingerprint
function Fn(e, t) {
  return new e({ type: "string", format: "jwt", check: "string_format", abort: !1, ...Ld(t) });
}
//@ chunk-7vp249v4.js:53584-53650 esm-fingerprint
var gIi = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
//@ chunk-7vp249v4.js:53650-53781 esm-fingerprint
function rlo(e, t) {
  return new e({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...Ld(t),
  });
}
//@ chunk-7vp249v4.js:53781-53874 esm-fingerprint
function olo(e, t) {
  return new e({ type: "string", format: "date", check: "string_format", ...Ld(t) });
}
//@ chunk-7vp249v4.js:53874-53981 esm-fingerprint
function Mn(e, t) {
  return new e({ type: "string", format: "time", check: "string_format", precision: null, ...Ld(t) });
}
//@ chunk-7vp249v4.js:53981-54077 esm-fingerprint
function Un(e, t) {
  return new e({ type: "string", format: "duration", check: "string_format", ...Ld(t) });
}
//@ chunk-7vp249v4.js:54077-54143 esm-fingerprint
function Jn(e, t) {
  return new e({ type: "number", checks: [], ...Ld(t) });
}
//@ chunk-7vp249v4.js:54143-54220 esm-fingerprint
function hIi(e, t) {
  return new e({ type: "number", coerce: !0, checks: [], ...Ld(t) });
}
//@ chunk-7vp249v4.js:54220-54324 esm-fingerprint
function Bn(e, t) {
  return new e({ type: "number", check: "number_format", abort: !1, format: "safeint", ...Ld(t) });
}
//@ chunk-7vp249v4.js:54324-54426 esm-fingerprint
function Vn(e, t) {
  return new e({ type: "number", check: "number_format", abort: !1, format: "int32", ...Ld(t) });
}
//@ chunk-7vp249v4.js:54426-54483 esm-layout
function Kn(e, t) {
  return new e({ type: "boolean", ...Ld(t) });
}
//@ chunk-7vp249v4.js:54483-54551 esm-fingerprint
function yIi(e, t) {
  return new e({ type: "boolean", coerce: !0, ...Ld(t) });
}
//@ chunk-7vp249v4.js:54551-54610 esm-layout
function Wn(e, t) {
  return new e({ type: "undefined", ...Ld(t) });
}
//@ chunk-7vp249v4.js:54610-54664 esm-layout
function Gn(e, t) {
  return new e({ type: "null", ...Ld(t) });
}
//@ chunk-7vp249v4.js:54664-54706 esm-fingerprint
function qn(e) {
  return new e({ type: "any" });
}
//@ chunk-7vp249v4.js:54706-54752 esm-fingerprint
function Yn(e) {
  return new e({ type: "unknown" });
}
//@ chunk-7vp249v4.js:54752-54807 esm-fingerprint
function Xn(e, t) {
  return new e({ type: "never", ...Ld(t) });
}
//@ chunk-7vp249v4.js:54807-54889 esm-fingerprint
function ye(e, t) {
  return new Re({ check: "less_than", ...Ld(t), value: e, inclusive: !1 });
}
//@ chunk-7vp249v4.js:54889-54970 esm-fingerprint
function Y(e, t) {
  return new Re({ check: "less_than", ...Ld(t), value: e, inclusive: !0 });
}
//@ chunk-7vp249v4.js:54970-55055 esm-fingerprint
function $e(e, t) {
  return new De({ check: "greater_than", ...Ld(t), value: e, inclusive: !1 });
}
//@ chunk-7vp249v4.js:55055-55139 esm-fingerprint
function X(e, t) {
  return new De({ check: "greater_than", ...Ld(t), value: e, inclusive: !0 });
}
//@ chunk-7vp249v4.js:55139-55210 esm-fingerprint
function ze(e, t) {
  return new Lr({ check: "multiple_of", ...Ld(t), value: e });
}
//@ chunk-7vp249v4.js:55210-55283 esm-fingerprint
function aMn(e, t) {
  return new Ur({ check: "max_length", ...Ld(t), maximum: e });
}
//@ chunk-7vp249v4.js:55283-55354 esm-fingerprint
function R(e, t) {
  return new Jr({ check: "min_length", ...Ld(t), minimum: e });
}
//@ chunk-7vp249v4.js:55354-55428 esm-fingerprint
function be(e, t) {
  return new Br({ check: "length_equals", ...Ld(t), length: e });
}
//@ chunk-7vp249v4.js:55428-55518 esm-fingerprint
function tt(e, t) {
  return new Vr({ check: "string_format", format: "regex", ...Ld(t), pattern: e });
}
//@ chunk-7vp249v4.js:55518-55600 esm-fingerprint
function rt(e) {
  return new Kr({ check: "string_format", format: "lowercase", ...Ld(e) });
}
//@ chunk-7vp249v4.js:55600-55682 esm-fingerprint
function ot(e) {
  return new Wr({ check: "string_format", format: "uppercase", ...Ld(e) });
}
//@ chunk-7vp249v4.js:55682-55776 esm-fingerprint
function nt(e, t) {
  return new Gr({ check: "string_format", format: "includes", ...Ld(t), includes: e });
}
//@ chunk-7vp249v4.js:55776-55871 esm-fingerprint
function it(e, t) {
  return new qr({ check: "string_format", format: "starts_with", ...Ld(t), prefix: e });
}
//@ chunk-7vp249v4.js:55871-55964 esm-fingerprint
function st(e, t) {
  return new Yr({ check: "string_format", format: "ends_with", ...Ld(t), suffix: e });
}
//@ chunk-7vp249v4.js:55964-56018 esm-fingerprint
function C(e) {
  return new Xr({ check: "overwrite", tx: e });
}
//@ chunk-7vp249v4.js:56018-56063 esm-fingerprint
function ct(e) {
  return C((t) => t.normalize(e));
}
//@ chunk-7vp249v4.js:56063-56101 esm-layout
function ut() {
  return C((e) => e.trim());
}
//@ chunk-7vp249v4.js:56101-56146 esm-layout
function at() {
  return C((e) => e.toLowerCase());
}
//@ chunk-7vp249v4.js:56146-56191 esm-layout
function lt() {
  return C((e) => e.toUpperCase());
}
//@ chunk-7vp249v4.js:56191-56227 esm-layout
function pt() {
  return C((e) => TIi(e));
}
//@ chunk-7vp249v4.js:56227-56294 esm-fingerprint
function Hn(e, t, r) {
  return new e({ type: "array", element: t, ...Ld(r) });
}
//@ chunk-7vp249v4.js:56294-56402 esm-fingerprint
function Qn(e, t, r) {
  let n = Ld(r);
  return (n.abort ?? (n.abort = !0), new e({ type: "custom", check: "custom", fn: t, ...n }));
}
//@ chunk-7vp249v4.js:56402-56480 esm-fingerprint
function ei(e, t, r) {
  return new e({ type: "custom", check: "custom", fn: t, ...Ld(r) });
}
//@ chunk-7vp249v4.js:56480-56803 esm-fingerprint
function ti(e, t) {
  let r = Rs(
    (n) => (
      (n.addIssue = (i) => {
        if (typeof i === "string") n.issues.push(YJt(i, n.value, r._zod.def));
        else {
          let s = i;
          if (s.fatal) s.continue = !1;
          if ((s.code ?? (s.code = "custom"), !("input" in s))) s.input = n.value;
          (s.inst ?? (s.inst = r), s.continue ?? (s.continue = !r._zod.def.abort), n.issues.push(YJt(s)));
        }
      }),
      e(n.value, n)
    ),
    t,
  );
  return r;
}
//@ chunk-dcmhvw5a.js:431399-431646 esm-fingerprint
function kw(e, n) {
  if (typeof e.format !== "string" || !Kp.has(e.format)) return;
  let r;
  for (let a of zodChecksOf(n))
    if (a.check === "string_format" && a.format !== void 0 && !Kp.has(a.format)) r = a.format;
  let s = r === void 0 ? "" : (Aw[r] ?? r);
  if (s === "") delete e.format;
  else e.format = s;
}

export {
  mIi,
  hIi,
  yIi,
  C,
  tt,
  nt,
  it,
  st,
  R,
  aMn,
  be,
  rt,
  ot,
  ut,
  ct,
  at,
  lt,
  pt,
  Ye,
  Qe,
  Fn,
  Pn,
  Xe,
  He,
  kn,
  Zn,
  wn,
  Sn,
  In,
  On,
  An,
  et,
  jn,
  En,
  Tn,
  Nn,
  Cn,
  Rn,
  Dn,
  Ln,
  rlo,
  olo,
  Mn,
  Un,
  bn,
  $e,
  X,
  ye,
  Y,
  ze,
  Jn,
  Bn,
  Vn,
  Kn,
  Wn,
  Gn,
  qn,
  Yn,
  Xn,
  Hn,
  Qn,
  ei,
  ti,
  kw,
  gIi,
};
