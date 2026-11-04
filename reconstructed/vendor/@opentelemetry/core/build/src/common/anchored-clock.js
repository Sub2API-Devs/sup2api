/**
 * @opentelemetry/core/build/src/common/anchored-clock.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:56619-56983 cjs-fingerprint
var require_anchored_clock = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AnchoredClock = undefined;
  class AnchoredClock {
    _monotonicClock;
    _epochMillis;
    _performanceMillis;
    constructor(systemClock, monotonicClock) {
      this._monotonicClock = monotonicClock;
      this._epochMillis = systemClock.now();
      this._performanceMillis = monotonicClock.now();
    }
    now() {
      let delta = this._monotonicClock.now() - this._performanceMillis;
      return this._epochMillis + delta;
    }
  }
  cjsExports.AnchoredClock = AnchoredClock;
});
export { require_anchored_clock };
