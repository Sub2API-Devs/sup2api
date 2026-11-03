/**
 * entrypoints/warmSpare/claimCredentials.ts
 *
 * 2.1.316 新增。预热备用进程接收会话凭证。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mmkhgzzy.js (14)
 * attribution: placement 14
 */
import { getCredentialRoad } from "../../bootstrap/state.js";
import {
  yMn,
  CCR_OAUTH_TOKEN_PATH,
  CCR_API_KEY_PATH,
  getOAuthTokenFromFileDescriptor,
  getApiKeyFromFileDescriptor,
} from "../../utils/authFileDescriptor.js";
import { PROVIDER_ENV_FLAGS } from "../../utils/model/modelIds.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { isChildSession, isClaudecodeSession } from "../../utils/sessionShape.js";

//@ chunk-mmkhgzzy.js:425-436 placement
var o = null;
//@ chunk-mmkhgzzy.js:436-456 placement
function q_i(n) {
  o = n;
}
//@ chunk-mmkhgzzy.js:456-500 placement
function iAn() {
  return o?.credential() ?? null;
}
//@ chunk-mmkhgzzy.js:500-549 placement
function Y_i() {
  return o?.road() ?? "none_at_claim";
}
/**
 * 判断认领凭证的来源：认领时没有凭证、来自环境变量，或来自文件描述符等其他通道。
 */
//@ chunk-mmkhgzzy.js:549-808 placement
function credentialRoad(n, e) {
  if (e === null) return "none_at_claim";
  let t = e.kind === "bearer",
    i = t ? "CLAUDE_CODE_OAUTH_TOKEN" : "ANTHROPIC_API_KEY",
    u = t ? "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" : "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR";
  return r(n[i]) === void 0 ? (getCredentialRoad(u) ?? "none") : "env_var";
}
/**
 * 预热备用进程认领会话时读取凭据：CCR 环境下从固定路径读 OAuth token 或 API key（二者都有时视为冲突返回 null）；否则依次从环境变量与文件描述符读取，返回 {kind:"bearer"|"key"}。
 */
//@ chunk-mmkhgzzy.js:808-1346 placement
function claimedCredential(env) {
  if (_(env)) {
    let ccrOAuthToken = r(yMn(CCR_OAUTH_TOKEN_PATH, "OAuth token")),
      ccrApiKey = r(yMn(CCR_API_KEY_PATH, "API key"));
    if (ccrOAuthToken !== void 0 && ccrApiKey !== void 0) return null;
    return ccrOAuthToken === void 0 ? c(ccrApiKey) : { kind: "bearer", token: ccrOAuthToken };
  }
  let hasOAuthTokenFd = a(env, "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"),
    hasApiKeyFd = a(env, "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR"),
    oauthToken =
      r(env.CLAUDE_CODE_OAUTH_TOKEN) ?? (hasOAuthTokenFd ? r(getOAuthTokenFromFileDescriptor()) : void 0),
    apiKey = r(env.ANTHROPIC_API_KEY) ?? (hasApiKeyFd ? r(getApiKeyFromFileDescriptor()) : void 0);
  if (oauthToken !== void 0) return { kind: "bearer", token: oauthToken };
  if (apiKey !== void 0) return { kind: "key", key: apiKey };
  if (hasOAuthTokenFd || hasApiKeyFd) return null;
  let fdOAuthToken = r(getOAuthTokenFromFileDescriptor());
  if (fdOAuthToken !== void 0) return { kind: "bearer", token: fdOAuthToken };
  return c(r(getApiKeyFromFileDescriptor()));
}
/**
 * 判断预热备用进程的认证是否不适合被认领：无认证、第三方提供商、自定义 base URL，否则返回 null。
 */
//@ chunk-mmkhgzzy.js:1346-1603 placement
function spareAuthIneligibility() {
  let n = o?.env();
  if (n === void 0) return "no_auth";
  if ([...PROVIDER_ENV_FLAGS, "CLAUDE_CODE_USE_GATEWAY"].some((i) => isEnvTruthy(n[i])))
    return "third_party_provider";
  let t = r(n.ANTHROPIC_BASE_URL);
  if (t !== void 0 && !isFirstPartyAnthropicHost(t)) return "custom_base_url";
  return iAn() === null ? "no_auth" : null;
}
//@ chunk-mmkhgzzy.js:1603-1710 placement
var OAUTH_OVERRIDE_ENV_VARS = [
  "USE_LOCAL_OAUTH",
  "USE_STAGING_OAUTH",
  "CLAUDE_LOCAL_OAUTH_API_BASE",
  "CLAUDE_CODE_CUSTOM_OAUTH_URL",
];
//@ chunk-mmkhgzzy.js:1710-1786 placement
function ORt() {
  let n = o?.env() ?? {};
  return OAUTH_OVERRIDE_ENV_VARS.some((e) => process.env[e] !== n[e]);
}
//@ chunk-mmkhgzzy.js:1786-1882 placement
function Q_i() {
  let n = o?.env();
  return n === void 0 || _(n) ? void 0 : r(n.CLAUDE_CODE_SUBSCRIPTION_TYPE);
}
//@ chunk-mmkhgzzy.js:1882-1967 placement
function _(n) {
  return isChildSession() || isClaudecodeSession() || a(n, "CLAUDE_CODE_CHILD_SESSION") || a(n, "CLAUDECODE");
}
//@ chunk-mmkhgzzy.js:1967-2007 placement
function a(n, e) {
  return r(n[e]) !== void 0;
}
//@ chunk-mmkhgzzy.js:2007-2063 placement
function c(n) {
  return n === void 0 ? null : { kind: "key", key: n };
}
//@ chunk-mmkhgzzy.js:2063-2120 placement
function r(n) {
  let e = n?.trim() ?? "";
  return e === "" ? void 0 : e;
}

export { spareAuthIneligibility, iAn, ORt, Y_i, Q_i, q_i, claimedCredential, credentialRoad };
