/**
 * utils/sessionAccessToken.ts
 *
 * 2.1.316 新增：是否为 review 来源的远程会话；是否使用会话访问令牌。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-636x8tdt.js (4)
 * attribution: placement 4
 */
import { env } from "./env.js";
import { isSelfHostedRemoteEnvironment } from "./remoteEnvironment.js";
import { setSessionIngressToken, setOauthTokenFromFd } from "../bootstrap/state.js";

/**
 * 是否为 review 来源的远程会话。
 */
//@ chunk-636x8tdt.js:303-371 placement
function isReviewSession() {
  return env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review";
}
/**
 * 是否使用会话访问令牌。
 */
//@ chunk-636x8tdt.js:371-404 placement
function usesSessionAccessToken() {
  return isSelfHostedRemoteEnvironment() && isReviewSession();
}
/**
 * 使用会话访问令牌时，返回需要从子进程环境中移除的令牌相关环境变量名。
 */
//@ chunk-636x8tdt.js:404-507 placement
function getSessionTokenEnvKeys() {
  return usesSessionAccessToken()
    ? ["CLAUDE_CODE_SESSION_ACCESS_TOKEN", "CLAUDE_SESSION_INGRESS_TOKEN_FILE"]
    : [];
}
/**
 * 使用会话访问令牌时，把令牌类环境变量写入对应的内存缓存（会话入口令牌或 OAuth 令牌），返回是否已处理。
 */
//@ chunk-636x8tdt.js:507-680 placement
function applySessionTokenEnv(r, e) {
  if (!usesSessionAccessToken()) return !1;
  if (r === "CLAUDE_CODE_SESSION_ACCESS_TOKEN") {
    if (e !== "") setSessionIngressToken(e);
    return !0;
  }
  if (r === "CLAUDE_CODE_OAUTH_TOKEN") {
    if (e !== "") setOauthTokenFromFd(e);
    return !0;
  }
  return !1;
}

export { usesSessionAccessToken, isReviewSession, getSessionTokenEnvKeys, applySessionTokenEnv };
