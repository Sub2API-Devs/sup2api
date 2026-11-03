/**
 * @anthropic-ai/sdk/internal/utils/async-queue.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-layout 1
 */
import { ke, Kn } from "../tslib.mjs";

//@ chunk-hwmsct5x.js:59815-60695 esm-layout
var Mn,
  Wt,
  On,
  Wu = (() => {
    class e {
      constructor() {
        (Mn.set(this, []), Wt.set(this, []), On.set(this, !1));
      }
      push(n) {
        if (ke(this, On, "f")) return !1;
        let r = ke(this, Wt, "f").shift();
        if (r) r({ done: !1, value: n });
        else ke(this, Mn, "f").push(n);
        return !0;
      }
      close() {
        if (ke(this, On, "f")) return;
        Kn(this, On, !0, "f");
        while (ke(this, Wt, "f").length > 0) ke(this, Wt, "f").shift()({ done: !0, value: void 0 });
      }
      next(n) {
        if (ke(this, Mn, "f").length > 0)
          return Promise.resolve({ done: !1, value: ke(this, Mn, "f").shift() });
        if (ke(this, On, "f") || n?.aborted) return Promise.resolve({ done: !0, value: void 0 });
        return new Promise((r) => {
          let s = (y) => {
              (n?.removeEventListener("abort", h), r(y));
            },
            h = () => {
              let index = ke(this, Wt, "f").indexOf(s);
              if (index >= 0) ke(this, Wt, "f").splice(index, 1);
              r({ done: !0, value: void 0 });
            };
          (ke(this, Wt, "f").push(s), n?.addEventListener("abort", h, { once: !0 }));
        });
      }
      tryShift() {
        return ke(this, Mn, "f").shift();
      }
    }
    return ((Mn = new WeakMap()), (Wt = new WeakMap()), (On = new WeakMap()), e);
  })();

export { Wu };
