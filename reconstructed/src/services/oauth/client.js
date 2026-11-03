/**
 * services/oauth/client.ts
 *
 * OAuth 客户端：拼 authorize URL（PKCE S256）、授权码换令牌、刷新与吊销令牌、拉 profile/roles、创建 API key、写 oauthAccount。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/oauth/client.ts
 * pieces: chunk-aepeg2w5.js (37)
 * attribution: placement 3, layout 9, facade-exports 25
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

//@ chunk-aepeg2w5.js:295624-295741 placement
var API_KEY_NOT_CREATED_MESSAGE =
  "The server did not create an API key and gave no readable reason. If this keeps happening, contact support.";
//@ chunk-aepeg2w5.js:295741-295825 placement
class KeyMintRefusedError extends Error {
  constructor(message, n) {
    super(message, n);
    this.name = "KeyMintRefusedError";
  }
}
//@ chunk-aepeg2w5.js:295825-295881 placement
/**
 * 判断是否为需要二次验证或被拒铸币的错误。
 */
function isVerificationOrMintRefusal(e) {
  return e instanceof VerificationRequiredError || e instanceof KeyMintRefusedError;
}
//@ chunk-aepeg2w5.js:295881-295911 layout
/**
 * 刷新令牌的有效期（30 天）。
 */
var TOKEN_CONFIG_TTL_MS = 86400000;
var REFRESH_TOKEN_EXPIRY_MS = 2592000000;
//@ chunk-aepeg2w5.js:295911-296007 facade-exports
function resolveRefreshTokenExpiresAt(refreshTokenExpiresIn, n) {
  if (typeof refreshTokenExpiresIn === "number") return Date.now() + refreshTokenExpiresIn * 1000;
  return n ? Date.now() + REFRESH_TOKEN_EXPIRY_MS : undefined;
}
//@ chunk-aepeg2w5.js:296007-296036 facade-exports
function shouldUseClaudeAIAuth(scopes) {
  return isClaudeAiScopeSet(scopes);
}
//@ chunk-aepeg2w5.js:296036-296120 facade-exports
function parseScopes(scopeString) {
  if (typeof scopeString !== "string") return [];
  return scopeString.split(" ").filter(Boolean);
}
//@ chunk-aepeg2w5.js:296120-296969 facade-exports = buildAuthUrl (0.957)
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
//@ chunk-aepeg2w5.js:296969-297709 facade-exports = exchangeCodeForTokens (0.816)
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
//@ chunk-aepeg2w5.js:297709-300375 facade-exports = refreshOAuthToken (0.686)
/**
 * 用 refresh token 换新令牌（POST TOKEN_URL，30 秒超时，可带 expires_in），成功打 tengu_oauth_token_refresh_success；必要时补拉 profile 更新订阅信息与 oauthAccount。
 */
async function refreshOAuthToken(
  refreshToken,
  {
    scopes: n,
    expiresIn: r,
    clientId: s,
    skipProfileFetch: h,
    signal: y,
    telemetryContext: S,
    invalidScopeRetried: w,
    storageV5: R,
  } = {},
) {
  let x = Array.isArray(n) && n.length ? n : claudeAiLoginScopes();
  let requestBody = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: s ?? getOauthConfig().CLIENT_ID,
    scope: x.join(" "),
  };
  if (r !== undefined) requestBody.expires_in = r;
  try {
    let response = await axios_default.post(getOauthConfig().TOKEN_URL, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
      signal: y,
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
    let scopes = parseScopes(data.scope);
    logEvent("tengu_oauth_token_refresh_success", {
      plugins_scope_requested: x.includes(CLAUDE_AI_PLUGINS_SCOPE),
      plugins_scope_granted: scopes.includes(CLAUDE_AI_PLUGINS_SCOPE),
    });
    logFeatureOk("oauth_token_refresh");
    let config = getGlobalConfig();
    let Se = h ? null : getClaudeAIOAuthTokens();
    let ae = consumeProfileStamp(Se);
    let ie =
      config.oauthAccount?.billingType !== undefined &&
      config.oauthAccount?.accountCreatedAt !== undefined &&
      config.oauthAccount?.subscriptionCreatedAt !== undefined &&
      config.oauthAccount?.ccOnboardingFlags !== undefined &&
      Se?.subscriptionType != null &&
      Se?.rateLimitTier != null &&
      !ae;
    let profileInfo = h || ie ? null : await fetchProfileInfo(accessToken);
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
          R,
        );
    }
    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
      refreshTokenExpiresAt,
      scopes,
      clientId: s,
      ...reconcileSubscriptionType(Se, profileInfo),
      rateLimitTier: profileInfo?.rateLimitTier ?? Se?.rateLimitTier ?? null,
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
    let L = w === true && isInvalidScopeError(error);
    logEvent("tengu_oauth_token_refresh_failure", {
      ...errorTelemetryFields(error),
      ...extractOAuthErrorFields(error),
      ...(S && {
        context: fromEnum(S),
      }),
      ...(L && {
        context: lit("invalid_scope_retried"),
      }),
    });
    if (isAccountOnHoldError(error)) logFeatureBad("oauth_token_refresh", "oauth_refresh_account_on_hold");
    else if (isInvalidGrantError(error)) logFeatureBad("oauth_token_refresh", "oauth_refresh_invalid_grant");
    else if (!y?.aborted && !S && !L) logFeatureSad("oauth_token_refresh", "oauth_refresh_request_failed");
    throw error;
  }
}
//@ chunk-aepeg2w5.js:300375-301017 facade-exports
/**
 * 吊销令牌：POST <TOKEN_URL>/revoke（token、token_type_hint、client_id），5 秒超时，用于登出。
 */
async function revokeOAuthTokenAcknowledged(token, n, tokenTypeHint = "refresh_token") {
  try {
    let headers =
      (
        await axios_default.post(
          `${getOauthConfig().TOKEN_URL}/revoke`,
          {
            token,
            token_type_hint: tokenTypeHint,
            client_id: n ?? getOauthConfig().CLIENT_ID,
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
//@ chunk-aepeg2w5.js:301017-301055 facade-exports
/**
 * 吊销 refresh token（登出时）。
 */
async function revokeOAuthToken(refreshToken, clientId) {
  await revokeOAuthTokenAcknowledged(refreshToken, clientId);
}
//@ chunk-aepeg2w5.js:301055-301806 facade-exports = fetchAndStoreUserRoles (0.813)
/**
 * 拉取 ROLES_URL（organization_role / workspace_role）并写入 oauthAccount。
 */
async function fetchAndStoreUserRoles(accessToken, n) {
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
    n,
  );
  logEvent("tengu_oauth_roles_stored", {
    org_role:
      data.organization_role == null ? undefined : sanitizedMachineReasonForTelemetry(data.organization_role),
  });
  logFeatureOk("oauth_fetch_roles");
}
//@ chunk-aepeg2w5.js:301806-302642 facade-exports = createAndStoreApiKey (0.589)
/**
 * Console 登录后用 OAuth 令牌调用 API_KEY_URL 创建 API key 并保存（tengu_oauth_api_key）。
 */
async function createAndStoreApiKey(accessToken, n) {
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
      await saveApiKey(apiKey, n);
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
    let h = verificationErrorMessage(error);
    let status = axios_default.isAxiosError(error) ? error.response?.status : undefined;
    if (h !== null && status !== undefined && status >= 400 && status < 500) {
      logFeatureBad("oauth_create_api_key", "oauth_api_key_refused");
      throw new KeyMintRefusedError(sanitizeVerificationMessage(h) ?? API_KEY_NOT_CREATED_MESSAGE, {
        cause: error,
      });
    }
    logFeatureBad("oauth_create_api_key", "oauth_api_key_request_failed");
    throw error;
  }
}
//@ chunk-aepeg2w5.js:302642-302710 facade-exports
/**
 * 令牌是否已过期或 5 分钟内过期（expiresAt 为 null 视为不过期）。
 */
function isOAuthTokenExpired(expiresAt, n = Date.now()) {
  if (expiresAt === null) return false;
  return n + 300000 >= expiresAt;
}
//@ chunk-aepeg2w5.js:302710-302829 facade-exports = fetchProfileInfo (0.606)
var SUBSCRIPTION_TYPE_BY_ORG_TYPE = new Map([
  ["claude_max", "max"],
  ["claude_pro", "pro"],
  ["claude_enterprise", "enterprise"],
  ["claude_team", "team"],
]);
//@ chunk-aepeg2w5.js:302829-302888 facade-exports
/**
 * organization_type → 订阅类型（claude_max→max、claude_pro→pro、claude_enterprise→enterprise、claude_team→team）。
 */
function subscriptionTypeForOrganizationType(organizationType) {
  return (
    (organizationType !== undefined ? SUBSCRIPTION_TYPE_BY_ORG_TYPE.get(organizationType) : undefined) ?? null
  );
}
//@ chunk-aepeg2w5.js:302888-302928 layout
var profileStampState = identity_2(
  {
    spent: false,
  },
  (e) => {
    e.spent = false;
  },
);
//@ chunk-aepeg2w5.js:302928-302995 layout
function consumeProfileStamp(e) {
  if (profileStampState.spent || !isUnmarkedStoredPlan(e)) return false;
  profileStampState.spent = true;
  return true;
}
//@ chunk-aepeg2w5.js:302995-303750 layout
function reconcileSubscriptionType(e, profileInfo) {
  let subscriptionType = e?.subscriptionType ?? null;
  let subscriptionTypeSource = e?.subscriptionTypeSource;
  let h = subscriptionType === null || subscriptionTypeSource === "profile";
  let y = isProvisionalProfilePlan(e);
  let subscriptionType_2 = profileInfo?.subscriptionType ?? null;
  let w =
    subscriptionType_2 !== null &&
    profileInfo?.originStamped === true &&
    (y || !isProfilePlanDowngrade(subscriptionType, subscriptionType_2));
  if (!h) {
    if (w && subscriptionType_2 !== subscriptionType)
      return {
        subscriptionType: subscriptionType_2,
        subscriptionTypeSource: "profile",
        subscriptionTypeVerifiedAt: Date.now(),
      };
    return subscriptionTypeSource === "sign_in" || (w && subscriptionType_2 === subscriptionType)
      ? {
          subscriptionType,
          subscriptionTypeSource: "sign_in",
        }
      : {
          subscriptionType,
        };
  }
  if (w)
    return {
      subscriptionType: subscriptionType_2,
      subscriptionTypeSource: "profile",
      subscriptionTypeVerifiedAt: Date.now(),
    };
  if (subscriptionType !== null && (!y || subscriptionType_2 === null))
    return {
      subscriptionType,
      subscriptionTypeSource: "profile",
      subscriptionTypeVerifiedAt: e?.subscriptionTypeVerifiedAt,
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
//@ chunk-aepeg2w5.js:303750-304677 facade-exports
/**
 * 拉 OAuth profile 并提取 subscriptionType（由 organization_type 映射）、rateLimitTier、seatTier、hasExtraUsageEnabled、billingType 等。
 */
async function fetchProfileInfo(accessToken) {
  let oauthProfileWithOriginFromOauthToken = await getOauthProfileWithOriginFromOauthToken(accessToken);
  let profile = oauthProfileWithOriginFromOauthToken?.profile;
  let h = {
    subscriptionType: subscriptionTypeForOrganizationType(profile?.organization?.organization_type),
    rateLimitTier: profile?.organization?.rate_limit_tier ?? null,
    seatTier: profile?.organization?.seat_tier ?? null,
    hasExtraUsageEnabled: profile?.organization?.has_extra_usage_enabled ?? null,
    billingType: profile?.organization?.billing_type ?? null,
    ccOnboardingFlags: profile?.organization?.cc_onboarding_flags ?? {},
    claudeCodeTrialEndsAt: profile?.organization?.claude_code_trial_ends_at ?? null,
    claudeCodeTrialDurationDays: profile?.organization?.claude_code_trial_duration_days ?? null,
  };
  if (profile?.account?.display_name) h.displayName = profile.account.display_name;
  if (profile?.account?.full_name) h.fullName = profile.account.full_name;
  if (profile?.account?.created_at) h.accountCreatedAt = profile.account.created_at;
  if (profile?.organization?.subscription_created_at)
    h.subscriptionCreatedAt = profile.organization.subscription_created_at;
  logEvent("tengu_oauth_profile_fetch_success", {});
  return {
    ...h,
    rawProfile: profile,
    originStamped: oauthProfileWithOriginFromOauthToken?.stamped,
  };
}
//@ chunk-aepeg2w5.js:304677-304931 facade-exports = getOrganizationUUID (0.873)
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
//@ chunk-aepeg2w5.js:304931-306619 facade-exports = populateOAuthAccountInfoIfNeeded (0.733)
/**
 * oauthAccount 缺字段时拉 profile 补全（可覆盖 env 提供的账户信息）。
 */
async function populateOAuthAccountInfoIfNeeded(credentials, n, r = true) {
  let envAccountUuid = env.CLAUDE_CODE_ACCOUNT_UUID;
  let envUserEmail = env.CLAUDE_CODE_USER_EMAIL;
  let envOrganizationUuid = env.CLAUDE_CODE_ORGANIZATION_UUID;
  let S =
    !isDiskless() && envAccountUuid && envUserEmail && envOrganizationUuid
      ? {
          accountUuid: envAccountUuid,
          emailAddress: envUserEmail,
          organizationUuid: envOrganizationUuid,
        }
      : null;
  if (S && !getGlobalConfig().oauthAccount) storeOAuthAccountInfo(S, n);
  if (r)
    await checkAndRefreshOAuthTokenIfNeeded({
      credentials,
      storageV5: n,
    });
  else {
    let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(credentials);
    if (isOAuthTokenExpired(claudeAIOAuthTokens?.expiresAt ?? null)) return false;
  }
  let config = getGlobalConfig();
  let profileFetchedAt = config.oauthAccount?.profileFetchedAt;
  let x = profileFetchedAt !== undefined && Date.now() - profileFetchedAt < TOKEN_CONFIG_TTL_MS;
  let config_2 = getStoredOAuthTierVerifiedAt();
  let F =
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
      x &&
      !F) ||
    !isClaudeAISubscriber() ||
    !hasProfileScope()
  )
    return false;
  let tokens = getClaudeAIOAuthTokens();
  if (!tokens?.accessToken) return false;
  let profile = await getOauthProfileWithOriginFromOauthToken(tokens.accessToken);
  let profile_2 = profile?.profile;
  if (!profile_2?.account || !profile_2.organization) return false;
  if (S)
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
      profileFetchedAt: Date.now(),
    },
    n,
  );
  await recordStoredLoginPlan(tokens, profile_2, profile?.stamped === true, credentials);
  return true;
}
//@ chunk-aepeg2w5.js:306619-307249 layout
async function recordStoredLoginPlan(tokens, profile, originStamped, credentials) {
  let h = tokens.subscriptionTypeSource === "profile" || isUnmarkedStoredPlan(tokens);
  if ((tokens.subscriptionType !== null && !h) || !tokens.refreshToken || !credentialIsOwnStoredLogin())
    return;
  let y = subscriptionTypeForOrganizationType(profile.organization.organization_type);
  if (y === null) return;
  let S = await backfillStoredOAuthTier({
    expectedRefreshToken: tokens.refreshToken,
    subscriptionType: y,
    rateLimitTier: profile.organization.rate_limit_tier ?? null,
    verifiedAt: Date.now(),
    originStamped,
    credentials,
  });
  logForDebugging(
    S === "written"
      ? `OAuth: recorded the stored login plan (${y}) from the profile`
      : S === "reverified" || S === "confirmed"
        ? `OAuth: profile re-read confirms the stored login plan (${y}; ${S})`
        : `OAuth: stored login plan not recorded from the profile (${S})`,
  );
}
//@ chunk-aepeg2w5.js:307249-307324 layout
function getPlanDisplayName(e) {
  return credentialIsOwnStoredLogin()
    ? planDisplayNameFromProfile(e)
    : (getGlobalConfig().oauthAccount?.planDisplayName ?? null);
}
//@ chunk-aepeg2w5.js:307324-308809 facade-exports = storeOAuthAccountInfo (0.667)
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
//@ chunk-aepeg2w5.js:308809-309012 layout
function parseOAuthErrorBody(e) {
  if (!e || typeof e !== "object")
    return {
      code: undefined,
      description: undefined,
    };
  let n = e;
  let error = n.error;
  return {
    code: typeof error === "string" ? error : error && typeof error === "object" ? error.type : undefined,
    description: n.error_description,
  };
}
//@ chunk-aepeg2w5.js:309012-309170 facade-exports = isTransientNetworkError (1)
function isAccountOnHoldError(error) {
  if (!axios_default.isAxiosError(error) || !error.response) return false;
  let status = error.response.status;
  if (status !== 400 && status !== 401 && status !== 403) return false;
  return classifyOAuthErrorResponse(error.response.data) !== null;
}
//@ chunk-aepeg2w5.js:309170-309250 facade-exports = isTransientNetworkError (1)
function getAccountOnHoldErrorUrl(error) {
  return (
    (axios_default.isAxiosError(error) ? classifyOAuthErrorResponse(error.response?.data) : null)?.url ??
    HTTPS_CLAUDE_AI_RESTRICTED
  );
}
//@ chunk-aepeg2w5.js:309250-309442 facade-exports
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
//@ chunk-aepeg2w5.js:309442-309566 facade-exports
function isInvalidScopeError(error) {
  if (!axios_default.isAxiosError(error) || error.response?.status !== 400) return false;
  return parseOAuthErrorBody(error.response.data).code === "invalid_scope";
}
//@ chunk-aepeg2w5.js:309566-309633 facade-exports = isTransientNetworkError (1)
function isOAuthTokenRequestRefused(error) {
  return axios_default.isAxiosError(error) && isNonRetryableClientError(error.response?.status);
}
//@ chunk-aepeg2w5.js:309633-309706 layout
var FATAL_OAUTH_ERROR_CODES = new Set(["invalid_client", "invalid_scope", "unauthorized_client"]);
//@ chunk-aepeg2w5.js:309706-309850 facade-exports = isTransientNetworkError (1)
function isExpectedOAuthTokenError(error) {
  if (!axios_default.isAxiosError(error) || error.response?.status !== 400) return false;
  let { code } = parseOAuthErrorBody(error.response.data);
  return typeof code === "string" && FATAL_OAUTH_ERROR_CODES.has(code);
}
//@ chunk-aepeg2w5.js:309850-310009 layout
var TERMINAL_REFRESH_ERRORS = [
  "Refresh token expired",
  "Refresh token not found or invalid",
  "No organization associated with this token",
  "No account associated with this token",
  ACCOUNT_ON_HOLD,
];
//@ chunk-aepeg2w5.js:310009-310237 facade-exports
function extractOAuthErrorFields(error) {
  if (!axios_default.isAxiosError(error) || !error.response) return {};
  let { code, description } = parseOAuthErrorBody(error.response.data);
  return {
    oauth_error_status: fromNumber(error.response.status),
    oauth_error_type: sanitizedOAuthErrorTypeForTelemetry(code),
    oauth_error_description: fromEnumOpt(TERMINAL_REFRESH_ERRORS.find((s) => s === description)),
  };
}
//@ chunk-aepeg2w5.js:310237-310369 facade-exports
async function restoreOAuthAccountAfterRefusedRefresh(storedOauthAccountInfo, n) {
  await saveGlobalConfig(
    (r) =>
      r.oauthAccount?.accountUuid === storedOauthAccountInfo.accountUuid &&
      !isDeepStrictEqual(r.oauthAccount, storedOauthAccountInfo)
        ? {
            ...r,
            oauthAccount: storedOauthAccountInfo,
          }
        : r,
    n,
  );
}
export {
  isOAuthTokenExpired,
  getOrganizationUUID,
  shouldUseClaudeAIAuth,
  isInvalidGrantError,
  isAccountOnHoldError,
  isExpectedOAuthTokenError,
  refreshOAuthToken,
  isInvalidScopeError,
  getAccountOnHoldErrorUrl,
  revokeOAuthToken,
  restoreOAuthAccountAfterRefusedRefresh,
  fetchProfileInfo,
  subscriptionTypeForOrganizationType,
  isVerificationOrMintRefusal,
  storeOAuthAccountInfo,
  SUBSCRIPTION_TYPE_BY_ORG_TYPE,
  populateOAuthAccountInfoIfNeeded,
  buildAuthUrl,
  exchangeCodeForTokens,
  parseScopes,
  resolveRefreshTokenExpiresAt,
  fetchAndStoreUserRoles,
  createAndStoreApiKey,
  revokeOAuthTokenAcknowledged,
};
