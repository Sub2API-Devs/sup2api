/**
 * entrypoints/warmSpare/claimCredentials.ts
 *
 * 2.1.316 新增。预热备用进程接收会话凭证。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hwf472v9.js (14)
 * attribution: placement 14
 */
import { getCredentialRoad } from "../../bootstrap/state.js";
import {
  readWellKnownCredentialToken,
  CCR_OAUTH_TOKEN_PATH,
  CCR_API_KEY_PATH,
  getOAuthTokenFromFileDescriptor,
  getApiKeyFromFileDescriptor,
} from "../../utils/authFileDescriptor.js";
import { PROVIDER_ENV_FLAGS } from "../../utils/model/modelIds.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { isChildSession, isClaudecodeSession } from "../../utils/sessionShape.js";

//@ chunk-hwf472v9.js:426-437 placement
var claimContext = null;
//@ chunk-hwf472v9.js:437-457 placement
/**
 * 函数 setClaimContext（设置认领上下文）。
 */
function setClaimContext(context) {
  claimContext = context;
}
//@ chunk-hwf472v9.js:457-501 placement
/**
 * 函数 claimedCredential（认领到的凭据）。
 */
function claimedCredential() {
  return claimContext?.credential() ?? null;
}
//@ chunk-hwf472v9.js:501-550 placement
/**
 * 函数 claimRoadHint（认领路径提示）。
 */
function claimRoadHint() {
  return claimContext?.road() ?? "none_at_claim";
}
//@ chunk-hwf472v9.js:550-809 placement
/**
 * 判断认领凭证的来源：认领时没有凭证、来自环境变量，或来自文件描述符等其他通道。
 */
function credentialRoad(claimLaunchEnv, launchCredential) {
  if (launchCredential === null) return "none_at_claim";
  let isBearer = launchCredential.kind === "bearer";
  let envVarName = isBearer ? "CLAUDE_CODE_OAUTH_TOKEN" : "ANTHROPIC_API_KEY";
  let fdEnvName = isBearer
    ? "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"
    : "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR";
  return trimmedOrUndefined(claimLaunchEnv[envVarName]) === undefined
    ? (getCredentialRoad(fdEnvName) ?? "none")
    : "env_var";
}
//@ chunk-hwf472v9.js:809-1348 placement
/**
 * 预热备用进程认领会话时读取凭据：CCR 环境下从固定路径读 OAuth token 或 API key（二者都有时视为冲突返回 null）；否则依次从环境变量与文件描述符读取，返回 {kind:"bearer"|"key"}。
 */
function claimedCredential_2(env) {
  if (_(env)) {
    let ccrOAuthToken = trimmedOrUndefined(readWellKnownCredentialToken(CCR_OAUTH_TOKEN_PATH, "OAuth token"));
    let ccrApiKey = trimmedOrUndefined(readWellKnownCredentialToken(CCR_API_KEY_PATH, "API key"));
    if (ccrOAuthToken !== undefined && ccrApiKey !== undefined) return null;
    return ccrOAuthToken === undefined
      ? toKeyCredential(ccrApiKey)
      : {
          kind: "bearer",
          token: ccrOAuthToken,
        };
  }
  let hasOAuthTokenFd = hasNonEmptyEnv(env, "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR");
  let hasApiKeyFd = hasNonEmptyEnv(env, "CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR");
  let oauthToken =
    trimmedOrUndefined(env.CLAUDE_CODE_OAUTH_TOKEN) ??
    (hasOAuthTokenFd ? trimmedOrUndefined(getOAuthTokenFromFileDescriptor()) : undefined);
  let apiKey =
    trimmedOrUndefined(env.ANTHROPIC_API_KEY) ??
    (hasApiKeyFd ? trimmedOrUndefined(getApiKeyFromFileDescriptor()) : undefined);
  if (oauthToken !== undefined)
    return {
      kind: "bearer",
      token: oauthToken,
    };
  if (apiKey !== undefined)
    return {
      kind: "key",
      key: apiKey,
    };
  if (hasOAuthTokenFd || hasApiKeyFd) return null;
  let fdOAuthToken = trimmedOrUndefined(getOAuthTokenFromFileDescriptor());
  if (fdOAuthToken !== undefined)
    return {
      kind: "bearer",
      token: fdOAuthToken,
    };
  return toKeyCredential(trimmedOrUndefined(getApiKeyFromFileDescriptor()));
}
//@ chunk-hwf472v9.js:1348-1605 placement
/**
 * 判断预热备用进程的认证是否不适合被认领：无认证、第三方提供商、自定义 base URL，否则返回 null。
 */
function spareAuthIneligibility() {
  let env = claimContext?.env();
  if (env === undefined) return "no_auth";
  if ([...PROVIDER_ENV_FLAGS, "CLAUDE_CODE_USE_GATEWAY"].some((flag) => isEnvTruthy(env[flag])))
    return "third_party_provider";
  let baseUrl = trimmedOrUndefined(env.ANTHROPIC_BASE_URL);
  if (baseUrl !== undefined && !isFirstPartyAnthropicHost(baseUrl)) return "custom_base_url";
  return claimedCredential() === null ? "no_auth" : null;
}
//@ chunk-hwf472v9.js:1605-1712 placement
var OAUTH_OVERRIDE_ENV_VARS = [
  "USE_LOCAL_OAUTH",
  "USE_STAGING_OAUTH",
  "CLAUDE_LOCAL_OAUTH_API_BASE",
  "CLAUDE_CODE_CUSTOM_OAUTH_URL",
];
//@ chunk-hwf472v9.js:1712-1788 placement
/**
 * 函数 envDriftDetected（当前环境与认领时不一致）。
 */
function envDriftDetected() {
  let claimEnv = claimContext?.env() ?? {};
  return OAUTH_OVERRIDE_ENV_VARS.some((key) => process.env[key] !== claimEnv[key]);
}
//@ chunk-hwf472v9.js:1788-1884 placement
/**
 * 函数 claimedSubscriptionType（认领时的订阅类型）。
 */
function claimedSubscriptionType() {
  let env = claimContext?.env();
  return env === undefined || _(env) ? undefined : trimmedOrUndefined(env.CLAUDE_CODE_SUBSCRIPTION_TYPE);
}
//@ chunk-hwf472v9.js:1884-1969 placement
function _(env) {
  return (
    isChildSession() ||
    isClaudecodeSession() ||
    hasNonEmptyEnv(env, "CLAUDE_CODE_CHILD_SESSION") ||
    hasNonEmptyEnv(env, "CLAUDECODE")
  );
}
//@ chunk-hwf472v9.js:1969-2009 placement
function hasNonEmptyEnv(env, name) {
  return trimmedOrUndefined(env[name]) !== undefined;
}
//@ chunk-hwf472v9.js:2009-2065 placement
function toKeyCredential(key) {
  return key === undefined
    ? null
    : {
        kind: "key",
        key,
      };
}
//@ chunk-hwf472v9.js:2065-2122 placement
function trimmedOrUndefined(value) {
  let trimmed = value?.trim() ?? "";
  return trimmed === "" ? undefined : trimmed;
}
export {
  spareAuthIneligibility,
  setClaimContext,
  claimedCredential_2,
  credentialRoad,
  envDriftDetected,
  claimedCredential,
  claimRoadHint,
  claimedSubscriptionType,
};
