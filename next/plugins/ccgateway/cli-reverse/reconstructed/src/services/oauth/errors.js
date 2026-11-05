/**
 * services/oauth/errors.ts
 *
 * 2.1.316 新增：OAuth 错误类型
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (2)
 * attribution: placement 2
 */

//@ chunk-vn3g7zt8.js:256302-256496 placement
class OAuthRefreshDeadError extends Error {
  reachedTimeLimit;
  constructor(reachedTimeLimit) {
    super("OAuth refresh token is no longer valid; run /login to re-authenticate");
    this.name = "OAuthRefreshDeadError";
    this.reachedTimeLimit = reachedTimeLimit;
  }
}
//@ chunk-vn3g7zt8.js:256496-256684 placement
class OAuthRefreshLockTimeoutError extends Error {
  constructor() {
    super(
      "OAuth access token could not be refreshed: another Claude Code process is holding the refresh lock",
    );
    this.name = "OAuthRefreshLockTimeoutError";
  }
}
export { OAuthRefreshDeadError, OAuthRefreshLockTimeoutError };
