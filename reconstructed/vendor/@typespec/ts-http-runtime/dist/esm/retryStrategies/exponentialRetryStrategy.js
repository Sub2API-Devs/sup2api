/**
 * @typespec/ts-http-runtime/dist/esm/retryStrategies/exponentialRetryStrategy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-layout 2, esm-fingerprint 2
 */
import { Cl } from "./throttlingRetryStrategy.js";
import { Kn } from "../util/delay.js";

//@ chunk-mrx6y2r5.js:44526-44547 esm-layout
var Lm = 1000,
  Hm = 64000;
//@ chunk-mrx6y2r5.js:44547-44975 esm-fingerprint
function Il(e = {}) {
  var t, r;
  let n = (t = e.retryDelayInMs) !== null && t !== void 0 ? t : Lm,
    o = (r = e.maxRetryDelayInMs) !== null && r !== void 0 ? r : Hm;
  return {
    name: "exponentialRetryStrategy",
    retry({ retryCount: i, response: s, responseError: a }) {
      let c = $m(a),
        l = c && e.ignoreSystemErrors,
        d = Fm(s),
        u = d && e.ignoreHttpStatusCodes;
      if ((s && (Cl(s) || !d)) || u || l) return { skipStrategy: !0 };
      if (a && !c && !d) return { errorToThrow: a };
      return Kn(i, { retryDelayInMs: n, maxRetryDelayInMs: o });
    },
  };
}
//@ chunk-mrx6y2r5.js:44975-45092 esm-layout
function Fm(e) {
  return Boolean(
    e && e.status !== void 0 && (e.status >= 500 || e.status === 408) && e.status !== 501 && e.status !== 505,
  );
}
//@ chunk-mrx6y2r5.js:45092-45267 esm-fingerprint
function $m(e) {
  if (!e) return !1;
  return (
    e.code === "ETIMEDOUT" ||
    e.code === "ESOCKETTIMEDOUT" ||
    e.code === "ECONNREFUSED" ||
    e.code === "ECONNRESET" ||
    e.code === "ENOENT" ||
    e.code === "ENOTFOUND"
  );
}

export { Il };
