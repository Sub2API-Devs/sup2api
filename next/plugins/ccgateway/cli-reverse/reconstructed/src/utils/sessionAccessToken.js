/**
 * utils/sessionAccessToken.ts
 *
 * 2.1.316 新增：是否为 review 来源的远程会话；是否使用会话访问令牌。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mk44ne6r.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";
import { isSelfHostedByocEnvironment } from "./remoteEnvironment.js";
import { setSessionIngressToken, setOauthTokenFromFd } from "../bootstrap/state.js";

//@ chunk-mk44ne6r.js:302-370 placement
/**
 * 是否为 review 来源的远程会话。
 */
function isReviewSession() {
  return env.CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "review";
}
//@ chunk-mk44ne6r.js:370-402 placement
/**
 * 是否使用会话访问令牌。
 */
function usesSessionAccessToken() {
  return isSelfHostedByocEnvironment() && isReviewSession();
}
//@ chunk-mk44ne6r.js:402-505 placement
/**
 * 使用会话访问令牌时，返回需要从子进程环境中移除的令牌相关环境变量名。
 */
function getSessionTokenEnvKeys() {
  return usesSessionAccessToken()
    ? ["CLAUDE_CODE_SESSION_ACCESS_TOKEN", "CLAUDE_SESSION_INGRESS_TOKEN_FILE"]
    : [];
}
//@ chunk-mk44ne6r.js:505-678 placement
/**
 * 使用会话访问令牌时，把令牌类环境变量写入对应的内存缓存（会话入口令牌或 OAuth 令牌），返回是否已处理。
 */
function applySessionTokenEnv(name, token) {
  if (!usesSessionAccessToken()) return false;
  if (name === "CLAUDE_CODE_SESSION_ACCESS_TOKEN") {
    if (token !== "") setSessionIngressToken(token);
    return true;
  }
  if (name === "CLAUDE_CODE_OAUTH_TOKEN") {
    if (token !== "") setOauthTokenFromFd(token);
    return true;
  }
  return false;
}
export { isReviewSession, applySessionTokenEnv, usesSessionAccessToken, getSessionTokenEnvKeys };
