/**
 * @anthropic-ai/bedrock-sdk/internal/headers.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-e7naa6k8.js (3), chunk-h87x8cg3.js (3), chunk-qhhcfyds.js (4)
 * attribution: esm-fingerprint 6, esm-layout 4
 */
import { C } from "./utils/values.mjs";
import { P } from "./qs/utils.js";

//@ chunk-qhhcfyds.js:670-708 esm-layout
var d = (e) => ((d = Array.isArray), d(e)),
  A = d;
//@ chunk-qhhcfyds.js:708-757 esm-fingerprint
var I = Symbol.for("brand.privateNullableHeaders");
//@ chunk-qhhcfyds.js:757-1186 esm-fingerprint
function* M(e) {
  if (!e) return;
  if (I in e) {
    let { values: values, nulls: nulls } = e;
    yield* values.entries();
    for (let i of nulls) yield [i, null];
    return;
  }
  let t = !1,
    r;
  if (e instanceof Headers) r = e.entries();
  else if (A(e)) r = e;
  else ((t = !0), (r = Object.entries(e ?? {})));
  for (let n of r) {
    let o = n[0];
    if (typeof o !== "string") throw TypeError("expected header name to be a string");
    let i = A(n[1]) ? n[1] : [n[1]],
      s = !1;
    for (let a of i) {
      if (a === void 0) continue;
      if (t && !s) ((s = !0), yield [o, w]);
      yield [o, a];
    }
  }
}
//@ chunk-qhhcfyds.js:1186-1788 esm-layout
var w = Symbol("clear"),
  Q = new Set(["x-stainless-helper"]),
  J_qhhc = (e, t) => {
    let r = e
      ? e
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
      : [];
    for (let n of t.split(",").map((o) => o.trim())) if (n && !r.includes(n)) r.push(n);
    return r.join(", ");
  },
  E = (e) => {
    let headers = new Headers(),
      r = new Set();
    for (let n of e) {
      let o = new Set();
      for (let [i, s] of M(n)) {
        let lower = i.toLowerCase();
        if (Q.has(lower)) {
          if (s === w) continue;
          if (s === null) (headers.delete(i), r.add(lower));
          else (headers.set(i, J_qhhc(headers.get(i), s)), r.delete(lower));
          continue;
        }
        if (s === w || !o.has(lower)) {
          if ((headers.delete(i), o.add(lower), s === w)) continue;
        }
        if (s === null) (headers.delete(i), r.add(lower));
        else (headers.append(i, s), r.delete(lower));
      }
    }
    return { [I]: !0, values: headers, nulls: r };
  };
//@ chunk-e7naa6k8.js:453-502 esm-fingerprint
var U = Symbol.for("brand.privateNullableHeaders");
//@ chunk-e7naa6k8.js:502-931 esm-fingerprint
function* q(e) {
  if (!e) return;
  if (U in e) {
    let { values: values, nulls: nulls } = e;
    yield* values.entries();
    for (let s of nulls) yield [s, null];
    return;
  }
  let t = !1,
    o;
  if (e instanceof Headers) o = e.entries();
  else if (C(e)) o = e;
  else ((t = !0), (o = Object.entries(e ?? {})));
  for (let r of o) {
    let n = r[0];
    if (typeof n !== "string") throw TypeError("expected header name to be a string");
    let s = C(r[1]) ? r[1] : [r[1]],
      i = !1;
    for (let l of s) {
      if (l === void 0) continue;
      if (t && !i) ((i = !0), yield [n, _]);
      yield [n, l];
    }
  }
}
//@ chunk-e7naa6k8.js:931-1533 esm-layout
var _ = Symbol("clear"),
  J = new Set(["x-stainless-helper"]),
  V = (e, t) => {
    let o = e
      ? e
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];
    for (let r of t.split(",").map((n) => n.trim())) if (r && !o.includes(r)) o.push(r);
    return o.join(", ");
  },
  R = (e) => {
    let headers = new Headers(),
      o = new Set();
    for (let r of e) {
      let n = new Set();
      for (let [s, i] of q(r)) {
        let lower = s.toLowerCase();
        if (J.has(lower)) {
          if (i === _) continue;
          if (i === null) (headers.delete(s), o.add(lower));
          else (headers.set(s, V(headers.get(s), i)), o.delete(lower));
          continue;
        }
        if (i === _ || !n.has(lower)) {
          if ((headers.delete(s), n.add(lower), i === _)) continue;
        }
        if (i === null) (headers.delete(s), o.add(lower));
        else (headers.append(s, i), o.delete(lower));
      }
    }
    return { [U]: !0, values: headers, nulls: o };
  };
//@ chunk-h87x8cg3.js:8288-8337 esm-fingerprint
var V_h87x = Symbol.for("brand.privateNullableHeaders");
//@ chunk-h87x8cg3.js:8337-8767 esm-fingerprint
function* Ie(e) {
  if (!e) return;
  if (V_h87x in e) {
    let { values: values, nulls: nulls } = e;
    yield* values.entries();
    for (let o of nulls) yield [o, null];
    return;
  }
  let t = !1,
    r;
  if (e instanceof Headers) r = e.entries();
  else if (P(e)) r = e;
  else ((t = !0), (r = Object.entries(e ?? {})));
  for (let n of r) {
    let s = n[0];
    if (typeof s !== "string") throw TypeError("expected header name to be a string");
    let o = P(n[1]) ? n[1] : [n[1]],
      i = !1;
    for (let a of o) {
      if (a === void 0) continue;
      if (t && !i) ((i = !0), yield [s, O]);
      yield [s, a];
    }
  }
}
//@ chunk-h87x8cg3.js:8767-9374 esm-layout
var O = Symbol("clear"),
  Ne = new Set(["x-stainless-helper"]),
  Pe = (e, t) => {
    let r = e
      ? e
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
      : [];
    for (let n of t.split(",").map((s) => s.trim())) if (n && !r.includes(n)) r.push(n);
    return r.join(", ");
  },
  g = (e) => {
    let headers = new Headers(),
      r = new Set();
    for (let n of e) {
      let s = new Set();
      for (let [o, i] of Ie(n)) {
        let lower = o.toLowerCase();
        if (Ne.has(lower)) {
          if (i === O) continue;
          if (i === null) (headers.delete(o), r.add(lower));
          else (headers.set(o, Pe(headers.get(o), i)), r.delete(lower));
          continue;
        }
        if (i === O || !s.has(lower)) {
          if ((headers.delete(o), s.add(lower), i === O)) continue;
        }
        if (i === null) (headers.delete(o), r.add(lower));
        else (headers.append(o, i), r.delete(lower));
      }
    }
    return { [V_h87x]: !0, values: headers, nulls: r };
  };

export { R, g, E };
