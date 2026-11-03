/**
 * @azure/msal-node/dist/retry/ImdsRetryPolicy.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-fingerprint 2
 */
import { b } from "../../../msal-common/lib/index-node-DhUjlPuB.js";
import { Ac } from "../../lib/msal-node.cjs";

//@ chunk-mrx6y2r5.js:277618-277725 esm-fingerprint
var BE = [b.NOT_FOUND, b.REQUEST_TIMEOUT, b.GONE, b.TOO_MANY_REQUESTS],
  zE = 3,
  GE = 7,
  qE = 1000,
  KE = 4000,
  VE = 2000,
  jE = 1e4;
//@ chunk-mrx6y2r5.js:277725-278573 esm-fingerprint
class xr {
  constructor() {
    this.exponentialRetryStrategy = new Ac(
      xr.MIN_EXPONENTIAL_BACKOFF_MS,
      xr.MAX_EXPONENTIAL_BACKOFF_MS,
      xr.EXPONENTIAL_DELTA_BACKOFF_MS,
    );
  }
  static get MIN_EXPONENTIAL_BACKOFF_MS() {
    return qE;
  }
  static get MAX_EXPONENTIAL_BACKOFF_MS() {
    return KE;
  }
  static get EXPONENTIAL_DELTA_BACKOFF_MS() {
    return VE;
  }
  static get HTTP_STATUS_GONE_RETRY_AFTER_MS() {
    return jE;
  }
  set isNewRequest(e) {
    this._isNewRequest = e;
  }
  async pauseForRetry(e, t, r) {
    if (this._isNewRequest) ((this._isNewRequest = !1), (this.maxRetries = e === b.GONE ? GE : zE));
    if (
      (BE.includes(e) ||
        (e >= b.SERVER_ERROR_RANGE_START && e <= b.SERVER_ERROR_RANGE_END && t < this.maxRetries)) &&
      t < this.maxRetries
    ) {
      let n =
        e === b.GONE ? xr.HTTP_STATUS_GONE_RETRY_AFTER_MS : this.exponentialRetryStrategy.calculateDelay(t);
      return (
        r.verbose(`Retrying request in ${n}ms (retry attempt: ${t + 1})`),
        await new Promise((o) => setTimeout(o, n)),
        !0
      );
    }
    return !1;
  }
}

export { xr };
