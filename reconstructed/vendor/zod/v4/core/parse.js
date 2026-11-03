/**
 * zod/v4/core/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (15)
 * attribution: esm-fingerprint 12, esm-layout 3
 */
import { x8e, Xne } from "./core.js";
import { R8e, ehs } from "./util.js";
import { Yt } from "./errors.js";

//@ chunk-7vp249v4.js:2814-2870 esm-fingerprint
function se(e, t) {
  return { callee: t?.callee ?? e, Err: t?.Err };
}
//@ chunk-7vp249v4.js:2870-3140 esm-fingerprint
var ce = (e) => {
  let t = (r, n, i, s) => {
    let c = i ? { ...i, async: !1 } : { async: !1 },
      run = r._zod.run({ value: n, issues: [] }, c);
    if (run instanceof Promise) throw new x8e();
    if (run.issues.length) {
      let l = new (s?.Err ?? e)(run.issues.map((issue) => R8e(issue, c, Xne())));
      throw (ehs(l, s?.callee ?? t), l);
    }
    return run.value;
  };
  return t;
};
//@ chunk-7vp249v4.js:3140-3411 esm-fingerprint
var ue = (e) => {
  let t = async (r, n, i, s) => {
    let c = i ? { ...i, async: !0 } : { async: !0 },
      run = r._zod.run({ value: n, issues: [] }, c);
    if (run instanceof Promise) run = await run;
    if (run.issues.length) {
      let l = new (s?.Err ?? e)(run.issues.map((issue) => R8e(issue, c, Xne())));
      throw (ehs(l, s?.callee ?? t), l);
    }
    return run.value;
  };
  return t;
};
//@ chunk-7vp249v4.js:3411-3618 esm-fingerprint
var B = (e) => (t, r, n) => {
    let i = n ? { ...n, async: !1 } : { async: !1 },
      run = t._zod.run({ value: r, issues: [] }, i);
    if (run instanceof Promise) throw new x8e();
    return run.issues.length ? er(e, run.issues, i) : { success: !0, data: run.value };
  },
  qgs = B(Yt);
//@ chunk-7vp249v4.js:3618-3780 esm-fingerprint
function er(e, t, r) {
  let n;
  return {
    success: !1,
    get error() {
      if (!n) ((n = new e(t.map((i) => R8e(i, r, Xne())))), (t = void 0), (r = void 0));
      return n;
    },
    set error(i) {
      ((n = i), (t = void 0), (r = void 0));
    },
  };
}
//@ chunk-7vp249v4.js:3780-3979 esm-fingerprint
var ae = (e) => async (t, r, n) => {
  let i = n ? { ...n, async: !0 } : { async: !0 },
    run = t._zod.run({ value: r, issues: [] }, i);
  if (run instanceof Promise) run = await run;
  return run.issues.length ? er(e, run.issues, i) : { success: !0, data: run.value };
};
//@ chunk-7vp249v4.js:3979-4193 esm-fingerprint
var ps = Symbol.for("zod.compile.invalid"),
  fs = Symbol.for("zod.compile.fallback"),
  Ie = (e, t, r) => {
    let validator = e._zod.bag.validator;
    if (validator !== void 0) {
      if (validator(t) !== ps) return !0;
      if (validator.definite === !0 && r === void 0) return !1;
    }
    return ds(e, t, r);
  };
//@ chunk-7vp249v4.js:4193-4449 esm-fingerprint
function ds(e, t, r) {
  let n = r ? { ...r, async: !1, abortEarly: !0 } : { async: !1, abortEarly: !0 },
    fallbackRun = e._zod.bag.fallbackRun,
    s;
  if (fallbackRun) ((n[fs] = !0), (s = fallbackRun({ value: t, issues: [] }, n)));
  else s = e._zod.run({ value: t, issues: [] }, n);
  if (s instanceof Promise) throw new x8e();
  return s.issues.length === 0;
}
//@ chunk-7vp249v4.js:4449-4761 esm-fingerprint
var Oe = async (e, t, r) => {
    let n = r ? { ...r, async: !0, abortEarly: !0 } : { async: !0, abortEarly: !0 },
      run = e._zod.run({ value: t, issues: [] }, n);
    if (run instanceof Promise) run = await run;
    return run.issues.length === 0;
  },
  tr = (e) => {
    let t = ce(e),
      r = (n, i, s, c) => {
        let a = s ? { ...s, direction: "backward" } : { direction: "backward" };
        return t(n, i, a, se(r, c));
      };
    return r;
  };
//@ chunk-7vp249v4.js:4761-4826 esm-layout
var rr = (e) => {
  let t = ce(e),
    r = (n, i, s, c) => t(n, i, s, se(r, c));
  return r;
};
//@ chunk-7vp249v4.js:4826-4970 esm-fingerprint
var or = (e) => {
  let t = ue(e),
    r = async (n, i, s, c) => {
      let a = s ? { ...s, direction: "backward" } : { direction: "backward" };
      return await t(n, i, a, se(r, c));
    };
  return r;
};
//@ chunk-7vp249v4.js:4970-5046 esm-layout
var nr = (e) => {
  let t = ue(e),
    r = async (n, i, s, c) => await t(n, i, s, se(r, c));
  return r;
};
//@ chunk-7vp249v4.js:5046-5147 esm-fingerprint
var ir = (e) => (t, r, n) => {
  let i = n ? { ...n, direction: "backward" } : { direction: "backward" };
  return B(e)(t, r, i);
};
//@ chunk-7vp249v4.js:5147-5180 esm-layout
var sr = (e) => (t, r, n) => B(e)(t, r, n);
//@ chunk-7vp249v4.js:5180-5287 esm-fingerprint
var cr = (e) => async (t, r, n) => {
  let i = n ? { ...n, direction: "backward" } : { direction: "backward" };
  return ae(e)(t, r, i);
};

export { ae, Ie, Oe, ce, ue, B, tr, rr, or, nr, ir, sr, cr, qgs };
