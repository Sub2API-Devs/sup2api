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

//@ chunk-636x8tdt.js:303-371 placement
/**
 * 是否为 review 来源的远程会话。
 */
function isReviewSession() {
  return env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review";
}
//@ chunk-636x8tdt.js:371-404 placement
/**
 * 是否使用会话访问令牌。
 */
function usesSessionAccessToken() {
  return isSelfHostedRemoteEnvironment() && isReviewSession();
}
//@ chunk-636x8tdt.js:404-507 placement
/**
 * 使用会话访问令牌时，返回需要从子进程环境中移除的令牌相关环境变量名。
 */
function getSessionTokenEnvKeys() {
  return usesSessionAccessToken()
    ? ["CLAUDE_CODE_SESSION_ACCESS_TOKEN", "CLAUDE_SESSION_INGRESS_TOKEN_FILE"]
    : [];
}
//@ chunk-636x8tdt.js:507-680 placement
/**
 * 使用会话访问令牌时，把令牌类环境变量写入对应的内存缓存（会话入口令牌或 OAuth 令牌），返回是否已处理。
 */
function applySessionTokenEnv(r, token) {
  if (!usesSessionAccessToken()) return false;
  if (r === "CLAUDE_CODE_SESSION_ACCESS_TOKEN") {
    if (token !== "") setSessionIngressToken(token);
    return true;
  }
  if (r === "CLAUDE_CODE_OAUTH_TOKEN") {
    if (token !== "") setOauthTokenFromFd(token);
    return true;
  }
  return false;
}
export { usesSessionAccessToken, isReviewSession, getSessionTokenEnvKeys, applySessionTokenEnv };
