/**
 * services/oauth/errors.ts
 *
 * 2.1.316 新增：OAuth 错误类型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: placement 2
 */

//@ chunk-hwmsct5x.js:251250-251402 placement
class OAuthRefreshDeadError extends Error {
  constructor() {
    super("OAuth refresh token is no longer valid; run /login to re-authenticate");
    this.name = "OAuthRefreshDeadError";
  }
}
//@ chunk-hwmsct5x.js:251402-251590 placement
class OAuthRefreshLockTimeoutError extends Error {
  constructor() {
    super(
      "OAuth access token could not be refreshed: another Claude Code process is holding the refresh lock",
    );
    this.name = "OAuthRefreshLockTimeoutError";
  }
}
export { OAuthRefreshDeadError, OAuthRefreshLockTimeoutError };
