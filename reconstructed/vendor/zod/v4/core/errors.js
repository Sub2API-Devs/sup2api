/**
 * zod/v4/core/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (8)
 * attribution: esm-fingerprint 8
 */
import { aSr } from "./util.js";
import { Fr } from "./core.js";

//@ chunk-7vp249v4.js:433-531 esm-fingerprint
function is() {
  let _zod = this._zod;
  return (_zod.message ?? (_zod.message = JSON.stringify(_zod.def, aSr, 2)), _zod.message);
}
//@ chunk-7vp249v4.js:531-566 esm-fingerprint
function ss(e) {
  this._zod.message = e;
}
//@ chunk-7vp249v4.js:566-1225 esm-fingerprint
var cs = { get: is, set: ss, enumerable: !0, configurable: !0 },
  Se = { value: void 0, enumerable: !1 },
  weakSet = new WeakSet([Object.prototype, Error.prototype]),
  Gt = (e, t) => {
    ((e.name = "$ZodError"),
      (Se.value = t),
      Object.defineProperty(e, "issues", Se),
      (Se.value = void 0),
      Object.defineProperty(e, "message", cs));
    let prototypeOf = Object.getPrototypeOf(e);
    if (!weakSet.has(prototypeOf))
      (weakSet.add(prototypeOf),
        Object.defineProperty(prototypeOf, "toString", {
          configurable: !0,
          enumerable: !1,
          get() {
            let n = () => this.message;
            return (Object.defineProperty(this, "toString", { value: n, configurable: !0, writable: !0 }), n);
          },
          set(n) {
            Object.defineProperty(this, "toString", { value: n, configurable: !0, writable: !0 });
          },
        }));
  },
  qt = Fr("$ZodError", Gt),
  Yt = Fr("$ZodError", Gt, void 0, { Parent: Error });
//@ chunk-7vp249v4.js:1225-1416 esm-fingerprint
function us(e, t, r) {
  if (!Object.prototype.hasOwnProperty.call(e, t))
    if (t === "__proto__")
      Object.defineProperty(e, t, { value: r(), writable: !0, enumerable: !0, configurable: !0 });
    else e[t] = r();
  return e[t];
}
//@ chunk-7vp249v4.js:1416-1590 esm-fingerprint
function Xt(e, t = (r) => r.message) {
  let r = {},
    n = [];
  for (let issue of e.issues)
    if (issue.path.length > 0) us(r, issue.path[0], () => []).push(t(issue));
    else n.push(t(issue));
  return { formErrors: n, fieldErrors: r };
}
//@ chunk-7vp249v4.js:1590-2297 esm-fingerprint
function Ht(e, t = (r) => r.message) {
  let r = { _errors: [] },
    n = (i, s = []) => {
      for (let issue of i.issues)
        if (issue.code === "invalid_union" && issue.errors.length)
          issue.errors.map((error) => n({ issues: error }, [...s, ...issue.path]));
        else if (issue.code === "invalid_key") n({ issues: issue.issues }, [...s, ...issue.path]);
        else if (issue.code === "invalid_element") n({ issues: issue.issues }, [...s, ...issue.path]);
        else {
          let a = [...s, ...issue.path];
          if (a.length === 0) r._errors.push(t(issue));
          else {
            let l = r,
              p = 0;
            while (p < a.length) {
              let f = a[p],
                d = p === a.length - 1;
              if (f === "_errors") {
                if (d) l._errors.push(t(issue));
                p++;
                continue;
              }
              if (!Object.prototype.hasOwnProperty.call(l, f))
                Object.defineProperty(l, f, {
                  value: { _errors: [] },
                  enumerable: !0,
                  writable: !0,
                  configurable: !0,
                });
              let _ = l[f];
              if (d) _._errors.push(t(issue));
              ((l = _), p++);
            }
          }
        }
    };
  return (n(e), r);
}
//@ chunk-7vp249v4.js:2297-2602 esm-fingerprint
function as(e) {
  let t = [],
    mapped = e.map((n) => (typeof n === "object" ? n.key : n));
  for (let n of mapped)
    if (typeof n === "number") t.push(`[${n}]`);
    else if (typeof n === "symbol") t.push(`[${JSON.stringify(String(n))}]`);
    else if (/[^\w$]/.test(n)) t.push(`[${JSON.stringify(n)}]`);
    else {
      if (t.length) t.push(".");
      t.push(n);
    }
  return t.join("");
}
//@ chunk-7vp249v4.js:2602-2814 esm-fingerprint
function pIi(e) {
  let t = [],
    sorted = [...e.issues].sort((n, i) => (n.path ?? []).length - (i.path ?? []).length);
  for (let n of sorted)
    if ((t.push(`\u2716 ${n.message}`), n.path?.length)) t.push(`  \u2192 at ${as(n.path)}`);
  return t.join(`
`);
}

export { Yt, qt, Ht, Xt, pIi };
