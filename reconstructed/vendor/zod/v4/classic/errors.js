/**
 * zod/v4/classic/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { qt, Ht, Xt } from "../core/errors.js";
import { aSr } from "../core/util.js";
import { Fr } from "../core/core.js";

//@ chunk-7vp249v4.js:78914-78969 esm-layout
var weakSet_2 = new WeakSet([Object.prototype, Error.prototype]);
//@ chunk-7vp249v4.js:78969-79221 esm-fingerprint
function Ze(e, t, r) {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    get() {
      let n = r(this);
      return (Object.defineProperty(this, t, { value: n, configurable: !0, writable: !0 }), n);
    },
    set(n) {
      Object.defineProperty(this, t, { value: n, configurable: !0, writable: !0 });
    },
  });
}
//@ chunk-7vp249v4.js:79221-79741 esm-fingerprint
var Ei = (e, t) => {
    (qt.init(e, t), (e.name = "ZodError"));
    let prototypeOf = Object.getPrototypeOf(e);
    if (weakSet_2.has(prototypeOf)) return;
    (weakSet_2.add(prototypeOf),
      Ze(prototypeOf, "format", (n) => (i) => Ht(n, i)),
      Ze(prototypeOf, "flatten", (n) => (i) => Xt(n, i)),
      Ze(prototypeOf, "addIssue", (n) => (i) => {
        (n.issues.push(i), (n.message = JSON.stringify(n.issues, aSr, 2)));
      }),
      Ze(prototypeOf, "addIssues", (n) => (i) => {
        (n.issues.push(...i), (n.message = JSON.stringify(n.issues, aSr, 2)));
      }),
      Object.defineProperty(prototypeOf, "isEmpty", {
        configurable: !0,
        enumerable: !1,
        get() {
          return this.issues.length === 0;
        },
      }));
  },
  kR = Fr("ZodError", Ei),
  S = Fr("ZodError", Ei, void 0, { Parent: Error });

export { kR, S };
