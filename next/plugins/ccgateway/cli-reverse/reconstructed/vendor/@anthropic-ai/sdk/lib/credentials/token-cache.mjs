/**
 * @anthropic-ai/sdk/lib/credentials/token-cache.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-gjbr82c9.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  ADVISORY_REFRESH_THRESHOLD_IN_SECONDS,
  MAX_FEDERATION_TOKEN_TTL_SECONDS,
  MIN_REFRESH_MARGIN_SECONDS,
} from "./types.mjs";

//@ chunk-gjbr82c9.js:3513-3561 esm-layout
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}
//@ chunk-gjbr82c9.js:3561-4532 esm-fingerprint
class TokenCache {
  constructor(provider, onAdvisoryRefreshError) {
    this.cached = null;
    this.pendingRefresh = null;
    this.nextForce = false;
    this.lastAdvisoryError = 0;
    this.provider = provider;
    this.onAdvisoryRefreshError = onAdvisoryRefreshError;
  }
  async getToken() {
    let force = this.nextForce;
    this.nextForce = false;
    let cached = this.cached;
    if (force || cached == null) return (await this.refresh(force)).token;
    if (cached.expiresAt == null) return cached.token;
    let remaining = cached.expiresAt - nowSeconds();
    if (remaining > ADVISORY_REFRESH_THRESHOLD_IN_SECONDS) return cached.token;
    if (remaining > MAX_FEDERATION_TOKEN_TTL_SECONDS) {
      this.backgroundRefresh();
      return cached.token;
    }
    return (await this.refresh()).token;
  }
  invalidate() {
    this.cached = null;
    this.nextForce = true;
  }
  refresh(force = false) {
    if (this.pendingRefresh && !force) return this.pendingRefresh;
    return this.doRefresh(force);
  }
  backgroundRefresh() {
    if (this.pendingRefresh) return;
    if (nowSeconds() - this.lastAdvisoryError < MIN_REFRESH_MARGIN_SECONDS) return;
    this.doRefresh().catch((err) => {
      this.lastAdvisoryError = nowSeconds();
      this.onAdvisoryRefreshError?.(err);
    });
  }
  doRefresh(force = false) {
    this.pendingRefresh = this.provider(
      force
        ? {
            forceRefresh: true,
          }
        : undefined,
    ).then(
      (token) => {
        this.cached = token;
        this.pendingRefresh = null;
        return token;
      },
      (err) => {
        this.pendingRefresh = null;
        throw err;
      },
    );
    return this.pendingRefresh;
  }
}
export { nowSeconds, TokenCache };
