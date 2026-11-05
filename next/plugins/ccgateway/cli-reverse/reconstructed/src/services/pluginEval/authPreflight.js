/**
 * services/pluginEval/authPreflight.ts
 *
 * 2.1.316 新增：plugin eval 运行前的认证预检（WIF 联邦、网关会话剩余时长）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-af1hzzme.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getAPIProvider, isFirstPartyProvider } from "../../utils/model/providers.js";
import { getWIFPrecedenceSource, getWIFStatusLine } from "../../utils/wifProfile.js";
import { env } from "../../utils/env.js";
import { getWIFTokenCache } from "../oauth/wifCredentials.js";
import { errorMessage } from "../../utils/errors.js";
import { withTimeout } from "../../utils/sleep.js";
import { FILE_IDENTITY_TIMEOUT_MS } from "./safeFiles.js";
import { WorkloadIdentityError } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { hasCustomAuthorizationHeader, getCustomHeaderMap } from "../api/client.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { refreshGatewayToken } from "../gateway/gatewayAuth.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAntBuild } from "../../utils/envUtils.js";
import {
  effectiveAuthTokenEnv,
  getConfiguredApiKeyHelper,
  shouldUseWIFAuth,
  isClaudeAISubscriber,
  getClaudeAIOAuthTokensAsync,
  checkAndRefreshOAuthTokenIfNeeded,
  clearOAuthTokenCache,
} from "../../utils/auth.js";
import {
  getApiKeyFromFileDescriptor,
  hasPossibleCredentialFromDescriptor,
} from "../../utils/authFileDescriptor.js";
import { loginToHandOn } from "../../utils/auth/launcherHostLogin.js";

//@ chunk-af1hzzme.js:113868-113959 placement (2.1.88 match: logEventTo1P, 1)
async function logEventTo1P() {
  if (getAPIProvider() !== "firstParty")
    return {
      ok: true,
    };
  if (isEnvQuadAuthWithoutKey()) return setupWorkloadIdentityForEval();
  return {
    ok: true,
  };
}
//@ chunk-af1hzzme.js:113959-114071 placement
function isEnvQuadAuthWithoutKey() {
  return (
    getWIFPrecedenceSource() === "env-quad" &&
    !env.ANTHROPIC_API_KEY &&
    !env.ANTHROPIC_AUTH_TOKEN &&
    !env.ANTHROPIC_UNIX_SOCKET
  );
}
//@ chunk-af1hzzme.js:114071-114896 placement
/**
 * 配置工作负载身份联邦（WIF）时预先换取令牌，失败给出说明。
 */
async function setupWorkloadIdentityForEval() {
  let tokenCache;
  try {
    tokenCache = await getWIFTokenCache();
  } catch (error) {
    return {
      ok: false,
      message: `workload identity federation is configured (${getWIFStatusLine()}) but could not be set up: ${errorMessage(error)}`,
    };
  }
  if (tokenCache === null)
    return {
      ok: true,
    };
  try {
    await withTimeout(
      tokenCache.getToken(),
      FILE_IDENTITY_TIMEOUT_MS,
      `no answer from the token exchange within ${FILE_IDENTITY_TIMEOUT_MS / 1000}s`,
    );
    return {
      ok: true,
    };
  } catch (error) {
    let statusCode = error instanceof WorkloadIdentityError ? error.statusCode : null;
    let failureMessage = `workload identity federation could not obtain an access token (${getWIFStatusLine()})${statusCode === null ? "" : ` [HTTP ${statusCode}]`}: ${errorMessage(error)}`;
    if (
      (statusCode !== null && (statusCode >= 500 || statusCode === 429 || statusCode === 408)) ||
      (statusCode === null && TRANSIENT_AUTH_ERROR_RE.test(errorMessage(error)))
    )
      return {
        ok: true,
        warning: `${failureMessage}; continuing \u2014 if every run fails the same way, that is why`,
      };
    return {
      ok: false,
      message: `${failureMessage}${statusCode === 401 || statusCode === 403 ? " \u2014 the identity token was rejected: check the federation rule and organization ids, and for a rule spanning several workspaces set ANTHROPIC_WORKSPACE_ID" : ""}`,
    };
  }
}
//@ chunk-af1hzzme.js:114896-115072 placement
var TRANSIENT_AUTH_ERROR_RE =
  /Failed to reach token endpoint|Unable to connect|timed out|TimeoutError|^no answer |ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|fetch failed/i;
//@ chunk-af1hzzme.js:115207-115221 placement
/**
 * 认证预检的过期余量（300000 毫秒）。
 */
var AUTH_EXPIRY_MARGIN_MS = 300000;
//@ chunk-af1hzzme.js:115221-116905 placement
/**
 * 预检本次运行的认证：网关会话是否会在超时前过期、是否需要 /login。
 */
async function checkEvalAuthPreflight(credentials, timeoutSeconds, renewAuth) {
  let expiryDeadline = () => Date.now() + timeoutSeconds * 1000 + AUTH_EXPIRY_MARGIN_MS;
  let usesCustomAuthHeader = hasCustomAuthorizationHeader();
  {
    let gatewayAuth = getGatewayAuth();
    if (gatewayAuth) {
      if (gatewayAuth.idpRefreshToken && gatewayAuth.expiresAt < expiryDeadline())
        await renewAuth(gatewayAuth.expiresAt, expiryDeadline(), async () => {
          await refreshGatewayToken(credentials, {
            force: true,
          });
          return getGatewayAuth()?.expiresAt ?? null;
        });
      else
        await refreshGatewayToken(credentials, {
          force: false,
        });
      let latestAuth = getGatewayAuth() ?? gatewayAuth;
      let warning;
      if (latestAuth.expiresAt < expiryDeadline()) {
        warning = `gateway session expires in ~${Math.max(0, Math.floor((latestAuth.expiresAt - Date.now()) / 60000))} min, before this run's ${timeoutSeconds}s timeout; a long run may lose auth part-way${latestAuth.idpRefreshToken ? "" : " (run /login to renew)"}`;
        logForDebugging(`[eval] ${warning}`, {
          level: "warn",
        });
      }
      return {
        kind: "gateway",
        url: latestAuth.url,
        jwt: latestAuth.jwt,
        authorizationHeaderIsCredential: usesCustomAuthHeader,
        ...(warning !== undefined && {
          warning,
        }),
      };
    }
  }
  if (usesCustomAuthHeader) return null;
  if (
    !isFirstPartyProvider() ||
    (isAntBuild() ? undefined : env.ANTHROPIC_API_KEY) ||
    effectiveAuthTokenEnv() ||
    env.ANTHROPIC_UNIX_SOCKET ||
    getConfiguredApiKeyHelper() ||
    Object.keys(getCustomHeaderMap()).some((key) => key.toLowerCase() === "x-api-key") ||
    shouldUseWIFAuth()
  )
    return null;
  let apiKeyFromFileDescriptor = getApiKeyFromFileDescriptor();
  if (apiKeyFromFileDescriptor && !isClaudeAISubscriber())
    return {
      kind: "apiKey",
      apiKey: apiKeyFromFileDescriptor,
    };
  if (!apiKeyFromFileDescriptor && hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR"))
    return null;
  let tokens = loginToHandOn(await getClaudeAIOAuthTokensAsync(credentials));
  if (!tokens?.accessToken)
    return apiKeyFromFileDescriptor
      ? {
          kind: "apiKey",
          apiKey: apiKeyFromFileDescriptor,
        }
      : null;
  let tokenWarning;
  if (tokens.expiresAt !== null && tokens.expiresAt < expiryDeadline()) {
    if (tokens.refreshToken) {
      await renewAuth(tokens.expiresAt, expiryDeadline(), async () => {
        await checkAndRefreshOAuthTokenIfNeeded({
          credentials,
          force: true,
        });
        clearOAuthTokenCache();
        return (await getClaudeAIOAuthTokensAsync(credentials))?.expiresAt ?? null;
      });
      clearOAuthTokenCache();
      tokens = loginToHandOn(await getClaudeAIOAuthTokensAsync(credentials));
      if (!tokens?.accessToken)
        return apiKeyFromFileDescriptor
          ? {
              kind: "apiKey",
              apiKey: apiKeyFromFileDescriptor,
            }
          : null;
    }
    if (tokens.expiresAt !== null && tokens.expiresAt < expiryDeadline()) {
      tokenWarning = `login token expires in ~${Math.max(0, Math.floor((tokens.expiresAt - Date.now()) / 60000))} min, before this run's ${timeoutSeconds}s timeout; a long run may lose auth part-way (run /login to renew)`;
      logForDebugging(`[eval] ${tokenWarning}`, {
        level: "warn",
      });
    }
  }
  return {
    kind: "oauth",
    accessToken: tokens.accessToken,
    scopes: Array.isArray(tokens.scopes) ? tokens.scopes : [],
    subscriptionType: tokens.subscriptionType ?? null,
    rateLimitTier: tokens.rateLimitTier ?? null,
    ...(tokenWarning !== undefined && {
      warning: tokenWarning,
    }),
  };
}
export { checkEvalAuthPreflight, logEventTo1P };
