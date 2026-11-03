/**
 * @anthropic-ai/sdk/lib/credentials/token-cache.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { cIi, hMt, uIi } from "./types.mjs";

//@ chunk-3wydcdvj.js:3513-3561 esm-layout
function y() {
  return Math.floor(Date.now() / 1000);
}
//@ chunk-3wydcdvj.js:3561-4532 esm-fingerprint
class TokenCache {
  constructor(e, n) {
    ((this.cached = null),
      (this.pendingRefresh = null),
      (this.nextForce = !1),
      (this.lastAdvisoryError = 0),
      (this.provider = e),
      (this.onAdvisoryRefreshError = n));
  }
  async getToken() {
    let nextForce = this.nextForce;
    this.nextForce = !1;
    let cached = this.cached;
    if (nextForce || cached == null) return (await this.refresh(nextForce)).token;
    if (cached.expiresAt == null) return cached.token;
    let r = cached.expiresAt - y();
    if (r > cIi) return cached.token;
    if (r > hMt) return (this.backgroundRefresh(), cached.token);
    return (await this.refresh()).token;
  }
  invalidate() {
    ((this.cached = null), (this.nextForce = !0));
  }
  refresh(e = !1) {
    if (this.pendingRefresh && !e) return this.pendingRefresh;
    return this.doRefresh(e);
  }
  backgroundRefresh() {
    if (this.pendingRefresh) return;
    if (y() - this.lastAdvisoryError < uIi) return;
    this.doRefresh().catch((e) => {
      ((this.lastAdvisoryError = y()), this.onAdvisoryRefreshError?.(e));
    });
  }
  doRefresh(e = !1) {
    return (
      (this.pendingRefresh = this.provider(e ? { forceRefresh: !0 } : void 0).then(
        (n) => ((this.cached = n), (this.pendingRefresh = null), n),
        (n) => {
          throw ((this.pendingRefresh = null), n);
        },
      )),
      this.pendingRefresh
    );
  }
}

export { y, TokenCache };
