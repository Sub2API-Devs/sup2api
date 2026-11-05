/**
 * services/oauth/client.ts
 *
 * OAuth 客户端：拼 authorize URL（PKCE S256）、授权码换令牌、刷新与吊销令牌、拉 profile/roles、创建 API key、写 oauthAccount。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/oauth/client.ts
 * pieces: chunk-exfmq47h.js (38)
 * attribution: placement 3, layout 9, facade-exports 26
 */
import { isDeepStrictEqual } from "util";
import {
  VerificationRequiredError,
  FAST_MODE_CHECK_HTTP_OPTIONS,
  parseVerificationRequired,
  verificationErrorMessage,
  sanitizeVerificationMessage,
  isVerificationRequired,
} from "../api/verificationRequired.js";
import {
  isClaudeAiScopeSet,
  getOauthConfig,
  CLAUDE_AI_INFERENCE_SCOPE,
  allOAuthScopes,
  claudeAiLoginScopes,
  CLAUDE_AI_PLUGINS_SCOPE,
} from "../../constants/oauth.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  getClaudeAIOAuthTokens,
  saveApiKey,
  isUnmarkedStoredPlan,
  isProvisionalProfilePlan,
  isProfilePlanDowngrade,
  hasProfileScope,
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
  getStoredOAuthTierVerifiedAt,
  isClaudeAISubscriber,
  credentialIsOwnStoredLogin,
  backfillStoredOAuthTier,
} from "../../utils/auth.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { fromEnum, lit, fromNumber, fromEnumOpt } from "../analytics/safeMetadata.js";
import { isSessionsToken } from "./sessionsBearerHooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { claudeCodeUserAgent } from "../../utils/http.js";
import {
  sanitizedMachineReasonForTelemetry,
  isNonRetryableClientError,
  sanitizedOAuthErrorTypeForTelemetry,
} from "../../utils/errors.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { getOauthProfileWithOriginFromOauthToken, getOauthProfileFromOauthToken } from "./getOauthProfile.js";
import { env } from "../../utils/env.js";
import { isDiskless } from "../../bootstrap/state.js";
import { planDisplayNameFromProfile } from "./validateOauthToken.js";
import { classifyOAuthErrorResponse, HTTPS_CLAUDE_AI_RESTRICTED, ACCOUNT_ON_HOLD } from "./oauthErrors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:305728-305845 placement
var API_KEY_NOT_CREATED_MESSAGE =
  "The server did not create an API key and gave no readable reason. If this keeps happening, contact support.";
//@ chunk-exfmq47h.js:305845-305929 placement
class KeyMintRefusedError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "KeyMintRefusedError";
  }
}
//@ chunk-exfmq47h.js:305929-305985 placement
/**
 * 判断是否为需要二次验证或被拒铸币的错误。
 */
function isVerificationOrMintRefusal(error) {
  return error instanceof VerificationRequiredError || error instanceof KeyMintRefusedError;
}
//@ chunk-exfmq47h.js:305985-306015 layout
/**
 * 刷新令牌的有效期（30 天）。
 */
var TOKEN_CONFIG_TTL_MS = 86400000;
var REFRESH_TOKEN_EXPIRY_MS = 2592000000;
//@ chunk-exfmq47h.js:306015-306111 facade-exports
function resolveRefreshTokenExpiresAt(refreshTokenExpiresIn, hasExpiry) {
  if (typeof refreshTokenExpiresIn === "number") return Date.now() + refreshTokenExpiresIn * 1000;
  return hasExpiry ? Date.now() + REFRESH_TOKEN_EXPIRY_MS : undefined;
}
//@ chunk-exfmq47h.js:306111-306140 facade-exports
function shouldUseClaudeAIAuth(scopes) {
  return isClaudeAiScopeSet(scopes);
}
//@ chunk-exfmq47h.js:306140-306224 facade-exports
function parseScopes(scopeString) {
  if (typeof scopeString !== "string") return [];
  return scopeString.split(" ").filter(Boolean);
}
//@ chunk-exfmq47h.js:306224-307073 facade-exports (2.1.88 match: buildAuthUrl, 0.957)
/**
 * 拼 OAuth authorize URL：claude.ai 用 CLAUDE_AI_AUTHORIZE_URL，Console 用 CONSOLE_AUTHORIZE_URL；参数 code=true、client_id、response_type=code、redirect_uri（手动模式 MANUAL_REDIRECT_URL，否则 http://localhost:<port>/callback）、scope、PKCE S256、state，可选 orgUUID/login_hint/login_method。
 */
function buildAuthUrl({
  codeChallenge,
  state,
  port,
  isManual,
  loginWithClaudeAi,
  inferenceOnly,
  orgUUID,
  loginHint,
  loginMethod,
  oauthClient,
  alsoRequestScope,
}) {
  let authUrlBase = loginWithClaudeAi
    ? getOauthConfig().CLAUDE_AI_AUTHORIZE_URL
    : getOauthConfig().CONSOLE_AUTHORIZE_URL;
  let authUrl = new URL(authUrlBase);
  authUrl.searchParams.append("code", "true");
  authUrl.searchParams.append("client_id", oauthClient?.clientId ?? getOauthConfig().CLIENT_ID);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append(
    "redirect_uri",
    isManual ? getOauthConfig().MANUAL_REDIRECT_URL : `http://localhost:${port}/callback`,
  );
  let scopesToUse = oauthClient
    ? oauthClient.scopes
    : inferenceOnly
      ? [CLAUDE_AI_INFERENCE_SCOPE]
      : alsoRequestScope
        ? [...allOAuthScopes(), alsoRequestScope]
        : allOAuthScopes();
  authUrl.searchParams.append("scope", scopesToUse.join(" "));
  authUrl.searchParams.append("code_challenge", codeChallenge);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("state", state);
  if (orgUUID) authUrl.searchParams.append("orgUUID", orgUUID);
  if (loginHint) authUrl.searchParams.append("login_hint", loginHint);
  if (loginMethod) authUrl.searchParams.append("login_method", loginMethod);
  return authUrl.toString();
}
//@ chunk-exfmq47h.js:307073-307813 facade-exports (2.1.88 match: exchangeCodeForTokens, 0.816)
/**
 * 用授权码 + code_verifier 向 TOKEN_URL 换取令牌（grant_type=authorization_code）。
 */
async function exchangeCodeForTokens(
  authorizationCode,
  { state, codeVerifier, port, useManualRedirect = false, expiresIn, clientId },
) {
  let requestBody = {
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: useManualRedirect
      ? getOauthConfig().MANUAL_REDIRECT_URL
      : `http://localhost:${port}/callback`,
    client_id: clientId ?? getOauthConfig().CLIENT_ID,
    code_verifier: codeVerifier,
    state,
  };
  if (expiresIn !== undefined) requestBody.expires_in = expiresIn;
  let response = await axios_default.post(getOauthConfig().TOKEN_URL, requestBody, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
    ...FAST_MODE_CHECK_HTTP_OPTIONS,
  });
  if (response.status !== 200) {
    logFeatureBad(
      "oauth_token_exchange",
      response.status === 401 ? "oauth_exchange_invalid_code" : "oauth_exchange_http_error",
    );
    throw Error(
      response.status === 401
        ? "Authentication failed: Invalid authorization code"
        : `Token exchange failed (${response.status}): ${response.statusText}`,
    );
  }
  logEvent("tengu_oauth_token_exchange_success", {});
  logFeatureOk("oauth_token_exchange");
  return response.data;
}
//@ chunk-exfmq47h.js:307813-310504 facade-exports (2.1.88 match: refreshOAuthToken, 0.686)
/**
 * 用 refresh token 换新令牌（POST TOKEN_URL，30 秒超时，可带 expires_in），成功打 tengu_oauth_token_refresh_success；必要时补拉 profile 更新订阅信息与 oauthAccount。
 */
async function refreshOAuthToken(
  refreshToken,
  {
    scopes: requestedScopes,
    expiresIn: expiresInSeconds,
    clientId,
    skipProfileFetch,
    signal,
    telemetryContext,
    invalidScopeRetried,
    storageV5,
  } = {},
) {
  let scopes =
    Array.isArray(requestedScopes) && requestedScopes.length ? requestedScopes : claudeAiLoginScopes();
  let requestBody = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId ?? getOauthConfig().CLIENT_ID,
    scope: scopes.join(" "),
  };
  if (expiresInSeconds !== undefined) requestBody.expires_in = expiresInSeconds;
  try {
    let response = await axios_default.post(getOauthConfig().TOKEN_URL, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
      signal,
      ...FAST_MODE_CHECK_HTTP_OPTIONS,
    });
    if (response.status !== 200) throw Error(`Token refresh failed: ${response.statusText}`);
    let data = response.data;
    let {
      access_token: accessToken,
      refresh_token: newRefreshToken = refreshToken,
      expires_in: expiresIn,
    } = data;
    let expiresAt = Date.now() + expiresIn * 1000;
    let refreshTokenExpiresAt = resolveRefreshTokenExpiresAt(data.refresh_token_expires_in, false);
    let scopes_2 = parseScopes(data.scope);
    logEvent("tengu_oauth_token_refresh_success", {
      plugins_scope_requested: scopes.includes(CLAUDE_AI_PLUGINS_SCOPE),
      plugins_scope_granted: scopes_2.includes(CLAUDE_AI_PLUGINS_SCOPE),
    });
    logFeatureOk("oauth_token_refresh");
    let config = getGlobalConfig();
    let previousTokens = skipProfileFetch ? null : getClaudeAIOAuthTokens();
    let stampConsumed = consumeProfileStamp(previousTokens);
    let accountNeedsRefresh =
      config.oauthAccount?.billingType !== undefined &&
      config.oauthAccount?.accountCreatedAt !== undefined &&
      config.oauthAccount?.subscriptionCreatedAt !== undefined &&
      config.oauthAccount?.ccOnboardingFlags !== undefined &&
      previousTokens?.subscriptionType != null &&
      previousTokens?.rateLimitTier != null &&
      !stampConsumed;
    let profileInfo = skipProfileFetch || accountNeedsRefresh ? null : await fetchProfileInfo(accessToken);
    if (profileInfo && config.oauthAccount) {
      let updates = {};
      if (profileInfo.displayName !== undefined) updates.displayName = profileInfo.displayName;
      if (profileInfo.fullName !== undefined) updates.fullName = profileInfo.fullName;
      if (typeof profileInfo.hasExtraUsageEnabled === "boolean")
        updates.hasExtraUsageEnabled = profileInfo.hasExtraUsageEnabled;
      if (profileInfo.billingType !== null) updates.billingType = profileInfo.billingType;
      if (profileInfo.accountCreatedAt !== undefined) updates.accountCreatedAt = profileInfo.accountCreatedAt;
      if (profileInfo.subscriptionCreatedAt !== undefined)
        updates.subscriptionCreatedAt = profileInfo.subscriptionCreatedAt;
      if (profileInfo.rawProfile) {
        updates.ccOnboardingFlags = profileInfo.ccOnboardingFlags;
        updates.claudeCodeTrialEndsAt = profileInfo.claudeCodeTrialEndsAt;
        updates.claudeCodeTrialDurationDays = profileInfo.claudeCodeTrialDurationDays;
        updates.seatTier = profileInfo.seatTier;
        updates.planDisplayName = getPlanDisplayName(profileInfo.rawProfile) ?? undefined;
        updates.profileFetchedAt = Date.now();
      }
      if (Object.keys(updates).length > 0)
        await saveGlobalConfig(
          (current) => ({
            ...current,
            oauthAccount: current.oauthAccount
              ? {
                  ...current.oauthAccount,
                  ...updates,
                }
              : current.oauthAccount,
          }),
          storageV5,
        );
    }
    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      refreshTokenExpiresAt,
      scopes: scopes_2,
      clientId,
      ...reconcileSubscriptionType(previousTokens, profileInfo),
      rateLimitTier: profileInfo?.rateLimitTier ?? previousTokens?.rateLimitTier ?? null,
      profile: profileInfo?.rawProfile,
      ...(profileInfo?.rawProfile !== undefined && {
        profileOriginStamped: profileInfo.originStamped === true,
      }),
      tokenAccount: data.account
        ? {
            uuid: data.account.uuid,
            emailAddress: data.account.email_address,
            organizationUuid: data.organization?.uuid,
          }
        : undefined,
    };
  } catch (error) {
    let scopeRetry = invalidScopeRetried === true && isInvalidScopeError(error);
    logEvent("tengu_oauth_token_refresh_failure", {
      ...errorTelemetryFields(error),
      ...extractOAuthErrorFields(error),
      ...(telemetryContext && {
        context: fromEnum(telemetryContext),
      }),
      ...(scopeRetry && {
        context: lit("invalid_scope_retried"),
      }),
    });
    if (isAccountOnHoldError(error)) logFeatureBad("oauth_token_refresh", "oauth_refresh_account_on_hold");
    else if (isInvalidGrantError(error)) logFeatureBad("oauth_token_refresh", "oauth_refresh_invalid_grant");
    else if (!signal?.aborted && !telemetryContext && !scopeRetry)
      logFeatureSad("oauth_token_refresh", "oauth_refresh_request_failed");
    throw error;
  }
}
//@ chunk-exfmq47h.js:310504-311146 facade-exports
/**
 * 吊销令牌：POST <TOKEN_URL>/revoke（token、token_type_hint、client_id），5 秒超时，用于登出。
 */
async function revokeOAuthTokenAcknowledged(token, clientId, tokenTypeHint = "refresh_token") {
  try {
    let headers =
      (
        await axios_default.post(
          `${getOauthConfig().TOKEN_URL}/revoke`,
          {
            token,
            token_type_hint: tokenTypeHint,
            client_id: clientId ?? getOauthConfig().CLIENT_ID,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 5000,
            ...FAST_MODE_CHECK_HTTP_OPTIONS,
          },
        )
      )?.headers ?? {};
    if (!isSessionsToken(headers["request-id"])) {
      logForDebugging(
        "OAuth token revoke answered 2xx without an Anthropic request id; not counted as acknowledged.",
      );
      logFeatureSad("oauth_token_revoke", "unstamped_2xx");
      return false;
    }
    logFeatureOk("oauth_token_revoke");
    return true;
  } catch (error) {
    let status = axios_default.isAxiosError(error) ? error.response?.status : undefined;
    logForDebugging(
      `OAuth token revoke failed (status=${status ?? "network"}); continuing with local logout.`,
    );
    logFeatureSad("oauth_token_revoke", `http_${status ?? "network"}`);
    return false;
  }
}
//@ chunk-exfmq47h.js:311146-311184 facade-exports
/**
 * 吊销 refresh token（登出时）。
 */
async function revokeOAuthToken(refreshToken, clientId) {
  await revokeOAuthTokenAcknowledged(refreshToken, clientId);
}
//@ chunk-exfmq47h.js:311184-311935 facade-exports (2.1.88 match: fetchAndStoreUserRoles, 0.813)
/**
 * 拉取 ROLES_URL（organization_role / workspace_role）并写入 oauthAccount。
 */
async function fetchAndStoreUserRoles(accessToken, storageV5) {
  let response = await axios_default.get(getOauthConfig().ROLES_URL, {
    headers: {
      "User-Agent": claudeCodeUserAgent(),
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 1e4,
    signal: AbortSignal.timeout(1e4),
    ...FAST_MODE_CHECK_HTTP_OPTIONS,
  });
  if (response.status !== 200) {
    logFeatureBad("oauth_fetch_roles", "oauth_roles_http_error");
    throw Error(`Failed to fetch user roles: ${response.statusText}`);
  }
  let data = response.data;
  if (!getGlobalConfig().oauthAccount) {
    logFeatureBad("oauth_fetch_roles", "oauth_roles_no_account");
    throw Error("OAuth account information not found in config");
  }
  await saveGlobalConfig(
    (current) => ({
      ...current,
      oauthAccount: current.oauthAccount
        ? {
            ...current.oauthAccount,
            organizationRole: data.organization_role,
            workspaceRole: data.workspace_role,
            organizationName: data.organization_name,
          }
        : current.oauthAccount,
    }),
    storageV5,
  );
  logEvent("tengu_oauth_roles_stored", {
    org_role:
      data.organization_role == null ? undefined : sanitizedMachineReasonForTelemetry(data.organization_role),
  });
  logFeatureOk("oauth_fetch_roles");
}
//@ chunk-exfmq47h.js:311935-312771 facade-exports (2.1.88 match: createAndStoreApiKey, 0.589)
/**
 * Console 登录后用 OAuth 令牌调用 API_KEY_URL 创建 API key 并保存（tengu_oauth_api_key）。
 */
async function createAndStoreApiKey(accessToken, storageV5) {
  try {
    let response = await axios_default.post(getOauthConfig().API_KEY_URL, null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": claudeCodeUserAgent(),
      },
      ...FAST_MODE_CHECK_HTTP_OPTIONS,
    });
    let apiKey = response.data?.raw_key;
    if (apiKey) {
      await saveApiKey(apiKey, storageV5);
      logEvent("tengu_oauth_api_key", {
        status: lit("success"),
        statusCode: response.status,
      });
      logFeatureOk("oauth_create_api_key");
      return apiKey;
    }
    logFeatureBad("oauth_create_api_key", "oauth_api_key_empty_response");
    return null;
  } catch (error) {
    logEvent("tengu_oauth_api_key", {
      status: lit("failure"),
      ...errorTelemetryFields(error),
    });
    let message = axios_default.isAxiosError(error)
      ? parseVerificationRequired(error.response?.status, error.response?.data)
      : undefined;
    if (message !== undefined) {
      logFeatureBad("oauth_create_api_key", "oauth_api_key_verification_required");
      throw new VerificationRequiredError(message, {
        cause: error,
      });
    }
    let verificationMessage = verificationErrorMessage(error);
    let status = axios_default.isAxiosError(error) ? error.response?.status : undefined;
    if (verificationMessage !== null && status !== undefined && status >= 400 && status < 500) {
      logFeatureBad("oauth_create_api_key", "oauth_api_key_refused");
      throw new KeyMintRefusedError(
        sanitizeVerificationMessage(verificationMessage) ?? API_KEY_NOT_CREATED_MESSAGE,
        {
          cause: error,
        },
      );
    }
    logFeatureBad("oauth_create_api_key", "oauth_api_key_request_failed");
    throw error;
  }
}
//@ chunk-exfmq47h.js:312771-312839 facade-exports
/**
 * 令牌是否已过期或 5 分钟内过期（expiresAt 为 null 视为不过期）。
 */
function isOAuthTokenExpired(expiresAt, now = Date.now()) {
  if (expiresAt === null) return false;
  return now + 300000 >= expiresAt;
}
//@ chunk-exfmq47h.js:312839-312958 facade-exports (2.1.88 match: fetchProfileInfo, 0.606)
var SUBSCRIPTION_TYPE_BY_ORG_TYPE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:312839", () => {
  SUBSCRIPTION_TYPE_BY_ORG_TYPE = new Map([
    ["claude_max", "max"],
    ["claude_pro", "pro"],
    ["claude_enterprise", "enterprise"],
    ["claude_team", "team"],
  ]);
});
//@ chunk-exfmq47h.js:312958-313017 facade-exports
/**
 * organization_type → 订阅类型（claude_max→max、claude_pro→pro、claude_enterprise→enterprise、claude_team→team）。
 */
function subscriptionTypeForOrganizationType(organizationType) {
  return (
    (organizationType !== undefined ? SUBSCRIPTION_TYPE_BY_ORG_TYPE.get(organizationType) : undefined) ?? null
  );
}
//@ chunk-exfmq47h.js:313017-313057 layout
var profileStampState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:313017", () => {
  profileStampState = identity_2(
    {
      spent: false,
    },
    (state) => {
      state.spent = false;
    },
  );
});
//@ chunk-exfmq47h.js:313057-313124 layout
function consumeProfileStamp(tokens) {
  if (profileStampState.spent || !isUnmarkedStoredPlan(tokens)) return false;
  profileStampState.spent = true;
  return true;
}
//@ chunk-exfmq47h.js:313124-313879 layout
function reconcileSubscriptionType(tokens, profileInfo) {
  let subscriptionType = tokens?.subscriptionType ?? null;
  let subscriptionTypeSource = tokens?.subscriptionTypeSource;
  let trustsExisting = subscriptionType === null || subscriptionTypeSource === "profile";
  let isProvisional = isProvisionalProfilePlan(tokens);
  let subscriptionType_2 = profileInfo?.subscriptionType ?? null;
  let profileWins =
    subscriptionType_2 !== null &&
    profileInfo?.originStamped === true &&
    (isProvisional || !isProfilePlanDowngrade(subscriptionType, subscriptionType_2));
  if (!trustsExisting) {
    if (profileWins && subscriptionType_2 !== subscriptionType)
      return {
        subscriptionType: subscriptionType_2,
        subscriptionTypeSource: "profile",
        subscriptionTypeVerifiedAt: Date.now(),
      };
    return subscriptionTypeSource === "sign_in" || (profileWins && subscriptionType_2 === subscriptionType)
      ? {
          subscriptionType,
          subscriptionTypeSource: "sign_in",
        }
      : {
          subscriptionType,
        };
  }
  if (profileWins)
    return {
      subscriptionType: subscriptionType_2,
      subscriptionTypeSource: "profile",
      subscriptionTypeVerifiedAt: Date.now(),
    };
  if (subscriptionType !== null && (!isProvisional || subscriptionType_2 === null))
    return {
      subscriptionType,
      subscriptionTypeSource: "profile",
      subscriptionTypeVerifiedAt: tokens?.subscriptionTypeVerifiedAt,
    };
  return subscriptionType_2 === null
    ? {
        subscriptionType: null,
      }
    : {
        subscriptionType: subscriptionType_2,
        subscriptionTypeSource: "profile",
      };
}
//@ chunk-exfmq47h.js:313879-314806 facade-exports
/**
 * 拉 OAuth profile 并提取 subscriptionType（由 organization_type 映射）、rateLimitTier、seatTier、hasExtraUsageEnabled、billingType 等。
 */
async function fetchProfileInfo(accessToken) {
  let oauthProfileWithOriginFromOauthToken = await getOauthProfileWithOriginFromOauthToken(accessToken);
  let profile = oauthProfileWithOriginFromOauthToken?.profile;
  let info = {
    subscriptionType: subscriptionTypeForOrganizationType(profile?.organization?.organization_type),
    rateLimitTier: profile?.organization?.rate_limit_tier ?? null,
    seatTier: profile?.organization?.seat_tier ?? null,
    hasExtraUsageEnabled: profile?.organization?.has_extra_usage_enabled ?? null,
    billingType: profile?.organization?.billing_type ?? null,
    ccOnboardingFlags: profile?.organization?.cc_onboarding_flags ?? {},
    claudeCodeTrialEndsAt: profile?.organization?.claude_code_trial_ends_at ?? null,
    claudeCodeTrialDurationDays: profile?.organization?.claude_code_trial_duration_days ?? null,
  };
  if (profile?.account?.display_name) info.displayName = profile.account.display_name;
  if (profile?.account?.full_name) info.fullName = profile.account.full_name;
  if (profile?.account?.created_at) info.accountCreatedAt = profile.account.created_at;
  if (profile?.organization?.subscription_created_at)
    info.subscriptionCreatedAt = profile.organization.subscription_created_at;
  logEvent("tengu_oauth_profile_fetch_success", {});
  return {
    ...info,
    rawProfile: profile,
    originStamped: oauthProfileWithOriginFromOauthToken?.stamped,
  };
}
//@ chunk-exfmq47h.js:314806-315060 facade-exports (2.1.88 match: getOrganizationUUID, 0.873)
/**
 * 组织 UUID：oauthAccount.organizationUuid，缺失时拉 profile。
 */
async function getOrganizationUUID() {
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  if (CLAUDE_CODE_ORGANIZATION_UUID) return CLAUDE_CODE_ORGANIZATION_UUID;
  let orgUUID = getGlobalConfig().oauthAccount?.organizationUuid;
  if (orgUUID) return orgUUID;
  let accessToken = getClaudeAIOAuthTokens()?.accessToken;
  if (accessToken === undefined || !hasProfileScope()) return null;
  let profileOrgUUID = (await getOauthProfileFromOauthToken(accessToken))?.organization?.uuid;
  if (!profileOrgUUID) return null;
  return profileOrgUUID;
}
//@ chunk-exfmq47h.js:315060-316772 facade-exports (2.1.88 match: populateOAuthAccountInfoIfNeeded, 0.733)
/**
 * oauthAccount 缺字段时拉 profile 补全（可覆盖 env 提供的账户信息）。
 */
async function populateOAuthAccountInfoIfNeeded(credentials, storageV5, refresh = true) {
  let envAccountUuid = env.CLAUDE_CODE_ACCOUNT_UUID;
  let envUserEmail = env.CLAUDE_CODE_USER_EMAIL;
  let envOrganizationUuid = env.CLAUDE_CODE_ORGANIZATION_UUID;
  let envAccountInfo =
    !isDiskless() && envAccountUuid && envUserEmail && envOrganizationUuid
      ? {
          accountUuid: envAccountUuid,
          emailAddress: envUserEmail,
          organizationUuid: envOrganizationUuid,
        }
      : null;
  if (envAccountInfo && !getGlobalConfig().oauthAccount) storeOAuthAccountInfo(envAccountInfo, storageV5);
  if (refresh)
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
      storageV5,
    });
  else {
    let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(credentials);
    if (isOAuthTokenExpired(claudeAIOAuthTokens?.expiresAt ?? null)) return false;
  }
  let config = getGlobalConfig();
  let profileFetchedAt = config.oauthAccount?.profileFetchedAt;
  let profileFresh = profileFetchedAt !== undefined && Date.now() - profileFetchedAt < TOKEN_CONFIG_TTL_MS;
  let config_2 = getStoredOAuthTierVerifiedAt();
  let needsVerificationCheck =
    isVerificationRequired() &&
    (config_2 === undefined
      ? getClaudeAIOAuthTokens()?.subscriptionType === null &&
        isClaudeAISubscriber() &&
        credentialIsOwnStoredLogin()
      : config_2 === null || config_2 > Date.now() || Date.now() - config_2 >= TOKEN_CONFIG_TTL_MS);
  if (
    (config.oauthAccount &&
      config.oauthAccount.billingType !== undefined &&
      config.oauthAccount.accountCreatedAt !== undefined &&
      config.oauthAccount.subscriptionCreatedAt !== undefined &&
      config.oauthAccount.ccOnboardingFlags !== undefined &&
      profileFresh &&
      !needsVerificationCheck) ||
    !isClaudeAISubscriber() ||
    !hasProfileScope()
  )
    return false;
  let tokens = getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return false;
  let profile = await getOauthProfileWithOriginFromOauthToken(tokens.accessToken);
  let profile_2 = profile?.profile;
  if (!profile_2?.account || !profile_2.organization) return false;
  if (envAccountInfo)
    logForDebugging("OAuth profile fetch succeeded, overriding env var account info", {
      level: "info",
    });
  storeOAuthAccountInfo(
    {
      accountUuid: profile_2.account.uuid,
      emailAddress: profile_2.account.email,
      organizationUuid: profile_2.organization.uuid,
      displayName: profile_2.account.display_name || undefined,
      fullName: profile_2.account.full_name || undefined,
      hasExtraUsageEnabled: profile_2.organization.has_extra_usage_enabled ?? false,
      billingType: profile_2.organization.billing_type ?? undefined,
      accountCreatedAt: profile_2.account.created_at,
      subscriptionCreatedAt: profile_2.organization.subscription_created_at ?? undefined,
      ccOnboardingFlags: profile_2.organization.cc_onboarding_flags ?? {},
      claudeCodeTrialEndsAt: profile_2.organization.claude_code_trial_ends_at ?? null,
      claudeCodeTrialDurationDays: profile_2.organization.claude_code_trial_duration_days ?? null,
      seatTier: profile_2.organization.seat_tier ?? null,
      planDisplayName: getPlanDisplayName(profile_2),
      profileFetchedAt: profileFresh && profileFetchedAt <= Date.now() ? undefined : Date.now(),
    },
    storageV5,
  );
  await recordStoredLoginPlan(tokens, profile_2, profile?.stamped === true, credentials);
  return true;
}
//@ chunk-exfmq47h.js:316772-317402 layout
async function recordStoredLoginPlan(stored, profile, originStamped, credentials) {
  let planUntrusted = stored.subscriptionTypeSource === "profile" || isUnmarkedStoredPlan(stored);
  if (
    (stored.subscriptionType !== null && !planUntrusted) ||
    !stored.refreshToken ||
    !credentialIsOwnStoredLogin()
  )
    return;
  let subscriptionType = subscriptionTypeForOrganizationType(profile.organization.organization_type);
  if (subscriptionType === null) return;
  let backfillResult = await backfillStoredOAuthTier({
    expectedRefreshToken: stored.refreshToken,
    subscriptionType,
    rateLimitTier: profile.organization.rate_limit_tier ?? null,
    verifiedAt: Date.now(),
    originStamped,
    credentials,
  });
  logForDebugging(
    backfillResult === "written"
      ? `OAuth: recorded the stored login plan (${subscriptionType}) from the profile`
      : backfillResult === "reverified" || backfillResult === "confirmed"
        ? `OAuth: profile re-read confirms the stored login plan (${subscriptionType}; ${backfillResult})`
        : `OAuth: stored login plan not recorded from the profile (${backfillResult})`,
  );
}
//@ chunk-exfmq47h.js:317402-317477 layout
function getPlanDisplayName(profile) {
  return credentialIsOwnStoredLogin()
    ? planDisplayNameFromProfile(profile)
    : (getGlobalConfig().oauthAccount?.planDisplayName ?? null);
}
//@ chunk-exfmq47h.js:317477-318962 facade-exports (2.1.88 match: storeOAuthAccountInfo, 0.667)
/**
 * 写全局配置 oauthAccount：accountUuid、emailAddress、organizationUuid、displayName、hasExtraUsageEnabled、billingType、accountCreatedAt、subscriptionCreatedAt、seatTier、planDisplayName 等。
 */
function storeOAuthAccountInfo(
  {
    accountUuid,
    emailAddress,
    organizationUuid,
    displayName,
    fullName,
    hasExtraUsageEnabled,
    billingType,
    accountCreatedAt,
    subscriptionCreatedAt,
    ccOnboardingFlags,
    claudeCodeTrialEndsAt,
    claudeCodeTrialDurationDays,
    seatTier,
    planDisplayName,
    profileFetchedAt,
  },
  storageV5,
) {
  let accountInfo = {
    accountUuid,
    emailAddress,
    organizationUuid,
    hasExtraUsageEnabled,
    billingType,
    accountCreatedAt,
    subscriptionCreatedAt,
    ccOnboardingFlags,
    claudeCodeTrialEndsAt,
    claudeCodeTrialDurationDays,
    seatTier,
    planDisplayName: planDisplayName ?? undefined,
  };
  if (displayName) accountInfo.displayName = displayName;
  if (fullName) accountInfo.fullName = fullName;
  if (profileFetchedAt !== undefined) accountInfo.profileFetchedAt = profileFetchedAt;
  saveGlobalConfig((current) => {
    if (
      profileFetchedAt === undefined &&
      current.oauthAccount?.accountUuid === accountInfo.accountUuid &&
      current.oauthAccount?.emailAddress === accountInfo.emailAddress &&
      current.oauthAccount?.organizationUuid === accountInfo.organizationUuid &&
      current.oauthAccount?.displayName === accountInfo.displayName &&
      current.oauthAccount?.fullName === accountInfo.fullName &&
      current.oauthAccount?.hasExtraUsageEnabled === accountInfo.hasExtraUsageEnabled &&
      current.oauthAccount?.billingType === accountInfo.billingType &&
      current.oauthAccount?.accountCreatedAt === accountInfo.accountCreatedAt &&
      current.oauthAccount?.subscriptionCreatedAt === accountInfo.subscriptionCreatedAt &&
      current.oauthAccount?.claudeCodeTrialEndsAt === accountInfo.claudeCodeTrialEndsAt &&
      current.oauthAccount?.claudeCodeTrialDurationDays === accountInfo.claudeCodeTrialDurationDays &&
      current.oauthAccount?.seatTier === accountInfo.seatTier &&
      current.oauthAccount?.planDisplayName === accountInfo.planDisplayName &&
      JSON.stringify(current.oauthAccount?.ccOnboardingFlags) ===
        JSON.stringify(accountInfo.ccOnboardingFlags)
    )
      return current;
    return {
      ...current,
      oauthAccount: {
        ...current.oauthAccount,
        ...accountInfo,
      },
    };
  }, storageV5);
}
//@ chunk-exfmq47h.js:318962-319165 layout
function parseOAuthErrorBody(body) {
  if (!body || typeof body !== "object")
    return {
      code: undefined,
      description: undefined,
    };
  let record = body;
  let error = record.error;
  return {
    code: typeof error === "string" ? error : error && typeof error === "object" ? error.type : undefined,
    description: record.error_description,
  };
}
//@ chunk-exfmq47h.js:319165-319323 facade-exports (2.1.88 match: isTransientNetworkError, 1)
function isAccountOnHoldError(error) {
  if (!axios_default.isAxiosError(error) || !error.response) return false;
  let status = error.response.status;
  if (status !== 400 && status !== 401 && status !== 403) return false;
  return classifyOAuthErrorResponse(error.response.data) !== null;
}
//@ chunk-exfmq47h.js:319323-319403 facade-exports (2.1.88 match: isTransientNetworkError, 1)
function getAccountOnHoldErrorUrl(error) {
  return (
    (axios_default.isAxiosError(error) ? classifyOAuthErrorResponse(error.response?.data) : null)?.url ??
    HTTPS_CLAUDE_AI_RESTRICTED
  );
}
//@ chunk-exfmq47h.js:319403-319595 facade-exports
/**
 * OAuth 错误是否为 invalid_grant（refresh token 失效）。
 */
function isInvalidGrantError(error) {
  if (!axios_default.isAxiosError(error) || !error.response) return false;
  let status = error.response.status;
  if (status !== 400 && status !== 401) return false;
  return (
    parseOAuthErrorBody(error.response.data).code === "invalid_grant" &&
    classifyOAuthErrorResponse(error.response.data) === null
  );
}
//@ chunk-exfmq47h.js:319595-319719 facade-exports
function isInvalidScopeError(error) {
  if (!axios_default.isAxiosError(error) || error.response?.status !== 400) return false;
  return parseOAuthErrorBody(error.response.data).code === "invalid_scope";
}
//@ chunk-exfmq47h.js:319719-319786 facade-exports (2.1.88 match: isTransientNetworkError, 1)
function isOAuthTokenRequestRefused(error) {
  return axios_default.isAxiosError(error) && isNonRetryableClientError(error.response?.status);
}
//@ chunk-exfmq47h.js:319786-319859 layout
var FATAL_OAUTH_ERROR_CODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-exfmq47h.js:319786", () => {
  FATAL_OAUTH_ERROR_CODES = new Set(["invalid_client", "invalid_scope", "unauthorized_client"]);
});
//@ chunk-exfmq47h.js:319859-320003 facade-exports (2.1.88 match: isTransientNetworkError, 1)
function isExpectedOAuthTokenError(error) {
  if (!axios_default.isAxiosError(error) || error.response?.status !== 400) return false;
  let { code } = parseOAuthErrorBody(error.response.data);
  return typeof code === "string" && FATAL_OAUTH_ERROR_CODES.has(code);
}
//@ chunk-exfmq47h.js:320003-320168 layout
var REFRESH_TOKEN_EXPIRED_MESSAGE = "Refresh token expired";
var versionTag = [
  REFRESH_TOKEN_EXPIRED_MESSAGE,
  "Refresh token not found or invalid",
  "No organization associated with this token",
  "No account associated with this token",
  ACCOUNT_ON_HOLD,
];
//@ chunk-exfmq47h.js:320168-320256 facade-exports (2.1.88 match: isTransientNetworkError, 1)
function isRefreshTokenExpiredError(error) {
  return (
    isInvalidGrantError(error) &&
    axios_default.isAxiosError(error) &&
    parseOAuthErrorBody(error.response?.data).description === REFRESH_TOKEN_EXPIRED_MESSAGE
  );
}
//@ chunk-exfmq47h.js:320256-320484 facade-exports
function extractOAuthErrorFields(error) {
  if (!axios_default.isAxiosError(error) || !error.response) return {};
  let { code, description } = parseOAuthErrorBody(error.response.data);
  return {
    oauth_error_status: fromNumber(error.response.status),
    oauth_error_type: sanitizedOAuthErrorTypeForTelemetry(code),
    oauth_error_description: fromEnumOpt(versionTag.find((candidate) => candidate === description)),
  };
}
//@ chunk-exfmq47h.js:320484-320616 facade-exports
async function restoreOAuthAccountAfterRefusedRefresh(storedOauthAccountInfo, storageV5) {
  await saveGlobalConfig(
    (config) =>
      config.oauthAccount?.accountUuid === storedOauthAccountInfo.accountUuid &&
      !isDeepStrictEqual(config.oauthAccount, storedOauthAccountInfo)
        ? {
            ...config,
            oauthAccount: storedOauthAccountInfo,
          }
        : config,
    storageV5,
  );
}
export {
  isOAuthTokenExpired,
  getOrganizationUUID,
  refreshOAuthToken,
  isInvalidGrantError,
  shouldUseClaudeAIAuth,
  isRefreshTokenExpiredError,
  isAccountOnHoldError,
  isExpectedOAuthTokenError,
  isInvalidScopeError,
  getAccountOnHoldErrorUrl,
  revokeOAuthToken,
  SUBSCRIPTION_TYPE_BY_ORG_TYPE,
  storeOAuthAccountInfo,
  restoreOAuthAccountAfterRefusedRefresh,
  fetchProfileInfo,
  subscriptionTypeForOrganizationType,
  isVerificationOrMintRefusal,
  fetchAndStoreUserRoles,
  createAndStoreApiKey,
  revokeOAuthTokenAcknowledged,
  buildAuthUrl,
  exchangeCodeForTokens,
  parseScopes,
  resolveRefreshTokenExpiresAt,
  populateOAuthAccountInfoIfNeeded,
  extractOAuthErrorFields,
  isOAuthTokenRequestRefused,
};
