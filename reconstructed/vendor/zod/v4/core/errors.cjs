/**
 * zod/v4/core/errors.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Xs } from "./core.cjs";
import { Ee } from "./util.cjs";

//@ chunk-1ny7cxrt.js:106489-110963 cjs-fingerprint
var E_ = x(function (Nn) {
  var q6 =
      (Nn && Nn.__createBinding) ||
      (Object.create
        ? function (e, t, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(t, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !t.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return t[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, t, n, o) {
            if (o === void 0) o = n;
            e[o] = t[n];
          }),
    G6 =
      (Nn && Nn.__setModuleDefault) ||
      (Object.create
        ? function (e, t) {
            Object.defineProperty(e, "default", { enumerable: !0, value: t });
          }
        : function (e, t) {
            e.default = t;
          }),
    W6 =
      (Nn && Nn.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var t = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) q6(t, e, key);
        }
        return (G6(t, e), t);
      };
  Object.defineProperty(Nn, "__esModule", { value: !0 });
  Nn.$ZodRealError = Nn.$ZodError = void 0;
  Nn.flattenError = tZ;
  Nn.formatError = nZ;
  Nn.treeifyError = rZ;
  Nn.toDotPath = lP;
  Nn.prettifyError = iZ;
  var Jf = Xs(),
    Y6 = W6(Ee());
  function J6() {
    let _zod = this._zod;
    return (
      _zod.message ?? (_zod.message = JSON.stringify(_zod.def, Y6.jsonStringifyReplacer, 2)),
      _zod.message
    );
  }
  function X6(e) {
    this._zod.message = e;
  }
  var Q6 = { get: J6, set: X6, enumerable: !0, configurable: !0 },
    k_ = { value: void 0, enumerable: !1 },
    weakSet = new WeakSet([Object.prototype, Error.prototype]),
    aP = (e, t) => {
      ((e.name = "$ZodError"),
        (k_.value = t),
        Object.defineProperty(e, "issues", k_),
        (k_.value = void 0),
        Object.defineProperty(e, "message", Q6));
      let prototypeOf = Object.getPrototypeOf(e);
      if (!weakSet.has(prototypeOf))
        (weakSet.add(prototypeOf),
          Object.defineProperty(prototypeOf, "toString", {
            configurable: !0,
            enumerable: !1,
            get() {
              let o = () => this.message;
              return (
                Object.defineProperty(this, "toString", { value: o, configurable: !0, writable: !0 }),
                o
              );
            },
            set(o) {
              Object.defineProperty(this, "toString", { value: o, configurable: !0, writable: !0 });
            },
          }));
    };
  Nn.$ZodError = Jf.$constructor("$ZodError", aP);
  Nn.$ZodRealError = Jf.$constructor("$ZodError", aP, void 0, { Parent: Error });
  function eZ(e, t, n) {
    if (!Object.prototype.hasOwnProperty.call(e, t))
      if (t === "__proto__")
        Object.defineProperty(e, t, { value: n(), writable: !0, enumerable: !0, configurable: !0 });
      else e[t] = n();
    return e[t];
  }
  function tZ(e, t = (n) => n.message) {
    let n = {},
      o = [];
    for (let issue of e.issues)
      if (issue.path.length > 0) eZ(n, issue.path[0], () => []).push(t(issue));
      else o.push(t(issue));
    return { formErrors: o, fieldErrors: n };
  }
  function nZ(e, t = (n) => n.message) {
    let n = { _errors: [] },
      o = (r, s = []) => {
        for (let issue of r.issues)
          if (issue.code === "invalid_union" && issue.errors.length)
            issue.errors.map((error) => o({ issues: error }, [...s, ...issue.path]));
          else if (issue.code === "invalid_key") o({ issues: issue.issues }, [...s, ...issue.path]);
          else if (issue.code === "invalid_element") o({ issues: issue.issues }, [...s, ...issue.path]);
          else {
            let l = [...s, ...issue.path];
            if (l.length === 0) n._errors.push(t(issue));
            else {
              let c = n,
                u = 0;
              while (u < l.length) {
                let f = l[u],
                  h = u === l.length - 1;
                if (f === "_errors") {
                  if (h) c._errors.push(t(issue));
                  u++;
                  continue;
                }
                if (!Object.prototype.hasOwnProperty.call(c, f))
                  Object.defineProperty(c, f, {
                    value: { _errors: [] },
                    enumerable: !0,
                    writable: !0,
                    configurable: !0,
                  });
                let m = c[f];
                if (h) m._errors.push(t(issue));
                ((c = m), u++);
              }
            }
          }
      };
    return (o(e), n);
  }
  function rZ(e, t = (n) => n.message) {
    let n = { errors: [] },
      o = (r, s = []) => {
        var a;
        for (let issue of r.issues)
          if (issue.code === "invalid_union" && issue.errors.length)
            issue.errors.map((error) => o({ issues: error }, [...s, ...issue.path]));
          else if (issue.code === "invalid_key") o({ issues: issue.issues }, [...s, ...issue.path]);
          else if (issue.code === "invalid_element") o({ issues: issue.issues }, [...s, ...issue.path]);
          else {
            let c = [...s, ...issue.path];
            if (c.length === 0) {
              n.errors.push(t(issue));
              continue;
            }
            let u = n,
              f = 0;
            while (f < c.length) {
              let h = c[f],
                m = f === c.length - 1;
              if (typeof h === "string") {
                if (
                  (u.properties ?? (u.properties = {}),
                  !Object.prototype.hasOwnProperty.call(u.properties, h))
                )
                  Object.defineProperty(u.properties, h, {
                    value: { errors: [] },
                    enumerable: !0,
                    writable: !0,
                    configurable: !0,
                  });
                u = u.properties[h];
              } else
                (u.items ?? (u.items = []), (a = u.items)[h] ?? (a[h] = { errors: [] }), (u = u.items[h]));
              if (m) u.errors.push(t(issue));
              f++;
            }
          }
      };
    return (o(e), n);
  }
  function lP(e) {
    let t = [],
      mapped = e.map((o) => (typeof o === "object" ? o.key : o));
    for (let o of mapped)
      if (typeof o === "number") t.push(`[${o}]`);
      else if (typeof o === "symbol") t.push(`[${JSON.stringify(String(o))}]`);
      else if (/[^\w$]/.test(o)) t.push(`[${JSON.stringify(o)}]`);
      else {
        if (t.length) t.push(".");
        t.push(o);
      }
    return t.join("");
  }
  function iZ(e) {
    let t = [],
      sorted = [...e.issues].sort((o, r) => (o.path ?? []).length - (r.path ?? []).length);
    for (let o of sorted)
      if ((t.push(`\u2716 ${o.message}`), o.path?.length)) t.push(`  \u2192 at ${lP(o.path)}`);
    return t.join(`
`);
  }
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(Nn);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Nn, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(Nn, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(Nn);
  })();
});

export { E_ };
