/**
 * execa/lib/kill.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */
import os from "os";
import { onExit } from "../../signal-exit/dist/mjs/index.js";

//@ chunk-m4p5zn6n.js:19164-20307 esm-layout
var Wr = 5000,
  en = (e, n = "SIGTERM", r = {}) => {
    let o = e(n);
    return (qr(e, n, r, o), o);
  },
  qr = (e, n, r, o) => {
    if (!Hr(n, r, o)) return;
    let s = Xr(r),
      u = setTimeout(() => {
        e("SIGKILL");
      }, s);
    if (u.unref) u.unref();
  },
  Hr = (e, { forceKillAfterTimeout: forceKillAfterTimeout }, r) => Vr(e) && forceKillAfterTimeout !== !1 && r,
  Vr = (e) => e === os.constants.signals.SIGTERM || (typeof e === "string" && e.toUpperCase() === "SIGTERM"),
  Xr = ({ forceKillAfterTimeout: forceKillAfterTimeout = !0 }) => {
    if (forceKillAfterTimeout === !0) return Wr;
    if (!Number.isFinite(forceKillAfterTimeout) || forceKillAfterTimeout < 0)
      throw TypeError(
        `Expected the \`forceKillAfterTimeout\` option to be a non-negative integer, got \`${forceKillAfterTimeout}\` (${typeof forceKillAfterTimeout})`,
      );
    return forceKillAfterTimeout;
  },
  tn = (e, n) => {
    if (e.kill()) n.isCanceled = !0;
  },
  Yr = (e, n, r) => {
    (e.kill(n), r(Object.assign(Error("Timed out"), { timedOut: !0, signal: n })));
  },
  nn = (e, { timeout: timeout, killSignal: killSignal = "SIGTERM" }, o) => {
    if (timeout === 0 || timeout === void 0) return o;
    let s,
      promise = new Promise((l, f) => {
        s = setTimeout(() => {
          Yr(e, killSignal, f);
        }, timeout);
      }),
      d = o.finally(() => {
        clearTimeout(s);
      });
    return Promise.race([promise, d]);
  },
  rn = ({ timeout: timeout }) => {
    if (timeout !== void 0 && (!Number.isFinite(timeout) || timeout < 0))
      throw TypeError(
        `Expected the \`timeout\` option to be a non-negative integer, got \`${timeout}\` (${typeof timeout})`,
      );
  },
  on = async (e, { cleanup: cleanup, detached: detached }, o) => {
    if (!cleanup || detached) return o;
    let s = onExit(() => {
      e.kill();
    });
    return o.finally(() => {
      s();
    });
  };

export { rn, nn, on, en, tn };
