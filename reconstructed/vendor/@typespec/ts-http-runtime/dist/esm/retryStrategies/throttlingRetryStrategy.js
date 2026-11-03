/**
 * @typespec/ts-http-runtime/dist/esm/retryStrategies/throttlingRetryStrategy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-fingerprint 4
 */
import { Tl } from "../util/helpers.js";

//@ chunk-mrx6y2r5.js:43991-44059 esm-fingerprint
var RETRY_AFTER = "Retry-After",
  Um = ["retry-after-ms", "x-ms-retry-after-ms", RETRY_AFTER];
//@ chunk-mrx6y2r5.js:44059-44323 esm-fingerprint
function El(e) {
  if (!(e && [429, 503].includes(e.status))) return;
  try {
    for (let o of Um) {
      let i = Tl(e, o);
      if (i === 0 || i) return i * (o === RETRY_AFTER ? 1000 : 1);
    }
    let t = e.headers.get(RETRY_AFTER);
    if (!t) return;
    let n = Date.parse(t) - Date.now();
    return Number.isFinite(n) ? Math.max(0, n) : void 0;
  } catch (error) {
    return;
  }
}
//@ chunk-mrx6y2r5.js:44323-44368 esm-fingerprint
function Cl(e) {
  return Number.isFinite(El(e));
}
//@ chunk-mrx6y2r5.js:44368-44526 esm-fingerprint
function Al() {
  return {
    name: "throttlingRetryStrategy",
    retry({ response: e }) {
      let t = El(e);
      if (!Number.isFinite(t)) return { skipStrategy: !0 };
      return { retryAfterInMs: t };
    },
  };
}

export { Cl, Al };
